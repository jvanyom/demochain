import type { Organization, Proposal, ProposalId } from '@/domain'
import type { QueryObserverResult, RefetchOptions } from '@tanstack/react-query'

import { proposalQueries, organizationQueries, votingQueries } from '@/algorand/queries'
import { useAlgorand } from '@/hooks/useAlgorand'
import { useQuery } from '@tanstack/react-query'

interface ProposalDetail {
	proposal: Proposal | null
	organization: Organization | null
	isMember: boolean
	hasApprovalVoted: boolean
	hasElectionVoted: boolean
	isPending: boolean
	isError: boolean
	error: Error | null
	refetch: (options?: RefetchOptions) => Promise<QueryObserverResult<Proposal | null>>
}

export function useProposalDetail(id: ProposalId): ProposalDetail {
	const { address } = useAlgorand()

	const proposalQuery = useQuery({
		...proposalQueries.detail(id)
	})

	const proposal = proposalQuery.data ?? null
	const orgId = proposal?.orgId

	const orgQuery = useQuery({
		...organizationQueries.detail(orgId!),
		enabled: orgId !== undefined
	})

	const isMemberQuery = useQuery({
		...organizationQueries.isMember(address!, orgId!),
		enabled: address !== null && orgId !== undefined
	})

	const approvalVotedQuery = useQuery({
		...votingQueries.approvalVoted(address!, id),
		enabled: address !== null
	})

	const electionVotedQuery = useQuery({
		...votingQueries.electionVoted(address!, id),
		enabled: address !== null
	})

	return {
		proposal,
		organization: orgQuery.data ?? null,
		isMember: isMemberQuery.data ?? false,
		hasApprovalVoted: approvalVotedQuery.data ?? false,
		hasElectionVoted: electionVotedQuery.data ?? false,
		isPending: proposalQuery.isPending || (orgId !== undefined && orgQuery.isPending),
		isError: proposalQuery.isError || orgQuery.isError,
		error: proposalQuery.error ?? orgQuery.error,
		refetch: proposalQuery.refetch
	}
}
