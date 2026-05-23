import type { OnChainApprovalTally, OnChainOrganization, OnChainProposal } from './wire'
import type { Proposal, Organization } from '@/domain'

import { asAddress, asProposalId, asOrganizationId, computeProposalState } from '@/domain'

export function mapToOrganization(id: number, onChain: OnChainOrganization, memberCount: number): Organization {
	return {
		id: asOrganizationId(id),
		name: onChain.name,
		description: onChain.description,
		organizer: asAddress(onChain.organizer),
		memberCount
	}
}

export function mapToProposal(
	id: number,
	onChain: OnChainProposal,
	tally: OnChainApprovalTally,
	memberCount: number,
	now = Math.floor(Date.now() / 1000)
): Proposal {
	const approvalTally = {
		votesFor: tally.votesFor,
		totalVotes: tally.totalVotes
	}

	const state = computeProposalState({
		now,
		startDate: onChain.startingDate,
		endDate: onChain.endingDate,
		approvalTally,
		memberCount
	})

	return {
		id: asProposalId(id),
		orgId: asOrganizationId(onChain.orgId),
		title: onChain.title,
		description: onChain.description,
		options: onChain.options.map((title, i) => ({ id: i, title })),
		startDate: onChain.startingDate,
		endDate: onChain.endingDate,
		state,
		approvalTally,
		memberCount
	}
}
