import type {Address, OrganizationId, ProposalId} from "@/domain";

import {APP_ID} from './config';

import {
    type TransactionSigner,
    callMethod,
    proposalBoxKey,
    tallyBoxKey,
    orgBoxKey,
    censusBoxKey,
    approvalBallotKey,
    boxExists,
    castProposalVoteMethod
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

export async function hasApprovalVoted(sender: Address, proposalId: ProposalId): Promise<boolean> {
    return boxExists(approvalBallotKey(sender, proposalId));
}
