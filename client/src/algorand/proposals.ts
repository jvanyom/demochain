import { APP_ID } from './config';

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
