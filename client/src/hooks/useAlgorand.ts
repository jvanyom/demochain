import { useWallet } from '@txnlab/use-wallet-react';
import { algodClient } from '@/algorand/config';

export function useAlgorand() {
  const { activeAddress, transactionSigner, wallets } = useWallet();

  return {
    isConnected: !!activeAddress,
    address: activeAddress ?? null,
    signer: transactionSigner,
    algodClient,
    wallets,
  };
}
