from algopy import ARC4Contract, Global, arc4, BoxMap, Txn, urange, op, UInt64
from algopy.arc4 import abimethod

# Max addresses per batch call: 8 box slots − 1 reserved for `organizations`
MAX_CENSUS_BATCH = 7

MIN_START_ADVANCE = 3 * 24 * 60 * 60  # 3 dies en segons
MIN_VOTING_WINDOW = 24 * 60 * 60  # 1 dia en segons

APPROVAL_QUORUM_NUM = 2  # numerador del quòrum d'aprovació (2/3)
APPROVAL_QUORUM_DEN = 3  # denominador del quòrum d'aprovació (2/3)


class Organization(arc4.Struct):
    org_id: arc4.UInt64
    name: arc4.String
    description: arc4.String
    organizer: arc4.Address
    member_count: arc4.UInt32


class Proposal(arc4.Struct):
    org_id: arc4.UInt64
    title: arc4.String
    description: arc4.String
    options: arc4.DynamicArray[arc4.String]
    starting_date: arc4.UInt64
    ending_date: arc4.UInt64


class ApprovalTally(arc4.Struct):
    votes_for: arc4.UInt32
    total_votes: arc4.UInt32


# ballot = papereta
class BallotId(arc4.Struct):
    sender: arc4.Address
    proposal_id: arc4.UInt64


class CensusId(arc4.Struct):
    org_id: arc4.UInt64
    member: arc4.Address


