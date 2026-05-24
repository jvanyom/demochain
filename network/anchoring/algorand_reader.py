"""Llegeix l'estat d'una elecció (proposta + paperetes) des del contracte Demochain.

Estructura de BoxMaps rellevant (vegeu contract.py):
  pr_<UInt64>                → struct Proposal (title, description, options, org_id, creator, start, end)
  eb_<BallotId>              → DynamicArray[UInt8]  (ordre de preferència del votant)
    on BallotId = (arc4.Address[32B] + arc4.UInt64[8B]) = 40 bytes

Codificació ARC-4 del struct Proposal (camps dinàmics primer al head):
  Head (62 bytes):
    [0:2]  offset→title        (uint16 BE, absolut des de l'inici)
    [2:4]  offset→description  (uint16 BE)
    [4:6]  offset→options      (uint16 BE)
    [6:14] org_id              (uint64 BE)
    [14:46] creator            (32 bytes)
    [46:54] starting_date      (uint64 BE)
    [54:62] ending_date        (uint64 BE)
  Tail: dades dels camps dinàmics en ordre (title, description, options)
"""

import base64
import logging
import struct
from typing import Optional

from algosdk.v2client.algod import AlgodClient

from .models import Ballot, ElectionState

logger = logging.getLogger(__name__)

BOX_PREFIX_PROPOSAL = b"pr_"
BOX_PREFIX_BALLOT = b"eb_"

# Mida del head d'un struct Proposal (3 offsets × 2B + org_id 8B + creator 32B + 2 dates × 8B)
_PROPOSAL_HEAD_SIZE = 3 * 2 + 8 + 32 + 8 + 8  # = 62


def _read_arc4_string(data: bytes, offset: int) -> tuple[str, int]:
    """Descodifica un arc4.String des de `data` a la posició `offset`.

    Returns:
        (valor, offset_final) — offset just després de la cadena.
    """
    length = struct.unpack_from(">H", data, offset)[0]
    text = data[offset + 2 : offset + 2 + length].decode("utf-8")
    return text, offset + 2 + length


def _read_arc4_string_array(data: bytes, offset: int) -> list[str]:
    """Descodifica un arc4.DynamicArray[String] des de `data` a `offset`."""
    count = struct.unpack_from(">H", data, offset)[0]
    if count == 0:
        return []
    base = offset + 2  # byte just després del count; els offsets són relatius a aquí
    offsets = [struct.unpack_from(">H", data, base + i * 2)[0] for i in range(count)]
    result = []
    for rel_off in offsets:
        abs_off = base + rel_off
        s, _ = _read_arc4_string(data, abs_off)
        result.append(s)
    return result


def _decode_proposal(raw: bytes) -> tuple[str, list[str]]:
    """Extreu el títol i les opcions del bytes crus d'un struct Proposal.

    Returns:
        (title, options)

    Raises:
        ValueError: Si les dades són insuficients o mal formades.
    """
    if len(raw) < _PROPOSAL_HEAD_SIZE:
        raise ValueError(f"Proposal massa curta: {len(raw)} bytes")

    offset_title = struct.unpack_from(">H", raw, 0)[0]
    # offset_description a bytes [2:4] — no el necessitem
    offset_options = struct.unpack_from(">H", raw, 4)[0]

    title, _ = _read_arc4_string(raw, offset_title)
    options = _read_arc4_string_array(raw, offset_options)
    return title, options


def _decode_ballot_preference(raw: bytes) -> list[int]:
    """Descodifica un arc4.DynamicArray[UInt8] (ordre de preferència)."""
    if len(raw) < 2:
        return []
    count = struct.unpack_from(">H", raw, 0)[0]
    return list(raw[2 : 2 + count])


def _ballot_box_key(proposal_id: int, voter_address_bytes: bytes) -> bytes:
    """Construeix la clau de box per a BallotId(sender, proposal_id).

    ARC-4 Struct encoding (tots dos camps estàtics):
      voter_address_bytes (32B) + proposal_id uint64 BE (8B)
    """
    return BOX_PREFIX_BALLOT + voter_address_bytes + struct.pack(">Q", proposal_id)


def _proposal_box_key(proposal_id: int) -> bytes:
    return BOX_PREFIX_PROPOSAL + struct.pack(">Q", proposal_id)


