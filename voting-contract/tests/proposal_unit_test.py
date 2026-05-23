from collections.abc import Iterator

import pytest
from algopy import arc4
from algopy_testing import AlgopyTestContext, algopy_testing_context

from smart_contracts.demochain.contract import (
    MIN_START_ADVANCE,
    MIN_VOTING_WINDOW,
    Demochain,
)

NOW = 1_000_000_000

VALID_START = NOW + MIN_START_ADVANCE + MIN_VOTING_WINDOW  # 4 dies des d'ara
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
def org_setup(context: AlgopyTestContext, contract: Demochain):
    """Crea una org i retorna (sender, org_id). El sender queda al cens com a admin."""
    sender = context.any.account()
    with context.txn.create_group(active_txn_overrides={"sender": sender}):
        org_id = contract.create_organization(arc4.String("Org"), arc4.String("Descripció"))
    return sender, org_id


# --- Tests dels criteris d'acceptació ---


def test_create_proposal_with_valid_params_returns_id(
    context: AlgopyTestContext, contract: Demochain, org_setup
) -> None:
    sender, org_id = org_setup
    with context.txn.create_group(active_txn_overrides={"sender": sender}):
        proposal_id = contract.create_proposal(
            org_id,
            arc4.String("Títol"),
            arc4.String("Descripció"),
            arc4.DynamicArray(arc4.String("Opció A"), arc4.String("Opció B")),
            arc4.UInt64(VALID_START),
            arc4.UInt64(VALID_END),
        )
    assert proposal_id == arc4.UInt64(1)


def test_create_proposal_second_call_returns_incremental_id(
    context: AlgopyTestContext, contract: Demochain, org_setup
) -> None:
    sender, org_id = org_setup
    options = arc4.DynamicArray(arc4.String("Sí"), arc4.String("No"))
    with context.txn.create_group(active_txn_overrides={"sender": sender}):
        id1 = contract.create_proposal(
            org_id,
            arc4.String("Proposta 1"),
            arc4.String("Descripció 1"),
            options,
            arc4.UInt64(VALID_START),
            arc4.UInt64(VALID_END),
        )
        id2 = contract.create_proposal(
            org_id,
            arc4.String("Proposta 2"),
            arc4.String("Descripció 2"),
            options,
            arc4.UInt64(VALID_START),
            arc4.UInt64(VALID_END),
        )
    assert id1 == arc4.UInt64(1)
    assert id2 == arc4.UInt64(2)


def test_create_proposal_stores_proposal_on_chain(context: AlgopyTestContext, contract: Demochain, org_setup) -> None:
    sender, org_id = org_setup
    title = arc4.String("Títol")
    description = arc4.String("Descripció")

    with context.txn.create_group(active_txn_overrides={"sender": sender}):
        proposal_id = contract.create_proposal(
            org_id,
            title,
            description,
            arc4.DynamicArray(arc4.String("Sí"), arc4.String("No")),
            arc4.UInt64(VALID_START),
            arc4.UInt64(VALID_END),
        )
    proposal = contract.proposals[proposal_id]

    assert proposal.org_id == org_id
    assert proposal.title == title
    assert proposal.description == description
    assert proposal.starting_date == arc4.UInt64(VALID_START)
    assert proposal.ending_date == arc4.UInt64(VALID_END)


def test_create_proposal_org_not_found_raises_error(context: AlgopyTestContext, contract: Demochain, org_setup) -> None:
    sender, _ = org_setup
    with context.txn.create_group(active_txn_overrides={"sender": sender}):
        with pytest.raises(AssertionError, match=r"org.not-found"):
            contract.create_proposal(
                arc4.UInt64(99),
                arc4.String("Títol"),
                arc4.String("Descripció"),
                arc4.DynamicArray(arc4.String("Sí"), arc4.String("No")),
                arc4.UInt64(VALID_START),
                arc4.UInt64(VALID_END),
            )


def test_create_proposal_unauthorized_raises_error(context: AlgopyTestContext, contract: Demochain, org_setup) -> None:
    _, org_id = org_setup
    outsider = context.any.account()
    with context.txn.create_group(active_txn_overrides={"sender": outsider}):
        with pytest.raises(AssertionError, match=r"org.census.unauthorized"):
            contract.create_proposal(
                org_id,
                arc4.String("Títol"),
                arc4.String("Descripció"),
                arc4.DynamicArray(arc4.String("Sí"), arc4.String("No")),
                arc4.UInt64(VALID_START),
                arc4.UInt64(VALID_END),
            )


