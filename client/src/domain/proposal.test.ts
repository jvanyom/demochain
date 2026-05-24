import type { Proposal } from './proposal'

import { describe, it, expect } from 'bun:test'

import { approvalPercentage, asProposalId } from './proposal'

function mockProposal(votesFor: number, memberCount: number): Proposal {
	// oxlint-disable-next-line no-unsafe-type-assertion
	return {
		approvalTally: { votesFor, totalVotes: votesFor },
		memberCount
	} as Proposal
}

describe('approvalPercentage', () => {
	it('retorna 0 quan memberCount és zero', () => {
		expect(approvalPercentage(mockProposal(0, 0))).toBe(0)
	})

	it('retorna 0 quan no hi ha vots però memberCount > 0', () => {
		expect(approvalPercentage(mockProposal(0, 10))).toBe(0)
	})

	it('retorna 100 quan tots els membres han votat a favor', () => {
		expect(approvalPercentage(mockProposal(10, 10))).toBe(100)
	})

	it('retorna 50 quan exactament la meitat ha votat a favor', () => {
		expect(approvalPercentage(mockProposal(5, 10))).toBe(50)
	})

	it('arrodoneix cap avall per a 1/3 (33,33…) → 33', () => {
		expect(approvalPercentage(mockProposal(1, 3))).toBe(33)
	})

	it('arrodoneix cap amunt per a 2/3 (66,66…) → 67', () => {
		expect(approvalPercentage(mockProposal(2, 3))).toBe(67)
	})

	it('retorna 0 per a memberCount negatiu (tractat com ≤ 0)', () => {
		expect(approvalPercentage(mockProposal(5, -1))).toBe(0)
	})

	it('membre únic aprova → 100%', () => {
		expect(approvalPercentage(mockProposal(1, 1))).toBe(100)
	})

	it('membre únic no aprova → 0%', () => {
		expect(approvalPercentage(mockProposal(0, 1))).toBe(0)
	})

	it('100 de 150 membres → 67%', () => {
		expect(approvalPercentage(mockProposal(100, 150))).toBe(67)
	})

	it('1 de 4 membres → 25%', () => {
		expect(approvalPercentage(mockProposal(1, 4))).toBe(25)
	})

	it('3 de 4 membres → 75%', () => {
		expect(approvalPercentage(mockProposal(3, 4))).toBe(75)
	})
})

describe('asProposalId', () => {
	it('accepta el 0', () => {
		expect(asProposalId(0)).toBeNumber()
	})

	it('accepta enters positius', () => {
		expect(asProposalId(42)).toBeNumber()
	})

	it('llança error per a nombres negatius', () => {
		expect(() => asProposalId(-1)).toThrow()
	})

	it('llança error per a nombres decimals', () => {
		expect(() => asProposalId(1.5)).toThrow()
	})
})
