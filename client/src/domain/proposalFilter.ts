import type { Proposal } from './proposal';

export type ProposalFilter = 'active' | 'all' | 'pending' | 'approved' | 'voting' | 'closed';

export const PROPOSAL_FILTERS: ProposalFilter[] = [
  'active', 'pending', 'approved', 'voting', 'closed', 'all',
];

export function proposalMatchesFilter(p: Proposal, filter: ProposalFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'active') return p.state.kind !== 'Closed';
  if (filter === 'pending') return p.state.kind === 'PendingApproval';
  if (filter === 'approved') return p.state.kind === 'PendingStart';
  if (filter === 'voting') return p.state.kind === 'Open';
  if (filter === 'closed') return p.state.kind === 'Closed';
  return true;
}
