import * as z from 'zod';

const approvalTallySchema = z.object({
  votesFor: z.number().int().nonnegative(),
  totalVotes: z.number().int().nonnegative(),
});

export type ApprovalTally = z.infer<typeof approvalTallySchema>;

export type ProposalStateKind =
  | 'PendingApproval'
  | 'Rejected'
  | 'PendingStart'
  | 'Open'
  | 'Closed';

export type ProposalState =
  | { kind: 'PendingApproval'; approvalTally: ApprovalTally; memberCount: number }
  | { kind: 'Rejected'; approvalTally: ApprovalTally; memberCount: number }
  | { kind: 'PendingStart' }
  | { kind: 'Open' }
  | { kind: 'Closed' };

export interface ProposalStateInputs {
  now: number;
  startDate: number;
  endDate: number;
  approvalTally: ApprovalTally;
  memberCount: number;
}

export function isApproved(tally: ApprovalTally, memberCount: number): boolean {
  return memberCount > 0 && 3 * tally.votesFor >= 2 * memberCount;
}

export function computeProposalState(inputs: ProposalStateInputs): ProposalState {
  const { now, startDate, endDate, approvalTally, memberCount } = inputs;
  const approved = isApproved(approvalTally, memberCount);

  if (now >= endDate) return { kind: 'Closed' };
  if (approved && now >= startDate) return { kind: 'Open' };
  if (approved) return { kind: 'PendingStart' };
  if (now >= startDate) return { kind: 'Rejected', approvalTally, memberCount };
  return { kind: 'PendingApproval', approvalTally, memberCount };
}
