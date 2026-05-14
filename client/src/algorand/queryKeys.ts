export const queryKeys = {
    organizations: {
        all: () => ['organizations'] as const,
        detail: (id: number) => ['organizations', id] as const
    },
    // Prefix keys for broad namespace invalidation in mutations
    censusPrefix: ['census'] as const,
}