class AlgorandElectionReader:
    """Llegeix propostes i paperetes des del contracte Demochain via algod."""

    def __init__(self, algod_client: AlgodClient, app_id: int):
        self.algod = algod_client
        self.app_id = app_id

    def _box_value(self, name: bytes) -> Optional[bytes]:
        try:
            result = self.algod.application_box_by_name(self.app_id, name)
            return base64.b64decode(result["value"])
        except Exception as exc:
            logger.debug("Box no trobada %r: %s", name, exc)
            return None

    def _list_boxes(self) -> list[bytes]:
        """Retorna els noms (bytes) de totes les boxes de l'aplicació."""
        try:
            resp = self.algod.application_boxes(self.app_id)
            return [base64.b64decode(b["name"]) for b in resp.get("boxes", [])]
        except Exception as exc:
            logger.error("Error llistant boxes de l'app %d: %s", self.app_id, exc)
            return []

    def list_proposal_ids(self) -> list[int]:
        """Retorna els IDs numèrics de totes les propostes registrades a l'app."""
        prefix = BOX_PREFIX_PROPOSAL
        prefix_len = len(prefix)
        ids: list[int] = []
        for box_name in self._list_boxes():
            if not box_name.startswith(prefix):
                continue
            payload = box_name[prefix_len:]
            if len(payload) != 8:
                continue
            (pid,) = struct.unpack(">Q", payload)
            ids.append(pid)
        return sorted(ids)

    def read_proposal_window(self, proposal_id: int) -> Optional[tuple[int, int]]:
        """Retorna (starting_date, ending_date) d'una proposta sense llegir les paperetes.

        Optimitzat per al dimoni d'ancoratge: només descodifica les dues dates
        del head del struct (bytes 46-62) per decidir si la proposta s'ha tancat.
        """
        raw = self._box_value(_proposal_box_key(proposal_id))
        if raw is None or len(raw) < _PROPOSAL_HEAD_SIZE:
            return None
        starting_date = struct.unpack_from(">Q", raw, 46)[0]
        ending_date = struct.unpack_from(">Q", raw, 54)[0]
        return starting_date, ending_date

    def read_election_state(self, proposal_id: int) -> Optional[ElectionState]:
        """Llegeix l'estat complet d'una proposta: títol, opcions i totes les paperetes.

        Args:
            proposal_id: ID numèric de la proposta (clau al BoxMap pr_).

        Returns:
            ElectionState amb les paperetes registrades, o None si la proposta
            no existeix.
        """
        prop_raw = self._box_value(_proposal_box_key(proposal_id))
        if prop_raw is None:
            logger.warning("Proposta %d no trobada", proposal_id)
            return None

        try:
            title, options = _decode_proposal(prop_raw)
        except ValueError as exc:
            logger.error("Error descodificant proposta %d: %s", proposal_id, exc)
            return None

        # Escanejar totes les boxes per trobar les paperetes d'aquesta proposta.
        # La clau d'una papereta és: b"eb_" + 32B(voter) + 8B(proposal_id).
        # Filtrem les que acaben amb struct.pack(">Q", proposal_id).
        pid_suffix = struct.pack(">Q", proposal_id)
        ballot_prefix = BOX_PREFIX_BALLOT
        ballot_prefix_len = len(ballot_prefix)
        address_size = 32

        ballots: list[Ballot] = []
        for box_name in self._list_boxes():
            if not box_name.startswith(ballot_prefix):
                continue
            payload = box_name[ballot_prefix_len:]  # 40 bytes: 32B addr + 8B pid
            if len(payload) != address_size + 8:
                continue
            if payload[address_size:] != pid_suffix:
                continue

            voter_bytes = payload[:address_size]
            ballot_raw = self._box_value(box_name)
            if ballot_raw is None:
                continue

            preference = _decode_ballot_preference(ballot_raw)
            voter_addr = _bytes_to_algorand_address(voter_bytes)
            ballots.append(Ballot(voter=voter_addr, preference=preference))

        # Ordenar per adreça per garantir ordre determinista.
        ballots.sort(key=lambda b: b.voter)

        try:
            status = self.algod.status()
            block_round = status.get("last-round", 0)
        except Exception:
            block_round = 0

        return ElectionState(
            proposal_id=proposal_id,
            title=title,
            options=options,
            ballots=ballots,
            block_round=block_round,
        )


def _bytes_to_algorand_address(raw: bytes) -> str:
    """Converteix 32 bytes de clau pública a adreça Algorand (base32 + checksum)."""
    import base64 as b64
    import hashlib

    checksum = hashlib.new("sha512_256", raw).digest()[-4:]
    return b64.b32encode(raw + checksum).decode("utf-8").rstrip("=")
