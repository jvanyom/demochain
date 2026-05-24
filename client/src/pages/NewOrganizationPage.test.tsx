import { mock, describe, it, expect, afterEach } from 'bun:test'

import { asOrganizationId } from '@/domain'
import { MOCK_ADDRESS, MOCK_MEMBER_ADDRESS, makeQueryClient } from '@/tests/utils'
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
		t: (k: string, opts?: Record<string, unknown>): string => (opts ? `${k}:${JSON.stringify(opts)}` : k),
		i18n: {
			resolvedLanguage: 'ca',
			language: 'ca',
			changeLanguage: async (): Promise<void> => {}
		}
	})
}))

void mock.module('@txnlab/use-wallet-react', () => ({
	useNetwork: () => ({ activeNetwork: 'mainnet-v1.0' }),
	NetworkId: { LOCALNET: 'localnet' }
}))

void mock.module('@/algorand/dev-accounts', () => ({
	getDevAddresses: () => []
}))

let mockIsConnected = true
void mock.module('@/hooks/useAlgorand', () => ({
	useAlgorand: () => ({
		isConnected: mockIsConnected,
		address: mockIsConnected ? MOCK_ADDRESS : null,
		signer: () => Promise.resolve([])
	})
}))

const mockCreateOrg = mock((_org: Record<string, unknown>) =>
	Promise.resolve({
		orgId: asOrganizationId(1),
		txId: 'txid-org'
	})
)
const mockAddCensus = mock((_census: { members: string[]; [k: string]: unknown }) => Promise.resolve(undefined))
void mock.module('@/algorand/mutations', () => ({
	useCreateOrganization: () => ({ mutateAsync: mockCreateOrg }),
	useAddToCensus: () => ({ mutateAsync: mockAddCensus })
}))

// ── Component import (after mocks) ───────────────────────────────────────────

import { NewOrganizationPage } from './NewOrganizationPage'

// ── Render helper ─────────────────────────────────────────────────────────────

function renderPage() {
	const qc = makeQueryClient()
	return render(
		<QueryClientProvider client={qc}>
			<MemoryRouter>
				<NewOrganizationPage />
			</MemoryRouter>
		</QueryClientProvider>
	)
}

