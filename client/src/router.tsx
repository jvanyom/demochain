import type { OrganizationId, ProposalId } from '@/domain'

import { organizationQueries, proposalQueries } from '@/algorand/queries'
import { RouteError } from '@/components/RouteError'
import { asOrganizationId, asProposalId } from '@/domain'
import { parseRouteId } from '@/hooks/utils'
import { LandingPage } from '@/pages/LandingPage'
import { NewOrganizationPage } from '@/pages/NewOrganizationPage'
import { NewProposalPage } from '@/pages/NewProposalPage'
import { OrganizationDetailPage } from '@/pages/OrganizationDetailPage'
import { OrganizationsPage } from '@/pages/OrganizationsPage'
import { ProposalDetailPage } from '@/pages/ProposalDetailPage'
import { ProposalsPage } from '@/pages/ProposalsPage'
import { ResultsPage } from '@/pages/ResultsPage'
import { VotePage } from '@/pages/VotePage'
import { queryClient } from '@/query-client'
import { createBrowserRouter } from 'react-router-dom'

import App from './App'

export const router = createBrowserRouter([
	{
		element: <App />,
		children: [
			{
				path: '/',
				element: <LandingPage />
			},
			{
				path: '/organizations',
				loader: async (): Promise<null> => {
					await queryClient.ensureQueryData(organizationQueries.all())

					return null
				},
				element: <OrganizationsPage />,
				errorElement: <RouteError />
			},
			{
				path: '/organizations/:id',
				loader: async ({ params }): Promise<OrganizationId> => {
					const id = asOrganizationId(parseRouteId(params['id']))

					await Promise.all([
						queryClient.ensureQueryData(organizationQueries.detail(id)),
						queryClient.ensureQueryData(organizationQueries.census(id))
					])

					return id
				},
				element: <OrganizationDetailPage />,
				errorElement: <RouteError />
			},
			{
				path: '/organizations/new',
				element: <NewOrganizationPage />
			},
			{
				path: '/proposals',
				loader: async (): Promise<null> => {
					await Promise.all([
						queryClient.ensureQueryData(proposalQueries.all()),
						queryClient.ensureQueryData(organizationQueries.all())
					])

					return null
				},
				element: <ProposalsPage />,
				errorElement: <RouteError />
			},
			{
				path: '/proposals/:id',
				loader: async ({ params }): Promise<ProposalId> => {
					const id = asProposalId(parseRouteId(params['id']))

					const proposal = await queryClient.ensureQueryData(proposalQueries.detail(id))

					if (proposal) await queryClient.ensureQueryData(organizationQueries.detail(proposal.orgId))

					return id
				},
				element: <ProposalDetailPage />,
				errorElement: <RouteError />
			},
			{
				path: '/proposals/:id/vote',
				loader: async ({ params }): Promise<ProposalId> => {
					const id = asProposalId(parseRouteId(params['id']))

					await queryClient.ensureQueryData(proposalQueries.detail(id))

					return id
				},
				element: <VotePage />,
				errorElement: <RouteError />
			},
			{
				path: '/proposals/:id/results',
				loader: async ({ params }): Promise<ProposalId> => {
					const id = asProposalId(parseRouteId(params['id']))

					await queryClient.ensureQueryData(proposalQueries.detail(id))

					return id
				},
				element: <ResultsPage />,
				errorElement: <RouteError />
			},
			{
				path: '/proposals/new',
				element: <NewProposalPage />
			}
		]
	}
])
