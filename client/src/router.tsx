import {createBrowserRouter} from 'react-router-dom';

import App from './App';

import {LandingPage} from '@/pages/LandingPage';
import {NewOrganizationPage} from "@/pages/NewOrganizationPage";

export const router = createBrowserRouter([{
    element: <App/>,
    children: [
        {path: '/', element: <LandingPage/>},
        {path: '/organizations/new', element: <NewOrganizationPage/>},
    ],
}]);
