import { useQuery } from '@tanstack/react-query';

import type {ProposalId} from "@/domain";

import { proposalQueries, organizationQueries } from '@/algorand/queries';
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

  return {
    proposal,
    organization: orgQuery.data ?? null,
    isMember: isMemberQuery.data ?? false,
    hasApprovalVoted: true /*TODO*/,
    hasElectionVoted: true /*TODO*/,
    isPending: proposalQuery.isPending || (orgId !== undefined && orgQuery.isPending),
    isError: proposalQuery.isError || orgQuery.isError,
    error: proposalQuery.error ?? orgQuery.error,
    refetch: proposalQuery.refetch,
  };
}
