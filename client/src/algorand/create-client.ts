import type { TransactionSigner } from './_contract'
import type { OnChainOrganization, OnChainProposal, OnChainApprovalTally } from './wire'
import type { Address, OrganizationId, ProposalId } from '@/domain'

import {
	createOrganization,
	addToCensus,
	removeFromCensus,
	getOrganization,
	getAllOrganizationIds,
	getCensusMembers,
	getCensusMemberCount,
	isInCensusChain,
	type CreateOrganizationResult
} from './organizations'
import {
	createProposal,
	getProposal,
	getAllProposalIds,
	getApprovalTally,
	type CreateProposalResult
} from './proposals'
import {
	castApprovalVote,
	castRankedVote,
	hasApprovalVoted,
	hasElectionVoted,
	getElectionVoterCount,
	getElectionBallots,
	getElectionBallotForVoter
} from './voting'

export interface DemochainClient {
	createOrganization: (
		signer: TransactionSigner,
		sender: Address,
		name: string,
		description: string
	) => Promise<CreateOrganizationResult>
	getOrganization: (orgId: OrganizationId) => Promise<OnChainOrganization | null>
	getAllOrganizationIds: () => Promise<OrganizationId[]>

	addToCensus: (
		signer: TransactionSigner,
		sender: Address,
		orgId: OrganizationId,
		members: Address[],
		onProgress?: (done: number, total: number) => void
	) => Promise<void>
	removeFromCensus: (
		signer: TransactionSigner,
		sender: Address,
		orgId: OrganizationId,
		members: Address[]
	) => Promise<void>
	getCensusMembers: (orgId: OrganizationId) => Promise<Address[]>
	getCensusMemberCount: (orgId: OrganizationId) => Promise<number>
	isInCensusChain: (address: Address, orgId: OrganizationId) => Promise<boolean>

	createProposal: (
		signer: TransactionSigner,
		sender: Address,
		orgId: OrganizationId,
		title: string,
		description: string,
		options: string[],
		startingDate: number,
		endingDate: number
	) => Promise<CreateProposalResult>
	getProposal: (proposalId: ProposalId) => Promise<OnChainProposal | null>
	getAllProposalIds: () => Promise<ProposalId[]>

	getApprovalTally: (proposalId: ProposalId) => Promise<OnChainApprovalTally | null>

	castApprovalVote: (
		signer: TransactionSigner,
		sender: Address,
		proposalId: ProposalId,
		orgId: OrganizationId,
		approve: boolean
	) => Promise<string>
	castRankedVote: (
		signer: TransactionSigner,
		sender: Address,
		proposalId: ProposalId,
		orgId: OrganizationId,
		preferenceOrder: number[]
	) => Promise<string>

	hasApprovalVoted: (sender: Address, proposalId: ProposalId) => Promise<boolean>
	hasElectionVoted: (sender: Address, proposalId: ProposalId) => Promise<boolean>

	getElectionVoterCount: (proposalId: ProposalId) => Promise<number>
	getElectionBallots: (proposalId: ProposalId) => Promise<number[][]>
	getElectionBallotForVoter: (address: Address, proposalId: ProposalId) => Promise<number[] | null>
}

export function createDemochainClient(appId: number): DemochainClient {
	return {
		// ── Organitzacions ────────────────────────────────────────────────
		createOrganization: (
			signer: TransactionSigner,
			sender: Address,
			name: string,
			description: string
		): Promise<CreateOrganizationResult> => createOrganization(appId, signer, sender, name, description),

		addToCensus: (
			signer: TransactionSigner,
			sender: Address,
			orgId: OrganizationId,
			members: Address[],
			onProgress?: (done: number, total: number) => void
		): Promise<void> => addToCensus(appId, signer, sender, orgId, members, onProgress),

		removeFromCensus: (
			signer: TransactionSigner,
			sender: Address,
			orgId: OrganizationId,
			members: Address[]
		): Promise<void> => removeFromCensus(appId, signer, sender, orgId, members),

		getOrganization: (orgId: OrganizationId) => getOrganization(appId, orgId),

		getAllOrganizationIds: () => getAllOrganizationIds(appId),

		getCensusMembers: (orgId: OrganizationId) => getCensusMembers(appId, orgId),

		getCensusMemberCount: (orgId: OrganizationId) => getCensusMemberCount(appId, orgId),

		isInCensusChain: (address: Address, orgId: OrganizationId) => isInCensusChain(appId, address, orgId),

		// ── Propostes ─────────────────────────────────────────────────────
		createProposal: (
			signer: TransactionSigner,
			sender: Address,
			orgId: OrganizationId,
			title: string,
			description: string,
			options: string[],
			startingDate: number,
			endingDate: number
		): Promise<CreateProposalResult> =>
			createProposal(appId, signer, sender, orgId, title, description, options, startingDate, endingDate),

		getProposal: (proposalId: ProposalId) => getProposal(appId, proposalId),

		getAllProposalIds: () => getAllProposalIds(appId),

		getApprovalTally: (proposalId: ProposalId) => getApprovalTally(appId, proposalId),

		// ── Votació ───────────────────────────────────────────────────────
		castApprovalVote: (
			signer: TransactionSigner,
			sender: Address,
			proposalId: ProposalId,
			orgId: OrganizationId,
			approve: boolean
		): Promise<string> => castApprovalVote(appId, signer, sender, proposalId, orgId, approve),

		castRankedVote: (
			signer: TransactionSigner,
			sender: Address,
			proposalId: ProposalId,
			orgId: OrganizationId,
			preferenceOrder: number[]
		): Promise<string> => castRankedVote(appId, signer, sender, proposalId, orgId, preferenceOrder),

		hasApprovalVoted: (sender: Address, proposalId: ProposalId) => hasApprovalVoted(appId, sender, proposalId),

		hasElectionVoted: (sender: Address, proposalId: ProposalId) => hasElectionVoted(appId, sender, proposalId),

		getElectionVoterCount: (proposalId: ProposalId) => getElectionVoterCount(appId, proposalId),

		getElectionBallots: (proposalId: ProposalId) => getElectionBallots(appId, proposalId),

		getElectionBallotForVoter: (address: Address, proposalId: ProposalId) =>
			getElectionBallotForVoter(appId, address, proposalId)
	}
}

// Singleton per a l'app de producció - llegeix VITE_APP_ID una sola vegada en arrancar
export const demochainClient = createDemochainClient(
	import.meta.env['VITE_APP_ID'] ? Number(import.meta.env['VITE_APP_ID']) : 1002
)
