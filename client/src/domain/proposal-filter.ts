import type { Proposal } from './proposal'

export type ProposalFilter = 'active' | 'all' | 'pending' | 'approved' | 'voting' | 'closed'

export const PROPOSAL_FILTERS: ProposalFilter[] = ['active', 'pending', 'approved', 'voting', 'closed', 'all']

export function proposalMatchesFilter(proposal: Proposal, filter: ProposalFilter): boolean {
	const filteringMethods = {
		all: (): boolean => true,
		active: (): boolean => proposal.state.kind !== 'Closed',
		pending: (): boolean => proposal.state.kind === 'PendingApproval',
		approved: (): boolean => proposal.state.kind === 'PendingStart',
		voting: (): boolean => proposal.state.kind === 'Open',
		closed: (): boolean => proposal.state.kind === 'Closed'
	}

	return filteringMethods[filter]()
}
