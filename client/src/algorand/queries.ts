import {queryOptions} from '@tanstack/react-query';
import {
    getOrganization,
    getAllOrganizationIds,
    getCensusMembers,
    getCensusMemberCount,
    isInCensusChain
} from './organizations';

import type {Organization} from '@/domain';

import {mapToOrganization} from './mappers';
import {queryKeys} from './queryKeys';

// ── Fetchers asíncrons ────────────────────────────────────────────────────

async function fetchOrganization(id: number): Promise<Organization | null> {
    const onChain = await getOrganization(id);
    if (!onChain) return null;
    const memberCount = await getCensusMemberCount(id);
    return mapToOrganization(id, onChain, memberCount);
}

async function fetchOrganizations(): Promise<Organization[]> {
    const ids = await getAllOrganizationIds();
    const results = await Promise.all(ids.map(fetchOrganization));
    return results.filter((o): o is Organization => o !== null);
}

async function fetchCensusMembers(orgId: number): Promise<string[]> {
    return getCensusMembers(orgId);
}

async function fetchUserOrganizations(address: string): Promise<Organization[]> {
    const ids = await getAllOrganizationIds();

    const results = await Promise.all(
        ids.map(async (id) => {
            const isMember = await isInCensusChain(address, id);
            if (!isMember) return null;
            return fetchOrganization(id);
        }),
    );

    return results.filter((o): o is Organization => o !== null);
}

// ── Query options (co-locate key + fn for use in useQuery / prefetch) ─

export const organizationQueries = {
    all: () => queryOptions({
        queryKey: queryKeys.organizations.all(),
        queryFn: fetchOrganizations,
    }),
    detail: (id: number) => queryOptions({
        queryKey: queryKeys.organizations.detail(id),
        queryFn: () => fetchOrganization(id),
    }),
    census: (id: number) => queryOptions({
        queryKey: queryKeys.organizations.census(id),
        queryFn: () => fetchCensusMembers(id),
    }),
    forUser: (address: string) => queryOptions({
        queryKey: queryKeys.organizations.forUser(address),
        queryFn: () => fetchUserOrganizations(address),
    }),
};
