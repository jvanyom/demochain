import algosdk from "algosdk";

import {asOrganizationId} from "@/domain";

import type {OnChainApprovalTally, OnChainProposal} from "./wire";
import {algodClient, APP_ID} from './config';

import {
  proposalBoxKey,
  tallyBoxKey,
  orgBoxKey,
  censusBoxKey,
  createProposalMethod,
  callMethod,
  readGlobalUint64,
  type TransactionSigner,
} from './_contract';

export async function createProposal(
  signer: TransactionSigner,
  sender: string,
  orgId: number,
  title: string,
  description: string,
  options: string[],
  startingDate: number,
  endingDate: number,
): Promise<{ proposalId: number; txId: string }> {
  const currentProposalId = await readGlobalUint64('proposal_id');
  const nextId = currentProposalId + 1;

  // create_proposal calls _assert_in_census, so census box is required too.
  const result = await callMethod(
    signer,
    sender,
    createProposalMethod,
    [BigInt(orgId), title, description, options, BigInt(startingDate), BigInt(endingDate)],
    [
      { appIndex: APP_ID, name: proposalBoxKey(nextId) },
      { appIndex: APP_ID, name: tallyBoxKey(nextId) },
      { appIndex: APP_ID, name: orgBoxKey(orgId) },
      { appIndex: APP_ID, name: censusBoxKey(orgId, sender) },
    ],
  );

  const proposalId = Number(result.returnValue as bigint);
  return { proposalId, txId: result.txID };
}

export async function getProposal(proposalId: number): Promise<OnChainProposal | null> {
    try {
        const box = await algodClient.getApplicationBoxByName(APP_ID, proposalBoxKey(proposalId)).do();
        return decodeProposal(box.value);
    } catch {
        return null;
    }
}

export async function getApprovalTally(proposalId: number): Promise<OnChainApprovalTally | null> {
    try {
        const box = await algodClient.getApplicationBoxByName(APP_ID, tallyBoxKey(proposalId)).do();
        return decodeTally(box.value);
    } catch {
        return null;
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
