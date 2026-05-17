import type {Address, OrganizationId, ProposalId} from "@/domain";

export const queryKeys = {
    organizations: {
        all: () => ['organizations'] as const,
        detail: (id: OrganizationId) => ['organizations', id] as const,
        census: (id: OrganizationId) => ['organizations', id, 'census'] as const,
        isMember: (address: Address, orgId: OrganizationId) => ['census', 'membership', orgId, address] as const,
        forUser: (address: Address) => ['organizations', 'user', address] as const,
    },
    // Prefix keys for broad namespace invalidation in mutations
    censusPrefix: ['census'] as const,
    proposals: {
        all: () => ['proposals'] as const,
        detail: (id: ProposalId) => ['proposals', id] as const
    },
    voting: {
        approvalVoted: (address: Address, proposalId: ProposalId) => ['voting', 'approval', address, proposalId] as const,
        electionVoted: (address: Address, proposalId: ProposalId) => ['voting', 'election', address, proposalId] as const,
        electionVoterCount: (proposalId: ProposalId) => ['election', 'voterCount', proposalId] as const,
        electionResults: (proposalId: ProposalId) => ['election', 'results', proposalId] as const,
        electionBallotForVoter: (address: Address, proposalId: ProposalId) => ['voting', 'ballot', address, proposalId] as const
    },
    electionPrefix: ['election'] as const
}
