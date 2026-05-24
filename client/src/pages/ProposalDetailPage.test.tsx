import { mock, describe, it, expect, afterEach } from 'bun:test'

import { queryKeys } from '@/algorand/query-keys'
import {
	MOCK_ADDRESS,
	MOCK_ORG,
	MOCK_PROPOSAL_PENDING,
	MOCK_PROPOSAL_OPEN,
	MOCK_PROPOSAL_CLOSED,
	makeQueryClient
} from '@/tests/utils'
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

// ── Mocks ────────────────────────────────────────────────────────────────────

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

// oxlint-disable-next-line id-length
const mockCastApprovalVote = mock((_: { approve: boolean; [k: string]: unknown }) => Promise.resolve(undefined))
void mock.module('@/algorand/mutations', () => ({
	useCastApprovalVote: () => ({
		mutateAsync: mockCastApprovalVote,
		isSuccess: false,
		isError: false,
		error: null
	})
}))

// ── Component import (after mocks) ───────────────────────────────────────────

import { ProposalDetailPage } from './ProposalDetailPage'

// ── Helpers ───────────────────────────────────────────────────────────────────

interface RenderOptions {
	proposal?: typeof MOCK_PROPOSAL_PENDING
	isMember?: boolean
	hasApprovalVoted?: boolean
}

function renderPage({
	proposal = MOCK_PROPOSAL_PENDING,
	isMember = true,
	hasApprovalVoted = false
}: RenderOptions = {}) {
	const qc = makeQueryClient()
	qc.setQueryData(queryKeys.proposals.detail(proposal.id), proposal)
	qc.setQueryData(queryKeys.organizations.detail(proposal.orgId), MOCK_ORG)
	qc.setQueryData(queryKeys.organizations.isMember(MOCK_ADDRESS, proposal.orgId), isMember)
	qc.setQueryData(queryKeys.voting.approvalVoted(MOCK_ADDRESS, proposal.id), hasApprovalVoted)
	qc.setQueryData(queryKeys.voting.electionVoted(MOCK_ADDRESS, proposal.id), false)

	const router = createMemoryRouter([
		{
			path: '/',
			element: <ProposalDetailPage />,
			loader: () => proposal.id
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
	mockCastApprovalVote.mockClear()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProposalDetailPage - visualització bàsica', () => {
	it('mostra el títol de la proposta', async () => {
		renderPage()
		await waitFor(() => {
			expect(screen.getByText(MOCK_PROPOSAL_PENDING.title)).not.toBeNull()
		})
	})

	it("mostra el nom de l'organització", async () => {
		renderPage()
		await waitFor(() => {
			expect(screen.getByText(MOCK_ORG.name)).not.toBeNull()
		})
	})

	it('mostra la descripció de la proposta', async () => {
		renderPage()
		await waitFor(() => {
			expect(screen.getByText(MOCK_PROPOSAL_PENDING.description)).not.toBeNull()
		})
	})

	it('mostra totes les opcions', async () => {
		renderPage()
		await waitFor(() => {
			for (const opt of MOCK_PROPOSAL_PENDING.options) expect(screen.getByText(opt.title)).not.toBeNull()
		})
	})
})

describe("ProposalDetailPage - votació d'aprovació (PendingApproval)", () => {
	it('mostra els botons "Aprovar" i "Rebutjar" quan és membre connectat i no ha votat', async () => {
		renderPage()
		await waitFor(() => {
			expect(screen.getByText('common.approve')).not.toBeNull()
			expect(screen.getByText('common.reject')).not.toBeNull()
		})
	})

	it("mostra 'wallet.connect' quan no és connectat", async () => {
		mockIsConnected = false
		renderPage()
		await waitFor(() => {
			expect(screen.getByText('wallet.connect')).not.toBeNull()
		})
	})

	it("mostra 'org.not-member' quan és connectat però no és membre", async () => {
		renderPage({ isMember: false })
		await waitFor(() => {
			expect(screen.getByText('org.not-member')).not.toBeNull()
		})
	})

	it("mostra 'vote.already-voted' quan ja ha votat en l'aprovació", async () => {
		renderPage({ hasApprovalVoted: true })
		await waitFor(() => {
			expect(screen.getByText(/vote\.already-voted/)).not.toBeNull()
		})
	})

	it("clicar 'Aprovar' crida la mutació amb approve=true", async () => {
		renderPage()
		await waitFor(() => screen.getByText('common.approve'))
		fireEvent.click(screen.getByText('common.approve'))
		await waitFor(() => {
			expect(mockCastApprovalVote).toHaveBeenCalledTimes(1)
			expect(mockCastApprovalVote.mock.calls[0]?.[0]).toMatchObject({ approve: true })
		})
	})

	it("clicar 'Rebutjar' crida la mutació amb approve=false", async () => {
		renderPage()
		await waitFor(() => screen.getByText('common.reject'))
		fireEvent.click(screen.getByText('common.reject'))
		await waitFor(() => {
			expect(mockCastApprovalVote).toHaveBeenCalledTimes(1)
			expect(mockCastApprovalVote.mock.calls[0]?.[0]).toMatchObject({ approve: false })
		})
	})
})

describe('ProposalDetailPage - estat PendingStart', () => {
	const pendingStartProposal = {
		...MOCK_PROPOSAL_PENDING,
		state: { kind: 'PendingStart' as const }
	}

	it("mostra el panell d'espera quan la proposta és PendingStart", async () => {
		renderPage({ proposal: pendingStartProposal })
		await waitFor(() => {
			expect(screen.getByText('proposal.waiting-to-start')).not.toBeNull()
		})
	})

	it("no mostra els botons d'aprovació per a una proposta PendingStart", async () => {
		renderPage({ proposal: pendingStartProposal })
		await waitFor(() => screen.getByText('proposal.waiting-to-start'))
		expect(screen.queryByText('common.approve')).toBeNull()
		expect(screen.queryByText('common.reject')).toBeNull()
	})
})

describe('ProposalDetailPage - estat Open', () => {
	it('mostra el botó de votar per a una proposta Open', async () => {
		renderPage({ proposal: MOCK_PROPOSAL_OPEN })
		await waitFor(() => {
			expect(screen.getByText('vote.cta')).not.toBeNull()
		})
	})

	it("no mostra els botons d'aprovació per a una proposta Open", async () => {
		renderPage({ proposal: MOCK_PROPOSAL_OPEN })
		await waitFor(() => screen.getByText('vote.cta'))
		expect(screen.queryByText('common.approve')).toBeNull()
		expect(screen.queryByText('common.reject')).toBeNull()
	})
})

describe('ProposalDetailPage - estat Closed', () => {
	it('mostra el botó de resultats per a una proposta Closed', async () => {
		renderPage({ proposal: MOCK_PROPOSAL_CLOSED })
		await waitFor(() => {
			expect(screen.getByText('vote.results.cta')).not.toBeNull()
		})
	})

	it("mostra l'avís de proposta tancada", async () => {
		renderPage({ proposal: MOCK_PROPOSAL_CLOSED })
		await waitFor(() => {
			expect(screen.getByText('vote.closed-notice')).not.toBeNull()
		})
	})
})
