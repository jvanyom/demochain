import type { Address, OrganizationId, ProposalId } from '@/domain'

import algosdk from 'algosdk'

import { algodClient, APP_ID } from './config'
import arc56 from './Demochain.arc56.json'

// ── Descodificador d'errors ARC-56 ─────────────────────────────────────────────
const pcErrorMap = new Map<number, string>()

for (const entry of arc56.sourceInfo.approval.sourceInfo)
	for (const pc of entry.pc) pcErrorMap.set(pc, entry.errorMessage)

export function decodeContractError(err: unknown): Error {
	const raw = err instanceof Error ? err.message : String(err)
	const match = /\bpc=(\d+)/.exec(raw)

	if (match?.[1]) {
		const msg = pcErrorMap.get(parseInt(match[1], 10))

		if (msg) return new Error(msg)
	}

	const lower = raw.toLowerCase()

	if (['cancel', 'rejected', 'user rejected'].some(pattern => lower.includes(pattern)))
		return new Error('wallet.rejected')

	if (['network', 'timeout', 'fetch'].some(pattern => lower.includes(pattern))) return new Error('network')

	return err instanceof Error ? err : new Error(raw)
}

export type TransactionSigner = algosdk.TransactionSigner

// ── Utilitats per operar amb Bytes ───────────────────────────────────────────────────
export const enc = new TextEncoder()

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
	return a.length === b.length && a.every((x, i) => x === b[i])
}

// ── Box key helpers ──────────────────────────────────────────────────
// Prefixos descodificats des dels valors en base64 d'ARC-56 :
//   'organizations':    "org_"      (b3JnXw==)         4 bytes + uint64 = 12 bytes
//   'census':           "cs_"       (Y3Nf)             3 bytes + uint64 + pubkey = 43 bytes
//   'proposals':        "pr_"       (cHJf)             3 bytes + uint64 = 11 bytes
//   'approval_tallies': "at_"       (YXRf)             3 bytes + uint64 = 11 bytes

export function orgNameIndexKey(name: string): Uint8Array {
	const nameBytes = enc.encode(name)
	const lenBytes = new Uint8Array(2)

	new DataView(lenBytes.buffer).setUint16(0, nameBytes.length, false)
	return new Uint8Array([...enc.encode('on_'), ...lenBytes, ...nameBytes])
}

export function orgBoxKey(id: OrganizationId): Uint8Array {
	return new Uint8Array([...enc.encode('org_'), ...algosdk.bigIntToBytes(id, 8)])
}

// Census key: cs_ (3) + org_id (8) + member pubkey (32) = 43 bytes
export function censusBoxKey(orgId: OrganizationId, member: Address): Uint8Array {
	return new Uint8Array([
		...enc.encode('cs_'),
		...algosdk.bigIntToBytes(orgId, 8),
		...algosdk.decodeAddress(member).publicKey
	])
}

export function proposalBoxKey(id: ProposalId): Uint8Array {
	return new Uint8Array([...enc.encode('pr_'), ...algosdk.bigIntToBytes(id, 8)])
}

export function tallyBoxKey(id: ProposalId): Uint8Array {
	return new Uint8Array([...enc.encode('at_'), ...algosdk.bigIntToBytes(id, 8)])
}

export function approvalBallotKey(sender: Address, proposalId: ProposalId): Uint8Array {
	return new Uint8Array([
		...enc.encode('ab_'),
		...algosdk.decodeAddress(sender).publicKey,
		...algosdk.bigIntToBytes(proposalId, 8)
	])
}

export function electionBallotKey(sender: Address, proposalId: ProposalId): Uint8Array {
	return new Uint8Array([
		...enc.encode('eb_'),
		...algosdk.decodeAddress(sender).publicKey,
		...algosdk.bigIntToBytes(proposalId, 8)
	])
}

// ── Definicions dels mètodes ABI ───────────────────────────────────────────

export const createOrganizationMethod = new algosdk.ABIMethod({
	name: 'create_organization',
	args: [
		{ type: 'string', name: 'name' },
		{ type: 'string', name: 'description' }
	],
	returns: { type: 'uint64' }
})

