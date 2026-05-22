from collections.abc import Iterator

import pytest
from algopy_testing import AlgopyTestContext, algopy_testing_context
from algopy import arc4

from smart_contracts.demochain.contract import (
    Demochain,
    MIN_START_ADVANCE,
    MIN_VOTING_WINDOW,
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
def proposal_setup(context: AlgopyTestContext, contract: Demochain):
    """Crea una org, afegeix un votant al cens i crea una proposta.
    Retorna (admin, voter, org_id, proposal_id)."""
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
            arc4.DynamicArray(arc4.String("Sí"), arc4.String("No")),
            arc4.UInt64(VALID_START),
            arc4.UInt64(VALID_END),
        )

    return admin, voter, org_id, proposal_id


# --- Tests dels criteris d'acceptació ---


def test_cast_approval_vote_in_favor_increments_votes_for_and_total(
    context: AlgopyTestContext, contract: Demochain, proposal_setup
) -> None:
    _, voter, _, proposal_id = proposal_setup
    with context.txn.create_group(active_txn_overrides={"sender": voter}):
        contract.cast_approval_vote(proposal_id, arc4.Bool(True))

    tally = contract.approval_tallies[proposal_id]
    assert tally.votes_for == arc4.UInt32(1)
    assert tally.total_votes == arc4.UInt32(1)


def test_cast_approval_vote_against_increments_only_total(
    context: AlgopyTestContext, contract: Demochain, proposal_setup
) -> None:
    _, voter, _, proposal_id = proposal_setup
    with context.txn.create_group(active_txn_overrides={"sender": voter}):
        contract.cast_approval_vote(proposal_id, arc4.Bool(False))

    tally = contract.approval_tallies[proposal_id]
    assert tally.votes_for == arc4.UInt32(0)
    assert tally.total_votes == arc4.UInt32(1)


def test_cast_approval_vote_double_vote_raises_error(
    context: AlgopyTestContext, contract: Demochain, proposal_setup
) -> None:
    _, voter, _, proposal_id = proposal_setup
    with context.txn.create_group(active_txn_overrides={"sender": voter}):
        contract.cast_approval_vote(proposal_id, arc4.Bool(True))
        with pytest.raises(AssertionError, match="proposal.already-voted"):
            contract.cast_approval_vote(proposal_id, arc4.Bool(True))


def test_cast_approval_vote_after_window_closed_raises_error(
    context: AlgopyTestContext, contract: Demochain, proposal_setup
) -> None:
    _, voter, _, proposal_id = proposal_setup
    context.ledger.patch_global_fields(latest_timestamp=VALID_START)
    with context.txn.create_group(active_txn_overrides={"sender": voter}):
        with pytest.raises(AssertionError, match="proposal.ended"):
            contract.cast_approval_vote(proposal_id, arc4.Bool(True))


def test_cast_approval_vote_nonexistent_proposal_raises_error(
    context: AlgopyTestContext, contract: Demochain, proposal_setup
) -> None:
    _, voter, _, _ = proposal_setup
    with context.txn.create_group(active_txn_overrides={"sender": voter}):
        with pytest.raises(AssertionError, match="proposal.not-found"):
            contract.cast_approval_vote(arc4.UInt64(99), arc4.Bool(True))


def test_is_proposal_approved_when_two_thirds_vote_in_favor(
    context: AlgopyTestContext, contract: Demochain, proposal_setup
) -> None:
    # 3 a favor, 1 en contra → 3/4 > 2/3 → aprovada
    admin, voter, org_id, proposal_id = proposal_setup
    voter2 = context.any.account()
    voter3 = context.any.account()

    with context.txn.create_group(active_txn_overrides={"sender": admin}):
        contract.add_to_census(
            org_id, arc4.DynamicArray(arc4.Address(voter2), arc4.Address(voter3))
        )

    with context.txn.create_group(active_txn_overrides={"sender": admin}):
        contract.cast_approval_vote(proposal_id, arc4.Bool(True))
    with context.txn.create_group(active_txn_overrides={"sender": voter}):
        contract.cast_approval_vote(proposal_id, arc4.Bool(True))
    with context.txn.create_group(active_txn_overrides={"sender": voter2}):
        contract.cast_approval_vote(proposal_id, arc4.Bool(True))
    with context.txn.create_group(active_txn_overrides={"sender": voter3}):
        contract.cast_approval_vote(proposal_id, arc4.Bool(False))

    context.ledger.patch_global_fields(latest_timestamp=VALID_START)
    assert contract._is_proposal_approved(proposal_id)


