import React from 'react';

import {RouterProvider} from 'react-router-dom';
import {createRoot} from 'react-dom/client';

import {QueryClientProvider} from "@tanstack/react-query";

import {NetworkId, WalletId, WalletManager} from "@txnlab/use-wallet-react";

import {bootstrapDevAccountsToKmd} from "@/algorand/dev-accounts.ts";
import {ThemeProvider} from '@/theme/ThemeProvider';

import {queryClient} from './queryClient'
import {router} from './router';

import './index.css';
import './i18n';

const walletManager = new WalletManager({
    wallets: [
        {
            id: WalletId.KMD,
            options: {
                wallet: 'unencrypted-default-wallet',
                baseServer: 'http://localhost',
                token: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                port: 4002,
            },
        },
        WalletId.PERA,
    ],
    defaultNetwork: NetworkId.LOCALNET,
    networks: {
        [NetworkId.LOCALNET]: {
            algod: {
                baseServer: 'http://localhost',
                port: 4001,
                token: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            },
        },
    },
});

if (walletManager.activeNetwork === NetworkId.LOCALNET) {
    void bootstrapDevAccountsToKmd();
}

createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <RouterProvider router={router}/>
            </ThemeProvider>
        </QueryClientProvider>
    </React.StrictMode>,
);
