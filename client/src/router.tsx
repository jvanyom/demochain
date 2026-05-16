import {createBrowserRouter} from 'react-router-dom';

import {asOrganizationId, asProposalId} from "@/domain";

import {organizationQueries, proposalQueries} from "@/algorand/queries";
import {queryClient} from "@/queryClient";

import {RouteError} from "@/components/RouteError";

import App from './App';

import {LandingPage} from '@/pages/LandingPage';

import {OrganizationsPage} from "@/pages/OrganizationsPage";
import {NewOrganizationPage} from "@/pages/NewOrganizationPage";
import {OrganizationDetailPage} from "@/pages/OrganizationDetailPage";

import {ProposalsPage} from "@/pages/ProposalsPage";
import {NewProposalPage} from "@/pages/NewProposalPage";
import {ProposalDetailPage} from "@/pages/ProposalDetailPage";

import {VotePage} from "@/pages/VotePage";
import {ResultsPage} from "@/pages/ResultsPage";

import {parseRouteId} from "@/hooks/utils.ts";

export const router = createBrowserRouter([{
    element: <App/>,
    children: [
        {
            path: '/',
            element: <LandingPage/>
        },
        {
            path: '/organizations',
            loader: async () => {
                await queryClient.ensureQueryData(organizationQueries.all())

                return null;
            },
            element: <OrganizationsPage/>,
            errorElement: <RouteError/>,
        },
        {
            path: '/organizations/:id',
            loader: async ({params}) => {
                const id = asOrganizationId(parseRouteId(params['id']));

                await Promise.all([
                    queryClient.ensureQueryData(organizationQueries.detail(id)),
                    queryClient.ensureQueryData(organizationQueries.census(id))
                ]);

                return id;
            },
            element: <OrganizationDetailPage/>,
            errorElement: <RouteError/>,
        },
        {
            path: '/organizations/new',
            element: <NewOrganizationPage/>
        },
        {
            path: '/proposals',
            loader: async () => {
                await Promise.all([
                    queryClient.ensureQueryData(proposalQueries.all()),
                    queryClient.ensureQueryData(organizationQueries.all()),
                ])

                return null;
            },
            element: <ProposalsPage/>,
            errorElement: <RouteError/>,
        },
        {
            path: '/proposals/:id',
            loader: async ({params}) => {
                const id = asProposalId(parseRouteId(params['id']));

                const proposal = await queryClient.ensureQueryData(proposalQueries.detail(id));

                if (proposal) {
                    await queryClient.ensureQueryData(organizationQueries.detail(proposal.orgId));
                }

                return id;
            },
            element: <ProposalDetailPage/>,
            errorElement: <RouteError/>,
        },
        {
            path: '/proposals/:id/vote',
            loader: async ({params}) => {
                const id = asProposalId(parseRouteId(params['id']));

                await queryClient.ensureQueryData(proposalQueries.detail(id))

                return id;
            },
            element: <VotePage/>,
            errorElement: <RouteError/>,
        },
        {
            path: '/proposals/:id/results',
            loader: async ({params}) => {
                const id = asProposalId(parseRouteId(params['id']));

                await queryClient.ensureQueryData(proposalQueries.detail(id))

                return id
            },
            element: <ResultsPage/>,
            errorElement: <RouteError/>,
        },
        {
            path: '/proposals/new',
            element: <NewProposalPage/>
        },
    ],
}]);
