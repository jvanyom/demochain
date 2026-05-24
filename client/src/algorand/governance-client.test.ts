import type { DemochainClient } from './create-client'
import type { Address, OrganizationId, ProposalId } from '@/domain'

import { expect, describe, it, beforeAll } from 'bun:test'

import { asAddress, asProposalId, asOrganizationId } from '@/domain'
import algosdk, { type TransactionSigner } from 'algosdk'

import { algodClient } from './config'
import { createDemochainClient } from './create-client'
import arc56 from './Demochain.arc56.json'
import { bootstrapDevAccountsToKmd } from './dev-accounts'
import devAccounts from './dev-accounts.json'

interface RawDevAddress {
	address: string
	mnemonic: string
}

interface DevAddress {
	address: Address
	mnemonic: string
}

function parseDevAddress({ address, mnemonic }: RawDevAddress): DevAddress {
	return {
		address: asAddress(address),
		mnemonic
	}
}

// -- Comptes de test ---------------------------------------------------
const organizer = parseDevAddress(devAccounts[0]!)
const member1 = parseDevAddress(devAccounts[1]!)
const member2 = parseDevAddress(devAccounts[2]!)
const outsider = parseDevAddress(devAccounts[3]!) // mai afegit a cap cens

function signerPer(acct: { mnemonic: string }): TransactionSigner {
	return algosdk.makeBasicAccountTransactionSigner(algosdk.mnemonicToSecretKey(acct.mnemonic))
}

// -- Estat compartit mutable (s'estableix durant l'execució ordenada dels tests) -
let client: DemochainClient = createDemochainClient(0)
let orgId: OrganizationId = asOrganizationId(0)
let proposalId: ProposalId = asProposalId(0)

// -- Comprovació de salut de la LocalNet ------------------------------
async function assertLocalNet(): Promise<void> {
	try {
		await algodClient.status().do()
	} catch {
		throw new Error(
			'\n\n' +
				'╔══════════════════════════════════════════════════════════════╗\n' +
				"║  No s'ha pogut connectar a la LocalNet a localhost:4001      ║\n" +
				'║  Arrànca-la primer:  docker compose up -d algod              ║\n' +
				'╚══════════════════════════════════════════════════════════════╝\n'
		)
	}
}

// -- Desplegament del contracte ----------------------------------------
async function deployFreshContract(): Promise<number> {
	const account = algosdk.mnemonicToSecretKey(organizer.mnemonic)
	const sp = await algodClient.getTransactionParams().do()

	const txn = algosdk.makeApplicationCreateTxnFromObject({
		sender: account.addr,
		suggestedParams: sp,
		approvalProgram: new Uint8Array(Buffer.from(arc56.byteCode.approval, 'base64')),
		clearProgram: new Uint8Array(Buffer.from(arc56.byteCode.clear, 'base64')),
		numGlobalInts: arc56.state.schema.global.ints,
		numGlobalByteSlices: arc56.state.schema.global.bytes,
		numLocalInts: arc56.state.schema.local.ints,
		numLocalByteSlices: arc56.state.schema.local.bytes,
		onComplete: algosdk.OnApplicationComplete.NoOpOC
	})

	const signed = txn.signTxn(account.sk)
	const { txid } = await algodClient.sendRawTransaction(signed).do()
	const confirmation = await algosdk.waitForConfirmation(algodClient, txid, 4)

	const appId = Number(confirmation.applicationIndex)
	if (!appId || appId <= 0) throw new Error(`El desplegament del contracte ha fallat - App ID obtingut: ${appId}`)

	// Verifica que l'app existeix a la cadena
	const appInfo = await algodClient.getApplicationByID(appId).do()
	if (!appInfo) throw new Error(`Contracte desplegat però l'app ${appId} no s'ha trobat a la cadena`)

	// Finança el compte de l'app (10 ALGO) per cobrir el MBR de les caixes de propostes/recomptes
	const appAddr = algosdk.getApplicationAddress(appId)
	const fundTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
		sender: account.addr,
		receiver: appAddr,
		amount: 10_000_000,
		suggestedParams: sp
	})

	const signedFund = fundTxn.signTxn(account.sk)
	const { txid: fundId } = await algodClient.sendRawTransaction(signedFund).do()
	await algosdk.waitForConfirmation(algodClient, fundId, 4)

	return appId
}

// ═════════════════════════════════════════════════════════════════════
// SUITE DE TESTS
// ═════════════════════════════════════════════════════════════════════