afterEach(() => {
	cleanup()
	mockIsConnected = true
	mockCreateOrg.mockClear()
	mockAddCensus.mockClear()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('NewOrganizationPage - pas 1: dades bàsiques', () => {
	it('renderitza els camps de nom i descripció', () => {
		renderPage()
		expect(screen.getByPlaceholderText('org.fields.name-placeholder')).not.toBeNull()
		expect(screen.getByPlaceholderText('org.fields.description-placeholder')).not.toBeNull()
	})

	it('el botó "Següent" és desactivat si nom i descripció estan buits', () => {
		renderPage()
		const next = screen.getByText<HTMLButtonElement>('common.next')
		expect(next.disabled).toBeTrue()
	})

	it('el botó "Següent" s\'activa quan nom i descripció estan emplenats', () => {
		renderPage()
		fireEvent.change(screen.getByPlaceholderText('org.fields.name-placeholder'), {
			target: { value: 'Nova org' }
		})
		fireEvent.change(screen.getByPlaceholderText('org.fields.description-placeholder'), {
			target: { value: 'Descripció' }
		})
		const next = screen.getByText<HTMLButtonElement>('common.next')
		expect(next.disabled).toBeFalse()
	})

	it('el botó "Cancelar" apareix al pas 1', () => {
		renderPage()
		expect(screen.getByText('common.cancel')).not.toBeNull()
	})
})

describe('NewOrganizationPage - pas 2: cens', () => {
	async function avancarAlPas2() {
		renderPage()
		fireEvent.change(screen.getByPlaceholderText('org.fields.name-placeholder'), {
			target: { value: 'Nova org' }
		})
		fireEvent.change(screen.getByPlaceholderText('org.fields.description-placeholder'), {
			target: { value: 'Descripció' }
		})
		fireEvent.click(screen.getByText('common.next'))
		await waitFor(() => {
			expect(screen.getByPlaceholderText('org.fields.addresses-placeholder')).not.toBeNull()
		})
	}

	it('mostra el textarea de cens al pas 2', async () => {
		await avancarAlPas2()
		expect(screen.getByPlaceholderText('org.fields.addresses-placeholder')).not.toBeNull()
	})

	it('mostra el botó "Anterior" al pas 2', async () => {
		await avancarAlPas2()
		expect(screen.getByText('common.previous')).not.toBeNull()
	})

	it('mostra adreces vàlides introduïdes al textarea', async () => {
		await avancarAlPas2()
		const textarea = screen.getByPlaceholderText<HTMLTextAreaElement>('org.fields.addresses-placeholder')
		fireEvent.change(textarea, { target: { value: MOCK_ADDRESS } })
		expect(textarea.value).toContain(MOCK_ADDRESS)
	})

	it('avança al pas de revisió', async () => {
		await avancarAlPas2()
		fireEvent.click(screen.getByText('common.next'))
		await waitFor(() => {
			// El pas 3 mostra el recompte d'adreces vàlides
			expect(screen.getByText(/org\.members/)).not.toBeNull()
		})
	})
})

describe('NewOrganizationPage - pas 3: revisió i enviament', () => {
	async function avancarALaRevisio(nomOrg = 'Org de Prova', desc = 'La descripció') {
		renderPage()
		fireEvent.change(screen.getByPlaceholderText('org.fields.name-placeholder'), {
			target: { value: nomOrg }
		})
		fireEvent.change(screen.getByPlaceholderText('org.fields.description-placeholder'), {
			target: { value: desc }
		})
		fireEvent.click(screen.getByText('common.next'))
		await waitFor(() => screen.getByPlaceholderText('org.fields.addresses-placeholder'))
		fireEvent.click(screen.getByText('common.next'))
		await waitFor(() => screen.getByText(/org\.members/))
	}

	it('mostra el nom i la descripció a la revisió', async () => {
		await avancarALaRevisio('Org de Prova', 'La descripció')
		expect(screen.getByText('Org de Prova')).not.toBeNull()
		expect(screen.getByText('La descripció')).not.toBeNull()
	})

	it('el botó de submit no apareix si la cartera no està connectada', async () => {
		const { rerender } = renderPage()
		fireEvent.change(screen.getByPlaceholderText('org.fields.name-placeholder'), {
			target: { value: 'Org de Prova' }
		})
		fireEvent.change(screen.getByPlaceholderText('org.fields.description-placeholder'), {
			target: { value: 'La descripció' }
		})
		fireEvent.click(screen.getByText('common.next'))
		await waitFor(() => screen.getByPlaceholderText('org.fields.addresses-placeholder'))
		fireEvent.click(screen.getByText('common.next'))
		await waitFor(() => screen.getByText(/org\.members/))
		mockIsConnected = false
		rerender(
			<QueryClientProvider client={makeQueryClient()}>
				<MemoryRouter>
					<NewOrganizationPage />
				</MemoryRouter>
			</QueryClientProvider>
		)
		await waitFor(() => {
			expect(screen.queryByText('org.submit')).toBeNull()
			expect(screen.getAllByText('wallet.connect').length).toBeGreaterThan(0)
		})
	})

	it('el botó de submit apareix quan la cartera és connectada', async () => {
		await avancarALaRevisio()
		expect(screen.getByText('org.submit')).not.toBeNull()
	})

	it("clicar submit crida la mutació de creació d'organització", async () => {
		await avancarALaRevisio('Org Test', 'Desc Test')
		fireEvent.click(screen.getByText('org.submit'))
		await waitFor(() => {
			expect(mockCreateOrg).toHaveBeenCalledTimes(1)
		})
	})

	it("mostra la pantalla de confirmació després de crear l'organització", async () => {
		await avancarALaRevisio('Org Test', 'Desc Test')
		fireEvent.click(screen.getByText('org.submit'))
		await waitFor(() => {
			expect(screen.getByText('org.confirmed.title')).not.toBeNull()
		})
	})

	it("no crida addCensus si no s'han introduït adreces", async () => {
		await avancarALaRevisio()
		fireEvent.click(screen.getByText('org.submit'))
		await waitFor(() => screen.getByText('org.confirmed.title'))
		expect(mockAddCensus).not.toHaveBeenCalled()
	})

	it('crida addCensus amb les adreces vàlides introduïdes al cens', async () => {
		renderPage()
		fireEvent.change(screen.getByPlaceholderText('org.fields.name-placeholder'), {
			target: { value: 'Org Test' }
		})
		fireEvent.change(screen.getByPlaceholderText('org.fields.description-placeholder'), {
			target: { value: 'Desc Test' }
		})
		fireEvent.click(screen.getByText('common.next'))
		await waitFor(() => screen.getByPlaceholderText('org.fields.addresses-placeholder'))
		// Introduïm una adreça vàlida que no és la de l'usuari (s'exclou l'organitzador del cens extra)
		fireEvent.change(screen.getByPlaceholderText('org.fields.addresses-placeholder'), {
			target: { value: MOCK_MEMBER_ADDRESS }
		})
		fireEvent.click(screen.getByText('common.next'))
		await waitFor(() => screen.getByText(/org\.members/))
		fireEvent.click(screen.getByText('org.submit'))
		await waitFor(() => {
			expect(mockAddCensus).toHaveBeenCalledTimes(1)
			expect(mockAddCensus.mock.calls[0]?.[0]).toMatchObject({
				members: [MOCK_MEMBER_ADDRESS]
			})
		})
	})

	it('mostra la confirmació fins i tot quan hi ha adreces al cens', async () => {
		renderPage()
		fireEvent.change(screen.getByPlaceholderText('org.fields.name-placeholder'), {
			target: { value: 'Org Cens' }
		})
		fireEvent.change(screen.getByPlaceholderText('org.fields.description-placeholder'), {
			target: { value: 'Desc Cens' }
		})
		fireEvent.click(screen.getByText('common.next'))
		await waitFor(() => screen.getByPlaceholderText('org.fields.addresses-placeholder'))
		fireEvent.change(screen.getByPlaceholderText('org.fields.addresses-placeholder'), {
			target: { value: MOCK_MEMBER_ADDRESS }
		})
		fireEvent.click(screen.getByText('common.next'))
		await waitFor(() => screen.getByText(/org\.members/))
		fireEvent.click(screen.getByText('org.submit'))
		await waitFor(() => {
			expect(screen.getByText('org.confirmed.title')).not.toBeNull()
		})
	})
})
