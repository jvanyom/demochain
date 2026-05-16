import type algosdk from 'algosdk';

import {useMutation, useQueryClient} from '@tanstack/react-query';

import type {Address, OrganizationId, ProposalId} from "@/domain";

import {createOrganization, addToCensus, removeFromCensus} from './organizations';
import {castApprovalVote, castRankedVote} from "./voting";
import {createProposal} from "./proposals";

import {queryKeys} from './queryKeys';

// ── Shared argument shapes ───────────────────────────────────────────

interface SignerArgs {
    signer: algosdk.TransactionSigner;
    sender: Address;
}

interface CreateOrganizationArgs extends SignerArgs {
    name: string;
    description: string;
}

interface CensusArgs extends SignerArgs {
    orgId: OrganizationId;
    members: Address[];
    onProgress?: (done: number, total: number) => void;
}

interface CreateProposalArgs extends SignerArgs {
    orgId: OrganizationId;
    title: string;
    description: string;
    options: string[];
    startingDate: number;
    endingDate: number;
}

interface CastApprovalVoteArgs extends SignerArgs {
    proposalId: ProposalId;
    orgId: OrganizationId;
    approve: boolean;
}

interface CastRankedVoteArgs extends SignerArgs {
    proposalId: ProposalId;
    orgId: OrganizationId;
    preferenceOrder: number[];
}

// ── Mutation hooks ───────────────────────────────────────────────────

export function useCreateOrganization() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({signer, sender, name, description}: CreateOrganizationArgs) => {
            return createOrganization(signer, sender, name, description)
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({queryKey: queryKeys.organizations.all()});
        },
    });
}

export function useAddToCensus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({signer, sender, orgId, members, onProgress}: CensusArgs) => {
            return addToCensus(signer, sender, orgId, members, onProgress)
        },
        onSuccess: (_data, {orgId}) => {
            void queryClient.invalidateQueries({queryKey: queryKeys.organizations.detail(orgId)});
            void queryClient.invalidateQueries({queryKey: queryKeys.censusPrefix});
        },
    });
}

export function useRemoveFromCensus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ signer, sender, orgId, members }: CensusArgs) => {
            return removeFromCensus(signer, sender, orgId, members)
        },
        onSuccess: (_data, { orgId }) => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.organizations.detail(orgId) });
            void queryClient.invalidateQueries({ queryKey: queryKeys.censusPrefix });
        },
    });
}

export function useCreateProposal() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ signer, sender, orgId, title, description, options, startingDate, endingDate }: CreateProposalArgs) => {
            return createProposal(signer, sender, orgId, title, description, options, startingDate, endingDate)
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.proposals.all() });
        },
    });
}

export function useCastApprovalVote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ signer, sender, proposalId, orgId, approve }: CastApprovalVoteArgs) => {
            return castApprovalVote(signer, sender, proposalId, orgId, approve)
        },
        onSuccess: (_txId, { proposalId, sender }) => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.proposals.detail(proposalId) });
            void queryClient.invalidateQueries({ queryKey: queryKeys.proposals.all() });
            void queryClient.invalidateQueries({ queryKey: queryKeys.voting.approvalVoted(sender, proposalId) });
        },
    });
}

export function useCastRankedVote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ signer, sender, proposalId, orgId, preferenceOrder }: CastRankedVoteArgs) => {
            return castRankedVote(signer, sender, proposalId, orgId, preferenceOrder)
        },
        onSuccess: (_txId, { proposalId, sender }) => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.voting.electionVoted(sender, proposalId) });
            void queryClient.invalidateQueries({ queryKey: queryKeys.electionPrefix });
        },
    });
}