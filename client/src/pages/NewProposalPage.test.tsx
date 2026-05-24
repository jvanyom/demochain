import { mock, describe, it, expect, afterEach } from 'bun:test'

import { queryKeys } from '@/algorand/query-keys'
import { asProposalId } from '@/domain'
import { MOCK_ADDRESS, MOCK_ORG, makeQueryClient } from '@/tests/utils'
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

// ── Mocks ────────────────────────────────────────────────────────────────────

function motionTag(tag: string) {
	return function MotionEl({ children, initial, animate, exit, transition, ...rest }: Record<string, unknown>) {
		// oxlint-disable-next-line no-unsafe-type-assertion
		return React.createElement(tag, rest as React.HTMLAttributes<HTMLElement>, children as React.ReactNode)
	}
}

void mock.module('framer-motion', () => ({
	// oxlint-disable-next-line id-length
	m: { div: motionTag('div') },
	AnimatePresence: ({ children }: { children: React.ReactNode }) =>
		React.createElement(React.Fragment, null, children)
}))

void mock.module('react-i18next', () => ({
	useTranslation: () => ({
		t: (k: string, opts?: Record<string, unknown>) => (opts ? `${k}:${JSON.stringify(opts)}` : k),
		i18n: { resolvedLanguage: 'ca' }
	})
}))

let mockIsConnected = true
void mock.module('@/hooks/useAlgorand', () => ({
	useAlgorand: () => ({
		isConnected: mockIsConnected,
		address: mockIsConnected ? MOCK_ADDRESS : null,
		signer: () => Promise.resolve([])
	})
}))

const mockCreateProposal = mock(() => Promise.resolve({ proposalId: asProposalId(99), txId: 'txid-proposal' }))
void mock.module('@/algorand/mutations', () => ({
	useCreateProposal: () => ({ mutateAsync: mockCreateProposal })
}))

// DateTimePicker és un popover de calendari - el substituïm per un input simple
void mock.module('@/components/ui/DateTimePicker', () => ({
	DateTimePicker: ({
		value,
		onChange,
		placeholder
	}: {
		value: string
		onChange: (value: string) => void
		placeholder?: string
	}) => (
		// oxlint-disable-next-line jsx-a11y/control-has-associated-label
		<input placeholder={placeholder} value={value} onChange={event => onChange(event.target.value)} />
	)
}))

// ProposalReceipt usa framer-motion i modals complexos - el simplificem
void mock.module('@/components/proposal/ProposalReceipt', () => ({
	ProposalReceipt: ({ open, proposalTitle }: { open: boolean; proposalTitle: string }) =>
		open ? <div data-testid="receipt">{proposalTitle}</div> : null
}))

// ── Component import (after mocks) ───────────────────────────────────────────

import { NewProposalPage } from './NewProposalPage'

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderPage(orgs = [MOCK_ORG]) {
	const qc = makeQueryClient()
	// Pre-poblem la caché de TanStack Query amb les orgs elegibles
	qc.setQueryData(queryKeys.organizations.forUser(MOCK_ADDRESS), orgs)
	return {
		qc,
		...render(
			<QueryClientProvider client={qc}>
				<MemoryRouter>
					<NewProposalPage />
				</MemoryRouter>
			</QueryClientProvider>
		)
	}
}

// Dates vàlides per a mode producció (inici ≥3 dies, fi ≥1h després de l'inici)
function datesValides() {
	const start = new Date(Date.now() + 4 * 86_400_000)
	const end = new Date(start.getTime() + 2 * 3_600_000)
	return {
		start: start.toISOString().slice(0, 16),
		end: end.toISOString().slice(0, 16)
	}
}

