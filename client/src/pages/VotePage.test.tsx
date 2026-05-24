import { mock, describe, it, expect, afterEach } from 'bun:test'

import { queryKeys } from '@/algorand/query-keys'
import { MOCK_ADDRESS, MOCK_PROPOSAL_OPEN, makeQueryClient } from '@/tests/utils'
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

// ── Mocks ────────────────────────────────────────────────────────────────────

void mock.module('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key),
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

// oxlint-disable-next-line id-length
const mockCastRankedVote = mock((_: { preferenceOrder: number[]; [k: string]: unknown }) =>
	Promise.resolve('txid-vote')
)

void mock.module('@/algorand/mutations', () => ({
	useCastRankedVote: () => ({
		mutateAsync: mockCastRankedVote,
		isError: false,
		isPending: false,
		error: null
	})
}))

// VoteReceipt usa framer-motion - el simplificam
void mock.module('@/components/vote/VoteReceipt', () => ({
	VoteReceipt: ({
		open,
		proposalTitle
	}: {
		open: boolean
		proposalTitle: string
		onClose: () => void
		ranking: unknown[]
		txId: string
	}) => (open ? <div data-testid="vote-receipt">{proposalTitle}</div> : null)
}))

// ── Component import (after mocks) ───────────────────────────────────────────

import { VotePage } from './VotePage'

// ── Helpers ───────────────────────────────────────────────────────────────────

interface RenderOptions {
	isMember?: boolean
	hasVoted?: boolean
}

function renderPage({ isMember = true, hasVoted = false }: RenderOptions = {}) {
	const qc = makeQueryClient()
	qc.setQueryData(queryKeys.proposals.detail(MOCK_PROPOSAL_OPEN.id), MOCK_PROPOSAL_OPEN)
	qc.setQueryData(queryKeys.organizations.isMember(MOCK_ADDRESS, MOCK_PROPOSAL_OPEN.orgId), isMember)
	qc.setQueryData(queryKeys.voting.electionVoted(MOCK_ADDRESS, MOCK_PROPOSAL_OPEN.id), hasVoted)

	const router = createMemoryRouter([
		{
			path: '/',
			element: <VotePage />,
			loader: () => MOCK_PROPOSAL_OPEN.id
		}
	])

	return render(
		<QueryClientProvider client={qc}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	)
}

afterEach(() => {
	cleanup()
	mockIsConnected = true
	mockCastRankedVote.mockClear()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('VotePage - visualització per a membre no votat', () => {
	it('mostra el títol de la proposta', async () => {
		renderPage()
		await waitFor(() => {
			expect(screen.getByText(MOCK_PROPOSAL_OPEN.title)).not.toBeNull()
		})
	})

	it('renderitza les opcions de votació', async () => {
		renderPage()
		await waitFor(() => {
			for (const opt of MOCK_PROPOSAL_OPEN.options) expect(screen.getByText(opt.title)).not.toBeNull()
		})
	})

	it('mostra el botó de submit', async () => {
		renderPage()
		await waitFor(() => {
			expect(screen.getByText('vote.submit')).not.toBeNull()
		})
	})

	it('el botó de submit és actiu quan és connectat i membre', async () => {
		renderPage()
		await waitFor(() => screen.getByText('vote.submit'))
		const btn = screen.getByText('vote.submit')
		expect(btn.closest('button')!.disabled).toBeFalse()
	})
})

describe("VotePage - gestió de l'estat de la cartera", () => {
	// Quan address=null, la consulta de membresía es desactiva i retorna false,
	// de manera que la pàgina mostra 'org.not-member' (comportament esperat).
	it("mostra 'org.not-member' quan no és connectat (la membresía no es pot verificar)", async () => {
		mockIsConnected = false
		renderPage()
		await waitFor(() => {
			expect(screen.getByText('org.not-member')).not.toBeNull()
		})
	})
})

describe('VotePage - votant no membre', () => {
	it("mostra 'org.not-member' quan no és membre de l'organització", async () => {
		renderPage({ isMember: false })
		await waitFor(() => {
			expect(screen.getByText('org.not-member')).not.toBeNull()
		})
	})

	it('no mostra el botó de submit si no és membre', async () => {
		renderPage({ isMember: false })
		await waitFor(() => screen.getByText('org.not-member'))
		expect(screen.queryByText('vote.submit')).toBeNull()
	})
})

describe('VotePage - votant que ja ha votat', () => {
	it("mostra 'vote.already-voted' si ja ha votat", async () => {
		renderPage({ hasVoted: true })
		await waitFor(() => {
			expect(screen.getByText('vote.already-voted')).not.toBeNull()
		})
	})

	it('mostra el botó de resultats si ja ha votat', async () => {
		renderPage({ hasVoted: true })
		await waitFor(() => {
			expect(screen.getByText('vote.results.cta')).not.toBeNull()
		})
	})

	it('no mostra el botó de submit si ja ha votat', async () => {
		renderPage({ hasVoted: true })
		await waitFor(() => screen.getByText('vote.already-voted'))
		expect(screen.queryByText('vote.submit')).toBeNull()
	})
})

describe('VotePage - enviament del vot', () => {
	it('clicar submit crida la mutació', async () => {
		renderPage()
		await waitFor(() => screen.getByText('vote.submit'))
		fireEvent.click(screen.getByText('vote.submit'))
		await waitFor(() => {
			expect(mockCastRankedVote).toHaveBeenCalledTimes(1)
		})
	})

	it("la mutació rep l'ordre de preferències correcte", async () => {
		renderPage()
		// Esperar que el useEffect hagi corregut i les opcions estiguin renderitzades
		await waitFor(() => screen.getByText(MOCK_PROPOSAL_OPEN.options[0]?.title ?? ''))
		fireEvent.click(screen.getByText('vote.submit'))
		await waitFor(() => {
			const expectedOrder = MOCK_PROPOSAL_OPEN.options.map(option => option.id)
			expect(mockCastRankedVote.mock.calls[0]?.[0]?.preferenceOrder).toEqual(expectedOrder)
		})
	})

	it('mostra el rebut del vot després de votar', async () => {
		renderPage()
		await waitFor(() => screen.getByText('vote.submit'))
		fireEvent.click(screen.getByText('vote.submit'))
		await waitFor(() => {
			expect(screen.getByTestId('vote-receipt')).not.toBeNull()
		})
	})
})
