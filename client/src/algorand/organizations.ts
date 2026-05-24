import type { OnChainOrganization } from './wire'
import type { Address, OrganizationId } from '@/domain'

import { asAddress, asOrganizationId } from '@/domain'
import algosdk from 'algosdk'

import {
	type TransactionSigner,
	orgBoxKey,
	orgNameIndexKey,
	censusBoxKey,
	singleBoxExists,
	readGlobalUint64,
	decodeContractError,
	bytesEqual,
	CENSUS_BOX_MBR,
	CENSUS_BATCH,
	enc,
	addToCensusMethod,
	removeFromCensusMethod,
	createOrganizationMethod
} from './_contract'
import { algodClient } from './config'

export interface CreateOrganizationResult {
	orgId: OrganizationId
	txId: string
}

export async function createOrganization(
	appId: number,
	signer: TransactionSigner,
	sender: Address,
	name: string,
	description: string
): Promise<CreateOrganizationResult> {
	const currentOrgId = asOrganizationId(await readGlobalUint64(appId, 'org_id'))
	const nextId = asOrganizationId(currentOrgId + 1)

	const suggestedParams = await algodClient.getTransactionParams().do()
	const appAddress = algosdk.getApplicationAddress(appId)

	// Paga el compte de l'aplicació per cobrir MBR per a les 3 boxes que crearà:
	// box org (key=12, value=8+2+nom+2+desc+32), box d'índex de nom, box de cens organitzador
	const nameBytes = enc.encode(name)
	const descBytes = enc.encode(description)
	const orgValueSize = 8 + 2 + nameBytes.length + 2 + descBytes.length + 32
	const orgBoxMbr = 2500 + 400 * (12 + orgValueSize)
	const nameIndexMbr = 2500 + 400 * (3 + 2 + nameBytes.length + 8)
	const totalMbr = orgBoxMbr + nameIndexMbr + CENSUS_BOX_MBR

	const payTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
		sender,
		receiver: appAddress,
		amount: totalMbr,
		suggestedParams
	})

	const composer = new algosdk.AtomicTransactionComposer()

	composer.addTransaction({ txn: payTxn, signer })
	composer.addMethodCall({
		appID: appId,
		method: createOrganizationMethod,
		methodArgs: [name, description],
		sender,
		signer,
		suggestedParams,
		boxes: [
			{ appIndex: appId, name: orgNameIndexKey(name) },
			{ appIndex: appId, name: orgBoxKey(nextId) },
			{ appIndex: appId, name: censusBoxKey(nextId, sender) }
		]
	})

	try {
		const result = await composer.execute(algodClient, 4)
		const [methodResult] = result.methodResults

		if (methodResult) {
			const orgId = asOrganizationId(Number(methodResult.returnValue))

			return { orgId, txId: methodResult.txID }
		}
	} catch (err) {
		throw decodeContractError(err)
	}

	throw new Error('No contract result')
}

export async function getOrganization(appId: number, orgId: OrganizationId): Promise<OnChainOrganization | null> {
	try {
		const box = await algodClient.getApplicationBoxByName(appId, orgBoxKey(orgId)).do()
		return decodeOrganization(box.value)
	} catch {
		return null
	}
}

export async function getAllOrganizationIds(appId: number): Promise<OrganizationId[]> {
	try {
		const { boxes } = await algodClient.getApplicationBoxes(appId).do()
		const orgPrefix = enc.encode('org_') // 4 bytes
		const ids: OrganizationId[] = []

		for (const { name } of boxes)
			// org_ box names: "org_" (4) + uint64 (8) = 12 bytes
			if (name.length === 12 && bytesEqual(name.slice(0, 4), orgPrefix)) {
				const id = asOrganizationId(Number(algosdk.bytesToBigInt(name.slice(4))))
				if (id > 0) ids.push(id)
			}

		return ids.sort((a, b) => a - b)
	} catch {
		return []
	}
}

