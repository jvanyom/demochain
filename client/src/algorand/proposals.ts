import algosdk from "algosdk";

import type {Address, OrganizationId, ProposalId} from "@/domain";
import {asOrganizationId, asProposalId} from "@/domain";

import type {OnChainApprovalTally, OnChainProposal} from "./wire";
import {algodClient, APP_ID} from './config';

import {
    type TransactionSigner,
    proposalBoxKey,
    tallyBoxKey,
    orgBoxKey,
    censusBoxKey,
    readGlobalUint64,
    callMethod,
    bytesEqual,
    enc,
    createProposalMethod,
} from './_contract';

export async function createProposal(
    signer: TransactionSigner,
    sender: Address,
    orgId: OrganizationId,
    title: string,
    description: string,
    options: string[],
    startingDate: number,
    endingDate: number,
): Promise<{ proposalId: ProposalId; txId: string }> {
    const currentProposalId = asProposalId(await readGlobalUint64('proposal_id'));
    const nextId = asProposalId(currentProposalId + 1);

    // create_proposal calls _assert_in_census, so census box is required too.
    const result = await callMethod(
        signer,
        sender,
        createProposalMethod,
        [BigInt(orgId), title, description, options, BigInt(startingDate), BigInt(endingDate)],
        [
            {appIndex: APP_ID, name: proposalBoxKey(nextId)},
            {appIndex: APP_ID, name: tallyBoxKey(nextId)},
            {appIndex: APP_ID, name: orgBoxKey(orgId)},
            {appIndex: APP_ID, name: censusBoxKey(orgId, sender)},
        ],
    );

    return {
        proposalId: asProposalId(Number(result.returnValue as bigint)),
        txId: result.txID
    };
}

export async function getProposal(proposalId: ProposalId): Promise<OnChainProposal | null> {
    try {
        const box = await algodClient.getApplicationBoxByName(APP_ID, proposalBoxKey(proposalId)).do();
        return decodeProposal(box.value);
    } catch {
        return null;
    }
}

export async function getApprovalTally(proposalId: ProposalId): Promise<OnChainApprovalTally | null> {
    try {
        const box = await algodClient.getApplicationBoxByName(APP_ID, tallyBoxKey(proposalId)).do();
        return decodeTally(box.value);
    } catch {
        return null;
    }
}

export async function getAllProposalIds(): Promise<ProposalId[]> {
    try {
        const {boxes} = await algodClient.getApplicationBoxes(APP_ID).do();
        const proposalPrefix = enc.encode('proposals'); // 9 bytes
        const ids: ProposalId[] = [];

        for (const box of boxes) {
            const name = box.name;
            if (name.length === 17 && bytesEqual(name.slice(0, 9), proposalPrefix)) {
                const id = Number(algosdk.bytesToBigInt(name.slice(9)));

                if (id > 0)
                    ids.push(asProposalId(id));
            }
        }

        return ids.sort((a, b) => a - b);
    } catch {
        return [];
    }
}

// Proposal ARC-4 type: (uint64, string, string, string[], uint64, uint64)
function decodeProposal(data: Uint8Array): OnChainProposal {
    const type = algosdk.ABIType.from('(uint64,string,string,string[],uint64,uint64)');
    const decoded = type.decode(data) as [bigint, string, string, string[], bigint, bigint];

    return {
        orgId: asOrganizationId(Number(decoded[0])),
        title: decoded[1],
        description: decoded[2],
        options: decoded[3],
        startingDate: Number(decoded[4]),
        endingDate: Number(decoded[5]),
    };
}

// ApprovalTally ARC-4 type: (uint32, uint32)
function decodeTally(data: Uint8Array): OnChainApprovalTally {
    const type = algosdk.ABIType.from('(uint32,uint32)');
    const decoded = type.decode(data) as [bigint, bigint];

    return {
        votesFor: Number(decoded[0]),
        totalVotes: Number(decoded[1]),
    };
}
