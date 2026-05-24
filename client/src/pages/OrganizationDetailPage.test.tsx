import type { Address, OrganizationId, ProposalId } from '@/domain'

import { mock, describe, it, expect, afterEach } from 'bun:test'

import { queryKeys } from '@/algorand/query-keys'
import {
	MOCK_ADDRESS,
	MOCK_MEMBER_ADDRESS,
	MOCK_NEW_ADDRESS,
	MOCK_ORG,
	MOCK_ORG_ID,
	MOCK_PROPOSAL_PENDING,
	makeQueryClient
} from '@/tests/utils'
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import React from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

// ── Mocks ────────────────────────────────────────────────────────────────────

void mock.module('react-i18next', () => ({
	useTranslation: () => ({
		t: (k: string, opts?: Record<string, unknown>) => (opts ? `${k}:${JSON.stringify(opts)}` : k),
		i18n: {
			resolvedLanguage: 'ca',
			language: 'ca',
			changeLanguage: async () => {}
		}
	})
}))

// framer-motion: Drawer usa AnimatePresence + m.div + m.aside
function motionTag(tag: string) {
	return function MotionEl({ children, initial, animate, exit, transition, ...rest }: Record<string, unknown>) {
		// oxlint-disable-next-line no-unsafe-type-assertion
		return React.createElement(tag, rest as React.HTMLAttributes<HTMLElement>, children as React.ReactNode)
	}
}

void mock.module('framer-motion', () => ({
	// oxlint-disable-next-line id-length
	m: {
		div: motionTag('div'),
		aside: motionTag('aside'),
		dialog: motionTag('dialog'),
		li: motionTag('li'),
		span: motionTag('span'),
		// oxlint-disable-next-line id-length
		p: motionTag('p')
	},
	AnimatePresence: ({ children }: { children: React.ReactNode }) =>
		React.createElement(React.Fragment, null, children),
	useMotionValue: () => ({
		get: () => 0,
		set: () => {}
	}),
	useTransform: () => ({ get: () => 0 })
}))

let mockAddress: typeof MOCK_ADDRESS | null = MOCK_ADDRESS
void mock.module('@/hooks/useAlgorand', () => ({
	useAlgorand: () => ({
		isConnected: mockAddress !== null,
		address: mockAddress,
		signer: () => Promise.resolve([])
	})
}))

// oxlint-disable-next-line id-length
const mockAddToCensus = mock((_: { orgId: unknown; members: string[]; [k: string]: unknown }) =>
	Promise.resolve(undefined)
)
// oxlint-disable-next-line id-length
const mockRemoveFromCensus = mock((_: { orgId: unknown; members: string[]; [k: string]: unknown }) =>
	Promise.resolve(undefined)
)
void mock.module('@/algorand/mutations', () => ({
	useAddToCensus: () => ({ mutateAsync: mockAddToCensus }),
	useRemoveFromCensus: () => ({ mutateAsync: mockRemoveFromCensus })
}))

// Les consultes retornen mockCensus per referència → estables fins i tot en refetch
let mockCensus: string[] = [MOCK_ADDRESS, MOCK_MEMBER_ADDRESS]

// Mock complet per evitar peticions HTTP reals durant els tests de totes les pàgines
void mock.module('@/algorand/queries', () => ({
	organizationQueries: {
		all: () => ({ queryKey: queryKeys.organizations.all(), queryFn: () => Promise.resolve([MOCK_ORG]) }),
		detail: (id: OrganizationId) => ({
			queryKey: queryKeys.organizations.detail(id),
			queryFn: () => Promise.resolve(MOCK_ORG)
		}),
		census: (id: OrganizationId) => ({
			queryKey: queryKeys.organizations.census(id),
			queryFn: () => Promise.resolve(mockCensus)
		}),
		isMember: (address: Address, orgId: OrganizationId) => ({
			queryKey: queryKeys.organizations.isMember(address, orgId),
			queryFn: () => Promise.resolve(true)
		}),
		forUser: (address: Address) => ({
			queryKey: queryKeys.organizations.forUser(address),
			queryFn: () => Promise.resolve([MOCK_ORG])
		})
	},
	proposalQueries: {
		all: () => ({ queryKey: queryKeys.proposals.all(), queryFn: () => Promise.resolve([MOCK_PROPOSAL_PENDING]) }),
		detail: (id: ProposalId) => ({
			queryKey: queryKeys.proposals.detail(id),
			queryFn: () => Promise.resolve(MOCK_PROPOSAL_PENDING)
		})
	},
	votingQueries: {
		approvalVoted: (address: Address, proposalId: ProposalId) => ({
			queryKey: queryKeys.voting.approvalVoted(address, proposalId),
			queryFn: () => Promise.resolve(false)
		}),
		electionVoted: (address: Address, proposalId: ProposalId) => ({
			queryKey: queryKeys.voting.electionVoted(address, proposalId),
			queryFn: () => Promise.resolve(false)
		}),
		electionVoterCount: (proposalId: ProposalId) => ({
			queryKey: queryKeys.voting.electionVoterCount(proposalId),
			queryFn: () => Promise.resolve(0)
		}),
		electionResults: (proposalId: ProposalId) => ({
			queryKey: queryKeys.voting.electionResults(proposalId),
			queryFn: () => Promise.resolve(null)
		}),
		electionBallotForVoter: (address: Address, proposalId: ProposalId) => ({
			queryKey: queryKeys.voting.electionBallotForVoter(address, proposalId),
			queryFn: () => Promise.resolve(null),
			enabled: false,
			retry: false,
			staleTime: 30_000
		})
	}
}))

