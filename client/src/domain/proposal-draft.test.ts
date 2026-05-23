import { describe, it, expect } from 'bun:test'

import {
	proposalDraftOptionsSchema,
	proposalDraftBasicsSchema,
	proposalDraftDatesSchema,
	proposalDraftSchema,
	proposalFormSchema
} from './proposal-draft'

const APPROVAL_BUFFER_DAYS = 3

function futureDate(daysFromNow: number): Date {
	const date = new Date()
	date.setDate(date.getDate() + daysFromNow)
	date.setHours(0, 0, 0, 0)
	return date
}

function errorCodes(result: { success: boolean; error?: { issues: { message: string }[] } }): string[] {
	if (result.success || !result.error) return []
	return result.error.issues.map(i => i.message)
}

describe('proposalDraftBasicsSchema', () => {
	it('passa amb títol i descripció no buits', () => {
		const result = proposalDraftBasicsSchema.safeParse({ title: 'La meva proposta', description: 'Alguns detalls' })

		expect(result.success).toBeTrue()
	})

	it('falla amb títol buit → proposal.empty-title', () => {
		const result = proposalDraftBasicsSchema.safeParse({ title: '', description: 'Alguns detalls' })

		expect(result.success).toBeFalse()
		expect(errorCodes(result)).toContain('proposal.empty-title')
	})

	it("falla amb títol d'espais → proposal.empty-title", () => {
		const result = proposalDraftBasicsSchema.safeParse({ title: '   ', description: 'Alguns detalls' })

		expect(result.success).toBeFalse()
		expect(errorCodes(result)).toContain('proposal.empty-title')
	})

	it('falla amb descripció buida → proposal.empty-description', () => {
		const result = proposalDraftBasicsSchema.safeParse({ title: 'La meva proposta', description: '' })

		expect(result.success).toBeFalse()
		expect(errorCodes(result)).toContain('proposal.empty-description')
	})

	it("falla amb descripció d'espais → proposal.empty-description", () => {
		const result = proposalDraftBasicsSchema.safeParse({ title: 'La meva proposta', description: '  ' })

		expect(result.success).toBeFalse()
		expect(errorCodes(result)).toContain('proposal.empty-description')
	})
})

describe('proposalDraftDatesSchema', () => {
	it("passa quan l'inici és 4+ dies endavant i el final és 2+ dies després", () => {
		const result = proposalDraftDatesSchema.safeParse({
			startDate: futureDate(APPROVAL_BUFFER_DAYS + 1),
			endDate: futureDate(APPROVAL_BUFFER_DAYS + 3)
		})

		expect(result.success).toBeTrue()
	})

	it("falla quan l'inici és menys de 3 dies endavant → proposal.starting-too-soon", () => {
		const result = proposalDraftDatesSchema.safeParse({
			startDate: futureDate(1),
			endDate: futureDate(5)
		})

		expect(result.success).toBeFalse()
		expect(errorCodes(result)).toContain('proposal.starting-too-soon')
	})

	it("falla quan el final és igual a l'inici → proposal.small-voting-window", () => {
		const start = futureDate(APPROVAL_BUFFER_DAYS + 1)
		const result = proposalDraftDatesSchema.safeParse({
			startDate: start,
			endDate: new Date(start)
		})

		expect(result.success).toBeFalse()
		expect(errorCodes(result)).toContain('proposal.small-voting-window')
	})

	it("falla quan el final és menys d'1 dia després de l'inici → proposal.small-voting-window", () => {
		const result = proposalDraftDatesSchema.safeParse({
			startDate: futureDate(APPROVAL_BUFFER_DAYS + 1),
			endDate: futureDate(APPROVAL_BUFFER_DAYS + 1.9)
		})

		expect(result.success).toBeFalse()
		expect(errorCodes(result)).toContain('proposal.small-voting-window')
	})

	it("passa quan el final és més d'1 dia després de l'inici", () => {
		const result = proposalDraftDatesSchema.safeParse({
			startDate: futureDate(APPROVAL_BUFFER_DAYS + 1),
			endDate: futureDate(APPROVAL_BUFFER_DAYS + 4)
		})

		expect(result.success).toBeTrue()
	})
})

