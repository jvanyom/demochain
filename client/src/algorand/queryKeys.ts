import type {Address, OrganizationId, ProposalId} from "@/domain";

export const queryKeys = {
    organizations: {
        all: () => ['organizations'] as const,
        detail: (id: OrganizationId) => ['organizations', id] as const,
        census: (id: OrganizationId) => ['organizations', id, 'census'] as const,
        forUser: (address: Address) => ['organizations', 'user', address] as const,
    },
    // Prefix keys for broad namespace invalidation in mutations
    censusPrefix: ['census'] as const,
    proposals: {
        all: () => ['proposals'] as const,
        detail: (id: ProposalId) => ['proposals', id] as const
    },
}