export async function addToCensus(
	appId: number,
	signer: TransactionSigner,
	sender: Address,
	orgId: OrganizationId,
	members: Address[],
	onProgress?: (done: number, total: number) => void
): Promise<void> {
	if (members.length === 0) return

	const appAddress = algosdk.getApplicationAddress(appId)
	const batches: Address[][] = []

	for (let i = 0; i < members.length; i += CENSUS_BATCH) batches.push(members.slice(i, i + CENSUS_BATCH))

	let done = 0

	try {
		await Promise.all(
			batches.map(async batch => {
				const suggestedParams = await algodClient.getTransactionParams().do()

				const payTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
					sender,
					receiver: appAddress,
					amount: CENSUS_BOX_MBR * batch.length,
					suggestedParams
				})

				const composer = new algosdk.AtomicTransactionComposer()
				composer.addTransaction({ txn: payTxn, signer })
				composer.addMethodCall({
					appID: appId,
					method: addToCensusMethod,
					methodArgs: [BigInt(orgId), batch],
					sender,
					signer,
					suggestedParams,
					boxes: [
						{ appIndex: appId, name: orgBoxKey(orgId) },
						...batch.map(address => ({ appIndex: appId, name: censusBoxKey(orgId, address) }))
					]
				})

				await composer.execute(algodClient, 4)
				done += batch.length
				onProgress?.(done, members.length)
			})
		)
	} catch (err) {
		throw decodeContractError(err)
	}
}

export async function removeFromCensus(
	appId: number,
	signer: TransactionSigner,
	sender: Address,
	orgId: OrganizationId,
	members: Address[]
): Promise<void> {
	if (members.length === 0) return

	const suggestedParams = await algodClient.getTransactionParams().do()
	const composer = new algosdk.AtomicTransactionComposer()

	for (let i = 0; i < members.length; i += CENSUS_BATCH) {
		const batch = members.slice(i, i + CENSUS_BATCH)

		composer.addMethodCall({
			appID: appId,
			method: removeFromCensusMethod,
			methodArgs: [BigInt(orgId), batch],
			sender,
			signer,
			suggestedParams,
			boxes: [
				{ appIndex: appId, name: orgBoxKey(orgId) },
				...batch.map(address => ({ appIndex: appId, name: censusBoxKey(orgId, address) }))
			]
		})
	}

	try {
		await composer.execute(algodClient, 4)
	} catch (err) {
		throw decodeContractError(err)
	}
}

export async function getCensusMembers(appId: number, orgId: OrganizationId): Promise<Address[]> {
	try {
		const { boxes } = await algodClient.getApplicationBoxes(appId).do()
		const prefix = enc.encode('cs_') // 3 bytes
		const orgIdBytes = algosdk.bigIntToBytes(orgId, 8)
		const members: Address[] = []

		for (const { name } of boxes)
			// census box names: "cs_" (3) + org_id (8) + member pubkey (32) = 43 bytes
			if (name.length === 43 && bytesEqual(name.slice(0, 3), prefix) && bytesEqual(name.slice(3, 11), orgIdBytes))
				members.push(asAddress(algosdk.encodeAddress(name.slice(11))))

		return members
	} catch {
		return []
	}
}

export async function getCensusMemberCount(appId: number, orgId: OrganizationId): Promise<number> {
	try {
		const { boxes } = await algodClient.getApplicationBoxes(appId).do()
		const prefix = enc.encode('cs_')
		const orgIdBytes = algosdk.bigIntToBytes(orgId, 8)

		return boxes.filter(
			box =>
				box.name.length === 43 &&
				bytesEqual(box.name.slice(0, 3), prefix) &&
				bytesEqual(box.name.slice(3, 11), orgIdBytes)
		).length
	} catch {
		return 0
	}
}

export async function isInCensusChain(appId: number, address: Address, orgId: OrganizationId): Promise<boolean> {
	return singleBoxExists(appId, censusBoxKey(orgId, address))
}

function decodeOrganization(data: Uint8Array): OnChainOrganization {
	const type = algosdk.ABIType.from('(uint64,string,string,address)')
	// oxlint-disable-next-line no-unsafe-type-assertion
	const decoded = type.decode(data) as [bigint, string, string, string]

	return {
		orgId: asOrganizationId(Number(decoded[0])),
		name: decoded[1],
		description: decoded[2],
		organizer: asAddress(decoded[3]),
		memberCount: 0
	}
}
