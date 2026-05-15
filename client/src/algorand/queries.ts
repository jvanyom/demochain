import {queryOptions} from '@tanstack/react-query';

import type {Address, Organization, OrganizationId, Proposal, ProposalId} from '@/domain';

import {
    getOrganization,
    getAllOrganizationIds,
    getCensusMembers,
    getCensusMemberCount,
    isInCensusChain
} from './organizations';

import {
    getApprovalTally,
    getProposal
} from "./proposals";

import {mapToOrganization, mapToProposal} from './mappers';
import type {OnChainApprovalTally} from "./wire";
import {queryKeys} from './queryKeys';

// ── Fetchers asíncrons ────────────────────────────────────────────────────

async function fetchOrganization(id: OrganizationId): Promise<Organization | null> {
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

async function fetchCensusMembers(orgId: OrganizationId): Promise<string[]> {
    return getCensusMembers(orgId);
}

async function fetchUserOrganizations(address: Address): Promise<Organization[]> {
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

async function fetchProposal(id: ProposalId): Promise<Proposal | null> {
    const onChain = await getProposal(id);
    if (!onChain) return null;
    const tally = await getApprovalTally(id);
    if (!tally) return null;
    const memberCount = await getCensusMemberCount(onChain.orgId);
    return mapToProposal(id, onChain, tally as OnChainApprovalTally, memberCount);
}

// ── Query options (co-locate key + fn for use in useQuery / prefetch) ─

export const organizationQueries = {
    all: () => queryOptions({
        queryKey: queryKeys.organizations.all(),
        queryFn: fetchOrganizations,
    }),
    detail: (id: OrganizationId) => queryOptions({
        queryKey: queryKeys.organizations.detail(id),
        queryFn: () => fetchOrganization(id),
    }),
    census: (id: OrganizationId) => queryOptions({
        queryKey: queryKeys.organizations.census(id),
        queryFn: () => fetchCensusMembers(id),
    }),
    forUser: (address: Address) => queryOptions({
        queryKey: queryKeys.organizations.forUser(address),
        queryFn: () => fetchUserOrganizations(address),
    }),
};

export const proposalQueries = {
    detail: (id: ProposalId) => queryOptions({
        queryKey: queryKeys.proposals.detail(id),
        queryFn: () => fetchProposal(id),
    }),
};
