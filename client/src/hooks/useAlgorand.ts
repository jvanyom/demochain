import type { Address } from '@/domain'
import type { Wallet } from '@txnlab/use-wallet-react'
import type algosdk from 'algosdk'

import { algodClient } from '@/algorand/config'
import { asAddress } from '@/domain'
import { useWallet } from '@txnlab/use-wallet-react'

export interface Algorand {
	isConnected: boolean
	address: Address | null
	signer: (txnGroup: algosdk.Transaction[], indexesToSign: number[]) => Promise<Uint8Array[]>
	algodClient: algosdk.Algodv2
	wallets: Wallet[]
}

export function useAlgorand(): Algorand {
	const { activeAddress, transactionSigner, wallets } = useWallet()

	return {
		isConnected: Boolean(activeAddress),
		address: activeAddress ? asAddress(activeAddress) : null,
		signer: transactionSigner,
		algodClient,
		wallets
	}
}
