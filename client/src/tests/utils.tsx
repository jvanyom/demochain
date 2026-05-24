import type { Organization, Proposal } from '@/domain'
import type { RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'

import { asAddress, asOrganizationId, asProposalId } from '@/domain'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

export const MOCK_ADDRESS = asAddress('GK2BXKUOAIQC5SPP2FZBPK2HK5UD63YH6J25LJ2534M2UOVBYUNSASQVWE')
export const MOCK_MEMBER_ADDRESS = asAddress('UXXQCZWUBLEJBHCIPWVU3C6PVR7WY56NTWN6TBE43DITVFPFUEWGBI6UEU')
export const MOCK_NEW_ADDRESS = asAddress('TAPHHY5GJRXVXLUIQF3NNBMIQLJMDIAJKZJYVEUYYOQJGUJAEMIYJM55LQ')
export const MOCK_ORG_ID = asOrganizationId(1)
export const MOCK_PROPOSAL_ID = asProposalId(42)

export const MOCK_ORG: Organization = {
	id: MOCK_ORG_ID,
	name: 'Comunitat de prova',
	description: 'Una organització de test',
	organizer: MOCK_ADDRESS,
	memberCount: 3
}

export const MOCK_PROPOSAL_PENDING: Proposal = {
	id: MOCK_PROPOSAL_ID,
	orgId: MOCK_ORG_ID,
	title: 'Proposta de prova',
	description: 'Descripció de la proposta',
	options: [
		{ id: 0, title: 'Opció A' },
		{ id: 1, title: 'Opció B' }
	],
	startDate: Math.floor(Date.now() / 1000) + 4 * 86400,
	endDate: Math.floor(Date.now() / 1000) + 7 * 86400,
	state: { kind: 'PendingApproval', approvalTally: { votesFor: 1, totalVotes: 1 }, memberCount: 3 },
	approvalTally: { votesFor: 1, totalVotes: 1 },
	memberCount: 3
}

export const MOCK_PROPOSAL_OPEN: Proposal = {
	...MOCK_PROPOSAL_PENDING,
	state: { kind: 'Open' },
	approvalTally: { votesFor: 2, totalVotes: 2 }
}

export const MOCK_PROPOSAL_CLOSED: Proposal = {
	...MOCK_PROPOSAL_PENDING,
	state: { kind: 'Closed' },
	approvalTally: { votesFor: 2, totalVotes: 2 }
}

export function makeQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false, staleTime: Infinity },
			mutations: { retry: false }
		}
	})
}

export function renderWithMemoryRouter(ui: ReactElement, qc?: QueryClient): RenderResult {
	const client = qc ?? makeQueryClient()

	return render(
		<QueryClientProvider client={client}>
			<MemoryRouter>{ui}</MemoryRouter>
		</QueryClientProvider>
	)
}
