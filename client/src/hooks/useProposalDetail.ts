import { useQuery } from '@tanstack/react-query';

import type {ProposalId} from "@/domain";

import { proposalQueries, organizationQueries, votingQueries } from '@/algorand/queries';
import {useAlgorand} from "@/hooks/useAlgorand";

export function useProposalDetail(id: ProposalId) {
  const { address } = useAlgorand();

  const proposalQuery = useQuery({
    ...proposalQueries.detail(id)
  });

  const proposal = proposalQuery.data ?? null;
  const orgId = proposal?.orgId;

  const orgQuery = useQuery({
    ...organizationQueries.detail(orgId!),
    enabled: orgId !== undefined,
  });

  const isMemberQuery = useQuery({
    ...organizationQueries.isMember(address!, orgId!),
    enabled: address !== null && orgId !== undefined,
  });

  const approvalVotedQuery = useQuery({
    ...votingQueries.approvalVoted(address!, id),
    enabled: address !== null,
  });

  const electionVotedQuery = useQuery({
    ...votingQueries.electionVoted(address!, id),
    enabled: address !== null
  });

  return {
    proposal,
    organization: orgQuery.data ?? null,
    isMember: isMemberQuery.data ?? false,
    hasApprovalVoted: approvalVotedQuery.data ?? false,
    hasElectionVoted: electionVotedQuery.data ?? false,
    isPending: proposalQuery.isPending || (orgId !== undefined && orgQuery.isPending),
    isError: proposalQuery.isError || orgQuery.isError,
    error: proposalQuery.error ?? orgQuery.error,
    refetch: proposalQuery.refetch,
  };
}
