"""Envia el hash SHA-256 d'una elecció al NotaryContract desplegat a Ethereum.

Cada node universitari usa aquest mòdul per signar i enviar una transacció
Ethereum que registra el hash de les paperetes de la proposta. El contracte
NotaryContract aplica el consens K-de-N on-chain.
"""

import logging
import os
from dataclasses import dataclass

logger = logging.getLogger(__name__)

_DEFAULT_GAS_LIMIT = int(os.environ.get("ETH_GAS_LIMIT", "200000"))
_DEFAULT_TX_TIMEOUT = int(os.environ.get("ETH_TX_TIMEOUT", "60"))

NOTARY_ABI = [
    {
        "inputs": [{"internalType": "address", "name": "uni", "type": "address"}],
        "name": "addUniversity",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "address", "name": "uni", "type": "address"}],
        "name": "removeUniversity",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "string", "name": "electionId", "type": "string"}],
        "name": "openElection",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "string", "name": "electionId", "type": "string"},
            {"internalType": "bytes32", "name": "resultHash", "type": "bytes32"},
        ],
        "name": "submitHash",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "string", "name": "electionId", "type": "string"}],
        "name": "isElectionAnchored",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "string", "name": "electionId", "type": "string"},
            {"internalType": "address", "name": "submitter", "type": "address"},
        ],
        "name": "getSubmission",
        "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "string",
                "name": "electionId",
                "type": "string",
            },
            {
                "indexed": False,
                "internalType": "bytes32",
                "name": "resultHash",
                "type": "bytes32",
            },
            {
                "indexed": False,
                "internalType": "uint256",
                "name": "confirmations",
                "type": "uint256",
            },
        ],
        "name": "ResultAnchored",
        "type": "event",
    },
]


@dataclass
class SubmissionResult:
    success: bool
    tx_hash: str = ""
    anchored: bool = False
    error: str = ""


class EthereumSubmitter:
    """Client per enviar hashes de propostes al NotaryContract d'Ethereum."""

    def __init__(
        self,
        rpc_url: str,
        contract_address: str,
        private_key: str,
        gas_limit: int = _DEFAULT_GAS_LIMIT,
        tx_timeout: int = _DEFAULT_TX_TIMEOUT,
    ):
        from web3 import Web3

        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(contract_address),
            abi=NOTARY_ABI,
        )
        self.private_key = private_key
        self.account = self.w3.eth.account.from_key(private_key)
        self.gas_limit = gas_limit
        self.tx_timeout = tx_timeout

    def submit_hash(self, election_id: str, result_hash: bytes) -> SubmissionResult:
        """Envia el hash d'una proposta al NotaryContract.

        Args:
            election_id: Identificador de l'elecció (ex: "proposta-1").
            result_hash: SHA-256 de 32 bytes de les paperetes.

        Returns:
            SubmissionResult amb l'estat de la transacció.
        """
        try:
            tx = self.contract.functions.submitHash(
                election_id,
                result_hash,
            ).build_transaction(
                {
                    "from": self.account.address,
                    "nonce": self.w3.eth.get_transaction_count(self.account.address),
                    "gas": self.gas_limit,
                    "gasPrice": self.w3.eth.gas_price,
                }
            )

            signed_tx = self.w3.eth.account.sign_transaction(tx, self.private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=self.tx_timeout)

            if receipt["status"] != 1:
                return SubmissionResult(
                    success=False,
                    tx_hash=tx_hash.hex(),
                    error="Transacció revertida pel contracte",
                )

            anchored_logs = self.contract.events.ResultAnchored().process_receipt(
                receipt
            )
            anchored = bool(anchored_logs)
            if anchored:
                confs = anchored_logs[0]["args"]["confirmations"]
                logger.info(
                    "ResultAnchored per '%s' amb %d confirmacions", election_id, confs
                )

            return SubmissionResult(
                success=True, tx_hash=tx_hash.hex(), anchored=anchored
            )

        except Exception as exc:
            logger.error("Error enviant hash per '%s': %s", election_id, exc)
            return SubmissionResult(success=False, error=str(exc))
