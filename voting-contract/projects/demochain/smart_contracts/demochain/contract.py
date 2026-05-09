from algopy import ARC4Contract, Global, arc4, BoxMap, Txn, urange, op
from algopy.arc4 import abimethod

# Max addresses per batch call: 8 box slots − 1 reserved for `organizations`
MAX_CENSUS_BATCH = 7

MIN_START_ADVANCE = 3 * 24 * 60 * 60  # 3 dies en segons
MIN_VOTING_WINDOW = 24 * 60 * 60  # 1 dia en segons

APPROVAL_QUORUM_NUM = 3  # numerador del quòrum d'aprovació (3/4)
APPROVAL_QUORUM_DEN = 4  # denominador del quòrum d'aprovació (3/4)


class Organization(arc4.Struct):
    name: arc4.String
    description: arc4.String
    admin: arc4.Address


class Proposal(arc4.Struct):
    title: arc4.String
    description: arc4.String
    options: arc4.DynamicArray[arc4.String]
    org_id: arc4.UInt64
    creator: arc4.Address
    starting_date: arc4.UInt64
    ending_date: arc4.UInt64


class ApprovalTally(arc4.Struct):
    votes_for: arc4.UInt32
    total_votes: arc4.UInt32


# ballot = papereta
class BallotId(arc4.Struct):
    sender: arc4.Address
    proposal_id: arc4.UInt64


class Demochain(ARC4Contract):
    def __init__(self) -> None:
        self.org_id = arc4.UInt64(0)
        self.organizations = BoxMap(arc4.UInt64, Organization, key_prefix="org_")
        self.organization_names = BoxMap(arc4.String, arc4.Bool, key_prefix="on_")
        self.census = BoxMap(
            arc4.Tuple[arc4.UInt64, arc4.Address], arc4.Bool, key_prefix="cen_"
        )

        self.proposal_id = arc4.UInt64(0)
        self.proposals = BoxMap(arc4.UInt64, Proposal, key_prefix="pr_")

        self.approval_tallies = BoxMap(arc4.UInt64, ApprovalTally, key_prefix="at_")
        self.approval_ballots = BoxMap(BallotId, arc4.Bool, key_prefix="ab_")

    @abimethod()
    def create_org(self, name: arc4.String, description: arc4.String) -> arc4.UInt64:
        """Method for creating an organization"""
        assert not self._is_blank(name), "org.empty-name"
        assert not self._is_blank(description), "org.empty-description"
        assert name not in self.organization_names, "org.already-exists"

        self.org_id = arc4.UInt64(self.org_id.as_uint64() + 1)

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

    @abimethod()
    def create_proposal(
        self,
        org_id: arc4.UInt64,
        title: arc4.String,
        description: arc4.String,
        options: arc4.DynamicArray[arc4.String],
        start_date: arc4.UInt64,
        ending_date: arc4.UInt64,
    ) -> arc4.UInt64:
        assert org_id in self.organizations, "org.not-found"
        assert arc4.Tuple((org_id, arc4.Address(Txn.sender))) in self.census, (
            "proposal.unauthorized"
        )
        assert not self._is_blank(title), "proposal.empty-title"
        assert not self._is_blank(description), "proposal.empty-description"
        assert start_date.as_uint64() >= Global.latest_timestamp + MIN_START_ADVANCE, (
            "proposal.starting-too-soon"
        )
        assert ending_date.as_uint64() >= start_date.as_uint64() + MIN_VOTING_WINDOW, (
            "proposal.small-voting-window"
        )
        assert options.length >= 2, "proposal.too-few-options"

        for i in urange(options.length):
            opt_i = options[i]
            assert not self._is_blank(opt_i), "proposal.empty-options"
            for j in urange(i + 1, options.length):
                assert opt_i.bytes != options[j].bytes, "proposal.duplicated-options"

        self.proposal_id = arc4.UInt64(self.proposal_id.as_uint64() + 1)
        self.proposals[self.proposal_id] = Proposal(
            title,
            description,
            options.copy(),
            org_id,
            arc4.Address(Txn.sender),
            start_date,
            ending_date,
        )
        self.approval_tallies[self.proposal_id] = ApprovalTally(
            arc4.UInt32(0), arc4.UInt32(0)
        )

        return self.proposal_id

    @abimethod()
    def cast_approval_vote(self, proposal_id: arc4.UInt64, approve: arc4.Bool) -> None:
        assert proposal_id in self.proposals, "proposal.not-found"

        proposal = self.proposals[proposal_id].copy()
        assert (
            Global.latest_timestamp + MIN_START_ADVANCE
            < proposal.starting_date.as_uint64()
        ), "proposal.ended"

        assert arc4.Tuple((proposal.org_id, arc4.Address(Txn.sender))) in self.census, (
            "proposal.unauthorized"
        )

        ballot_id = BallotId(arc4.Address(Txn.sender), proposal_id)
        assert ballot_id not in self.approval_ballots, "proposal.already-voted"

        self.approval_ballots[ballot_id] = approve

        tally = self.approval_tallies[proposal_id].copy()
        if approve:
            self.approval_tallies[proposal_id] = ApprovalTally(
                arc4.UInt32(tally.votes_for.as_uint64() + 1),
                arc4.UInt32(tally.total_votes.as_uint64() + 1),
            )
        else:
            self.approval_tallies[proposal_id] = ApprovalTally(
                arc4.UInt32(tally.votes_for.as_uint64()),
                arc4.UInt32(tally.total_votes.as_uint64() + 1),
            )

    def _is_proposal_approved(self, proposal_id: arc4.UInt64) -> bool:
        proposal = self.proposals[proposal_id].copy()
        tally = self.approval_tallies[proposal_id].copy()
        return (
            Global.latest_timestamp >= proposal.starting_date.as_uint64()
            and APPROVAL_QUORUM_DEN * tally.votes_for.as_uint64()
            >= APPROVAL_QUORUM_NUM
            * tally.total_votes.as_uint64()  # votes_for / total_votes >= APPROVAL_QUORUM_NUM / APPROVAL_QUORUM_DEN
        )

    def _is_blank(self, s: arc4.String) -> bool:
        b = s.native.bytes
        if b.length == 0:
            return True
        for i in urange(b.length):
            if op.getbyte(b, i) != 32:
                return False
        return True
