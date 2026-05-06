from algopy import ARC4Contract, arc4, BoxMap, Txn, urange, op
from algopy.arc4 import abimethod


class Organization(arc4.Struct):
    name: arc4.String
    description: arc4.String
    admin: arc4.Address

class Demochain(ARC4Contract):

    def __init__(self) -> None:
        self.org_id = arc4.UInt64(0)
        self.organizations = BoxMap(arc4.UInt64, Organization, key_prefix="org_")
        self.organization_names = BoxMap(arc4.String, arc4.Bool, key_prefix="on_")
        self.census = BoxMap(arc4.Tuple[arc4.UInt64, arc4.Address], arc4.Bool, key_prefix="cen_")

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
        self.census[arc4.Tuple((self.org_id, arc4.Address(Txn.sender)))] = arc4.Bool(True)

        return self.org_id

    def _is_blank(self, s: arc4.String) -> bool:
        b = s.native.bytes
        if b.length == 0:
            return True
        for i in urange(b.length):
            if op.getbyte(b, i) != 32:
                return False
        return True
