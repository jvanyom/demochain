import { describe, it, expect } from 'bun:test'

import { organizationDraftSchema } from './organization-draft'

function errorMessages(result: { success: boolean; error?: { issues: { message: string }[] } }): string[] {
	if (result.success || !result.error) return []

	return result.error.issues.map(i => i.message)
}

describe('organizationDraftSchema', () => {
	it('passa amb un nom i una descripció vàlids', () => {
		const result = organizationDraftSchema.safeParse({ name: 'La meva org', description: 'Una descripció' })

		expect(result.success).toBeTrue()
	})

	it('elimina els espais laterals del nom i la descripció', () => {
		const result = organizationDraftSchema.safeParse({ name: '  La meva org  ', description: '  Desc  ' })

		expect(result.success).toBeTrue()
	})

	it('falla amb un nom buit → org.empty-name', () => {
		const result = organizationDraftSchema.safeParse({ name: '', description: 'Desc' })

		expect(result.success).toBeFalse()
		expect(errorMessages(result)).toContain('org.empty-name')
	})

	it("falla amb un nom d'espais → org.empty-name", () => {
		const result = organizationDraftSchema.safeParse({ name: '   ', description: 'Desc' })

		expect(result.success).toBeFalse()
		expect(errorMessages(result)).toContain('org.empty-name')
	})

	it('falla amb una descripció buida → org.empty-description', () => {
		const result = organizationDraftSchema.safeParse({ name: 'La meva org', description: '' })

		expect(result.success).toBeFalse()
		expect(errorMessages(result)).toContain('org.empty-description')
	})

	it("falla amb una descripció d'espais → org.empty-description", () => {
		const result = organizationDraftSchema.safeParse({ name: 'La meva org', description: '  ' })

		expect(result.success).toBeFalse()
		expect(errorMessages(result)).toContain('org.empty-description')
	})

	it('informa dels dos errors quan tant el nom com la descripció són buits', () => {
		const result = organizationDraftSchema.safeParse({ name: '', description: '' })

		expect(result.success).toBeFalse()

		const codes = errorMessages(result)
		expect(codes).toContain('org.empty-name')
		expect(codes).toContain('org.empty-description')
	})

	it('un caràcter és suficient per al nom', () => {
		const result = organizationDraftSchema.safeParse({ name: 'X', description: 'Desc' })

		expect(result.success).toBeTrue()
	})

	it('un caràcter és suficient per a la descripció', () => {
		const result = organizationDraftSchema.safeParse({ name: 'Nom', description: 'D' })

		expect(result.success).toBeTrue()
	})

	it('accepta caràcters Unicode (accents, emojis)', () => {
		const result = organizationDraftSchema.safeParse({
			name: 'Comunitat Veïnal',
			description: 'Gestió democràtica 🗳️'
		})

		expect(result.success).toBeTrue()
	})

	it('elimina salts de línia laterals del nom', () => {
		const result = organizationDraftSchema.safeParse({
			name: '\n  La meva org  \n',
			description: 'Desc'
		})

		expect(result.success).toBeTrue()
		if (result.success) expect(result.data.name).toBe('La meva org')
	})

	it('nom amb salt de línia entremig és vàlid (trim no afecta el contingut intern)', () => {
		const result = organizationDraftSchema.safeParse({
			name: 'Alpha\nBeta',
			description: 'Desc'
		})

		expect(result.success).toBeTrue()
	})

	it('falla amb nom de més de 100 caràcters → org.name-too-long', () => {
		const result = organizationDraftSchema.safeParse({ name: 'a'.repeat(101), description: 'Desc' })

		expect(result.success).toBeFalse()
		expect(errorMessages(result)).toContain('org.name-too-long')
	})

	it('passa amb nom de exactament 100 caràcters', () => {
		const result = organizationDraftSchema.safeParse({ name: 'a'.repeat(100), description: 'Desc' })

		expect(result.success).toBeTrue()
	})

	it('falla amb descripció de més de 1000 caràcters → org.description-too-long', () => {
		const result = organizationDraftSchema.safeParse({ name: 'Nom', description: 'a'.repeat(1001) })

		expect(result.success).toBeFalse()
		expect(errorMessages(result)).toContain('org.description-too-long')
	})

	it('passa amb descripció de exactament 1000 caràcters', () => {
		const result = organizationDraftSchema.safeParse({ name: 'Nom', description: 'a'.repeat(1000) })

		expect(result.success).toBeTrue()
	})
})
