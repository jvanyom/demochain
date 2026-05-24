import type { ElectionResults } from '@/domain'
import type { HTMLAttributes, ReactNode } from 'react'

import { mock, describe, it, expect, afterEach } from 'bun:test'

import { queryKeys } from '@/algorand/query-keys'
import { MOCK_PROPOSAL_OPEN, MOCK_PROPOSAL_CLOSED, makeQueryClient } from '@/tests/utils'
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { createElement, Fragment } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

// ── Mocks ────────────────────────────────────────────────────────────────────

void mock.module('react-i18next', () => ({
	useTranslation: () => ({
		t: (k: string, opts?: Record<string, unknown>) => (opts ? `${k}:${JSON.stringify(opts)}` : k),
		i18n: { resolvedLanguage: 'ca' }
	})
}))

// framer-motion: substituïm els components animats per elements HTML simples
function motionTag(tag: string) {
	return function MotionEl({ children, initial, animate, exit, transition, ...rest }: Record<string, unknown>) {
		// oxlint-disable-next-line no-unsafe-type-assertion
		return createElement(tag, rest as HTMLAttributes<HTMLElement>, children as ReactNode)
	}
}

void mock.module('framer-motion', () => ({
	// oxlint-disable-next-line id-length
	m: {
		div: motionTag('div'),
		li: motionTag('li'),
		span: motionTag('span'),
		// oxlint-disable-next-line id-length
		p: motionTag('p')
	},
	AnimatePresence: ({ children }: { children: ReactNode }) => createElement(Fragment, null, children),
	useMotionValue: () => ({
		get: () => 0,
		set: () => {}
	}),
	useTransform: () => ({ get: () => 0 })
}))

// ClosedResults i VerificationPanel usen framer-motion i lògica complexa - els simplifiquem
void mock.module('@/components/results/ClosedResults', () => ({
	ClosedResults: () => <div data-testid="closed-results" />
}))

void mock.module('@/components/results/VerificationPanel', () => ({
	VerificationPanel: () => <div data-testid="verification-panel" />
}))

// ── Component import (after mocks) ───────────────────────────────────────────

import { ResultsPage } from './ResultsPage'

// ── Dades de test ─────────────────────────────────────────────────────────────

const MOCK_ELECTION_RESULTS: ElectionResults = {
	proposalId: MOCK_PROPOSAL_CLOSED.id,
	totalVoters: 2,
	ranking: [
		{ optionId: 0, firstChoiceVotes: 2, finalRank: 0, pairwiseWins: 1 },
		{ optionId: 1, firstChoiceVotes: 0, finalRank: 1, pairwiseWins: 0 }
	],
	pairwiseMatrix: [
		[0, 2],
		[0, 0]
	]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderOpen(voterCount = 3) {
	const qc = makeQueryClient()
	qc.setQueryData(queryKeys.proposals.detail(MOCK_PROPOSAL_OPEN.id), MOCK_PROPOSAL_OPEN)
	qc.setQueryData(queryKeys.voting.electionVoterCount(MOCK_PROPOSAL_OPEN.id), voterCount)

	const router = createMemoryRouter([
		{
			path: '/',
			element: <ResultsPage />,
			loader: () => MOCK_PROPOSAL_OPEN.id
		}
	])

	return render(
		<QueryClientProvider client={qc}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	)
}

function renderClosed(results: ElectionResults | null = MOCK_ELECTION_RESULTS) {
	const qc = makeQueryClient()
	qc.setQueryData(queryKeys.proposals.detail(MOCK_PROPOSAL_CLOSED.id), MOCK_PROPOSAL_CLOSED)
	qc.setQueryData(queryKeys.voting.electionVoterCount(MOCK_PROPOSAL_CLOSED.id), results?.totalVoters ?? 0)
	qc.setQueryData(queryKeys.voting.electionResults(MOCK_PROPOSAL_CLOSED.id), results)

	const router = createMemoryRouter([
		{
			path: '/',
			element: <ResultsPage />,
			loader: () => MOCK_PROPOSAL_CLOSED.id
		}
	])

	return render(
		<QueryClientProvider client={qc}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	)
}

afterEach(cleanup)

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ResultsPage - proposta en curs (Open)', () => {
	it('mostra el títol de la proposta', async () => {
		renderOpen()
		await waitFor(() => {
			expect(screen.getByText(MOCK_PROPOSAL_OPEN.title)).not.toBeNull()
		})
	})

	it("mostra l'encapçalament 'vote.results.title'", async () => {
		renderOpen()
		await waitFor(() => {
			expect(screen.getByText('vote.results.title')).not.toBeNull()
		})
	})

	it("mostra la insígnia 'common.live' per a proposta en curs", async () => {
		renderOpen()
		await waitFor(() => {
			expect(screen.getByText('common.live')).not.toBeNull()
		})
	})

	it("mostra el text 'vote.results.in-progress' per a proposta en curs", async () => {
		renderOpen()
		await waitFor(() => {
			expect(screen.getByText('vote.results.in-progress')).not.toBeNull()
		})
	})

	it('mostra el recompte de votants', async () => {
		renderOpen(7)
		await waitFor(() => {
			// El número de votants es mostra com a text numèric
			expect(screen.getByText('7')).not.toBeNull()
		})
	})

	it('mostra el panell de verificació', async () => {
		renderOpen()
		await waitFor(() => {
			expect(screen.getByTestId('verification-panel')).not.toBeNull()
		})
	})
})

describe('ResultsPage - proposta tancada (Closed)', () => {
	it('mostra el títol de la proposta', async () => {
		renderClosed()
		await waitFor(() => {
			expect(screen.getByText(MOCK_PROPOSAL_CLOSED.title)).not.toBeNull()
		})
	})

	it("no mostra la insígnia 'common.live' per a proposta tancada", async () => {
		renderClosed()
		await waitFor(() => screen.getByText(MOCK_PROPOSAL_CLOSED.title))
		expect(screen.queryByText('common.live')).toBeNull()
	})

	it("no mostra 'vote.results.in-progress' per a proposta tancada", async () => {
		renderClosed()
		await waitFor(() => screen.getByText(MOCK_PROPOSAL_CLOSED.title))
		expect(screen.queryByText('vote.results.in-progress')).toBeNull()
	})

	it('renderitza el component ClosedResults', async () => {
		renderClosed()
		await waitFor(() => {
			expect(screen.getByTestId('closed-results')).not.toBeNull()
		})
	})

	it('mostra el panell de verificació', async () => {
		renderClosed()
		await waitFor(() => {
			expect(screen.getByTestId('verification-panel')).not.toBeNull()
		})
	})
})
