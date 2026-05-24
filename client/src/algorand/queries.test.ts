import type { OnChainProposal, OnChainApprovalTally, OnChainOrganization } from './wire'

import { describe, it, expect } from 'bun:test'

import { asAddress, asOrganizationId } from '@/domain'

import { mapToProposal, mapToOrganization } from './mappers'

const propostaOnChain: OnChainProposal = {
	orgId: asOrganizationId(1),
	title: 'Proposta de prova',
	description: 'Una descripció',
	options: ['Opció A', 'Opció B', 'Opció C'],
	startingDate: 1_000_000,
	endingDate: 2_000_000
}

const recompte: OnChainApprovalTally = {
	votesFor: 2,
	totalVotes: 3
}

const orgOnChain: OnChainOrganization = {
	orgId: asOrganizationId(5),
	name: 'Org',
	description: 'Desc',
	organizer: asAddress('A'.repeat(58)),
	memberCount: 0
}

describe('mapToProposal', () => {
	it('genera IDs tipats (branded)', () => {
		const proposal = mapToProposal(3, propostaOnChain, recompte, 6, 500_000)

		expect(proposal.id as number).toBe(3)
		expect(proposal.orgId as number).toBe(1)
	})

	it('mapeja les opcions amb IDs numèrics que comencen per 0', () => {
		const proposal = mapToProposal(1, propostaOnChain, recompte, 6, 500_000)

		expect(proposal.options).toEqual([
			{ id: 0, title: 'Opció A' },
			{ id: 1, title: 'Opció B' },
			{ id: 2, title: 'Opció C' }
		])
	})

	it('conserva les dates en segons UNIX sense modificar-les', () => {
		const proposal = mapToProposal(1, propostaOnChain, recompte, 6, 500_000)

		expect(proposal.startDate).toBe(propostaOnChain.startingDate)
		expect(proposal.endDate).toBe(propostaOnChain.endingDate)
	})

	it('exposa approvalTally i memberCount directament', () => {
		const proposal = mapToProposal(1, propostaOnChain, recompte, 6, 500_000)

		expect(proposal.approvalTally.votesFor).toBe(2)
		expect(proposal.memberCount).toBe(6)
	})

	it("calcula PendingApproval quan now < startDate i el llindar no s'ha assolit", () => {
		const proposal = mapToProposal(1, propostaOnChain, { votesFor: 0, totalVotes: 0 }, 3, 500_000)

		expect(proposal.state.kind).toBe('PendingApproval')
	})

	it('calcula Open quan està aprovada i startDate <= now < endDate', () => {
		// 3 vots de 3 membres = aprovada; now és entre l'inici i el final
		const proposal = mapToProposal(1, propostaOnChain, { votesFor: 3, totalVotes: 3 }, 3, 1_500_000)

		expect(proposal.state.kind).toBe('Open')
	})

	it('calcula PendingStart quan està aprovada però now < startDate', () => {
		const proposal = mapToProposal(1, propostaOnChain, { votesFor: 3, totalVotes: 3 }, 3, 500_000)

		expect(proposal.state.kind).toBe('PendingStart')
	})

	it('calcula Rejected quan startDate <= now < endDate i no aprovada', () => {
		const proposal = mapToProposal(1, propostaOnChain, { votesFor: 0, totalVotes: 0 }, 3, 1_500_000)

		expect(proposal.state.kind).toBe('Rejected')
	})

	it('calcula Closed quan now >= endDate', () => {
		const proposal = mapToProposal(1, propostaOnChain, recompte, 3, 3_000_000)

		expect(proposal.state.kind).toBe('Closed')
	})
})

describe('mapToOrganization', () => {
	it("genera l'ID tipat (branded) i memberCount", () => {
		const org = mapToOrganization(5, orgOnChain, 10)

		expect(org.id as number).toBe(5)
		expect(org.memberCount).toBe(10)
	})

	it('trasllada el nom i la descripció sense modificar-los', () => {
		const org = mapToOrganization(5, orgOnChain, 0)

		expect(org.name).toBe('Org')
		expect(org.description).toBe('Desc')
	})
})
