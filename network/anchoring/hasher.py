"""Càlcul del hash SHA-256 determinista de l'estat d'una elecció Demochain.

A diferència del sistema original (que hashejava comptadors de vots per candidat),
aquest mòdul hasheja les paperetes de preferència completes (mètode Schulze).

Format canònic JSON (claus ordenades, sense espais):
  {
    "ballots": [
      {"preference": [2, 0, 1], "voter": "ADDR_A"},
      {"preference": [0, 2, 1], "voter": "ADDR_B"}
    ],
    "options": ["Opció A", "Opció B", "Opció C"],
    "proposal_id": 1,
    "title": "Rector 2026"
  }

Les paperetes estan ordenades per `voter` (ordre lexicogràfic) per garantir
que tots els nodes produeixin exactament el mateix JSON per al mateix estat.
"""

import hashlib
import json

from .models import ElectionState


def compute_election_hash(state: ElectionState) -> bytes:
    """Retorna el SHA-256 (32 bytes) de l'estat de l'elecció en forma canònica."""
    canonical = {
        "ballots": [
            {"preference": b.preference, "voter": b.voter}
            for b in sorted(state.ballots, key=lambda x: x.voter)
        ],
        "options": state.options,
        "proposal_id": state.proposal_id,
        "title": state.title,
    }
    canonical_json = json.dumps(canonical, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical_json.encode("utf-8")).digest()


def compute_election_hash_hex(state: ElectionState) -> str:
    """Retorna el SHA-256 en format hexadecimal amb prefix 0x (compatible bytes32 Solidity)."""
    return "0x" + compute_election_hash(state).hex()
