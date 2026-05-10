import struct
from unittest.mock import MagicMock
import base64

import pytest

from network.anchoring.algorand_reader import (
    _decode_ballot_preference,
    _decode_proposal,
    _ballot_box_key,
    _proposal_box_key,
    _bytes_to_algorand_address,
    AlgorandElectionReader,
    BOX_PREFIX_BALLOT,
    BOX_PREFIX_PROPOSAL,
)


# ── Helpers per construir bytes ARC-4 sintètics ───────────────────────────────


def arc4_string(s: str) -> bytes:
    b = s.encode("utf-8")
    return struct.pack(">H", len(b)) + b


def arc4_string_array(lst: list[str]) -> bytes:
    strings = [arc4_string(s) for s in lst]
    off_section = len(lst) * 2
    offset = off_section
    offsets = []
    for s in strings:
        offsets.append(offset)
        offset += len(s)
    header = struct.pack(">H", len(lst)) + b"".join(
        struct.pack(">H", o) for o in offsets
    )
    return header + b"".join(strings)


def build_proposal_raw(
    title: str,
    description: str,
    options: list[str],
    org_id: int = 1,
    creator: bytes = bytes(32),
    start: int = 0,
    end: int = 0,
) -> bytes:
    HEAD_SIZE = 62
    title_b = arc4_string(title)
    desc_b = arc4_string(description)
    options_b = arc4_string_array(options)

    off_title = HEAD_SIZE
    off_desc = off_title + len(title_b)
    off_opts = off_desc + len(desc_b)

    head = (
        struct.pack(">H", off_title)
        + struct.pack(">H", off_desc)
        + struct.pack(">H", off_opts)
        + struct.pack(">Q", org_id)
        + creator
        + struct.pack(">Q", start)
        + struct.pack(">Q", end)
    )
    assert len(head) == HEAD_SIZE
    return head + title_b + desc_b + options_b


# ── Tests de decodificació de la proposta ─────────────────────────────────────


class TestDecodeProposal:
    def test_basic(self):
        raw = build_proposal_raw("Rector 2026", "Desc", ["Alice", "Bob"])
        title, options = _decode_proposal(raw)
        assert title == "Rector 2026"
        assert options == ["Alice", "Bob"]

    def test_single_option(self):
        raw = build_proposal_raw("Test", "D", ["Única"])
        title, options = _decode_proposal(raw)
        assert title == "Test"
        assert options == ["Única"]

    def test_many_options(self):
        opts = [f"Candidat {i}" for i in range(5)]
        raw = build_proposal_raw("T", "D", opts)
        _, options = _decode_proposal(raw)
        assert options == opts

    def test_too_short_raises(self):
        with pytest.raises(ValueError):
            _decode_proposal(bytes(10))

    def test_unicode_title(self):
        raw = build_proposal_raw("Elecció Rectoral", "D", ["Opció A"])
        title, _ = _decode_proposal(raw)
        assert title == "Elecció Rectoral"


# ── Tests de decodificació de la papereta ─────────────────────────────────────


class TestDecodeBallotPreference:
    def test_basic(self):
        raw = struct.pack(">H", 3) + bytes([2, 0, 1])
        assert _decode_ballot_preference(raw) == [2, 0, 1]

    def test_empty(self):
        assert _decode_ballot_preference(struct.pack(">H", 0)) == []

    def test_too_short_returns_empty(self):
        assert _decode_ballot_preference(b"\x00") == []

    def test_two_options(self):
        raw = struct.pack(">H", 2) + bytes([1, 0])
        assert _decode_ballot_preference(raw) == [1, 0]


# ── Tests de construcció de claus de box ─────────────────────────────────────


