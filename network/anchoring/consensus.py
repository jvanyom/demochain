"""Verificació local del consens K-de-N entre els hashes calculats per cada node.

Permet detectar discrepàncies entre universitats abans de gastar gas a Ethereum.
La validació autoritativa es fa sempre al NotaryContract on-chain.
"""

import logging
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class ConsensusResult:
    reached: bool
    consensus_hash: str
    agreeing_nodes: list[str]
    dissenting_nodes: list[str] = field(default_factory=list)
    total_nodes: int = 0
    threshold_k: int = 0
    all_hashes: dict[str, str] = field(default_factory=dict)


def check_consensus(node_hashes: dict[str, str], threshold_k: int) -> ConsensusResult:
    """Verifica si hi ha consens K-de-N entre els hashes dels nodes.

    Args:
        node_hashes: {university_id: hash_hex} amb el hash calculat per cada node.
        threshold_k: Nombre mínim de nodes que han de coincidir.

    Returns:
        ConsensusResult amb l'estat del consens i els nodes concordants/discrepants.
    """
    if not node_hashes:
        return ConsensusResult(
            reached=False,
            consensus_hash="",
            agreeing_nodes=[],
            total_nodes=0,
            threshold_k=threshold_k,
        )

    hash_groups: dict[str, list[str]] = {}
    for node_id, hash_hex in node_hashes.items():
        hash_groups.setdefault(hash_hex, []).append(node_id)

    best_hash = max(hash_groups, key=lambda h: len(hash_groups[h]))
    agreeing = hash_groups[best_hash]
    dissenting = [n for n in node_hashes if n not in agreeing]
    reached = len(agreeing) >= threshold_k

    if reached:
        logger.info(
            "Consens assolit: %d/%d nodes (K=%d) hash=%s...",
            len(agreeing),
            len(node_hashes),
            threshold_k,
            best_hash[:18],
        )
    else:
        logger.warning(
            "Consens NO assolit: %d/%d nodes (K=%d requerits)",
            len(agreeing),
            len(node_hashes),
            threshold_k,
        )

    if dissenting:
        logger.warning("Nodes discrepants: %s", dissenting)

    return ConsensusResult(
        reached=reached,
        consensus_hash=best_hash,
        agreeing_nodes=agreeing,
        dissenting_nodes=dissenting,
        total_nodes=len(node_hashes),
        threshold_k=threshold_k,
        all_hashes=node_hashes,
    )