afterEach(() => {
	cleanup()
	mockIsConnected = true
	mockCreateProposal.mockClear()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("NewProposalPage - pas 0: selecció d'organització", () => {
	it("mostra el nom de l'organització elegible", async () => {
		renderPage()
		await waitFor(() => {
			expect(screen.getByText(MOCK_ORG.name)).not.toBeNull()
		})
	})

	it('mostra avís si no hi ha orgs elegibles', async () => {
		renderPage([])
		await waitFor(() => {
			expect(screen.getByText('proposal.new.org.empty')).not.toBeNull()
		})
	})

	it('el botó "Següent" és desactivat si no hi ha cap org seleccionada', async () => {
		renderPage([])
		await waitFor(() => screen.getByText('proposal.new.org.empty'))
		const next = screen.getByText<HTMLButtonElement>('common.next')
		expect(next.disabled).toBeTrue()
	})

	it('el botó "Següent" s\'activa en seleccionar una organització', async () => {
		renderPage()
		await waitFor(() => screen.getByText(MOCK_ORG.name))
		fireEvent.click(screen.getByLabelText(MOCK_ORG.name))
		const next = screen.getByText<HTMLButtonElement>('common.next')
		expect(next.disabled).toBeFalse()
	})

	it('mostra avís de "connecta la cartera" si isConnected=false', async () => {
		mockIsConnected = false
		renderPage()
		await waitFor(() => {
			expect(screen.getAllByText('wallet.connect').length).toBeGreaterThan(0)
		})
	})
})

describe('NewProposalPage - pas 1: dades bàsiques', () => {
	async function avancarAlPas1() {
		renderPage()
		await waitFor(() => screen.getByText(MOCK_ORG.name))
		fireEvent.click(screen.getByLabelText(MOCK_ORG.name))
		fireEvent.click(screen.getByText('common.next'))
		await waitFor(() => screen.getByPlaceholderText('proposal.new.fields.title-placeholder'))
	}

	it('mostra els camps de títol i descripció', async () => {
		await avancarAlPas1()
		expect(screen.getByPlaceholderText('proposal.new.fields.title-placeholder')).not.toBeNull()
		expect(screen.getByPlaceholderText('proposal.new.fields.description-placeholder')).not.toBeNull()
	})

	it('el botó "Següent" és desactivat si títol i descripció estan buits', async () => {
		await avancarAlPas1()
		expect(screen.getByText<HTMLButtonElement>('common.next').disabled).toBeTrue()
	})

	it('el botó "Següent" s\'activa amb títol i descripció emplenats', async () => {
		await avancarAlPas1()
		fireEvent.change(screen.getByPlaceholderText('proposal.new.fields.title-placeholder'), {
			target: { value: 'El meu títol' }
		})
		fireEvent.change(screen.getByPlaceholderText('proposal.new.fields.description-placeholder'), {
			target: { value: 'La meva descripció' }
		})
		expect(screen.getByText<HTMLButtonElement>('common.next').disabled).toBeFalse()
	})
})

describe('NewProposalPage - pas 2: dates', () => {
	async function avancarAlPas2() {
		renderPage()
		await waitFor(() => screen.getByText(MOCK_ORG.name))
		fireEvent.click(screen.getByLabelText(MOCK_ORG.name))
		fireEvent.click(screen.getByText('common.next'))
		await waitFor(() => screen.getByPlaceholderText('proposal.new.fields.title-placeholder'))
		fireEvent.change(screen.getByPlaceholderText('proposal.new.fields.title-placeholder'), {
			target: { value: 'Títol' }
		})
		fireEvent.change(screen.getByPlaceholderText('proposal.new.fields.description-placeholder'), {
			target: { value: 'Descripció' }
		})
		fireEvent.click(screen.getByText('common.next'))
		await waitFor(() => screen.getByPlaceholderText('proposal.new.fields.start-placeholder'))
	}

	it("mostra els camps d'inici i fi", async () => {
		await avancarAlPas2()
		expect(screen.getByPlaceholderText('proposal.new.fields.start-placeholder')).not.toBeNull()
		expect(screen.getByPlaceholderText('proposal.new.fields.end-placeholder')).not.toBeNull()
	})

	it('el botó "Següent" és desactivat si no s\'han seleccionat dates', async () => {
		await avancarAlPas2()
		expect(screen.getByText<HTMLButtonElement>('common.next').disabled).toBeTrue()
	})
})

describe('NewProposalPage - pas 3: opcions', () => {
	async function avancarAlPas3() {
		renderPage()
		await waitFor(() => screen.getByText(MOCK_ORG.name))
		fireEvent.click(screen.getByLabelText(MOCK_ORG.name))
		fireEvent.click(screen.getByText('common.next'))
		await waitFor(() => screen.getByPlaceholderText('proposal.new.fields.title-placeholder'))
		fireEvent.change(screen.getByPlaceholderText('proposal.new.fields.title-placeholder'), {
			target: { value: 'T' }
		})
		fireEvent.change(screen.getByPlaceholderText('proposal.new.fields.description-placeholder'), {
			target: { value: 'D' }
		})
		fireEvent.click(screen.getByText('common.next'))
		await waitFor(() => screen.getByPlaceholderText('proposal.new.fields.start-placeholder'))
		const { start, end } = datesValides()
		fireEvent.change(screen.getByPlaceholderText('proposal.new.fields.start-placeholder'), {
			target: { value: start }
		})
		fireEvent.change(screen.getByPlaceholderText('proposal.new.fields.end-placeholder'), { target: { value: end } })
		fireEvent.click(screen.getByText('common.next'))
		await waitFor(() => screen.getByText('proposal.new.fields.add-option'))
	}

	it("mostra el botó d'afegir opció", async () => {
		await avancarAlPas3()
		expect(screen.getByText('proposal.new.fields.add-option')).not.toBeNull()
	})

	it("comença amb 2 camps d'opció", async () => {
		await avancarAlPas3()
		const inputs = screen.getAllByPlaceholderText('proposal.new.fields.option-placeholder')
		expect(inputs.length).toBe(2)
	})

	it('afegir opció crea un nou camp', async () => {
		await avancarAlPas3()
		fireEvent.click(screen.getByText('proposal.new.fields.add-option'))
		await waitFor(() => {
			const inputs = screen.getAllByPlaceholderText('proposal.new.fields.option-placeholder')
			expect(inputs.length).toBe(3)
		})
	})

	it('el botó "Següent" és desactivat si les opcions estan buides', async () => {
		await avancarAlPas3()
		expect(screen.getByText<HTMLButtonElement>('common.next').disabled).toBeTrue()
	})

	it('el botó "Següent" s\'activa amb 2 opcions emplenades', async () => {
		await avancarAlPas3()
		const inputs = screen.getAllByPlaceholderText('proposal.new.fields.option-placeholder')

		if (inputs[0] && inputs[1]) {
			fireEvent.change(inputs[0], { target: { value: 'Opció A' } })
			fireEvent.change(inputs[1], { target: { value: 'Opció B' } })
		}

		expect(screen.getByText<HTMLButtonElement>('common.next').disabled).toBeFalse()
	})

	it('mostra error quan les opcions són duplicades i es fa blur', async () => {
		await avancarAlPas3()
		const inputs = screen.getAllByPlaceholderText('proposal.new.fields.option-placeholder')

		if (inputs[0] && inputs[1]) {
			fireEvent.change(inputs[0], { target: { value: 'Opció A' } })
			fireEvent.change(inputs[1], { target: { value: 'Opció A' } })
			fireEvent.blur(inputs[1])
		}

		await waitFor(() => {
			expect(screen.getByText('errors.proposal.duplicated-options')).not.toBeNull()
		})
	})

	it('no avança al pas 4 quan hi ha opcions duplicades', async () => {
		await avancarAlPas3()
		const inputs = screen.getAllByPlaceholderText('proposal.new.fields.option-placeholder')

		if (inputs[0] && inputs[1]) {
			fireEvent.change(inputs[0], { target: { value: 'Igual' } })
			fireEvent.change(inputs[1], { target: { value: 'Igual' } })
		}

		fireEvent.click(screen.getByText('common.next'))

		await waitFor(() => {
			expect(screen.getByText('errors.proposal.duplicated-options')).not.toBeNull()
		})
	})
})

describe('NewProposalPage - pas 4: revisió i enviament', () => {
	async function omplirIAvancarFinsALaRevisio() {
		renderPage()

		await waitFor(() => screen.getByText(MOCK_ORG.name))
		fireEvent.click(screen.getByLabelText(MOCK_ORG.name))
		fireEvent.click(screen.getByText('common.next'))

		await waitFor(() => screen.getByPlaceholderText('proposal.new.fields.title-placeholder'))
		fireEvent.change(screen.getByPlaceholderText('proposal.new.fields.title-placeholder'), {
			target: { value: 'Proposta Test' }
		})
		fireEvent.change(screen.getByPlaceholderText('proposal.new.fields.description-placeholder'), {
			target: { value: 'Desc Test' }
		})
		fireEvent.click(screen.getByText('common.next'))

		await waitFor(() => screen.getByPlaceholderText('proposal.new.fields.start-placeholder'))
		const { start, end } = datesValides()
		fireEvent.change(screen.getByPlaceholderText('proposal.new.fields.start-placeholder'), {
			target: { value: start }
		})
		fireEvent.change(screen.getByPlaceholderText('proposal.new.fields.end-placeholder'), { target: { value: end } })
		fireEvent.click(screen.getByText('common.next'))

		await waitFor(() => screen.getByText('proposal.new.fields.add-option'))

		const inputs = screen.getAllByPlaceholderText('proposal.new.fields.option-placeholder')

		if (inputs[0] && inputs[1]) {
			fireEvent.change(inputs[0], { target: { value: 'Opció A' } })
			fireEvent.change(inputs[1], { target: { value: 'Opció B' } })
		}

		fireEvent.click(screen.getByText('common.next'))

		await waitFor(() => screen.getByText('Proposta Test'))
	}

	it('la revisió mostra el títol de la proposta', async () => {
		await omplirIAvancarFinsALaRevisio()
		expect(screen.getByText('Proposta Test')).not.toBeNull()
	})

	it("la revisió mostra l'organització seleccionada", async () => {
		await omplirIAvancarFinsALaRevisio()
		expect(screen.getByText(MOCK_ORG.name)).not.toBeNull()
	})

	it('la revisió mostra les opcions emplenades', async () => {
		await omplirIAvancarFinsALaRevisio()
		expect(screen.getByText('Opció A')).not.toBeNull()
		expect(screen.getByText('Opció B')).not.toBeNull()
	})

	it('clicar submit crida la mutació de creació de proposta', async () => {
		await omplirIAvancarFinsALaRevisio()
		fireEvent.click(screen.getByText('proposal.new.submit'))
		await waitFor(() => {
			expect(mockCreateProposal).toHaveBeenCalledTimes(1)
		})
	})

	it('mostra el rebut de la proposta després de la creació', async () => {
		await omplirIAvancarFinsALaRevisio()
		fireEvent.click(screen.getByText('proposal.new.submit'))
		await waitFor(() => {
			expect(screen.getByTestId('receipt')).not.toBeNull()
		})
	})
})