def test_create_proposal_too_few_options_raises_error(
    context: AlgopyTestContext, contract: Demochain, org_setup
) -> None:
    sender, org_id = org_setup
    with context.txn.create_group(active_txn_overrides={"sender": sender}):
        with pytest.raises(AssertionError, match=r"proposal.too-few-options"):
            contract.create_proposal(
                org_id,
                arc4.String("Títol"),
                arc4.String("Descripció"),
                arc4.DynamicArray(arc4.String("Única opció")),
                arc4.UInt64(VALID_START),
                arc4.UInt64(VALID_END),
            )


def test_create_proposal_empty_option_raises_error(context: AlgopyTestContext, contract: Demochain, org_setup) -> None:
    sender, org_id = org_setup
    with context.txn.create_group(active_txn_overrides={"sender": sender}):
        with pytest.raises(AssertionError, match=r"proposal.empty-options"):
            contract.create_proposal(
                org_id,
                arc4.String("Títol"),
                arc4.String("Descripció"),
                arc4.DynamicArray(arc4.String("Opció A"), arc4.String("")),
                arc4.UInt64(VALID_START),
                arc4.UInt64(VALID_END),
            )


def test_create_proposal_blank_option_raises_error(context: AlgopyTestContext, contract: Demochain, org_setup) -> None:
    sender, org_id = org_setup
    with context.txn.create_group(active_txn_overrides={"sender": sender}):
        with pytest.raises(AssertionError, match=r"proposal.empty-options"):
            contract.create_proposal(
                org_id,
                arc4.String("Títol"),
                arc4.String("Descripció"),
                arc4.DynamicArray(arc4.String("Opció A"), arc4.String("   ")),
                arc4.UInt64(VALID_START),
                arc4.UInt64(VALID_END),
            )


def test_create_proposal_duplicated_options_are_allowed(
    context: AlgopyTestContext, contract: Demochain, org_setup
) -> None:
    sender, org_id = org_setup
    with context.txn.create_group(active_txn_overrides={"sender": sender}):
        proposal_id = contract.create_proposal(
            org_id,
            arc4.String("Títol"),
            arc4.String("Descripció"),
            arc4.DynamicArray(arc4.String("Igual"), arc4.String("Igual")),
            arc4.UInt64(VALID_START),
            arc4.UInt64(VALID_END),
        )
    assert proposal_id.as_uint64() > 0


def test_create_proposal_empty_title_raises_error(context: AlgopyTestContext, contract: Demochain, org_setup) -> None:
    sender, org_id = org_setup
    with context.txn.create_group(active_txn_overrides={"sender": sender}):
        with pytest.raises(AssertionError, match=r"proposal.empty-title"):
            contract.create_proposal(
                org_id,
                arc4.String(""),
                arc4.String("Descripció"),
                arc4.DynamicArray(arc4.String("Sí"), arc4.String("No")),
                arc4.UInt64(VALID_START),
                arc4.UInt64(VALID_END),
            )


def test_create_proposal_blank_title_raises_error(context: AlgopyTestContext, contract: Demochain, org_setup) -> None:
    sender, org_id = org_setup
    with context.txn.create_group(active_txn_overrides={"sender": sender}):
        with pytest.raises(AssertionError, match=r"proposal.empty-title"):
            contract.create_proposal(
                org_id,
                arc4.String("   "),
                arc4.String("Descripció"),
                arc4.DynamicArray(arc4.String("Sí"), arc4.String("No")),
                arc4.UInt64(VALID_START),
                arc4.UInt64(VALID_END),
            )


def test_create_proposal_empty_description_raises_error(
    context: AlgopyTestContext, contract: Demochain, org_setup
) -> None:
    sender, org_id = org_setup
    with context.txn.create_group(active_txn_overrides={"sender": sender}):
        with pytest.raises(AssertionError, match=r"proposal.empty-description"):
            contract.create_proposal(
                org_id,
                arc4.String("Títol"),
                arc4.String(""),
                arc4.DynamicArray(arc4.String("Sí"), arc4.String("No")),
                arc4.UInt64(VALID_START),
                arc4.UInt64(VALID_END),
            )


def test_create_proposal_blank_description_raises_error(
    context: AlgopyTestContext, contract: Demochain, org_setup
) -> None:
    sender, org_id = org_setup
    with context.txn.create_group(active_txn_overrides={"sender": sender}):
        with pytest.raises(AssertionError, match=r"proposal.empty-description"):
            contract.create_proposal(
                org_id,
                arc4.String("Títol"),
                arc4.String("   "),
                arc4.DynamicArray(arc4.String("Sí"), arc4.String("No")),
                arc4.UInt64(VALID_START),
                arc4.UInt64(VALID_END),
            )
