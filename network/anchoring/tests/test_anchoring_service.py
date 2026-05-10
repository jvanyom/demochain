from unittest.mock import MagicMock, patch

import pytest

from network.anchoring.anchoring_service import AnchoringResult, AnchoringService
from network.anchoring.ethereum_submitter import SubmissionResult
from network.anchoring.models import Ballot, ElectionState


def _make_state(proposal_id: int = 1) -> ElectionState:
    return ElectionState(
        proposal_id=proposal_id,
        title="Rector 2026",
        options=["Alice", "Bob"],
        ballots=[Ballot("ADDR_A", [1, 0]), Ballot("ADDR_B", [0, 1])],
    )


class TestAnchoringServiceComputeHash:
    def test_returns_hash_when_proposal_exists(self):
        algod = MagicMock()
        service = AnchoringService("uib", algod, app_id=1)
        service.reader = MagicMock()
        service.reader.read_election_state.return_value = _make_state()

        h = service.compute_hash(1)
        assert h is not None
        assert h.startswith("0x") and len(h) == 66

    def test_returns_none_when_proposal_missing(self):
        algod = MagicMock()
        service = AnchoringService("uib", algod, app_id=1)
        service.reader = MagicMock()
        service.reader.read_election_state.return_value = None

        assert service.compute_hash(99) is None

    def test_same_state_produces_same_hash(self):
        algod = MagicMock()
        s1 = AnchoringService("uib", algod, app_id=1)
        s2 = AnchoringService("upc", algod, app_id=1)
        state = _make_state()
        s1.reader = MagicMock()
        s2.reader = MagicMock()
        s1.reader.read_election_state.return_value = state
        s2.reader.read_election_state.return_value = state

        assert s1.compute_hash(1) == s2.compute_hash(1)


class TestAnchoringServiceAnchor:
    def test_returns_empty_hash_when_proposal_missing(self):
        algod = MagicMock()
        service = AnchoringService("uib", algod, app_id=1)
        service.reader = MagicMock()
        service.reader.read_election_state.return_value = None

        result = service.anchor(99)
        assert result.hash_hex == ""
        assert result.submission is None

    def test_anchor_without_submitter_computes_hash_only(self):
        algod = MagicMock()
        service = AnchoringService("uib", algod, app_id=1)
        service.reader = MagicMock()
        service.reader.read_election_state.return_value = _make_state()

        result = service.anchor(1)
        assert result.hash_hex.startswith("0x")
        assert result.submission is None

    def test_anchor_with_submitter_calls_submit(self):
        algod = MagicMock()
        submitter = MagicMock()
        submitter.submit_hash.return_value = SubmissionResult(
            success=True, tx_hash="0xdeadbeef", anchored=False
        )
        service = AnchoringService("uib", algod, app_id=1, eth_submitter=submitter)
        service.reader = MagicMock()
        service.reader.read_election_state.return_value = _make_state()

        result = service.anchor(1)
        assert result.submission is not None
        assert result.submission.success
        submitter.submit_hash.assert_called_once()

    def test_anchor_reflects_anchored_event(self):
        algod = MagicMock()
        submitter = MagicMock()
        submitter.submit_hash.return_value = SubmissionResult(
            success=True, tx_hash="0xbeef", anchored=True
        )
        service = AnchoringService("uib", algod, app_id=1, eth_submitter=submitter)
        service.reader = MagicMock()
        service.reader.read_election_state.return_value = _make_state()

        result = service.anchor(1)
        assert result.submission.anchored

    def test_anchor_election_id_uses_proposal_id(self):
        algod = MagicMock()
        service = AnchoringService("uib", algod, app_id=1)
        service.reader = MagicMock()
        service.reader.read_election_state.return_value = _make_state(proposal_id=7)

        result = service.anchor(7)
        assert result.election_id == "proposta-7"

    def test_submit_hash_receives_correct_bytes(self):
        from network.anchoring.hasher import compute_election_hash

        algod    = MagicMock()
        submitter = MagicMock()
        submitter.submit_hash.return_value = SubmissionResult(success=True, tx_hash="0x0")
        state    = _make_state()
        service  = AnchoringService("uib", algod, app_id=1, eth_submitter=submitter)
        service.reader = MagicMock()
        service.reader.read_election_state.return_value = state

        service.anchor(1)
        expected_bytes = compute_election_hash(state)
        _, call_kwargs = submitter.submit_hash.call_args
        actual_hash   = submitter.submit_hash.call_args[0][1]
        assert actual_hash == expected_bytes
