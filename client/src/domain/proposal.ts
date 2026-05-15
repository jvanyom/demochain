import * as z from 'zod';

import type {ApprovalTally, ProposalState} from "./proposalState";
import {organizationIdSchema} from "./organization";

declare const proposalIdBrand: unique symbol;
export type ProposalId = number & { readonly [proposalIdBrand]: true };

const proposalIdSchema = z
    .number()
    .int()
    .nonnegative()
    .transform((n): ProposalId => n as ProposalId);

export function asProposalId(n: number): ProposalId {
  return proposalIdSchema.parse(n);
}

const proposalOptionSchema = z.object({
  id: z.number().int().nonnegative(),
  title: z.string(),
  description: z.string().optional(),
});

export type ProposalOption = z.infer<typeof proposalOptionSchema>;

const proposalBaseSchema = z.object({
  id: proposalIdSchema,
  orgId: organizationIdSchema,
  title: z.string(),
  description: z.string(),
  options: z.array(proposalOptionSchema),
  /** UNIX seconds. */
  startDate: z.number().int().nonnegative(),
  /** UNIX seconds. */
  endDate: z.number().int().nonnegative(),
});

type ProposalBase = z.infer<typeof proposalBaseSchema>;

export type Proposal = ProposalBase & {
  state: ProposalState;
  approvalTally: ApprovalTally;
  memberCount: number;
};
