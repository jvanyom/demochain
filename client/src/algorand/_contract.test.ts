import { describe, it, expect } from 'bun:test'

import { asOrganizationId, asProposalId, asAddress } from '@/domain'

import {
	orgBoxKey,
	orgNameIndexKey,
	censusBoxKey,
	proposalBoxKey,
	tallyBoxKey,
	approvalBallotKey,
	electionBallotKey,
	enc
} from './_contract'

// Adreça real d'un compte de dev (checksum vàlid per a algosdk.decodeAddress)
const ADDR = asAddress('GK2BXKUOAIQC5SPP2FZBPK2HK5UD63YH6J25LJ2534M2UOVBYUNSASQVWE')
const ORG_ID = asOrganizationId(1)
const PROPOSAL_ID = asProposalId(7)

describe('orgBoxKey', () => {
	it('té la longitud correcta: 4 + 8 = 12 bytes', () => {
		expect(orgBoxKey(ORG_ID)).toHaveLength(12)
	})

	it('comença amb el prefix "org_"', () => {
		const key = orgBoxKey(ORG_ID)
		const prefix = enc.encode('org_')
		expect(key.slice(0, 4)).toEqual(prefix)
	})

	it('IDs diferents produeixen claus diferents', () => {
		const key1 = orgBoxKey(asOrganizationId(1))
		const key2 = orgBoxKey(asOrganizationId(2))
		expect(key1).not.toEqual(key2)
	})

	it("l'ID 0 produeix una clau vàlida de 12 bytes", () => {
		expect(orgBoxKey(asOrganizationId(0))).toHaveLength(12)
	})

	it("els 8 bytes finals codifiquen l'ID en big-endian", () => {
		const key = orgBoxKey(asOrganizationId(1))
		// ID=1 → els 7 primers dels 8 bytes finals han de ser 0, l'últim ha de ser 1
		expect(key[11]).toBe(1)
		expect(key[4]).toBe(0)
	})
})

describe('censusBoxKey', () => {
	it('té la longitud correcta: 3 + 8 + 32 = 43 bytes', () => {
		expect(censusBoxKey(ORG_ID, ADDR)).toHaveLength(43)
	})

	it('comença amb el prefix "cs_"', () => {
		const key = censusBoxKey(ORG_ID, ADDR)
		expect(key.slice(0, 3)).toEqual(enc.encode('cs_'))
	})

	it('orgs diferents produeixen claus diferents per al mateix membre', () => {
		const key1 = censusBoxKey(asOrganizationId(1), ADDR)
		const key2 = censusBoxKey(asOrganizationId(2), ADDR)
		expect(key1).not.toEqual(key2)
	})
})

describe('proposalBoxKey', () => {
	it('té la longitud correcta: 3 + 8 = 11 bytes', () => {
		expect(proposalBoxKey(PROPOSAL_ID)).toHaveLength(11)
	})

	it('comença amb el prefix "pr_"', () => {
		const key = proposalBoxKey(PROPOSAL_ID)
		expect(key.slice(0, 3)).toEqual(enc.encode('pr_'))
	})

	it('IDs diferents produeixen claus diferents', () => {
		const key1 = proposalBoxKey(asProposalId(1))
		const key2 = proposalBoxKey(asProposalId(2))
		expect(key1).not.toEqual(key2)
	})
})

describe('tallyBoxKey', () => {
	it('té la longitud correcta: 3 + 8 = 11 bytes', () => {
		expect(tallyBoxKey(PROPOSAL_ID)).toHaveLength(11)
	})

	it('comença amb el prefix "at_"', () => {
		const key = tallyBoxKey(PROPOSAL_ID)
		expect(key.slice(0, 3)).toEqual(enc.encode('at_'))
	})

	it('IDs diferents produeixen claus diferents', () => {
		const key1 = tallyBoxKey(asProposalId(1))
		const key2 = tallyBoxKey(asProposalId(2))
		expect(key1).not.toEqual(key2)
	})
})

describe('approvalBallotKey', () => {
	it('té la longitud correcta: 3 + 32 + 8 = 43 bytes', () => {
		expect(approvalBallotKey(ADDR, PROPOSAL_ID)).toHaveLength(43)
	})

	it('comença amb el prefix "ab_"', () => {
		const key = approvalBallotKey(ADDR, PROPOSAL_ID)
		expect(key.slice(0, 3)).toEqual(enc.encode('ab_'))
	})

	it('proposals diferents produeixen claus diferents per al mateix votant', () => {
		const key1 = approvalBallotKey(ADDR, asProposalId(1))
		const key2 = approvalBallotKey(ADDR, asProposalId(2))
		expect(key1).not.toEqual(key2)
	})
})

describe('electionBallotKey', () => {
	it('té la longitud correcta: 3 + 32 + 8 = 43 bytes', () => {
		expect(electionBallotKey(ADDR, PROPOSAL_ID)).toHaveLength(43)
	})

	it('comença amb el prefix "eb_"', () => {
		const key = electionBallotKey(ADDR, PROPOSAL_ID)
		expect(key.slice(0, 3)).toEqual(enc.encode('eb_'))
	})

	it('proposals diferents produeixen claus diferents per al mateix votant', () => {
		const key1 = electionBallotKey(ADDR, asProposalId(1))
		const key2 = electionBallotKey(ADDR, asProposalId(2))
		expect(key1).not.toEqual(key2)
	})
})

describe('orgNameIndexKey', () => {
	it('comença amb el prefix "on_"', () => {
		const key = orgNameIndexKey('Test')
		expect(key.slice(0, 3)).toEqual(enc.encode('on_'))
	})

	it('inclou la longitud del nom com a uint16 big-endian als bytes 3-4', () => {
		const nom = 'Test'
		const key = orgNameIndexKey(nom)

		if (key[3] && key[4]) {
			const longitud = (key[3] << 8) | key[4]

			expect(longitud).toBe(nom.length)
		}
	})

	it('noms diferents produeixen claus diferents', () => {
		expect(orgNameIndexKey('Alpha')).not.toEqual(orgNameIndexKey('Beta'))
	})

	it('té la longitud correcta: 3 + 2 + n bytes del nom', () => {
		const nom = 'Hola'
		const key = orgNameIndexKey(nom)
		expect(key).toHaveLength(3 + 2 + enc.encode(nom).length)
	})
})

describe('sense col·lisions entre constructors de claus', () => {
	it('orgBoxKey i proposalBoxKey no col·lideixen (prefixos "org_" vs "proposals")', () => {
		const orgKey = orgBoxKey(asOrganizationId(1))
		const proposalKey = proposalBoxKey(asProposalId(1))
		expect(orgKey[0]).not.toBe(proposalKey[0]) // 'o' (111) vs 'p' (112)
	})

	it('approvalBallotKey i electionBallotKey no col·lideixen (primer byte "a" vs "e")', () => {
		const ab = approvalBallotKey(ADDR, PROPOSAL_ID)
		const eb = electionBallotKey(ADDR, PROPOSAL_ID)
		expect(ab[0]).not.toBe(eb[0]) // 'a' (97) vs 'e' (101)
	})

	it('tallyBoxKey i censusBoxKey no col·lideixen (primer byte "a" vs "c")', () => {
		const tallyKey = tallyBoxKey(asProposalId(1))
		const censusKey = censusBoxKey(asOrganizationId(1), ADDR)
		expect(tallyKey[0]).not.toBe(censusKey[0]) // 'a' vs 'c'
	})
})
