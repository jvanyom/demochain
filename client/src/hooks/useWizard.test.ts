import { describe, it, expect } from 'bun:test'

import { renderHook, act } from '@testing-library/react'

import { useWizard } from './useWizard'

describe('useWizard - estat inicial', () => {
	it('comença en el pas 0', () => {
		const { result } = renderHook(() => useWizard(3))
		expect(result.current.step).toBe(0)
	})

	it('isFirst és true en el pas 0', () => {
		const { result } = renderHook(() => useWizard(3))
		expect(result.current.isFirst).toBeTrue()
	})

	it('isLast és false en el pas 0 (wizard de 3 passos)', () => {
		const { result } = renderHook(() => useWizard(3))
		expect(result.current.isLast).toBeFalse()
	})

	it('submitting és false inicialment', () => {
		const { result } = renderHook(() => useWizard(3))
		expect(result.current.submitting).toBeFalse()
	})

	it('error és null inicialment', () => {
		const { result } = renderHook(() => useWizard(3))
		expect(result.current.error).toBeNull()
	})
})

describe('useWizard - next()', () => {
	it('avança del pas 0 al pas 1', () => {
		const { result } = renderHook(() => useWizard(3))
		act(() => result.current.next())
		expect(result.current.step).toBe(1)
	})

	it('isFirst és false després del primer next()', () => {
		const { result } = renderHook(() => useWizard(3))
		act(() => result.current.next())
		expect(result.current.isFirst).toBeFalse()
	})

	it('isLast és true en arribar al darrer pas', () => {
		const { result } = renderHook(() => useWizard(3))
		act(() => result.current.next())
		act(() => result.current.next())
		expect(result.current.isLast).toBeTrue()
	})

	it('no supera el límit del darrer pas', () => {
		const { result } = renderHook(() => useWizard(3))
		act(() => result.current.next())
		act(() => result.current.next())
		act(() => result.current.next()) // pas 2 → intent avançar per sobre del límit
		expect(result.current.step).toBe(2)
	})
})

describe('useWizard - prev()', () => {
	it('retrocedeix del pas 1 al pas 0', () => {
		const { result } = renderHook(() => useWizard(3))
		act(() => result.current.next())
		act(() => result.current.prev())
		expect(result.current.step).toBe(0)
	})

	it('isFirst torna a ser true en retrocedir al pas 0', () => {
		const { result } = renderHook(() => useWizard(3))
		act(() => result.current.next())
		act(() => result.current.prev())
		expect(result.current.isFirst).toBeTrue()
	})

	it('no retrocedeix per sota de 0', () => {
		const { result } = renderHook(() => useWizard(3))
		act(() => result.current.prev()) // intent retrocedir des del pas 0
		expect(result.current.step).toBe(0)
	})
})

describe('useWizard - startSubmit / succeedSubmit / failSubmit', () => {
	it('startSubmit posa submitting a true', () => {
		const { result } = renderHook(() => useWizard(3))
		act(() => result.current.startSubmit())
		expect(result.current.submitting).toBeTrue()
	})

	it('startSubmit neteja un error previ', () => {
		const { result } = renderHook(() => useWizard(3))
		act(() => result.current.failSubmit('error anterior'))
		act(() => result.current.startSubmit())
		expect(result.current.error).toBeNull()
	})

	it('succeedSubmit posa submitting a false', () => {
		const { result } = renderHook(() => useWizard(3))
		act(() => result.current.startSubmit())
		act(() => result.current.succeedSubmit())
		expect(result.current.submitting).toBeFalse()
	})

	it("failSubmit posa submitting a false i guarda el missatge d'error", () => {
		const { result } = renderHook(() => useWizard(3))
		act(() => result.current.startSubmit())
		act(() => result.current.failSubmit('connexió rebutjada'))
		expect(result.current.submitting).toBeFalse()
		expect(result.current.error).toBe('connexió rebutjada')
	})

	it("un nou failSubmit sobreescriu l'error anterior", () => {
		const { result } = renderHook(() => useWizard(3))
		act(() => result.current.failSubmit('error 1'))
		act(() => result.current.failSubmit('error 2'))
		expect(result.current.error).toBe('error 2')
	})
})

describe("useWizard - wizard d'un sol pas", () => {
	it('isFirst i isLast són true simultàniament', () => {
		const { result } = renderHook(() => useWizard(1))
		expect(result.current.isFirst).toBeTrue()
		expect(result.current.isLast).toBeTrue()
	})

	it('next() no canvia el pas', () => {
		const { result } = renderHook(() => useWizard(1))
		act(() => result.current.next())
		expect(result.current.step).toBe(0)
	})
})

describe('useWizard - wizard de dos passos', () => {
	it('next() des del pas 0 arriba al darrer pas directament', () => {
		const { result } = renderHook(() => useWizard(2))
		act(() => result.current.next())
		expect(result.current.step).toBe(1)
		expect(result.current.isLast).toBeTrue()
	})
})
