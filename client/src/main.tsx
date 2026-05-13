import React from 'react';

import {RouterProvider} from 'react-router-dom';
import {createRoot} from 'react-dom/client';

import {ThemeProvider} from './theme/ThemeProvider';
import {router} from './router';

import './index.css';
import './i18n';

createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ThemeProvider>
            <RouterProvider router={router}/>
        </ThemeProvider>
    </React.StrictMode>,
);
