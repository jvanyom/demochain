import type algosdk from 'algosdk';

import {useMutation, useQueryClient} from '@tanstack/react-query';

import {createOrganization, addToCensus, removeFromCensus} from './organizations';
import {queryKeys} from './queryKeys';

// ── Shared argument shapes ───────────────────────────────────────────

interface SignerArgs {
    signer: algosdk.TransactionSigner;
    sender: string;
}

interface CreateOrganizationArgs extends SignerArgs {
    name: string;
    description: string;
}

interface CensusArgs extends SignerArgs {
    orgId: number;
    members: string[];
    onProgress?: (done: number, total: number) => void;
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
