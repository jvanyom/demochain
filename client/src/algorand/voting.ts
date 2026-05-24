import type { Address, OrganizationId, ProposalId } from '@/domain'

import algosdk from 'algosdk'

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
} from './_contract'
import { algodClient } from './config'

export async function castApprovalVote(
	appId: number,
	signer: TransactionSigner,
	sender: Address,
	proposalId: ProposalId,
	orgId: OrganizationId,
	approve: boolean
): Promise<string> {
	const result = await callMethod(
		appId,
		signer,
		sender,
		castProposalVoteMethod,
		[BigInt(proposalId), approve],
		[
			{ appIndex: appId, name: proposalBoxKey(proposalId) },
			{ appIndex: appId, name: tallyBoxKey(proposalId) },
			{ appIndex: appId, name: approvalBallotKey(sender, proposalId) },
			{ appIndex: appId, name: orgBoxKey(orgId) },
			{ appIndex: appId, name: censusBoxKey(orgId, sender) }
		]
	)

	return result.txID
}

export async function castRankedVote(
	appId: number,
	signer: TransactionSigner,
	sender: Address,
	proposalId: ProposalId,
	orgId: OrganizationId,
	preferenceOrder: number[]
): Promise<string> {
	const result = await callMethod(
		appId,
		signer,
		sender,
		castElectionVoteMethod,
		[BigInt(proposalId), preferenceOrder.map(optionOrder => BigInt(optionOrder))],
		[
			{ appIndex: appId, name: proposalBoxKey(proposalId) },
			{ appIndex: appId, name: tallyBoxKey(proposalId) },
			{ appIndex: appId, name: electionBallotKey(sender, proposalId) },
			{ appIndex: appId, name: orgBoxKey(orgId) },
			{ appIndex: appId, name: censusBoxKey(orgId, sender) }
		]
	)

	return result.txID
}

export async function getElectionVoterCount(appId: number, proposalId: ProposalId): Promise<number> {
	try {
		const { boxes } = await algodClient.getApplicationBoxes(appId).do()
		const prefix = enc.encode('eb_')
		const pidBytes = algosdk.bigIntToBytes(proposalId, 8)

		return boxes.filter(
			b =>
				b.name.length === 43 && bytesEqual(b.name.slice(0, 3), prefix) && bytesEqual(b.name.slice(35), pidBytes)
		).length
	} catch {
		return 0
	}
}

export async function hasApprovalVoted(appId: number, sender: Address, proposalId: ProposalId): Promise<boolean> {
	return boxExists(appId, approvalBallotKey(sender, proposalId))
}

export async function hasElectionVoted(appId: number, sender: Address, proposalId: ProposalId): Promise<boolean> {
	return boxExists(appId, electionBallotKey(sender, proposalId))
}

export async function getElectionBallots(appId: number, proposalId: ProposalId): Promise<number[][]> {
	try {
		const { boxes } = await algodClient.getApplicationBoxes(appId).do()
		const prefix = enc.encode('eb_')
		const pidBytes = algosdk.bigIntToBytes(proposalId, 8)

		const ballotBoxNames: Uint8Array[] = []

		for (const { name } of boxes)
			if (name.length === 43 && bytesEqual(name.slice(0, 3), prefix) && bytesEqual(name.slice(35), pidBytes))
				ballotBoxNames.push(name)

		return await Promise.all(
			ballotBoxNames.map(async name => {
				const box = await algodClient.getApplicationBoxByName(appId, name).do()
				return decodePreferenceOrder(box.value)
			})
		)
	} catch {
		return []
	}
}

export async function getElectionBallotForVoter(
	appId: number,
	address: Address,
	proposalId: ProposalId
): Promise<number[] | null> {
	try {
		const key = electionBallotKey(address, proposalId)
		const box = await algodClient.getApplicationBoxByName(appId, key).do()
		return decodePreferenceOrder(box.value)
	} catch {
		return null
	}
}

function decodePreferenceOrder(data: Uint8Array): number[] {
	const type = algosdk.ABIType.from('uint8[]')
	// oxlint-disable-next-line no-unsafe-type-assertion
	const decoded = type.decode(data) as bigint[]
	return decoded.map(Number)
}
