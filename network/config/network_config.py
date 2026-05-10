"""Carrega la configuració de la xarxa d'universitats des de universities.json.

Les credencials criptogràfiques (mnemonics Algorand, claus Ethereum) mai
s'emmagatzemen al JSON; el fitxer conté únicament el nom de la variable
d'entorn on cada credencial es troba.
"""

import json
import os
from dataclasses import dataclass
from pathlib import Path

CONFIG_DIR = Path(__file__).parent


@dataclass
class UniversityNode:
    id: str
    name: str
    algorand_mnemonic: str
    ethereum_private_key: str = ""

    @property
    def algorand_address(self) -> str:
        from algosdk import mnemonic
        return mnemonic.to_public_key(self.algorand_mnemonic)

    @property
    def algorand_private_key(self) -> str:
        from algosdk import mnemonic
        return mnemonic.to_private_key(self.algorand_mnemonic)

    @property
    def ethereum_address(self) -> str:
        from eth_account import Account
        return Account.from_key(self.ethereum_private_key).address


def load_universities() -> tuple[list[UniversityNode], int]:
    """Carrega les universitats i resol les credencials des de variables d'entorn.

    Returns:
        (llista de nodes, llindar K)
    """
    with open(CONFIG_DIR / "universities.json") as f:
        config = json.load(f)

    threshold_k: int = config["threshold_k"]
    nodes: list[UniversityNode] = []

    for uni in config["universities"]:
        nodes.append(UniversityNode(
            id=uni["id"],
            name=uni["name"],
            algorand_mnemonic=os.environ.get(uni["algorand_mnemonic_env"], ""),
            ethereum_private_key=os.environ.get(uni.get("ethereum_private_key_env", ""), ""),
        ))

    return nodes, threshold_k


def get_algod_config() -> dict:
    """Retorna la configuració de connexió al node algod des de variables d'entorn.

    Valors per defecte: AlgoKit LocalNet (http://localhost:4001).
    """
    return {
        "server": os.environ.get("ALGOD_SERVER", "http://localhost"),
        "port": int(os.environ.get("ALGOD_PORT", "4001")),
        "token": os.environ.get("ALGOD_TOKEN", "a" * 64),
    }


def get_ethereum_config() -> dict:
    """Retorna la configuració de connexió al node Ethereum des de variables d'entorn."""
    return {
        "rpc_url": os.environ.get("ETHEREUM_RPC_URL", "http://localhost:8545"),
        "contract_address": os.environ.get("NOTARY_CONTRACT_ADDRESS", ""),
    }
