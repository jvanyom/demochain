import type algosdk from 'algosdk';

import {useState} from 'react';

import type {Address, OrganizationId} from "@/domain";

import type {CensusMode} from '@/components/organization/CensusManager';

import {useAddToCensus, useRemoveFromCensus} from '@/algorand/mutations';

interface UseCensusApplyArgs {
    orgId: OrganizationId;
    census: Address[];
    signer: algosdk.TransactionSigner;
    sender: Address;
    onSuccess: (message: string) => void;
}

interface ApplyArgs {
    mode: CensusMode;
    addresses: Address[];
    selected: Set<Address>;
    onProgress: (done: number, total: number) => void;
    successMessages: { add: string; remove: string; replace: string };
}

export function useCensusApply({orgId, census, signer, sender, onSuccess}: UseCensusApplyArgs) {
    const [applying, setApplying] = useState(false);
    const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const addMutation = useAddToCensus();
    const removeMutation = useRemoveFromCensus();

    async function apply({mode, addresses, selected, onProgress, successMessages}: ApplyArgs) {
        setApplying(true);
        setError(null);
        setProgress(null);

        const trackProgress = (done: number, total: number) => {
            setProgress({done, total});
            onProgress(done, total);
        };

        try {
            if (mode === 'add') {
                const censusSet = new Set(census);
                const newAddresses = addresses.filter(a => !censusSet.has(a));
                await addMutation.mutateAsync({signer, sender, orgId, members: newAddresses, onProgress: trackProgress});
                onSuccess(successMessages.add);
            } else if (mode === 'remove') {
                await removeMutation.mutateAsync({signer, sender, orgId, members: Array.from(selected)});
                onSuccess(successMessages.remove);
            } else {
                if (census.length > 0) {
                    await removeMutation.mutateAsync({signer, sender, orgId, members: census});
                }
                await addMutation.mutateAsync({signer, sender, orgId, members: addresses, onProgress: trackProgress});
                onSuccess(successMessages.replace);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Transaction failed.');
        } finally {
            setApplying(false);
            setProgress(null);
        }
    }

    return {apply, applying, progress, error};
}