def test_is_proposal_not_approved_when_less_than_two_thirds_vote_in_favor(
    context: AlgopyTestContext, contract: Demochain, proposal_setup
) -> None:
    # 2 a favor, 2 en contra → 2/4 = 1/2 < 2/3 → no aprovada
    admin, voter, org_id, proposal_id = proposal_setup
    voter2 = context.any.account()
    voter3 = context.any.account()

    with context.txn.create_group(active_txn_overrides={"sender": admin}):
        contract.add_to_census(
            org_id, arc4.DynamicArray(arc4.Address(voter2), arc4.Address(voter3))
        )

    with context.txn.create_group(active_txn_overrides={"sender": admin}):
        contract.cast_approval_vote(proposal_id, arc4.Bool(True))
    with context.txn.create_group(active_txn_overrides={"sender": voter}):
        contract.cast_approval_vote(proposal_id, arc4.Bool(True))
    with context.txn.create_group(active_txn_overrides={"sender": voter2}):
        contract.cast_approval_vote(proposal_id, arc4.Bool(False))
    with context.txn.create_group(active_txn_overrides={"sender": voter3}):
        contract.cast_approval_vote(proposal_id, arc4.Bool(False))

    context.ledger.patch_global_fields(latest_timestamp=VALID_START)
    assert not contract._is_proposal_approved(proposal_id)


def test_is_proposal_approved_at_exact_two_thirds_quorum(
    context: AlgopyTestContext, contract: Demochain, proposal_setup
) -> None:
    # 2 a favor, 1 en contra → 2/3 exacte ≥ 2/3 → aprovada
    admin, voter, org_id, proposal_id = proposal_setup
    voter2 = context.any.account()

    with context.txn.create_group(active_txn_overrides={"sender": admin}):
        contract.add_to_census(org_id, arc4.DynamicArray(arc4.Address(voter2)))

    with context.txn.create_group(active_txn_overrides={"sender": admin}):
        contract.cast_approval_vote(proposal_id, arc4.Bool(True))
    with context.txn.create_group(active_txn_overrides={"sender": voter}):
        contract.cast_approval_vote(proposal_id, arc4.Bool(True))
    with context.txn.create_group(active_txn_overrides={"sender": voter2}):
        contract.cast_approval_vote(proposal_id, arc4.Bool(False))

    context.ledger.patch_global_fields(latest_timestamp=VALID_START)
    assert contract._is_proposal_approved(proposal_id)


def test_is_proposal_not_approved_before_starting_date(
    context: AlgopyTestContext, contract: Demochain, proposal_setup
) -> None:
    # Encara que hi hagi prou vots, no s'aprova fins que no ha passat la starting_date
    _, voter, _, proposal_id = proposal_setup

    with context.txn.create_group(active_txn_overrides={"sender": voter}):
        contract.cast_approval_vote(proposal_id, arc4.Bool(True))

    # El timestamp continua a NOW, molt abans de VALID_START
    assert not contract._is_proposal_approved(proposal_id)


def test_is_proposal_not_approved_with_no_votes(
    context: AlgopyTestContext, contract: Demochain, proposal_setup
) -> None:
    # Sense cap vot el quòrum no s'ha d'assolir, ni quan ha passat la starting_date
    _, _, _, proposal_id = proposal_setup
    context.ledger.patch_global_fields(latest_timestamp=VALID_START)
    assert not contract._is_proposal_approved(proposal_id)


def test_cast_approval_vote_unauthorized_voter_raises_error(
    context: AlgopyTestContext, contract: Demochain, proposal_setup
) -> None:
    outsider = context.any.account()
    _, _, _, proposal_id = proposal_setup
    with context.txn.create_group(active_txn_overrides={"sender": outsider}):
        with pytest.raises(AssertionError, match="org.census.unauthorized"):
            contract.cast_approval_vote(proposal_id, arc4.Bool(True))