export const addToCensusMethod = new algosdk.ABIMethod({
	name: 'add_to_census',
	args: [
		{ type: 'uint64', name: 'org_id' },
		{ type: 'address[]', name: 'members' }
	],
	returns: { type: 'void' }
})

export const removeFromCensusMethod = new algosdk.ABIMethod({
	name: 'remove_from_census',
	args: [
		{ type: 'uint64', name: 'org_id' },
		{ type: 'address[]', name: 'members' }
	],
	returns: { type: 'void' }
})

export const createProposalMethod = new algosdk.ABIMethod({
	name: 'create_proposal',
	args: [
		{ type: 'uint64', name: 'org_id' },
		{ type: 'string', name: 'title' },
		{ type: 'string', name: 'description' },
		{ type: 'string[]', name: 'options' },
		{ type: 'uint64', name: 'starting_date' },
		{ type: 'uint64', name: 'ending_date' }
	],
	returns: { type: 'uint64' }
})

export const castProposalVoteMethod = new algosdk.ABIMethod({
	name: 'cast_approval_vote',
	args: [
		{ type: 'uint64', name: 'proposal_id' },
		{ type: 'bool', name: 'approve' }
	],
	returns: { type: 'void' }
})

export const castElectionVoteMethod = new algosdk.ABIMethod({
	name: 'cast_election_vote',
	args: [
		{ type: 'uint64', name: 'proposal_id' },
		{ type: 'uint8[]', name: 'preference_order' }
	],
	returns: { type: 'void' }
})

// ── Executor ATC ─────────────────────────────────────────────────────

export async function callMethod(
	signer: TransactionSigner,
	sender: string,
	method: algosdk.ABIMethod,
	methodArgs: algosdk.ABIValue[],
	boxes: { appIndex: number; name: Uint8Array }[] = []
): Promise<algosdk.ABIResult> {
	const suggestedParams = await algodClient.getTransactionParams().do()
	const composer = new algosdk.AtomicTransactionComposer()

	composer.addMethodCall({
		appID: APP_ID,
		method,
		methodArgs,
		sender,
		signer,
		suggestedParams,
		boxes
	})

	try {
		const result = await composer.execute(algodClient, 4)

		return result.methodResults[0]!
	} catch (err) {
		throw decodeContractError(err)
	}
}

// ── Lector de l'estat global ──────────────────────────────────────────────

// Llegeix un comptador uint64 des de l'estat global.
// Torna a 0 si algod no està disponible (algunes configuracions de nodes no exposen
// /v2/applications o potser l'aplicació encara no s'ha desplegat).
export async function readGlobalUint64(keyStr: string): Promise<number> {
	try {
		const app = await algodClient.getApplicationByID(APP_ID).do()
		const keyBytes = enc.encode(keyStr)
		const entry = app.params.globalState?.find(key => bytesEqual(key.key, keyBytes))
		return entry ? Number(entry.value.uint) : 0
	} catch {
		return 0
	}
}

// ── Comprovacions de l'existència de boxes ─────────────────────────────────────────────

// Lectura directa del box - O(1). L'error 404 es detecta de manera silenciosa.
export async function singleBoxExists(key: Uint8Array): Promise<boolean> {
	try {
		await algodClient.getApplicationBoxByName(APP_ID, key).do()
		return true
	} catch {
		return false
	}
}

// Basat en escaneig - evita el 404 en alguns entorns.
export async function boxExists(key: Uint8Array): Promise<boolean> {
	try {
		const { boxes } = await algodClient.getApplicationBoxes(APP_ID).do()
		return boxes.some(b => bytesEqual(b.name, key))
	} catch {
		return false
	}
}

// ── Constants ─────────────────────────────────────────────────

// MBR constants (µALGO): 2500 box base + 400 per byte (key + value)
export const CENSUS_BOX_MBR = 20_100 // 'key'=43 (cs_+orgId+pubkey), value=1 (bool)

// 8 box refs max per tx: 1 for the org box, up to 7 for census entries.
// Each batch is its own atomic group (payment + method call) to stay within the 16-tx limit.

// 8 boxes màxim per transacció: 1 pel box d'organització, fins a 7.
// Cada lot és el seu propi grup atòmic (pagament + crida al mètode) per mantenir-se dins del límit de 16-tx.
export const CENSUS_BATCH = 7
