import type { CreateOrganizationResult } from './organizations'
import type { CreateProposalResult } from './proposals'
import type { Address, OrganizationId, ProposalId } from '@/domain'
import type algosdk from 'algosdk'

import { useMutation, type UseMutationResult, useQueryClient } from '@tanstack/react-query'

import { demochainClient } from './create-client'
import { queryKeys } from './query-keys'

// ── Shared argument shapes ───────────────────────────────────────────

interface SignerArgs {
	signer: algosdk.TransactionSigner
	sender: Address
}

interface CreateOrganizationArgs extends SignerArgs {
	name: string
	description: string
}

interface CensusArgs extends SignerArgs {
	orgId: OrganizationId
	members: Address[]
	onProgress?: (done: number, total: number) => void
}

interface CreateProposalArgs extends SignerArgs {
	orgId: OrganizationId
	title: string
	description: string
	options: string[]
	startingDate: number
	endingDate: number
}

interface CastApprovalVoteArgs extends SignerArgs {
	proposalId: ProposalId
	orgId: OrganizationId
	approve: boolean
}

interface CastRankedVoteArgs extends SignerArgs {
	proposalId: ProposalId
	orgId: OrganizationId
	preferenceOrder: number[]
}

// ── Mutation hooks ───────────────────────────────────────────────────

export function useCreateOrganization(): UseMutationResult<CreateOrganizationResult, Error, CreateOrganizationArgs> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ signer, sender, name, description }: CreateOrganizationArgs) =>
			demochainClient.createOrganization(signer, sender, name, description),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all() })
		}
	})
}

export function useAddToCensus(): UseMutationResult<void, Error, CensusArgs> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ signer, sender, orgId, members, onProgress }: CensusArgs) =>
			demochainClient.addToCensus(signer, sender, orgId, members, onProgress),
		onSuccess: (_data, { orgId }) => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.organizations.detail(orgId) })
			void queryClient.invalidateQueries({ queryKey: queryKeys.censusPrefix })
		}
	})
}

export function useRemoveFromCensus(): UseMutationResult<void, Error, CensusArgs> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ signer, sender, orgId, members }: CensusArgs) =>
			demochainClient.removeFromCensus(signer, sender, orgId, members),
		onSuccess: (_data, { orgId }) => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.organizations.detail(orgId) })
			void queryClient.invalidateQueries({ queryKey: queryKeys.censusPrefix })
		}
	})
}

export function useCreateProposal(): UseMutationResult<CreateProposalResult, Error, CreateProposalArgs> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({
			signer,
			sender,
			orgId,
			title,
			description,
			options,
			startingDate,
			endingDate
		}: CreateProposalArgs) =>
			demochainClient.createProposal(
				signer,
				sender,
				orgId,
				title,
				description,
				options,
				startingDate,
				endingDate
			),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.proposals.all() })
		}
	})
}

export function useCastApprovalVote(): UseMutationResult<string, Error, CastApprovalVoteArgs> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ signer, sender, proposalId, orgId, approve }: CastApprovalVoteArgs) =>
			demochainClient.castApprovalVote(signer, sender, proposalId, orgId, approve),
		onSuccess: (_txId, { proposalId, sender }) => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.proposals.detail(proposalId) })
			void queryClient.invalidateQueries({ queryKey: queryKeys.proposals.all() })
			void queryClient.invalidateQueries({ queryKey: queryKeys.voting.approvalVoted(sender, proposalId) })
		}
	})
}

export function useCastRankedVote(): UseMutationResult<string, Error, CastRankedVoteArgs> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ signer, sender, proposalId, orgId, preferenceOrder }: CastRankedVoteArgs) =>
			demochainClient.castRankedVote(signer, sender, proposalId, orgId, preferenceOrder),
		onSuccess: (_txId, { proposalId, sender }) => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.voting.electionVoted(sender, proposalId) })
			void queryClient.invalidateQueries({ queryKey: queryKeys.electionPrefix })
		}
	})
}