class Demochain(ARC4Contract):
    def __init__(self) -> None:
        super().__init__()

        self.proposal_id = UInt64(0)
        self.org_id = UInt64(0)

        self.organizations = BoxMap(UInt64, Organization, key_prefix="org_")
        self.organization_names = BoxMap(arc4.String, arc4.Bool, key_prefix="on_")
        self.census = BoxMap(CensusId, arc4.Bool, key_prefix="cs_")

        self.proposals = BoxMap(UInt64, Proposal, key_prefix="pr_")

        self.approval_tallies = BoxMap(UInt64, ApprovalTally, key_prefix="at_")
        self.approval_ballots = BoxMap(BallotId, arc4.Bool, key_prefix="ab_")

        self.election_ballots = BoxMap(BallotId, arc4.DynamicArray[arc4.UInt8], key_prefix="eb_")

    @abimethod()
    def create_organization(self, name: arc4.String, description: arc4.String) -> arc4.UInt64:
        """Method for creating an organization"""
        assert not self._is_blank(name), "org.empty-name"
        assert not self._is_blank(description), "org.empty-description"
        assert name not in self.organization_names, "org.already-exists"

        self.org_id += 1

        self.organizations[self.org_id] = Organization(
            arc4.UInt64(self.org_id),
            name,
            description,
            arc4.Address(Txn.sender),
            arc4.UInt32(1)
        )

        self.organization_names[name] = arc4.Bool(True)
        self.census[CensusId(arc4.UInt64(self.org_id), arc4.Address(Txn.sender))] = arc4.Bool(True)

        return arc4.UInt64(self.org_id)

    @abimethod()
    def add_to_census(self, org_id: arc4.UInt64, addresses: arc4.DynamicArray[arc4.Address]) -> None:
        assert addresses.length <= MAX_CENSUS_BATCH, "org.census.too-many-addresses"
        self._assert_is_organizer(org_id)

        for i in urange(addresses.length):
            address = addresses[i].copy()
            assert address != arc4.Address(Global.zero_address), "org.census.invalid-address"

            key = CensusId(org_id, address)
            assert key not in self.census, "org.census.duplicated-address"
            self.census[key] = arc4.Bool(True)

            self.organizations[org_id.as_uint64()].member_count = arc4.UInt32(
                self.organizations[org_id.as_uint64()].member_count.as_uint64() + 1
            )

    @abimethod()
    def remove_from_census(self, org_id: arc4.UInt64, addresses: arc4.DynamicArray[arc4.Address]) -> None:
        assert addresses.length <= MAX_CENSUS_BATCH, "org.census.too-many-addresses"
        self._assert_is_organizer(org_id)

        org = self.organizations[org_id.as_uint64()].copy()

        for i in urange(addresses.length):
            address = addresses[i].copy()
            key = CensusId(org_id, address)

            assert address != org.organizer, "org.census.cannot-remove-organizer"
            assert key in self.census, "org.census.non-registered-address"

            del self.census[key]

            self.organizations[org_id.as_uint64()].member_count = arc4.UInt32(
                self.organizations[org_id.as_uint64()].member_count.as_uint64() - 1
            )

    @abimethod()
    def is_in_census(self, org_id: arc4.UInt64, address: arc4.Address) -> arc4.Bool:
        return arc4.Bool(CensusId(org_id, address) in self.census)

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
        self._assert_in_census(org_id)

        assert not self._is_blank(title), "proposal.empty-title"
        assert not self._is_blank(description), "proposal.empty-description"
        assert options.length >= 2, "proposal.too-few-options"

        # assert start_date.as_uint64() >= Global.latest_timestamp + MIN_START_ADVANCE, "proposal.starting-too-soon"
        # assert ending_date.as_uint64() >= start_date.as_uint64() + MIN_VOTING_WINDOW, "proposal.small-voting-window"

        for i in urange(options.length):
            assert not self._is_blank(options[i]), "proposal.empty-options"

        self.proposal_id += 1

        self.proposals[self.proposal_id] = Proposal(
            org_id,
            title,
            description,
            options.copy(),
            start_date,
            ending_date,
        )

        self.approval_tallies[self.proposal_id] = ApprovalTally(arc4.UInt32(0), arc4.UInt32(0))

        return arc4.UInt64(self.proposal_id)

    @abimethod()
    def cast_approval_vote(self, proposal_id: arc4.UInt64, approve: arc4.Bool) -> None:
        self._assert_proposal_exists(proposal_id)

        proposal = self.proposals[proposal_id.as_uint64()].copy()
        self._assert_in_census(proposal.org_id)

        start_date = proposal.starting_date.as_uint64()
        # assert Global.latest_timestamp + MIN_START_ADVANCE < start_date, "proposal.ended"

        ballot_id = BallotId(arc4.Address(Txn.sender), proposal_id)
        assert ballot_id not in self.approval_ballots, "proposal.already-voted"

        self.approval_ballots[ballot_id] = approve

        tally = self.approval_tallies[proposal_id.as_uint64()].copy()

        if approve.native:
            self.approval_tallies[proposal_id.as_uint64()].votes_for = arc4.UInt32(tally.votes_for.as_uint64() + 1)

        self.approval_tallies[proposal_id.as_uint64()].total_votes = arc4.UInt32(tally.total_votes.as_uint64() + 1)

    @abimethod()
    def cast_election_vote(
        self,
        proposal_id: arc4.UInt64,
        preference_order: arc4.DynamicArray[arc4.UInt8],
    ) -> None:
        self._assert_proposal_exists(proposal_id)

        proposal = self.proposals[proposal_id.as_uint64()].copy()
        self._assert_in_census(proposal.org_id)

        assert Global.latest_timestamp >= proposal.starting_date.as_uint64(), "election.not-started"
        assert Global.latest_timestamp < proposal.ending_date.as_uint64(), "election.ended"

        self._assert_is_proposal_approved(proposal_id, proposal.org_id)

        proposal_vote = BallotId(arc4.Address(Txn.sender), proposal_id)
        assert proposal_vote not in self.election_ballots, "election.already-voted"

        n = proposal.options.length
        assert preference_order.length == n, "election.missing-options"

        for i in urange(n):
            assert preference_order[i].as_uint64() < n, "election.missing-options"

            for j in urange(i + 1, n):
                assert preference_order[i] != preference_order[j], "election.missing-options"

        self.election_ballots[proposal_vote] = preference_order.copy()

    def _assert_is_proposal_approved(self, proposal_id: arc4.UInt64, org_id: arc4.UInt64) -> None:
        tally = self.approval_tallies[proposal_id.as_uint64()].copy()
        org = self.organizations[org_id.as_uint64()].copy()

        total_votes = tally.total_votes.as_uint64()
        member_count = org.member_count.as_uint64()

        total = total_votes if total_votes > member_count else member_count

        approval_votes = tally.votes_for.as_uint64()

        reached_quorum = total > 0 and APPROVAL_QUORUM_DEN * approval_votes >= APPROVAL_QUORUM_NUM * total

        assert reached_quorum, "proposal.not-accepted"

    def _assert_proposal_exists(self, proposal_id: arc4.UInt64) -> None:
        assert proposal_id.as_uint64() in self.proposals, "proposal.not-found"

    def _assert_org_exists(self, org_id: arc4.UInt64) -> None:
        assert org_id.as_uint64() in self.organizations, "org.not-found"

    def _assert_is_organizer(self, org_id: arc4.UInt64) -> None:
        self._assert_org_exists(org_id)

        assert arc4.Address(Txn.sender) == self.organizations[org_id.as_uint64()].organizer, "org.unauthorized"

    def _assert_in_census(self, org_id: arc4.UInt64) -> None:
        self._assert_org_exists(org_id)

        assert CensusId(org_id, arc4.Address(Txn.sender)) in self.census, "org.census.unauthorized"

    def _is_blank(self, s: arc4.String) -> bool:
      b = s.native.bytes

      if b.length == 0:
        return True

      for i in urange(b.length):
        if op.getbyte(b, i) != 32:
          return False

      return True
