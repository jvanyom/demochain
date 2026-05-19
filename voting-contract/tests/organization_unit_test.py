from collections.abc import Iterator

import pytest
from algopy_testing import AlgopyTestContext, algopy_testing_context
from algopy import arc4

from smart_contracts.demochain.contract import Demochain


@pytest.fixture()
def context() -> Iterator[AlgopyTestContext]:
    with algopy_testing_context() as ctx:
        yield ctx


@pytest.fixture()
def contract(context: AlgopyTestContext) -> Demochain:
    return Demochain()


# --- Tests dels criteris d'acceptació ---


def test_create_org_with_valid_params_returns_id(
    context: AlgopyTestContext, contract: Demochain
) -> None:
    org_id = contract.create_organization(
        arc4.String("Demochain"), arc4.String("Sistema de votació")
    )
    assert org_id == arc4.UInt64(1)


def test_create_org_second_call_returns_incremental_id(
    context: AlgopyTestContext, contract: Demochain
) -> None:
    id1 = contract.create_organization(arc4.String("Org 1"), context.any.arc4.string(n=256))
    id2 = contract.create_organization(arc4.String("Org 2"), context.any.arc4.string(n=128))

    assert id1 == arc4.UInt64(1)
    assert id2 == arc4.UInt64(2)


def test_create_org_stores_org_on_chain(
    context: AlgopyTestContext, contract: Demochain
) -> None:
    name = arc4.String("Demochain")
    description = arc4.String("Voting system")
    org_id = contract.create_organization(name, description)
    org = contract.organizations[org_id]

    assert org.name == name
    assert org.description == description


def test_create_org_stores_caller_as_admin(
    context: AlgopyTestContext, contract: Demochain
) -> None:
    sender = context.any.account()

    with context.txn.create_group(active_txn_overrides={"sender": sender}):
        org_id = contract.create_organization(
            arc4.String("Invented organization"), arc4.String("Description")
        )

    assert contract.organizations[org_id].organizer == arc4.Address(sender)


def test_create_org_registers_name_in_names_map(contract: Demochain) -> None:
    name = arc4.String("Demochain")
    contract.create_organization(name, arc4.String("Voting system"))

    assert name in contract.organization_names
    assert contract.organization_names[name] == arc4.Bool(True)


def test_create_org_adds_creator_to_census(
    context: AlgopyTestContext, contract: Demochain
) -> None:
    sender = context.any.account()

    with context.txn.create_group(active_txn_overrides={"sender": sender}):
        org_id = contract.create_organization(
            arc4.String("Org census"), arc4.String("Description")
        )

    census_key = arc4.Tuple((org_id, arc4.Address(sender)))
    assert census_key in contract.census


def test_create_org_sets_initial_member_count_to_one(
    context: AlgopyTestContext, contract: Demochain
) -> None:
    org_id = contract.create_organization(arc4.String("Org"), arc4.String("Descripció"))
    assert contract.organizations[org_id].member_count == arc4.UInt32(1)


def test_create_org_empty_name_raises_error(
    context: AlgopyTestContext, contract: Demochain
) -> None:
    with pytest.raises(AssertionError, match="org.empty-name"):
        contract.create_organization(arc4.String(""), arc4.String("Valid description"))


def test_create_org_blank_name_raises_error(
    context: AlgopyTestContext, contract: Demochain
) -> None:
    with pytest.raises(AssertionError, match="org.empty-name"):
        contract.create_organization(arc4.String("   "), arc4.String("Valid description"))


def test_create_org_empty_description_raises_error(
    context: AlgopyTestContext, contract: Demochain
) -> None:
    with pytest.raises(AssertionError, match="org.empty-description"):
        contract.create_organization(arc4.String("Nom vàlid"), arc4.String(""))


def test_create_org_blank_description_raises_error(
    context: AlgopyTestContext, contract: Demochain
) -> None:
    with pytest.raises(AssertionError, match="org.empty-description"):
        contract.create_organization(arc4.String("Nom vàlid"), arc4.String("   "))


def test_create_org_duplicate_name_raises_error(
    context: AlgopyTestContext, contract: Demochain
) -> None:
    contract.create_organization(arc4.String("Demochain"), arc4.String("Primera"))

    with pytest.raises(AssertionError, match="org.already-exists"):
        contract.create_organization(arc4.String("Demochain"), arc4.String("Duplicada"))
