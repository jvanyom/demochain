from collections.abc import Iterator

import pytest
from algopy_testing import AlgopyTestContext, algopy_testing_context
from algopy import arc4

from smart_contracts.demochain.contract import Demochain, MAX_CENSUS_BATCH


@pytest.fixture()
def context() -> Iterator[AlgopyTestContext]:
    with algopy_testing_context() as ctx:
        yield ctx


@pytest.fixture()
def contract(context: AlgopyTestContext) -> Demochain:
    return Demochain()


# --- Criteris d'acceptació ---


def test_add_to_census_stores_addresses_in_box(
    context: AlgopyTestContext, contract: Demochain
) -> None:
    admin = context.any.account()
    member = context.any.account()

    with context.txn.create_group(active_txn_overrides={"sender": admin}):
        org_id = contract.create_org(arc4.String("Org"), arc4.String("Description"))
        contract.add_to_census(org_id, arc4.DynamicArray(arc4.Address(member)))

    key = arc4.Tuple((org_id, arc4.Address(member)))
    assert key in contract.census


def test_add_to_census_non_admin_raises_unauthorized(
    context: AlgopyTestContext, contract: Demochain
) -> None:
    admin = context.any.account()
    intruder = context.any.account()
    member = context.any.account()

    with context.txn.create_group(active_txn_overrides={"sender": admin}):
        org_id = contract.create_org(arc4.String("Org"), arc4.String("Description"))

    with context.txn.create_group(active_txn_overrides={"sender": intruder}):
        with pytest.raises(AssertionError, match="org.census.unauthorized"):
            contract.add_to_census(org_id, arc4.DynamicArray(arc4.Address(member)))


def test_add_to_census_duplicate_address_raises_error(
    context: AlgopyTestContext, contract: Demochain
) -> None:
    admin = context.any.account()
    member = context.any.account()
    addresses = arc4.DynamicArray(arc4.Address(member))

    with context.txn.create_group(active_txn_overrides={"sender": admin}):
        org_id = contract.create_org(arc4.String("Org"), arc4.String("Description"))
        contract.add_to_census(org_id, addresses)

        with pytest.raises(AssertionError, match="org.census.duplicated-address"):
            contract.add_to_census(org_id, addresses)


def test_add_to_census_zero_address_raises_invalid(
    context: AlgopyTestContext, contract: Demochain
) -> None:
    admin = context.any.account()
    zero_address = arc4.Address(b"\x00" * 32)

    with context.txn.create_group(active_txn_overrides={"sender": admin}):
        org_id = contract.create_org(arc4.String("Org"), arc4.String("Description"))

        with pytest.raises(AssertionError, match="org.census.invalid-address"):
            contract.add_to_census(org_id, arc4.DynamicArray(zero_address))


def test_remove_from_census_removes_address_from_box(
    context: AlgopyTestContext, contract: Demochain
) -> None:
    admin = context.any.account()
    member = context.any.account()
    addresses = arc4.DynamicArray(arc4.Address(member))

    with context.txn.create_group(active_txn_overrides={"sender": admin}):
        org_id = contract.create_org(arc4.String("Org"), arc4.String("Description"))
        contract.add_to_census(org_id, addresses)
        contract.remove_from_census(org_id, addresses)

    key = arc4.Tuple((org_id, arc4.Address(member)))
    assert key not in contract.census


def test_remove_from_census_non_admin_raises_unauthorized(
    context: AlgopyTestContext, contract: Demochain
) -> None:
    admin = context.any.account()
    intruder = context.any.account()
    member = context.any.account()
    addresses = arc4.DynamicArray(arc4.Address(member))

    with context.txn.create_group(active_txn_overrides={"sender": admin}):
        org_id = contract.create_org(arc4.String("Org"), arc4.String("Description"))
        contract.add_to_census(org_id, addresses)

    with context.txn.create_group(active_txn_overrides={"sender": intruder}):
        with pytest.raises(AssertionError, match="org.census.unauthorized"):
            contract.remove_from_census(org_id, addresses)


def test_remove_from_census_non_registered_raises_error(
    context: AlgopyTestContext, contract: Demochain
) -> None:
    admin = context.any.account()
    non_member = context.any.account()

    with context.txn.create_group(active_txn_overrides={"sender": admin}):
        org_id = contract.create_org(arc4.String("Org"), arc4.String("Description"))

        with pytest.raises(AssertionError, match="org.census.non-registered-address"):
            contract.remove_from_census(
                org_id, arc4.DynamicArray(arc4.Address(non_member))
            )


def test_remove_from_census_admin_raises_cannot_be_empty(
    context: AlgopyTestContext, contract: Demochain
) -> None:
    admin = context.any.account()

    with context.txn.create_group(active_txn_overrides={"sender": admin}):
        org_id = contract.create_org(arc4.String("Org"), arc4.String("Description"))

        with pytest.raises(AssertionError, match="org.census.cannot-be-empty"):
            contract.remove_from_census(org_id, arc4.DynamicArray(arc4.Address(admin)))


def test_is_in_census_returns_true_for_member(
    context: AlgopyTestContext, contract: Demochain
) -> None:
    admin = context.any.account()
    member = context.any.account()

    with context.txn.create_group(active_txn_overrides={"sender": admin}):
        org_id = contract.create_org(arc4.String("Org"), arc4.String("Description"))
        contract.add_to_census(org_id, arc4.DynamicArray(arc4.Address(member)))

    assert contract.is_in_census(org_id, arc4.Address(member)) == arc4.Bool(True)


def test_is_in_census_returns_false_for_non_member(
    context: AlgopyTestContext, contract: Demochain
) -> None:
    admin = context.any.account()
    non_member = context.any.account()

    with context.txn.create_group(active_txn_overrides={"sender": admin}):
        org_id = contract.create_org(arc4.String("Org"), arc4.String("Description"))

    assert contract.is_in_census(org_id, arc4.Address(non_member)) == arc4.Bool(False)


def test_add_to_census_exceeding_batch_limit_raises_error(
    context: AlgopyTestContext, contract: Demochain
) -> None:
    admin = context.any.account()
    addresses = arc4.DynamicArray(
        *[arc4.Address(context.any.account()) for _ in range(MAX_CENSUS_BATCH + 1)]
    )

    with context.txn.create_group(active_txn_overrides={"sender": admin}):
        org_id = contract.create_org(arc4.String("Org"), arc4.String("Description"))

        with pytest.raises(AssertionError, match="org.census.too-many-addresses"):
            contract.add_to_census(org_id, addresses)


def test_remove_from_census_exceeding_batch_limit_raises_error(
    context: AlgopyTestContext, contract: Demochain
) -> None:
    admin = context.any.account()
    members = [context.any.account() for _ in range(MAX_CENSUS_BATCH)]
    addresses = arc4.DynamicArray(*[arc4.Address(m) for m in members])
    too_many = arc4.DynamicArray(
        *[arc4.Address(m) for m in members], arc4.Address(context.any.account())
    )

    with context.txn.create_group(active_txn_overrides={"sender": admin}):
        org_id = contract.create_org(arc4.String("Org"), arc4.String("Description"))
        contract.add_to_census(org_id, addresses)

        with pytest.raises(AssertionError, match="org.census.too-many-addresses"):
            contract.remove_from_census(org_id, too_many)
