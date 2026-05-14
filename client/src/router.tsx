import {createBrowserRouter} from 'react-router-dom';

import {queryClient} from "@/queryClient.ts";
import {organizationQueries} from "@/algorand/queries";

import {RouteError} from "@/components/RouteError";

import App from './App';

import {LandingPage} from '@/pages/LandingPage';

import {OrganizationsPage} from "@/pages/OrganizationsPage";
import {NewOrganizationPage} from "@/pages/NewOrganizationPage";
import {OrganizationDetailPage} from "@/pages/OrganizationDetailPage";

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
                const id = parseRouteId(params.id);

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
    ],
}]);
