from collections.abc import Iterator

import pytest
from algopy import arc4
from algopy_testing import AlgopyTestContext, algopy_testing_context

from smart_contracts.demochain.contract import (
    MIN_START_ADVANCE,
    MIN_VOTING_WINDOW,
    BallotId,
    Demochain,
)

NOW = 1_000_000_000
VALID_START = NOW + MIN_START_ADVANCE + MIN_VOTING_WINDOW
VALID_END = VALID_START + MIN_VOTING_WINDOW


@pytest.fixture()
def context() -> Iterator[AlgopyTestContext]:
    with algopy_testing_context() as ctx:
        ctx.ledger.patch_global_fields(latest_timestamp=NOW)
        yield ctx


@pytest.fixture()
def contract(context: AlgopyTestContext) -> Demochain:
    return Demochain()


@pytest.fixture()
def approved_setup(context: AlgopyTestContext, contract: Demochain):
    """Crea org, cens, proposta i assoleix el quòrum. Timestamp = NOW (finestra no oberta)."""
    admin = context.any.account()
    voter = context.any.account()

    with context.txn.create_group(active_txn_overrides={"sender": admin}):
        org_id = contract.create_organization(arc4.String("Org"), arc4.String("Descripció"))

    with context.txn.create_group(active_txn_overrides={"sender": admin}):
        contract.add_to_census(org_id, arc4.DynamicArray(arc4.Address(voter)))

    with context.txn.create_group(active_txn_overrides={"sender": admin}):
        proposal_id = contract.create_proposal(
            org_id,
            arc4.String("Títol"),
            arc4.String("Descripció"),
            arc4.DynamicArray(arc4.String("A"), arc4.String("B"), arc4.String("C")),
            arc4.UInt64(VALID_START),
            arc4.UInt64(VALID_END),
        )

    # admin i voter voten a favor: 2/2 = 100% >= 2/3 → quòrum assolit
    with context.txn.create_group(active_txn_overrides={"sender": admin}):
        contract.cast_approval_vote(proposal_id, arc4.Bool(True))
    with context.txn.create_group(active_txn_overrides={"sender": voter}):
        contract.cast_approval_vote(proposal_id, arc4.Bool(True))

    return admin, voter, org_id, proposal_id


@pytest.fixture()
def election_setup(context: AlgopyTestContext, approved_setup):
    """Reutilitza approved_setup i avança el timestamp a dins de la finestra de votació."""
    admin, voter, org_id, proposal_id = approved_setup
    context.ledger.patch_global_fields(latest_timestamp=VALID_START + 1)
    return admin, voter, org_id, proposal_id


# --- Tests dels criteris d'acceptació ---


def test_cast_election_vote_saves_ballot(context: AlgopyTestContext, contract: Demochain, election_setup) -> None:
    _, voter, _, proposal_id = election_setup
    ballot = arc4.DynamicArray(arc4.UInt8(0), arc4.UInt8(1), arc4.UInt8(2))

    with context.txn.create_group(active_txn_overrides={"sender": voter}):
        contract.cast_election_vote(proposal_id, ballot)

    ballot_id = BallotId(arc4.Address(voter), proposal_id)
    stored = contract.election_ballots[ballot_id]
    assert stored[0] == arc4.UInt8(0)
    assert stored[1] == arc4.UInt8(1)
    assert stored[2] == arc4.UInt8(2)


def test_cast_election_vote_revote_raises_error(
    context: AlgopyTestContext, contract: Demochain, election_setup
) -> None:
    _, voter, _, proposal_id = election_setup
    first_ballot = arc4.DynamicArray(arc4.UInt8(2), arc4.UInt8(0), arc4.UInt8(1))
    second_ballot = arc4.DynamicArray(arc4.UInt8(1), arc4.UInt8(2), arc4.UInt8(0))

    with context.txn.create_group(active_txn_overrides={"sender": voter}):
        contract.cast_election_vote(proposal_id, first_ballot)
    with context.txn.create_group(active_txn_overrides={"sender": voter}):
        with pytest.raises(AssertionError, match=r"election.already-voted"):
            contract.cast_election_vote(proposal_id, second_ballot)


def test_cast_election_vote_nonexistent_proposal_raises_error(
    context: AlgopyTestContext, contract: Demochain, election_setup
) -> None:
    _, voter, _, _ = election_setup
    ballot = arc4.DynamicArray(arc4.UInt8(0), arc4.UInt8(1), arc4.UInt8(2))
    with context.txn.create_group(active_txn_overrides={"sender": voter}):
        with pytest.raises(AssertionError, match=r"proposal.not-found"):
            contract.cast_election_vote(arc4.UInt64(99), ballot)