describe('proposalDraftOptionsSchema', () => {
	it('passa amb 2 opcions úniques no buides', () => {
		const result = proposalDraftOptionsSchema.safeParse({ options: ['Opció A', 'Opció B'] })

		expect(result.success).toBeTrue()
	})

	it('falla amb només 1 opció → proposal.too-few-options', () => {
		const result = proposalDraftOptionsSchema.safeParse({ options: ['Només una'] })

		expect(result.success).toBeFalse()
		expect(errorCodes(result)).toContain('proposal.too-few-options')
	})

	it('falla amb 0 opcions → proposal.too-few-options', () => {
		const result = proposalDraftOptionsSchema.safeParse({ options: [] })

		expect(result.success).toBeFalse()
		expect(errorCodes(result)).toContain('proposal.too-few-options')
	})

	it('falla amb una opció buida → proposal.empty-options', () => {
		const result = proposalDraftOptionsSchema.safeParse({ options: ['Opció A', 'Opció B', ''] })

		expect(result.success).toBeFalse()
		expect(errorCodes(result)).toContain('proposal.empty-options')
	})

	it("falla amb una opció d'espais → proposal.empty-options", () => {
		const result = proposalDraftOptionsSchema.safeParse({ options: ['Opció A', 'Opció B', '   '] })

		expect(result.success).toBeFalse()
		expect(errorCodes(result)).toContain('proposal.empty-options')
	})

	it('falla amb opcions duplicades (insensible a majúscules) → proposal.duplicated-options', () => {
		const result = proposalDraftOptionsSchema.safeParse({ options: ['Opció A', 'opció a'] })

		expect(result.success).toBeFalse()
		expect(errorCodes(result)).toContain('proposal.duplicated-options')
	})

	it('passa amb 3 opcions úniques', () => {
		const result = proposalDraftOptionsSchema.safeParse({ options: ['A', 'B', 'C'] })

		expect(result.success).toBeTrue()
	})
})

describe('proposalDraftSchema (complet)', () => {
	it('passa amb totes les dades vàlides', () => {
		const result = proposalDraftSchema.safeParse({
			title: 'La meva proposta',
			description: 'Una descripció detallada',
			startDate: futureDate(APPROVAL_BUFFER_DAYS + 1),
			endDate: futureDate(APPROVAL_BUFFER_DAYS + 3),
			options: ['Opció A', 'Opció B']
		})

		expect(result.success).toBeTrue()
	})

	it('informa de tots els errors quan tot és invàlid', () => {
		const result = proposalDraftSchema.safeParse({
			title: '',
			description: '',
			startDate: futureDate(1),
			endDate: futureDate(1),
			options: ['única']
		})

		expect(result.success).toBeFalse()

		const codes = errorCodes(result)
		expect(codes).toContain('proposal.empty-title')
		expect(codes).toContain('proposal.empty-description')
		expect(codes).toContain('proposal.starting-too-soon')
		expect(codes).toContain('proposal.too-few-options')
	})
})

describe('proposalFormSchema', () => {
	// startDate i endDate són cadenes en format datetime-local.
	// Dates al futur llunyà per evitar el marge d'aprovació de 3 dies en validació de producció.
	const VALID_START = '2099-01-01T00:00'
	const VALID_END = '2099-01-05T00:00'

	function validBase() {
		return {
			orgId: '1',
			title: 'La meva proposta',
			description: 'Una descripció',
			startDate: VALID_START,
			endDate: VALID_END,
			options: [{ value: 'Opció A' }, { value: 'Opció B' }]
		}
	}

	it('passa amb totes les dades vàlides', () => {
		expect(proposalFormSchema.safeParse(validBase()).success).toBeTrue()
	})

	it('falla amb orgId buit → org.required', () => {
		const result = proposalFormSchema.safeParse({ ...validBase(), orgId: '' })

		expect(result.success).toBeFalse()
		expect(errorCodes(result)).toContain('org.required')
	})

	it('falla amb startDate buit → proposal.starting-too-soon', () => {
		const result = proposalFormSchema.safeParse({ ...validBase(), startDate: '' })

		expect(result.success).toBeFalse()
		expect(errorCodes(result)).toContain('proposal.starting-too-soon')
	})

	it('falla amb endDate buit → proposal.small-voting-window', () => {
		const result = proposalFormSchema.safeParse({ ...validBase(), endDate: '' })

		expect(result.success).toBeFalse()
		expect(errorCodes(result)).toContain('proposal.small-voting-window')
	})

	it('falla amb opcions duplicades (insensible a majúscules) → proposal.duplicated-options', () => {
		const result = proposalFormSchema.safeParse({
			...validBase(),
			options: [{ value: 'Opció A' }, { value: 'opció a' }]
		})

		expect(result.success).toBeFalse()
		expect(errorCodes(result)).toContain('proposal.duplicated-options')
	})

	it('falla amb una opció en blanc → proposal.empty-options', () => {
		const result = proposalFormSchema.safeParse({
			...validBase(),
			options: [{ value: 'Opció A' }, { value: 'Opció B' }, { value: '' }]
		})

		expect(result.success).toBeFalse()
		expect(errorCodes(result)).toContain('proposal.empty-options')
	})

	it('falla amb una sola opció → proposal.too-few-options', () => {
		const result = proposalFormSchema.safeParse({ ...validBase(), options: [{ value: 'Única' }] })

		expect(result.success).toBeFalse()
		expect(errorCodes(result)).toContain('proposal.too-few-options')
	})

	it("falla quan startDate és en el futur proper (per sota del marge d'aprovació) → proposal.starting-too-soon", () => {
		const futureProper = futureDate(1).toISOString().slice(0, 16)
		const result = proposalFormSchema.safeParse({ ...validBase(), startDate: futureProper })

		expect(result.success).toBeFalse()
		expect(errorCodes(result)).toContain('proposal.starting-too-soon')
	})
})
