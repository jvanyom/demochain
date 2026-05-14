export const queryKeys = {
    organizations: {
        all: () => ['organizations'] as const,
        detail: (id: number) => ['organizations', id] as const,
        census: (id: number) => ['organizations', id, 'census'] as const,
        forUser: (address: string) => ['organizations', 'user', address] as const,
    },
    // Prefix keys for broad namespace invalidation in mutations
    censusPrefix: ['census'] as const,
    proposals: {
        all: () => ['proposals'] as const
    },
}
