from algopy import ARC4Contract, Global, arc4, BoxMap, Txn, urange, op
from algopy.arc4 import abimethod

# Max addresses per batch call: 8 box slots − 1 reserved for `organizations`
MAX_CENSUS_BATCH = 7


class Organization(arc4.Struct):
    name: arc4.String
    description: arc4.String
    admin: arc4.Address


class Demochain(ARC4Contract):
    def __init__(self) -> None:
        self.org_id = arc4.UInt64(0)
        self.organizations = BoxMap(arc4.UInt64, Organization, key_prefix="org_")
        self.organization_names = BoxMap(arc4.String, arc4.Bool, key_prefix="on_")
        self.census = BoxMap(
            arc4.Tuple[arc4.UInt64, arc4.Address], arc4.Bool, key_prefix="cen_"
        )

    @abimethod()
    def create_org(self, name: arc4.String, description: arc4.String) -> arc4.UInt64:
        """Method for creating an organization"""
        assert not self._is_blank(name), "org.empty-name"
        assert not self._is_blank(description), "org.empty-description"
        assert name not in self.organization_names, "org.already-exists"

        self.org_id = arc4.UInt64(self.org_id.native + 1)

        self.organizations[self.org_id] = Organization(
            name,
            description,
            arc4.Address(Txn.sender),
        )
        self.organization_names[name] = arc4.Bool(True)
        self.census[arc4.Tuple((self.org_id, arc4.Address(Txn.sender)))] = arc4.Bool(
            True
        )

        return self.org_id

    @abimethod()
    def add_to_census(
        self, org_id: arc4.UInt64, addresses: arc4.DynamicArray[arc4.Address]
    ) -> arc4.Bool:
        assert addresses.length <= MAX_CENSUS_BATCH, "org.census.too-many-addresses"
        assert org_id in self.organizations, "org.not-found"
        assert Txn.sender == self.organizations[org_id].admin.native, (
            "org.census.unauthorized"
        )

        for i in urange(addresses.length):
            address = addresses[i].copy()
            assert address != arc4.Address(Global.zero_address), (
                "org.census.invalid-address"
            )
            key = arc4.Tuple((org_id, address))
            assert key not in self.census, "org.census.duplicated-address"
            self.census[key] = arc4.Bool(True)

        return arc4.Bool(True)

    @abimethod()
    def remove_from_census(
        self, org_id: arc4.UInt64, addresses: arc4.DynamicArray[arc4.Address]
    ) -> arc4.Bool:
        assert addresses.length <= MAX_CENSUS_BATCH, "org.census.too-many-addresses"
        assert org_id in self.organizations, "org.not-found"
        org = self.organizations[org_id].copy()
        assert Txn.sender == org.admin.native, "org.census.unauthorized"

        for i in urange(addresses.length):
            address = addresses[i].copy()
            assert address != org.admin, "org.census.cannot-be-empty"
            key = arc4.Tuple((org_id, address))
            assert key in self.census, "org.census.non-registered-address"
            del self.census[key]

        return arc4.Bool(True)

    @abimethod()
    def is_in_census(self, org_id: arc4.UInt64, address: arc4.Address) -> arc4.Bool:
        key = arc4.Tuple((org_id, address))
        return arc4.Bool(key in self.census)

    def _is_blank(self, s: arc4.String) -> bool:
        b = s.native.bytes
        if b.length == 0:
            return True
        for i in urange(b.length):
            if op.getbyte(b, i) != 32:
                return False
        return True
