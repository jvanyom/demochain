import algosdk from "algosdk";

import type {Address, OrganizationId, ProposalId} from "@/domain";

import {algodClient, APP_ID} from './config';

import {
    type TransactionSigner,
    callMethod,
    proposalBoxKey,
    tallyBoxKey,
    orgBoxKey,
    censusBoxKey,
    approvalBallotKey,
    electionBallotKey,
    boxExists,
    bytesEqual,
    enc,
    castProposalVoteMethod,
    castElectionVoteMethod
} from './_contract';

export async function castApprovalVote(
    signer: TransactionSigner,
    sender: Address,
    proposalId: ProposalId,
    orgId: OrganizationId,
    approve: boolean,
): Promise<string> {
    const result = await callMethod(
        signer,
        sender,
        castProposalVoteMethod,
        [BigInt(proposalId), approve],
        [
            {appIndex: APP_ID, name: proposalBoxKey(proposalId)},
            {appIndex: APP_ID, name: tallyBoxKey(proposalId)},
            {appIndex: APP_ID, name: approvalBallotKey(sender, proposalId)},
            {appIndex: APP_ID, name: orgBoxKey(orgId)},
            {appIndex: APP_ID, name: censusBoxKey(orgId, sender)},
        ],
    );

    return result.txID;
}

export async function castRankedVote(
    signer: TransactionSigner,
    sender: Address,
    proposalId: ProposalId,
    orgId: OrganizationId,
    preferenceOrder: number[],
): Promise<string> {
    const result = await callMethod(
        signer,
        sender,
        castElectionVoteMethod,
        [BigInt(proposalId), preferenceOrder.map((n) => BigInt(n))],
        [
            {appIndex: APP_ID, name: proposalBoxKey(proposalId)},
            {appIndex: APP_ID, name: tallyBoxKey(proposalId)},
            {appIndex: APP_ID, name: electionBallotKey(sender, proposalId)},
            {appIndex: APP_ID, name: orgBoxKey(orgId)},
            {appIndex: APP_ID, name: censusBoxKey(orgId, sender)},
        ],
    );

    return result.txID;
}

export async function getElectionVoterCount(proposalId: ProposalId): Promise<number> {
    try {
        const {boxes} = await algodClient.getApplicationBoxes(APP_ID).do();
        const prefix = enc.encode('eb_');
        const pidBytes = algosdk.bigIntToBytes(proposalId, 8);

        return boxes.filter(
            (b) =>
                b.name.length === 43 &&
                bytesEqual(b.name.slice(0, 3), prefix) &&
                bytesEqual(b.name.slice(35), pidBytes),
        ).length;

    } catch {
        return 0;
    }
}

export async function hasApprovalVoted(sender: Address, proposalId: ProposalId): Promise<boolean> {
    return boxExists(approvalBallotKey(sender, proposalId));
}

export async function hasElectionVoted(sender: Address, proposalId: ProposalId): Promise<boolean> {
    return boxExists(electionBallotKey(sender, proposalId));
}
