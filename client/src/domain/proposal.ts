import type { ApprovalTally, ProposalState } from './proposal-state'

import * as z from 'zod'

import { organizationIdSchema } from './organization'

declare const proposalIdBrand: unique symbol
export type ProposalId = number & { readonly [proposalIdBrand]: true }

const proposalIdSchema = z
	.number()
	.int()
	.nonnegative()
	// oxlint-disable-next-line no-unsafe-type-assertion
	.transform((proposalId): ProposalId => proposalId as ProposalId)

export function asProposalId(proposalId: number): ProposalId {
	return proposalIdSchema.parse(proposalId)
}

const proposalOptionSchema = z.object({
	id: z.number().int().nonnegative(),
	title: z.string(),
	description: z.string().optional()
})

export type ProposalOption = z.infer<typeof proposalOptionSchema>

const proposalBaseSchema = z.object({
	id: proposalIdSchema,
	orgId: organizationIdSchema,
	title: z.string(),
	description: z.string(),
	options: z.array(proposalOptionSchema),
	/** UNIX seconds. */
	startDate: z.number().int().nonnegative(),
	/** UNIX seconds. */
	endDate: z.number().int().nonnegative()
})

type ProposalBase = z.infer<typeof proposalBaseSchema>

export type Proposal = ProposalBase & {
	state: ProposalState
	approvalTally: ApprovalTally
	memberCount: number
}

export function approvalPercentage(proposal: Proposal): number {
	if (proposal.memberCount <= 0) return 0
	return Math.round((proposal.approvalTally.votesFor / proposal.memberCount) * 100)
}
