import { describe, it, expect } from 'bun:test'

import { computeProposalState, isApproved } from './proposal-state'

const HORA = 3600
const DIA = 24 * HORA

describe('isApproved', () => {
	it('retorna false quan memberCount és zero', () => {
		expect(isApproved({ votesFor: 0, totalVotes: 0 }, 0)).toBeFalse()
	})

	it('retorna true exactament al llindar 2/3', () => {
		// 2 de 3 → 3·2 = 6 ≥ 2·3 = 6
		expect(isApproved({ votesFor: 2, totalVotes: 2 }, 3)).toBeTrue()
	})

	it('retorna false just per sota del llindar 2/3', () => {
		// 1 de 3 → 3·1 = 3 < 2·3 = 6
		expect(isApproved({ votesFor: 1, totalVotes: 1 }, 3)).toBeFalse()
	})

	it('retorna true quan votesFor supera 2/3', () => {
		expect(isApproved({ votesFor: 5, totalVotes: 5 }, 6)).toBeTrue()
	})
})

describe('computeProposalState', () => {
	const ara = 1_700_000_000

	it('retorna PendingApproval quan és abans de startDate i per sota del llindar', () => {
		const estat = computeProposalState({
			now: ara,
			startDate: ara + DIA,
			endDate: ara + 2 * DIA,
			approvalTally: { votesFor: 0, totalVotes: 0 },
			memberCount: 10
		})

		expect(estat.kind).toBe('PendingApproval')

		if (estat.kind === 'PendingApproval') {
			expect(estat.approvalTally.votesFor).toBe(0)
			expect(estat.memberCount).toBe(10)
		}
	})

	it("retorna PendingStart quan s'ha assolit el llindar però és abans de startDate", () => {
		const estat = computeProposalState({
			now: ara,
			startDate: ara + DIA,
			endDate: ara + 2 * DIA,
			approvalTally: { votesFor: 7, totalVotes: 7 },
			memberCount: 10
		})

		expect(estat.kind).toBe('PendingStart')
	})

	it("retorna Open quan s'ha assolit el llindar i s'és dins la finestra de votació", () => {
		const estat = computeProposalState({
			now: ara,
			startDate: ara - HORA,
			endDate: ara + DIA,
			approvalTally: { votesFor: 7, totalVotes: 7 },
			memberCount: 10
		})

		expect(estat.kind).toBe('Open')
	})

	it('retorna Rejected quan ha passat startDate sense assolir el llindar', () => {
		const estat = computeProposalState({
			now: ara,
			startDate: ara - HORA,
			endDate: ara + DIA,
			approvalTally: { votesFor: 2, totalVotes: 5 },
			memberCount: 10
		})

		expect(estat.kind).toBe('Rejected')

		if (estat.kind === 'Rejected') {
			expect(estat.approvalTally.votesFor).toBe(2)
			expect(estat.memberCount).toBe(10)
		}
	})

	it("retorna Closed quan s'ha assolit endDate, independentment de l'aprovació", () => {
		const estatAprovada = computeProposalState({
			now: ara,
			startDate: ara - 2 * DIA,
			endDate: ara - HORA,
			approvalTally: { votesFor: 7, totalVotes: 7 },
			memberCount: 10
		})

		expect(estatAprovada.kind).toBe('Closed')

		const estatRebutjada = computeProposalState({
			now: ara,
			startDate: ara - 2 * DIA,
			endDate: ara - HORA,
			approvalTally: { votesFor: 1, totalVotes: 5 },
			memberCount: 10
		})

		expect(estatRebutjada.kind).toBe('Closed')
	})

	it('retorna Open quan now === startDate exactament i aprovada', () => {
		const estat = computeProposalState({
			now: ara,
			startDate: ara,
			endDate: ara + DIA,
			approvalTally: { votesFor: 7, totalVotes: 7 },
			memberCount: 10
		})

		expect(estat.kind).toBe('Open')
	})

	it('retorna Rejected quan now === startDate exactament i no aprovada', () => {
		const estat = computeProposalState({
			now: ara,
			startDate: ara,
			endDate: ara + DIA,
			approvalTally: { votesFor: 1, totalVotes: 5 },
			memberCount: 10
		})

		expect(estat.kind).toBe('Rejected')
	})

	it('retorna Closed quan now === endDate exactament', () => {
		const estat = computeProposalState({
			now: ara,
			startDate: ara - DIA,
			endDate: ara,
			approvalTally: { votesFor: 7, totalVotes: 7 },
			memberCount: 10
		})

		expect(estat.kind).toBe('Closed')
	})

	it('mai aprova amb zero membres', () => {
		const estat = computeProposalState({
			now: ara,
			startDate: ara + DIA,
			endDate: ara + 2 * DIA,
			approvalTally: { votesFor: 0, totalVotes: 0 },
			memberCount: 0
		})

		expect(estat.kind).toBe('PendingApproval')
	})
})
