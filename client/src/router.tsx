import { createBrowserRouter } from 'react-router-dom';

import { LandingPage } from './pages/LandingPage';
import App from './App';

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: '/', element: <LandingPage /> }
    ],
  },
]);