describe("Contracte de Governança - Tests d'integració", () => {
	beforeAll(async () => {
		await assertLocalNet()
		await bootstrapDevAccountsToKmd()

		const freshAppId = await deployFreshContract()
		client = createDemochainClient(freshAppId)
		console.log(`[test] Contracte nou desplegat - App ID ${freshAppId}`)
	})

	// --- Creació d'organitzacions --------------------------------------

	describe("Creació d'organitzacions", () => {
		it("crea una organització i afegeix l'organitzador al cens", async () => {
			const { orgId: currentOrgId, txId } = await client.createOrganization(
				signerPer(organizer),
				organizer.address,
				'Ajuntament de Test',
				'Organització de prova'
			)

			expect(currentOrgId).toBeGreaterThan(0)
			expect(txId).toBeTruthy()
			orgId = currentOrgId

			const org = await client.getOrganization(orgId)
			expect(org).not.toBeNull()
			expect(org!.name).toBe('Ajuntament de Test')
			expect(org!.description).toBe('Organització de prova')
			expect(org!.organizer).toBe(organizer.address)

			// L'organitzador s'afegeix automàticament al cens
			expect(await client.isInCensusChain(organizer.address, orgId)).toBe(true)
			expect(await client.getCensusMemberCount(orgId)).toBe(1)
		})

		it('apareix a getAllOrganizationIds', async () => {
			const ids = await client.getAllOrganizationIds()
			expect(ids).toContain(orgId)
		})

		it('rebutja el nom buit → org.empty-name', async () => {
			expect(client.createOrganization(signerPer(organizer), organizer.address, '', 'desc')).rejects.toThrow(
				/org\.empty-name/
			)
		})

		it('rebutja la descripció buida → org.empty-description', async () => {
			expect(client.createOrganization(signerPer(organizer), organizer.address, 'Vàlid', '')).rejects.toThrow(
				/org\.empty-description/
			)
		})

		it('rebutja el nom duplicat → org.already-exists', async () => {
			expect(
				client.createOrganization(
					signerPer(organizer),
					organizer.address,
					'Ajuntament de Test',
					'Altra descripció'
				)
			).rejects.toThrow(/org\.already-exists/)
		})
	})

	// --- Gestió del cens -----------------------------------------------

	describe('Gestió del cens', () => {
		it("l'organitzador afegeix membres al cens", async () => {
			await client.addToCensus(signerPer(organizer), organizer.address, orgId, [member1.address, member2.address])

			expect(await client.isInCensusChain(member1.address, orgId)).toBe(true)
			expect(await client.isInCensusChain(member2.address, orgId)).toBe(true)
			expect(await client.getCensusMemberCount(orgId)).toBe(3)
		})

		it('getCensusMembers retorna tots els membres', async () => {
			const membres = await client.getCensusMembers(orgId)
			expect(membres).toContain(organizer.address)
			expect(membres).toContain(member1.address)
			expect(membres).toContain(member2.address)
			expect(membres.length).toBe(3)
		})

		it("rebutja afegir al cens si no és l'organitzador → org.unauthorized", async () => {
			expect(client.addToCensus(signerPer(member1), member1.address, orgId, [outsider.address])).rejects.toThrow(
				/org\.unauthorized/
			)
		})

		it('rebutja afegir un membre duplicat → org.census.duplicated-address', async () => {
			expect(
				client.addToCensus(signerPer(organizer), organizer.address, orgId, [member1.address])
			).rejects.toThrow(/org\.census\.duplicated-address/)
		})

		it("l'organitzador elimina un membre del cens", async () => {
			await client.removeFromCensus(signerPer(organizer), organizer.address, orgId, [member2.address])
			expect(await client.isInCensusChain(member2.address, orgId)).toBe(false)
			expect(await client.getCensusMemberCount(orgId)).toBe(2)
		})

		it("rebutja eliminar del cens si no és l'organitzador → org.unauthorized", async () => {
			expect(
				client.removeFromCensus(signerPer(member1), member1.address, orgId, [organizer.address])
			).rejects.toThrow(/org\.unauthorized/)
		})

		it('rebutja eliminar una adreça no registrada → org.census.non-registered-address', async () => {
			expect(
				client.removeFromCensus(signerPer(organizer), organizer.address, orgId, [outsider.address])
			).rejects.toThrow(/org\.census\.non-registered-address/)
		})

		it('un extern no és al cens', async () => {
			expect(await client.isInCensusChain(outsider.address, orgId)).toBe(false)
		})

		it('torna a afegir member2 per als tests posteriors', async () => {
			await client.addToCensus(signerPer(organizer), organizer.address, orgId, [member2.address])
			expect(await client.getCensusMemberCount(orgId)).toBe(3)
		})
	})

	// --- Creació de propostes -----------------------------------------

	describe('Creació de propostes', () => {
		const inici = () => Math.floor(Date.now() / 1000)
		const final = () => inici() + 86400

		it('un membre del cens crea una proposta', async () => {
			const { proposalId: currentProposalId, txId } = await client.createProposal(
				signerPer(member1),
				member1.address,
				orgId,
				'Construir parc',
				'Proposta per construir un parc al centre',
				['Opció A', 'Opció B', 'Opció C'],
				inici(),
				final()
			)

			expect(currentProposalId).toBeGreaterThan(0)
			expect(txId).toBeTruthy()
			proposalId = currentProposalId

			const prop = await client.getProposal(proposalId)
			expect(prop).not.toBeNull()
			expect(prop!.title).toBe('Construir parc')
			expect(prop!.options).toEqual(['Opció A', 'Opció B', 'Opció C'])
			expect(prop!.orgId).toBe(orgId)
		})

		it('apareix a getAllProposalIds', async () => {
			const ids = await client.getAllProposalIds()
			expect(ids).toContain(proposalId)
		})

		it('el recompte comença a zero', async () => {
			const tally = await client.getApprovalTally(proposalId)
			expect(tally).not.toBeNull()
			expect(tally!.votesFor).toBe(0)
			expect(tally!.totalVotes).toBe(0)
		})

		it('rebutja un membre fora del cens → org.census.unauthorized', async () => {
			expect(
				client.createProposal(
					signerPer(outsider),
					outsider.address,
					orgId,
					'Intrús',
					'No hauria de funcionar',
					['A', 'B'],
					inici(),
					final()
				)
			).rejects.toThrow(/org\.census\.unauthorized/)
		})

		it('rebutja el títol buit → proposal.empty-title', async () => {
			expect(
				client.createProposal(
					signerPer(member1),
					member1.address,
					orgId,
					'',
					'Desc',
					['A', 'B'],
					inici(),
					final()
				)
			).rejects.toThrow(/proposal\.empty-title/)
		})

		it('rebutja la descripció buida → proposal.empty-description', async () => {
			expect(
				client.createProposal(
					signerPer(member1),
					member1.address,
					orgId,
					'Títol',
					'',
					['A', 'B'],
					inici(),
					final()
				)
			).rejects.toThrow(/proposal\.empty-description/)
		})

		it('rebutja menys de 2 opcions → proposal.too-few-options', async () => {
			expect(
				client.createProposal(
					signerPer(member1),
					member1.address,
					orgId,
					'Títol',
					'Desc',
					['Solo una'],
					inici(),
					final()
				)
			).rejects.toThrow(/proposal\.too-few-options/)
		})

		it('rebutja una opció buida → proposal.empty-option', async () => {
			expect(
				client.createProposal(
					signerPer(member1),
					member1.address,
					orgId,
					'Títol',
					'Desc',
					['A', ''],
					inici(),
					final()
				)
			).rejects.toThrow(/proposal\.empty-option/)
		})

		it('rebutja opcions duplicades → proposal.duplicated-option', async () => {
			expect(
				client.createProposal(
					signerPer(member1),
					member1.address,
					orgId,
					'Títol',
					'Desc',
					['Igual', 'Igual'],
					inici(),
					final()
				)
			).rejects.toThrow(/proposal\.duplicated-option/)
		})
	})

	// --- Votació d'aprovació -------------------------------------------

	describe("Votació d'aprovació", () => {
		it('member1 aprova la proposta', async () => {
			const txId = await client.castApprovalVote(signerPer(member1), member1.address, proposalId, orgId, true)
			expect(txId).toBeTruthy()

			expect(await client.hasApprovalVoted(member1.address, proposalId)).toBe(true)

			const tally = await client.getApprovalTally(proposalId)
			expect(tally!.votesFor).toBe(1)
			expect(tally!.totalVotes).toBe(1)
		})

		it("member2 rebutja la proposta (approve=false) - el recompte s'actualitza correctament", async () => {
			await client.castApprovalVote(signerPer(member2), member2.address, proposalId, orgId, false)

			const tally = await client.getApprovalTally(proposalId)
			expect(tally!.votesFor).toBe(1) // sense canvis - rebuig
			expect(tally!.totalVotes).toBe(2) // incrementat
		})

		it("l'organitzador aprova - s'assoleix el llindar 2/3", async () => {
			await client.castApprovalVote(signerPer(organizer), organizer.address, proposalId, orgId, true)

			const tally = await client.getApprovalTally(proposalId)
			expect(tally!.votesFor).toBe(2)
			expect(tally!.totalVotes).toBe(3)
			// 3 * 2 = 6 >= 2 * 3 = 6 → aprovada ✓
		})

		it('rebutja un vot duplicat → proposal.already-voted', async () => {
			expect(
				client.castApprovalVote(signerPer(member1), member1.address, proposalId, orgId, true)
			).rejects.toThrow(/proposal\.already-voted/)
		})

		it('rebutja un membre fora del cens → org.census.unauthorized', async () => {
			expect(
				client.castApprovalVote(signerPer(outsider), outsider.address, proposalId, orgId, true)
			).rejects.toThrow(/org\.census\.unauthorized/)
		})

		it('rebutja votar una proposta inexistent → proposal.not-found', async () => {
			expect(
				client.castApprovalVote(signerPer(member1), member1.address, asProposalId(99999), orgId, true)
			).rejects.toThrow(/proposal\.not-found/)
		})
	})

	// --- Votació d'elecció (preferencial) -----------------------------

	describe("Votació d'elecció (preferencial)", () => {
		beforeAll(async () => {
			// startingDate = now en el moment de crear la proposta.
			// Global.latest_timestamp d'Algorand va endarrerit ~3-4 s respecte el
			// rellotge real. Esperem un bloc complet per garantir que startingDate
			// ja ha passat abans d'enviar vots d'elecció.
			await new Promise(resolve => setTimeout(resolve, 4500))
		})
		it("rebutja el vot d'elecció en una proposta no aprovada → proposal.not-accepted", async () => {
			// Crea una segona proposta que ningú aprova
			const start = Math.floor(Date.now() / 1000)
			const { proposalId: pid2 } = await client.createProposal(
				signerPer(member1),
				member1.address,
				orgId,
				'Proposta sense aprovar',
				'Desc',
				['X', 'Y'],
				start,
				start + 86400
			)

			expect(client.castRankedVote(signerPer(member1), member1.address, pid2, orgId, [1, 0])).rejects.toThrow(
				/proposal\.not-accepted/
			)
		})

		it('emet un vot preferencial en una proposta aprovada', async () => {
			// 'proposalId' ha assolit el 2/3 d'aprovació al bloc anterior
			const txId = await client.castRankedVote(
				signerPer(organizer),
				organizer.address,
				proposalId,
				orgId,
				[2, 0, 1]
			)
			expect(txId).toBeTruthy()

			expect(await client.hasElectionVoted(organizer.address, proposalId)).toBe(true)
			expect(await client.getElectionVoterCount(proposalId)).toBe(1)
		})

		it('llegeix les paperetes correctament', async () => {
			const paperetes = await client.getElectionBallots(proposalId)
			expect(paperetes.length).toBe(1)
			expect(paperetes[0]).toEqual([2, 0, 1])
		})

		it("rebutja un vot d'elecció duplicat → election.already-voted", async () => {
			expect(
				client.castRankedVote(signerPer(organizer), organizer.address, proposalId, orgId, [0, 1, 2])
			).rejects.toThrow(/election\.already-voted/)
		})

		it('rebutja un ordre de preferències invàlid → election.missing-options', async () => {
			expect(
				client.castRankedVote(
					signerPer(member1),
					member1.address,
					proposalId,
					orgId,
					[0, 0, 1] // 0 duplicat, falta el 2
				)
			).rejects.toThrow(/election\.missing-options/)
		})

		it('rebutja un membre fora del cens → org.census.unauthorized', async () => {
			expect(
				client.castRankedVote(signerPer(outsider), outsider.address, proposalId, orgId, [0, 1, 2])
			).rejects.toThrow(/org\.census\.unauthorized/)
		})

		it('member1 també vota - múltiples paperetes', async () => {
			await client.castRankedVote(signerPer(member1), member1.address, proposalId, orgId, [1, 2, 0])

			expect(await client.getElectionVoterCount(proposalId)).toBe(2)
			const paperetes = await client.getElectionBallots(proposalId)
			expect(paperetes.length).toBe(2)
		})
	})
})