class TestBoxKeys:
    def test_proposal_key_prefix(self):
        key = _proposal_box_key(42)
        assert key.startswith(BOX_PREFIX_PROPOSAL)
        assert len(key) == len(BOX_PREFIX_PROPOSAL) + 8

    def test_proposal_key_encodes_id(self):
        key = _proposal_box_key(1)
        pid = struct.unpack(">Q", key[len(BOX_PREFIX_PROPOSAL) :])[0]
        assert pid == 1

    def test_ballot_key_structure(self):
        voter = bytes(range(32))
        key = _ballot_box_key(proposal_id=5, voter_address_bytes=voter)
        assert key.startswith(BOX_PREFIX_BALLOT)
        assert key[3:35] == voter
        pid = struct.unpack(">Q", key[35:])[0]
        assert pid == 5


# ── Tests de AlgorandElectionReader (amb mocks) ────────────────────────────────


def _b64(data: bytes) -> str:
    return base64.b64encode(data).decode()


class TestAlgorandElectionReader:
    def _make_reader(self, boxes: dict[bytes, bytes], status_round: int = 99):
        """Retorna un reader amb algod mockejat."""
        algod = MagicMock()

        def box_by_name(app_id, name):
            if name in boxes:
                return {"value": _b64(boxes[name])}
            raise Exception("box not found")

        algod.application_box_by_name.side_effect = box_by_name
        algod.application_boxes.return_value = {
            "boxes": [{"name": _b64(k)} for k in boxes]
        }
        algod.status.return_value = {"last-round": status_round}
        return AlgorandElectionReader(algod, app_id=1)

    def test_returns_none_for_missing_proposal(self):
        reader = self._make_reader({})
        assert reader.read_election_state(proposal_id=99) is None

    def test_reads_proposal_with_no_ballots(self):
        prop_raw = build_proposal_raw("Rector 2026", "D", ["A", "B"])
        reader = self._make_reader({_proposal_box_key(1): prop_raw})
        state = reader.read_election_state(1)
        assert state is not None
        assert state.title == "Rector 2026"
        assert state.options == ["A", "B"]
        assert state.ballots == []

    def test_reads_one_ballot(self):
        voter_bytes = bytes(range(32))
        voter_addr = _bytes_to_algorand_address(voter_bytes)
        prop_raw = build_proposal_raw("T", "D", ["X", "Y", "Z"])
        ballot_raw = struct.pack(">H", 3) + bytes([2, 0, 1])

        boxes = {
            _proposal_box_key(1): prop_raw,
            _ballot_box_key(proposal_id=1, voter_address_bytes=voter_bytes): ballot_raw,
        }
        reader = self._make_reader(boxes)
        state = reader.read_election_state(1)

        assert len(state.ballots) == 1
        assert state.ballots[0].voter == voter_addr
        assert state.ballots[0].preference == [2, 0, 1]

    def test_ballots_sorted_by_voter(self):
        v1 = bytes([0] * 32)
        v2 = bytes([1] * 32)
        v3 = bytes([2] * 32)
        prop_raw = build_proposal_raw("T", "D", ["A", "B"])
        ballot_raw = struct.pack(">H", 2) + bytes([1, 0])

        boxes = {
            _proposal_box_key(1): prop_raw,
            _ballot_box_key(1, v3): ballot_raw,
            _ballot_box_key(1, v1): ballot_raw,
            _ballot_box_key(1, v2): ballot_raw,
        }
        reader = self._make_reader(boxes)
        state = reader.read_election_state(1)

        addrs = [b.voter for b in state.ballots]
        assert addrs == sorted(addrs)

    def test_ignores_ballots_for_other_proposals(self):
        voter_bytes = bytes(range(32))
        prop_raw = build_proposal_raw("T", "D", ["A", "B"])
        ballot_raw = struct.pack(">H", 2) + bytes([1, 0])

        boxes = {
            _proposal_box_key(1): prop_raw,
            _ballot_box_key(proposal_id=2, voter_address_bytes=voter_bytes): ballot_raw,
        }
        reader = self._make_reader(boxes)
        state = reader.read_election_state(1)
        assert state.ballots == []

    def test_block_round_from_status(self):
        prop_raw = build_proposal_raw("T", "D", ["A"])
        reader = self._make_reader({_proposal_box_key(1): prop_raw}, status_round=42)
        state = reader.read_election_state(1)
        assert state.block_round == 42