// ── Component import (after mocks) ───────────────────────────────────────────

import { OrganizationDetailPage } from './OrganizationDetailPage'

// ── Helpers ───────────────────────────────────────────────────────────────────

interface RenderOptions {
	address?: typeof MOCK_ADDRESS | null
	census?: string[]
}

function renderPage({ address = MOCK_ADDRESS, census = [MOCK_ADDRESS, MOCK_MEMBER_ADDRESS] }: RenderOptions = {}) {
	mockAddress = address
	mockCensus = census

	const router = createMemoryRouter([
		{
			path: '/',
			element: <OrganizationDetailPage />,
			loader: () => MOCK_ORG_ID
		}
	])

	return render(
		<QueryClientProvider client={makeQueryClient()}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	)
}

async function obrirGestioCens(census = [MOCK_ADDRESS, MOCK_MEMBER_ADDRESS]) {
	renderPage({ census })
	await waitFor(() => screen.getByText(MOCK_ORG.name))
	fireEvent.click(screen.getByRole('tab', { name: /common\.census/ }))
	await waitFor(() => screen.getByText('org.census.manage'))
	fireEvent.click(screen.getByText('org.census.manage'))
	await waitFor(() => screen.getByRole('dialog'))
}

afterEach(() => {
	cleanup()
	mockAddress = MOCK_ADDRESS
	mockCensus = [MOCK_ADDRESS, MOCK_MEMBER_ADDRESS]
	mockAddToCensus.mockClear()
	mockRemoveFromCensus.mockClear()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('OrganizationDetailPage - visualització bàsica', () => {
	it("mostra el nom de l'organització", async () => {
		renderPage()
		await waitFor(() => {
			expect(screen.getByText(MOCK_ORG.name)).not.toBeNull()
		})
	})

	it("mostra la descripció de l'organització", async () => {
		renderPage()
		await waitFor(() => {
			expect(screen.getByText(MOCK_ORG.description)).not.toBeNull()
		})
	})

	it('la pestanya per defecte és "propostes"', async () => {
		renderPage()
		await waitFor(() => screen.getByText(MOCK_ORG.name))
		const tab = screen.getByRole('tab', { name: /common\.proposals/ })
		expect(tab.getAttribute('aria-selected')).toBe('true')
	})

	it("mostra la proposta de l'organització", async () => {
		renderPage()
		await waitFor(() => {
			expect(screen.getByText(MOCK_PROPOSAL_PENDING.title)).not.toBeNull()
		})
	})

	it("mostra el distintiu d'organitzador quan l'usuari és l'organitzador", async () => {
		renderPage()
		await waitFor(() => {
			expect(screen.getByText('common.organizer')).not.toBeNull()
		})
	})

	it('mostra el distintiu de membre per a un membre no-organitzador', async () => {
		renderPage({ address: MOCK_MEMBER_ADDRESS })
		await waitFor(() => {
			expect(screen.getByText('common.member')).not.toBeNull()
		})
	})
})

describe('OrganizationDetailPage - avís de no-membre', () => {
	it('mostra l\'avís "org.not-member" si l\'usuari no és membre ni organitzador', async () => {
		renderPage({ address: MOCK_NEW_ADDRESS, census: [MOCK_ADDRESS] })
		await waitFor(() => {
			expect(screen.getByText('org.not-member')).not.toBeNull()
		})
	})

	it('no mostra l\'avís "org.not-member" si és organitzador', async () => {
		renderPage()
		await waitFor(() => screen.getByText(MOCK_ORG.name))
		expect(screen.queryByText('org.not-member')).toBeNull()
	})

	it('no mostra l\'avís "org.not-member" si és membre', async () => {
		renderPage({ address: MOCK_MEMBER_ADDRESS })
		await waitFor(() => screen.getByText(MOCK_ORG.name))
		expect(screen.queryByText('org.not-member')).toBeNull()
	})
})

describe('OrganizationDetailPage - pestanya de cens', () => {
	it('mostra els membres del cens en canviar a la pestanya de cens', async () => {
		renderPage()
		await waitFor(() => screen.getByText(MOCK_ORG.name))
		fireEvent.click(screen.getByRole('tab', { name: /common\.census/ }))
		await waitFor(() => {
			expect(screen.getByText(MOCK_MEMBER_ADDRESS)).not.toBeNull()
		})
	})

	it('mostra el botó de gestió del cens si és organitzador', async () => {
		renderPage()
		await waitFor(() => screen.getByText(MOCK_ORG.name))
		fireEvent.click(screen.getByRole('tab', { name: /common\.census/ }))
		await waitFor(() => {
			expect(screen.getByText('org.census.manage')).not.toBeNull()
		})
	})

	it('no mostra el botó de gestió del cens per a membres no-organitzadors', async () => {
		renderPage({ address: MOCK_MEMBER_ADDRESS })
		await waitFor(() => screen.getByText(MOCK_ORG.name))
		fireEvent.click(screen.getByRole('tab', { name: /common\.census/ }))
		await waitFor(() => screen.getByText(MOCK_MEMBER_ADDRESS))
		expect(screen.queryByText('org.census.manage')).toBeNull()
	})

	it('no mostra el botó de gestió del cens per a no-membres', async () => {
		renderPage({ address: MOCK_NEW_ADDRESS, census: [MOCK_ADDRESS] })
		await waitFor(() => screen.getByText(MOCK_ORG.name))
		fireEvent.click(screen.getByRole('tab', { name: /common\.census/ }))
		await waitFor(() => screen.getByText(MOCK_ADDRESS))
		expect(screen.queryByText('org.census.manage')).toBeNull()
	})
})

describe('OrganizationDetailPage - gestió del cens: afegir membres', () => {
	it("el drawer s'obre en fer clic al botó de gestió del cens", async () => {
		await obrirGestioCens()
		expect(screen.getByRole('dialog')).not.toBeNull()
	})

	it("afegir una adreça nova crida useAddToCensus amb l'adreça filtrada", async () => {
		await obrirGestioCens([MOCK_ADDRESS])
		const textarea = screen.getByPlaceholderText('org.fields.addresses-placeholder')
		fireEvent.change(textarea, { target: { value: MOCK_NEW_ADDRESS } })
		await waitFor(() => screen.getByText(/org\.census\.add/))
		fireEvent.click(screen.getByText(/org\.census\.add/))
		await waitFor(() => {
			expect(mockAddToCensus).toHaveBeenCalledTimes(1)
			expect(mockAddToCensus.mock.calls[0]?.[0]).toMatchObject({
				orgId: MOCK_ORG_ID,
				members: [MOCK_NEW_ADDRESS]
			})
		})
	})

	it('el textarea mostra un missatge de validació quan hi ha adreces vàlides', async () => {
		await obrirGestioCens([MOCK_ADDRESS])
		const textarea = screen.getByPlaceholderText('org.fields.addresses-placeholder')
		fireEvent.change(textarea, { target: { value: MOCK_NEW_ADDRESS } })
		await waitFor(() => {
			expect(screen.getByText(/org\.valid-addresses/)).not.toBeNull()
		})
	})
})

describe('OrganizationDetailPage - gestió del cens: eliminar membres', () => {
	it('canviar al mode "eliminar" mostra la llista seleccionable', async () => {
		await obrirGestioCens()
		fireEvent.click(screen.getByText('common.remove'))
		const dialog = screen.getByRole('dialog')
		await waitFor(() => {
			expect(within(dialog).getByText(MOCK_MEMBER_ADDRESS)).not.toBeNull()
		})
	})

	it('eliminar un membre seleccionat crida useRemoveFromCensus', async () => {
		await obrirGestioCens([MOCK_ADDRESS, MOCK_MEMBER_ADDRESS])
		fireEvent.click(screen.getByText('common.remove'))
		const dialog = screen.getByRole('dialog')
		// Seleccionar l'adreça del membre dins el drawer
		await waitFor(() => within(dialog).getByText(MOCK_MEMBER_ADDRESS))
		const addrEl = within(dialog).getByText(MOCK_MEMBER_ADDRESS)
		fireEvent.click(addrEl.closest('button') ?? addrEl)
		// Fer clic al botó d'eliminar (text inclou el recompte d'elements seleccionats)
		await waitFor(() => within(dialog).getByText(/org\.census\.remove-selected/))
		fireEvent.click(within(dialog).getByText(/org\.census\.remove-selected/))
		await waitFor(() => {
			expect(mockRemoveFromCensus).toHaveBeenCalledTimes(1)
			expect(mockRemoveFromCensus.mock.calls[0]?.[0]).toMatchObject({
				orgId: MOCK_ORG_ID,
				members: [MOCK_MEMBER_ADDRESS]
			})
		})
	})
})
