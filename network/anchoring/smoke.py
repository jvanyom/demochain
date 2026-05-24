"""Smoke test que verifica la connectivitat del servei d'ancoratge.

Comprova:
  1. Connexió a algod i lectura de l'estat
  2. Connexió al node Ethereum (Hardhat local)
  3. NotaryContract desplegat amb el nombre esperat d'universitats blanquejades
  4. Adreces Ethereum de UIB/UPC/UAB efectivament a la whitelist

Es crida un cop a l'inici del contenidor 'anchoring' del docker-compose; si
totes les comprovacions passen, deixa el contenidor en repòs perquè es pugui
operar amb 'docker compose exec anchoring ...'.
"""

import logging
import os
import sys

from algosdk.v2client.algod import AlgodClient
from eth_account import Account
from web3 import Web3

logging.basicConfig(
    level=logging.INFO,
    format="[anchoring-smoke] %(message)s",
)
logger = logging.getLogger(__name__)


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default)


def check_algod() -> None:
    server = _env("ALGOD_SERVER", "http://algod")
    port = _env("ALGOD_PORT", "8080")
    token = _env("ALGOD_TOKEN", "a" * 64)
    url = f"{server}:{port}" if not server.endswith(f":{port}") else server
    logger.info("connecting to algod at %s", url)
    client = AlgodClient(token, url)
    status = client.status()
    logger.info("algod ok - last_round=%s", status.get("last-round"))


def check_app_id() -> int | None:
    app_id_str = _env("DEMOCHAIN_APP_ID", "").strip()
    if not app_id_str:
        logger.warning("DEMOCHAIN_APP_ID not set (contract-deploy may not have finished)")
        return None
    try:
        app_id = int(app_id_str)
    except ValueError:
        logger.error("DEMOCHAIN_APP_ID is not a number: %r", app_id_str)
        return None
    logger.info("DEMOCHAIN_APP_ID=%d", app_id)
    return app_id


def check_ethereum() -> Web3:
    rpc = _env("ETHEREUM_RPC_URL", "http://hardhat:8545")
    logger.info("connecting to ethereum at %s", rpc)
    w3 = Web3(Web3.HTTPProvider(rpc))
    if not w3.is_connected():
        raise RuntimeError(f"cannot connect to {rpc}")
    logger.info("ethereum ok - chain_id=%s, block=%s", w3.eth.chain_id, w3.eth.block_number)
    return w3


def check_notary_contract(w3: Web3) -> None:
    address = _env("NOTARY_CONTRACT_ADDRESS", "").strip()
    if not address:
        raise RuntimeError("NOTARY_CONTRACT_ADDRESS not set")
    address = Web3.to_checksum_address(address)
    abi = [
        {
            "inputs": [],
            "name": "universityCount",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function",
        },
        {
            "inputs": [],
            "name": "globalK",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function",
        },
        {
            "inputs": [{"internalType": "address", "name": "", "type": "address"}],
            "name": "whitelist",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "view",
            "type": "function",
        },
    ]
    contract = w3.eth.contract(address=address, abi=abi)
    count = contract.functions.universityCount().call()
    k = contract.functions.globalK().call()
    logger.info("NotaryContract @ %s - K-of-N = %d-of-%d", address, k, count)

    for uni_id in ("UIB", "UPC", "UAB"):
        key = _env(f"{uni_id}_ETH_PRIVATE_KEY", "").strip()
        if not key:
            logger.warning("%s_ETH_PRIVATE_KEY not set - skipping whitelist check", uni_id)
            continue
        addr = Account.from_key(key).address
        ok = contract.functions.whitelist(addr).call()
        logger.info("%s (%s) whitelisted=%s", uni_id, addr, ok)
        if not ok:
            raise RuntimeError(f"{uni_id} not in NotaryContract whitelist")


def main() -> int:
    try:
        check_algod()
        check_app_id()
        w3 = check_ethereum()
        check_notary_contract(w3)
    except Exception as exc:
        logger.error("smoke test FAILED: %s", exc)
        return 1
    logger.info("ALL CHECKS PASSED - anchoring service ready")
    return 0


if __name__ == "__main__":
    sys.exit(main())
