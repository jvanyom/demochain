import { bootstrapDevAccountsToKmd } from '@/algorand/dev-accounts'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { QueryClientProvider } from '@tanstack/react-query'
import { NetworkId, WalletId, WalletManager, WalletProvider } from '@txnlab/use-wallet-react'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

import { queryClient } from './query-client'
import { router } from './router'

import './index.css'
import './i18n'

const DEV_TOKEN = 'a'.repeat(64)

const walletManager = new WalletManager({
	wallets: [
		{
			id: WalletId.KMD,
			options: {
				wallet: import.meta.env['VITE_KMD_WALLET_NAME'] ?? 'unencrypted-default-wallet',
				baseServer: import.meta.env['VITE_KMD_SERVER'] ?? 'http://localhost',
				token: import.meta.env['VITE_KMD_TOKEN'] ?? DEV_TOKEN,
				port: Number(import.meta.env['VITE_KMD_PORT'] ?? 4002)
			}
		},
		WalletId.PERA
	],
	defaultNetwork: NetworkId.LOCALNET,
	networks: {
		[NetworkId.LOCALNET]: {
			algod: {
				baseServer: import.meta.env['VITE_ALGOD_SERVER'] ?? 'http://localhost',
				port: Number(import.meta.env['VITE_ALGOD_PORT'] ?? 4001),
				token: import.meta.env['VITE_ALGOD_TOKEN'] ?? DEV_TOKEN
			}
		}
	}
})

if (walletManager.activeNetwork === NetworkId.LOCALNET.toString()) void bootstrapDevAccountsToKmd()

createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<QueryClientProvider client={queryClient}>
			<ThemeProvider>
				<WalletProvider manager={walletManager}>
					<RouterProvider router={router} />
				</WalletProvider>
			</ThemeProvider>
		</QueryClientProvider>
	</React.StrictMode>
)
