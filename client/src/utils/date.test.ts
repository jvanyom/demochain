import { describe, it, expect } from 'bun:test'

import { dateToUnix, formatDate, formatDatetime } from './date'

describe('dateToUnix', () => {
	it("converteix l'época Unix a 0", () => {
		expect(dateToUnix(new Date(0))).toBe(0)
	})

	it('converteix un timestamp conegut correctament', () => {
		// 2024-01-01T00:00:00.000Z → 1704067200
		expect(dateToUnix(new Date('2024-01-01T00:00:00.000Z'))).toBe(1704067200)
	})

	it('trunca els mil·lisegons (floor, no round)', () => {
		// 1999 ms → 1 segon complet (no arrodoneix a 2)
		expect(dateToUnix(new Date(1999))).toBe(1)
	})

	it('gestiona timestamps a mig segon truncant-los', () => {
		expect(dateToUnix(new Date(500))).toBe(0)
	})
})

describe('formatDate', () => {
	const UNIX_2024 = 1704067200 // 2024-01-01T00:00:00.000Z

	it("formata amb locale 'en' i conté l'any 2024", () => {
		const result = formatDate(UNIX_2024, 'en')
		expect(result).toContain('2024')
	})

	it("formata amb locale 'ca' sense llançar cap error", () => {
		expect(() => formatDate(UNIX_2024, 'ca')).not.toThrow()
	})

	it("formata amb locale 'es' sense llançar cap error", () => {
		expect(() => formatDate(UNIX_2024, 'es')).not.toThrow()
	})

	it("retrocedeix a l'anglès per a un locale desconegut", () => {
		const resultDesconegut = formatDate(UNIX_2024, 'xx')
		const resultEn = formatDate(UNIX_2024, 'en')
		expect(resultDesconegut).toBe(resultEn)
	})

	it('retorna una cadena de text formatada (no el número brut)', () => {
		const result = formatDate(UNIX_2024, 'en')
		expect(typeof result).toBe('string')
		expect(result).not.toBe(String(UNIX_2024))
	})
})

describe('formatDatetime', () => {
	// 2024-01-01T12:00:00.000Z
	const UNIX_NOON = 1704110400

	it("formata amb locale 'en' i conté l'any 2024", () => {
		const result = formatDatetime(UNIX_NOON, 'en')
		expect(result).toContain('2024')
	})

	it("formata amb locale 'en' i conté els minuts (':00')", () => {
		const result = formatDatetime(UNIX_NOON, 'en')
		expect(result).toContain(':00')
	})

	it("formata amb locale 'ca' sense llançar cap error", () => {
		expect(() => formatDatetime(UNIX_NOON, 'ca')).not.toThrow()
	})

	it("formata amb locale 'es' sense llançar cap error", () => {
		expect(() => formatDatetime(UNIX_NOON, 'es')).not.toThrow()
	})

	it("retrocedeix a l'anglès per a un locale desconegut", () => {
		const resultDesconegut = formatDatetime(UNIX_NOON, 'xx')
		const resultEn = formatDatetime(UNIX_NOON, 'en')
		expect(resultDesconegut).toBe(resultEn)
	})

	it('retorna una cadena de text formatada (no el número brut)', () => {
		const result = formatDatetime(UNIX_NOON, 'en')
		expect(typeof result).toBe('string')
		expect(result).not.toBe(String(UNIX_NOON))
	})
})
