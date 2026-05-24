import type { Address, Organization, OrganizationId, Proposal, ProposalId, ElectionResults } from '@/domain'
import type { QueryKey, UndefinedInitialDataOptions } from '@tanstack/react-query'

import { asProposalId, computeElectionResults } from '@/domain'
import { queryOptions } from '@tanstack/react-query'

type Opts<TData, Key extends QueryKey> = UndefinedInitialDataOptions<TData, Error, TData, Key>

import { demochainClient } from './create-client'
import { mapToOrganization, mapToProposal } from './mappers'
import { queryKeys } from './query-keys'

// ── Fetchers asíncrons ────────────────────────────────────────────────────

async function fetchOrganization(id: OrganizationId): Promise<Organization | null> {
	const onChain = await demochainClient.getOrganization(id)
	if (!onChain) return null
	const memberCount = await demochainClient.getCensusMemberCount(id)
	return mapToOrganization(id, onChain, memberCount)
}

async function fetchOrganizations(): Promise<Organization[]> {
	const ids = await demochainClient.getAllOrganizationIds()
	const results = await Promise.all(ids.map(fetchOrganization))
	return results.filter((org): org is Organization => org !== null)
}

async function fetchCensusMembers(orgId: OrganizationId): Promise<Address[]> {
	return demochainClient.getCensusMembers(orgId)
}

async function fetchIsInCensus(address: Address, orgId: OrganizationId): Promise<boolean> {
	return demochainClient.isInCensusChain(address, orgId)
}

async function fetchUserOrganizations(address: Address): Promise<Organization[]> {
	const ids = await demochainClient.getAllOrganizationIds()

	const results = await Promise.all(
		ids.map(async id => {
			const isMember = await demochainClient.isInCensusChain(address, id)
			if (!isMember) return null
			return fetchOrganization(id)
		})
	)

	return results.filter((org): org is Organization => org !== null)
}

async function fetchProposal(id: ProposalId): Promise<Proposal | null> {
	const onChain = await demochainClient.getProposal(id)
	if (!onChain) return null
	const tally = await demochainClient.getApprovalTally(id)
	if (!tally) return null
	const memberCount = await demochainClient.getCensusMemberCount(onChain.orgId)
	return mapToProposal(id, onChain, tally, memberCount)
}

async function fetchProposals(): Promise<Proposal[]> {
	const ids = await demochainClient.getAllProposalIds()
	const results = await Promise.all(ids.map(fetchProposal))

	return results.filter((proposal): proposal is Proposal => proposal !== null)
}

async function fetchHasApprovalVoted(address: Address, proposalId: ProposalId): Promise<boolean> {
	return demochainClient.hasApprovalVoted(address, proposalId)
}

async function fetchHasElectionVoted(address: Address, proposalId: ProposalId): Promise<boolean> {
	return demochainClient.hasElectionVoted(address, proposalId)
}

async function fetchElectionVoterCount(proposalId: ProposalId): Promise<number> {
	return demochainClient.getElectionVoterCount(proposalId)
}

async function fetchElectionResults(proposalId: ProposalId, numOptions: number): Promise<ElectionResults> {
	const ballots = await demochainClient.getElectionBallots(proposalId)
	return computeElectionResults(asProposalId(proposalId), ballots, numOptions)
}

// ── Query options (co-locate key + fn for use in useQuery / prefetch) ─

export const organizationQueries = {
	all: (): Opts<Organization[], ReturnType<typeof queryKeys.organizations.all>> =>
		queryOptions({
			queryKey: queryKeys.organizations.all(),
			queryFn: fetchOrganizations
		}),
	detail: (id: OrganizationId): Opts<Organization | null, ReturnType<typeof queryKeys.organizations.detail>> =>
		queryOptions({
			queryKey: queryKeys.organizations.detail(id),
			queryFn: () => fetchOrganization(id)
		}),
	census: (id: OrganizationId): Opts<Address[], ReturnType<typeof queryKeys.organizations.census>> =>
		queryOptions({
			queryKey: queryKeys.organizations.census(id),
			queryFn: () => fetchCensusMembers(id)
		}),
	isMember: (
		address: Address,
		orgId: OrganizationId
	): Opts<boolean, ReturnType<typeof queryKeys.organizations.isMember>> =>
		queryOptions({
			queryKey: queryKeys.organizations.isMember(address, orgId),
			queryFn: () => fetchIsInCensus(address, orgId)
		}),
	forUser: (address: Address): Opts<Organization[], ReturnType<typeof queryKeys.organizations.forUser>> =>
		queryOptions({
			queryKey: queryKeys.organizations.forUser(address),
			queryFn: () => fetchUserOrganizations(address)
		})
}

export const proposalQueries = {
	all: (): Opts<Proposal[], ReturnType<typeof queryKeys.proposals.all>> =>
		queryOptions({
			queryKey: queryKeys.proposals.all(),
			queryFn: fetchProposals
		}),
	detail: (id: ProposalId): Opts<Proposal | null, ReturnType<typeof queryKeys.proposals.detail>> =>
		queryOptions({
			queryKey: queryKeys.proposals.detail(id),
			queryFn: () => fetchProposal(id)
		})
}

export const votingQueries = {
	approvalVoted: (
		address: Address,
		proposalId: ProposalId
	): Opts<boolean, ReturnType<typeof queryKeys.voting.approvalVoted>> =>
		queryOptions({
			queryKey: queryKeys.voting.approvalVoted(address, proposalId),
			queryFn: () => fetchHasApprovalVoted(address, proposalId)
		}),
	electionVoted: (
		address: Address,
		proposalId: ProposalId
	): Opts<boolean, ReturnType<typeof queryKeys.voting.electionVoted>> =>
		queryOptions({
			queryKey: queryKeys.voting.electionVoted(address, proposalId),
			queryFn: () => fetchHasElectionVoted(address, proposalId)
		}),
	electionVoterCount: (
		proposalId: ProposalId
	): Opts<number, ReturnType<typeof queryKeys.voting.electionVoterCount>> =>
		queryOptions({
			queryKey: queryKeys.voting.electionVoterCount(proposalId),
			queryFn: () => fetchElectionVoterCount(proposalId)
		}),
	electionResults: (
		proposalId: ProposalId,
		numOptions: number
	): Opts<ElectionResults, ReturnType<typeof queryKeys.voting.electionResults>> =>
		queryOptions({
			queryKey: queryKeys.voting.electionResults(proposalId),
			queryFn: () => fetchElectionResults(proposalId, numOptions)
		}),
	electionBallotForVoter: (
		address: Address,
		proposalId: ProposalId
	): Opts<number[] | null, ReturnType<typeof queryKeys.voting.electionBallotForVoter>> =>
		queryOptions({
			queryKey: queryKeys.voting.electionBallotForVoter(address, proposalId),
			queryFn: () => demochainClient.getElectionBallotForVoter(address, proposalId),
			enabled: Boolean(address),
			retry: false,
			staleTime: 30_000
		})
}
