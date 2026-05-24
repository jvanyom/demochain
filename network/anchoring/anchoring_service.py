"""Servei d'ancoratge per a un node universitari de Demochain.

Orquestra el flux complet:
  1. Llegeix la proposta i les paperetes des d'Algorand (AlgorandElectionReader)
  2. Calcula el hash SHA-256 determinista (hasher)
  3. Envia el hash al NotaryContract d'Ethereum (EthereumSubmitter)

El consens K-of-N és responsabilitat del NotaryContract; cada universitat
opera de forma independent sense necessitat de coordinar-se amb les altres.
"""

import logging
from dataclasses import dataclass

from algosdk.v2client.algod import AlgodClient

from .algorand_reader import AlgorandElectionReader
from .ethereum_submitter import EthereumSubmitter, SubmissionResult
from .hasher import compute_election_hash_hex

logger = logging.getLogger(__name__)


@dataclass
class AnchoringResult:
    election_id: str
    hash_hex: str
    submission: SubmissionResult | None = None


class AnchoringService:
    """Servei d'ancoratge per a un node universitari.

    Args:
        university_id: Identificador curt de la universitat (ex: "uib").
        algod_client:  Client AlgodClient connectat a un node Algorand.
        app_id:        APP_ID del contracte Demochain desplegat.
        eth_submitter: Client Ethereum per enviar el hash (opcional; si és None
                       el servei calcula el hash però no l'envia).
    """

    def __init__(
        self,
        university_id: str,
        algod_client: AlgodClient,
        app_id: int,
        eth_submitter: EthereumSubmitter | None = None,
    ):
        self.university_id = university_id
        self.reader = AlgorandElectionReader(algod_client, app_id)
        self.submitter = eth_submitter

    def compute_hash(self, proposal_id: int) -> str | None:
        """Llegeix l'estat de la proposta i calcula el hash SHA-256.

        Returns:
            Hash hex (0x...) o None si la proposta no existeix o no té paperetes.
        """
        state = self.reader.read_election_state(proposal_id)
        if state is None:
            logger.warning(
                "[%s] Proposta %d no trobada", self.university_id, proposal_id
            )
            return None
        hash_hex = compute_election_hash_hex(state)
        logger.info(
            "[%s] Hash calculat per proposta %d: %s...",
            self.university_id,
            proposal_id,
            hash_hex[:18],
        )
        return hash_hex

    def anchor(self, proposal_id: int) -> AnchoringResult:
        """Executa el flux complet d'ancoratge per a aquesta universitat.

        Args:
            proposal_id: ID numèric de la proposta a ancorar.

        Returns:
            AnchoringResult amb l'election_id, el hash i el resultat de la
            submissió a Ethereum (None si no hi ha submitter configurat).
        """
        state = self.reader.read_election_state(proposal_id)
        if state is None:
            logger.warning(
                "[%s] Proposta %d no trobada", self.university_id, proposal_id
            )
            return AnchoringResult(election_id=f"proposta-{proposal_id}", hash_hex="")

        hash_hex = compute_election_hash_hex(state)
        logger.info(
            "[%s] Hash calculat per '%s': %s...",
            self.university_id,
            state.election_id,
            hash_hex[:18],
        )

        submission: SubmissionResult | None = None
        if self.submitter:
            result_hash_bytes = bytes.fromhex(hash_hex[2:])
            submission = self.submitter.submit_hash(
                state.election_id, result_hash_bytes
            )
            if submission.success:
                logger.info(
                    "[%s] Hash enviat a Ethereum: tx=%s...",
                    self.university_id,
                    submission.tx_hash[:18],
                )
                if submission.anchored:
                    logger.info(
                        "[%s] RESULTAT ANCORAT a Ethereum per '%s'",
                        self.university_id,
                        state.election_id,
                    )
            else:
                logger.error(
                    "[%s] Error enviant hash: %s", self.university_id, submission.error
                )

        return AnchoringResult(
            election_id=state.election_id,
            hash_hex=hash_hex,
            submission=submission,
        )