def test_cast_election_vote_before_window_raises_error(
    context: AlgopyTestContext, contract: Demochain, approved_setup
) -> None:
    # Timestamp = NOW, molt abans de VALID_START → finestra no oberta
    _, voter, _, proposal_id = approved_setup
    ballot = arc4.DynamicArray(arc4.UInt8(0), arc4.UInt8(1), arc4.UInt8(2))
    with context.txn.create_group(active_txn_overrides={"sender": voter}):
        with pytest.raises(AssertionError, match=r"election.not-started"):
            contract.cast_election_vote(proposal_id, ballot)


def test_cast_election_vote_after_window_raises_error(
    context: AlgopyTestContext, contract: Demochain, approved_setup
) -> None:
    _, voter, _, proposal_id = approved_setup
    context.ledger.patch_global_fields(latest_timestamp=VALID_END + 1)
    ballot = arc4.DynamicArray(arc4.UInt8(0), arc4.UInt8(1), arc4.UInt8(2))
    with context.txn.create_group(active_txn_overrides={"sender": voter}):
        with pytest.raises(AssertionError, match=r"election.ended"):
            contract.cast_election_vote(proposal_id, ballot)


def test_cast_election_vote_proposal_not_approved_raises_error(context: AlgopyTestContext, contract: Demochain) -> None:
    # 1 a favor, 1 en contra → 50% < 75% → quòrum no assolit
    admin = context.any.account()
    voter1 = context.any.account()
    voter2 = context.any.account()

    with context.txn.create_group(active_txn_overrides={"sender": admin}):
        org_id = contract.create_organization(arc4.String("Org"), arc4.String("Desc"))
    with context.txn.create_group(active_txn_overrides={"sender": admin}):
        contract.add_to_census(org_id, arc4.DynamicArray(arc4.Address(voter1), arc4.Address(voter2)))
    with context.txn.create_group(active_txn_overrides={"sender": admin}):
        proposal_id = contract.create_proposal(
            org_id,
            arc4.String("Títol"),
            arc4.String("Desc"),
            arc4.DynamicArray(arc4.String("A"), arc4.String("B"), arc4.String("C")),
            arc4.UInt64(VALID_START),
            arc4.UInt64(VALID_END),
        )
    with context.txn.create_group(active_txn_overrides={"sender": voter1}):
        contract.cast_approval_vote(proposal_id, arc4.Bool(True))
    with context.txn.create_group(active_txn_overrides={"sender": voter2}):
        contract.cast_approval_vote(proposal_id, arc4.Bool(False))

    context.ledger.patch_global_fields(latest_timestamp=VALID_START + 1)
    ballot = arc4.DynamicArray(arc4.UInt8(0), arc4.UInt8(1), arc4.UInt8(2))
    with context.txn.create_group(active_txn_overrides={"sender": voter1}):
        with pytest.raises(AssertionError, match=r"proposal.not-accepted"):
            contract.cast_election_vote(proposal_id, ballot)


def test_cast_election_vote_unauthorized_voter_raises_error(
    context: AlgopyTestContext, contract: Demochain, election_setup
) -> None:
    outsider = context.any.account()
    _, _, _, proposal_id = election_setup
    ballot = arc4.DynamicArray(arc4.UInt8(0), arc4.UInt8(1), arc4.UInt8(2))
    with context.txn.create_group(active_txn_overrides={"sender": outsider}):
        with pytest.raises(AssertionError, match=r"org.census.unauthorized"):
            contract.cast_election_vote(proposal_id, ballot)


def test_cast_election_vote_wrong_number_of_options_raises_error(
    context: AlgopyTestContext, contract: Demochain, election_setup
) -> None:
    _, voter, _, proposal_id = election_setup
    short_ballot = arc4.DynamicArray(arc4.UInt8(0), arc4.UInt8(1))  # 2 opcions en comptes de 3
    with context.txn.create_group(active_txn_overrides={"sender": voter}):
        with pytest.raises(AssertionError, match=r"election.missing-options"):
            contract.cast_election_vote(proposal_id, short_ballot)


def test_cast_election_vote_duplicate_option_raises_error(
    context: AlgopyTestContext, contract: Demochain, election_setup
) -> None:
    _, voter, _, proposal_id = election_setup
    dup_ballot = arc4.DynamicArray(arc4.UInt8(0), arc4.UInt8(1), arc4.UInt8(1))  # índex 1 repetit
    with context.txn.create_group(active_txn_overrides={"sender": voter}):
        with pytest.raises(AssertionError, match=r"election.missing-options"):
            contract.cast_election_vote(proposal_id, dup_ballot)


def test_cast_election_vote_out_of_range_option_raises_error(
    context: AlgopyTestContext, contract: Demochain, election_setup
) -> None:
    _, voter, _, proposal_id = election_setup
    oob_ballot = arc4.DynamicArray(arc4.UInt8(0), arc4.UInt8(1), arc4.UInt8(3))  # índex 3 fora de rang (N=3)
    with context.txn.create_group(active_txn_overrides={"sender": voter}):
        with pytest.raises(AssertionError, match=r"election.missing-options"):
            contract.cast_election_vote(proposal_id, oob_ballot)
