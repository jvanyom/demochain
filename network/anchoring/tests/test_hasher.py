import pytest

from network.anchoring.hasher import compute_election_hash, compute_election_hash_hex
from network.anchoring.models import Ballot, ElectionState


def _state(**kwargs) -> ElectionState:
    defaults = dict(
        proposal_id=1,
        title="Rector 2026",
        options=["Alice", "Bob", "Carol"],
        ballots=[Ballot("ADDR_A", [2, 0, 1]), Ballot("ADDR_B", [0, 2, 1])],
    )
    defaults.update(kwargs)
    return ElectionState(**defaults)


class TestComputeElectionHash:
    def test_returns_32_bytes(self):
        h = compute_election_hash(_state())
        assert isinstance(h, bytes)
        assert len(h) == 32

    def test_deterministic_same_state(self):
        assert compute_election_hash(_state()) == compute_election_hash(_state())

    def test_ballot_order_independent(self):
        s1 = _state(ballots=[Ballot("ADDR_B", [0, 2, 1]), Ballot("ADDR_A", [2, 0, 1])])
        s2 = _state(ballots=[Ballot("ADDR_A", [2, 0, 1]), Ballot("ADDR_B", [0, 2, 1])])
        assert compute_election_hash(s1) == compute_election_hash(s2)

    def test_different_preference_produces_different_hash(self):
        s1 = _state(ballots=[Ballot("ADDR_A", [2, 0, 1])])
        s2 = _state(ballots=[Ballot("ADDR_A", [1, 0, 2])])
        assert compute_election_hash(s1) != compute_election_hash(s2)

    def test_different_voter_produces_different_hash(self):
        s1 = _state(ballots=[Ballot("ADDR_A", [2, 0, 1])])
        s2 = _state(ballots=[Ballot("ADDR_X", [2, 0, 1])])
        assert compute_election_hash(s1) != compute_election_hash(s2)

    def test_different_proposal_id_produces_different_hash(self):
        assert compute_election_hash(_state(proposal_id=1)) != compute_election_hash(
            _state(proposal_id=2)
        )

    def test_different_title_produces_different_hash(self):
        assert compute_election_hash(_state(title="A")) != compute_election_hash(
            _state(title="B")
        )

    def test_extra_ballot_produces_different_hash(self):
        s1 = _state(ballots=[Ballot("ADDR_A", [2, 0, 1])])
        s2 = _state(ballots=[Ballot("ADDR_A", [2, 0, 1]), Ballot("ADDR_B", [0, 1, 2])])
        assert compute_election_hash(s1) != compute_election_hash(s2)

    def test_empty_ballots_is_stable(self):
        s = _state(ballots=[])
        assert compute_election_hash(s) == compute_election_hash(s)


class TestComputeElectionHashHex:
    def test_format(self):
        h = compute_election_hash_hex(_state())
        assert h.startswith("0x")
        assert len(h) == 66

    def test_consistent_with_bytes(self):
        state = _state()
        h_bytes = compute_election_hash(state)
        h_hex = compute_election_hash_hex(state)
        assert h_hex == "0x" + h_bytes.hex()
