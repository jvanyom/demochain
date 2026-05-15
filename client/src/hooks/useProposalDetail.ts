import { useQuery } from '@tanstack/react-query';

import type {ProposalId} from "@/domain";

import { proposalQueries, organizationQueries } from '@/algorand/queries';

export function useProposalDetail(id: ProposalId) {
  const proposalQuery = useQuery({
    ...proposalQueries.detail(id)
  });

  const proposal = proposalQuery.data ?? null;
  const orgId = proposal?.orgId;

  const orgQuery = useQuery({
    ...organizationQueries.detail(orgId!),
    enabled: orgId !== undefined,
  });

  return {
    proposal,
    organization: orgQuery.data ?? null,
    isPending: proposalQuery.isPending || (orgId !== undefined && orgQuery.isPending),
    isError: proposalQuery.isError || orgQuery.isError,
    error: proposalQuery.error ?? orgQuery.error,
    refetch: proposalQuery.refetch,
  };
}
