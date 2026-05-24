"""Dimoni d'ancoratge per a un node universitari.

Polleja Algorand a la recerca de propostes tancades i, per a cada una,
envia el hash al NotaryContract d'Ethereum si aquesta universitat
encara no ho ha fet. La idempotència és cadena-nativa: abans de
submitre es consulta `NotaryContract.getSubmission(electionId, my_addr)`
i només s'envia si retorna zero. Això permet reiniciar el dimoni
lliurement sense risc de doble submissió.

Llançament típic (un cop per universitat):
  docker compose -f docker-compose.prod.yml up -d

Variables d'entorn requerides:
  ALGOD_SERVER, ALGOD_PORT, ALGOD_TOKEN
  DEMOCHAIN_APP_ID
  ETHEREUM_RPC_URL
  NOTARY_CONTRACT_ADDRESS
  UNI_ETH_PRIVATE_KEY
  UNIVERSITY_ID (per als logs)
  POLL_INTERVAL_SEC (per defecte 30)
"""

import logging
import os
import sys
import time

from algosdk.v2client.algod import AlgodClient

from .algorand_reader import AlgorandElectionReader
from .anchoring_service import AnchoringService
from .ethereum_submitter import EthereumSubmitter

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("anchoring.daemon")


def _required(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"missing required env var: {name}")
    return value


def _build_algod() -> AlgodClient:
    server = _required("ALGOD_SERVER")
    port = os.environ.get("ALGOD_PORT", "").strip()
    token = os.environ.get("ALGOD_TOKEN", "").strip()
    url = f"{server}:{port}" if port else server
    return AlgodClient(token, url)


def _latest_block_timestamp(algod: AlgodClient) -> int:
    status = algod.status()
    last_round = status.get("last-round", 0)
    if last_round == 0:
        return 0
    try:
        block = algod.block_info(last_round)
        return int(block.get("block", {}).get("ts", 0))
    except Exception as exc:
        logger.warning("error reading block %d timestamp: %s", last_round, exc)
        return 0


def _scan_once(
    university_id: str,
    reader: AlgorandElectionReader,
    service: AnchoringService,
    submitter: EthereumSubmitter,
    algod: AlgodClient,
) -> None:
    now_chain = _latest_block_timestamp(algod)
    if now_chain == 0:
        logger.warning("could not read chain timestamp; skipping scan")
        return

    proposal_ids = reader.list_proposal_ids()
    logger.info(
        "scan: chain_ts=%d proposals=%d", now_chain, len(proposal_ids)
    )

    for pid in proposal_ids:
        window = reader.read_proposal_window(pid)
        if window is None:
            continue
        _, ending_date = window
        if now_chain < ending_date:
            continue  # voting window still open

        election_id = f"proposta-{pid}"
        if submitter.has_submitted(election_id):
            logger.debug("[%s] %s ja submitida, ometent", university_id, election_id)
            continue

        logger.info("[%s] ancorant %s (proposal_id=%d)", university_id, election_id, pid)
        try:
            result = service.anchor(pid)
        except Exception as exc:
            logger.error("[%s] error ancorant %s: %s", university_id, election_id, exc)
            continue
        if result.submission and result.submission.success:
            logger.info(
                "[%s] %s submitida: tx=%s anchored=%s",
                university_id,
                election_id,
                result.submission.tx_hash,
                result.submission.anchored,
            )
        else:
            err = result.submission.error if result.submission else "(no submitter)"
            logger.error("[%s] submissió fallida per a %s: %s", university_id, election_id, err)


def main() -> int:
    try:
        university_id = os.environ.get("UNIVERSITY_ID", "uni").strip() or "uni"
        app_id = int(_required("DEMOCHAIN_APP_ID"))
        rpc_url = _required("ETHEREUM_RPC_URL")
        notary_address = _required("NOTARY_CONTRACT_ADDRESS")
        private_key = _required("UNI_ETH_PRIVATE_KEY")
        poll_interval = int(os.environ.get("POLL_INTERVAL_SEC", "30"))
    except RuntimeError as exc:
        logger.error("configuration error: %s", exc)
        return 2

    algod = _build_algod()
    try:
        status = algod.status()
        logger.info(
            "[%s] connected to algod, last_round=%s",
            university_id,
            status.get("last-round"),
        )
    except Exception as exc:
        logger.error("cannot reach algod: %s", exc)
        return 3

    submitter = EthereumSubmitter(
        rpc_url=rpc_url,
        contract_address=notary_address,
        private_key=private_key,
    )
    reader = AlgorandElectionReader(algod, app_id)
    service = AnchoringService(
        university_id=university_id,
        algod_client=algod,
        app_id=app_id,
        eth_submitter=submitter,
    )

    logger.info(
        "[%s] daemon ready: app_id=%d notary=%s submitter=%s interval=%ds",
        university_id,
        app_id,
        notary_address,
        submitter.account.address,
        poll_interval,
    )

    while True:
        try:
            _scan_once(university_id, reader, service, submitter, algod)
        except Exception as exc:
            logger.exception("unexpected error during scan: %s", exc)
        time.sleep(poll_interval)


if __name__ == "__main__":
    sys.exit(main())
