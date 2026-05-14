import {Wallet, LogOut, ChevronDown, ChevronUp, Search} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {useWallet} from '@txnlab/use-wallet-react';
import {useTranslation} from "react-i18next";

import {getDevAddresses} from '@/algorand/dev-accounts';

function truncateAddress(addr: string): string {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

const WALLET_LABELS: Record<string, string> = {
    kmd: 'KMD (LocalNet)',
    pera: 'Pera Wallet',
};

export function WalletConnect() {
    const {t} = useTranslation();
    const {wallets, activeAddress} = useWallet();

    const [menuOpen, setMenuOpen] = useState(false);
    const [filter, setFilter] = useState('');

    const connectedWallet = wallets.find((w) => w.isConnected);
    const rawAccounts = connectedWallet?.accounts ?? [];

    const accounts = useMemo(() => {
        const devSet = new Set(getDevAddresses());
        if (devSet.size === 0) return rawAccounts;
        return rawAccounts.filter(
            (a) => devSet.has(a.address) || a.address === activeAddress,
        );
    }, [rawAccounts, activeAddress]);

    const otherAccounts = useMemo(
        () => accounts.filter((a) => a.address !== activeAddress),
        [accounts, activeAddress],
    );

    const filteredOthers = useMemo(() => {
        if (!filter.trim()) return otherAccounts;
        const q = filter.trim().toUpperCase();
        return otherAccounts.filter((a) => a.address.toUpperCase().includes(q));
    }, [otherAccounts, filter]);

    useEffect(() => {
        if (!connectedWallet || !activeAddress) return;
        const devAddresses = getDevAddresses();
        if (devAddresses.length === 0) return;
        if (devAddresses.includes(activeAddress)) return;
        const fallback = rawAccounts.find((a) => devAddresses.includes(a.address));
        if (fallback) connectedWallet.setActiveAccount(fallback.address);
    }, [connectedWallet, activeAddress, rawAccounts]);

    const handleConnect = async (walletId: string) => {
        const wallet = wallets.find((w) => w.id === walletId);
        if (!wallet) return;
        try {
            await wallet.connect();
        } catch {
            localStorage.removeItem('txnlab-use-wallet');
            try {
                await wallet.connect();
            } catch (retryErr) {
                console.error('Wallet connect failed after state reset:', retryErr);
            }
        }
        setMenuOpen(false);
    };

    const handleSwitchAccount = (address: string) => {
        if (!connectedWallet) return;
        connectedWallet.setActiveAccount(address);
        setMenuOpen(false);
        setFilter('');
    };

    const handleDisconnect = async () => {
        if (connectedWallet) await connectedWallet.disconnect();
        localStorage.removeItem('txnlab-use-wallet');
        setMenuOpen(false);
    };

    // ── Not connected ────────────────────────────────────────────────
    if (!activeAddress) {
        return (
            <div className="relative">
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-medium text-fg transition hover:border-primary hover:text-primary"
                >
                    <Wallet size={15}/>
                    <span className="hidden sm:inline">{t("common.connect")}</span>
                    {menuOpen ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
                </button>

                {menuOpen && (
                    <>
                        <button
                            type="button"
                            aria-label="Close wallet menu"
                            className="fixed inset-0 z-40"
                            onClick={() => setMenuOpen(false)}
                        />
                        <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-border bg-surface p-2 shadow-md">
                            <div className="mb-1 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted">
                                {t("wallet.choose")}
                            </div>
                            {wallets.map(wallet => (
                                <button
                                    key={wallet.id}
                                    onClick={() => handleConnect(wallet.id)}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg transition hover:bg-bg"
                                >
                                    <Wallet size={14} className="text-primary"/>
                                    {WALLET_LABELS[wallet.id] ?? wallet.metadata.name}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    }

    // ── Connected ────────────────────────────────────────────────────
    const hasMultiple = accounts.length > 1;
    const showFilter = accounts.length > 8;

    return (
        <div className="relative">
            <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 text-sm font-medium text-primary transition hover:bg-primary/20"
            >
                <span className="size-2 rounded-full bg-emerald-500"/>
                <span className="font-mono text-xs">{truncateAddress(activeAddress)}</span>
                <ChevronDown size={14}/>
            </button>

            {menuOpen && (
                <>
                    <button
                        type="button"
                        aria-label="Close wallet menu"
                        className="fixed inset-0 z-40"
                        onClick={() => {
                            setMenuOpen(false);
                            setFilter('');
                        }}
                    />
                    <div
                        className="absolute right-0 top-full z-50 mt-2 flex max-h-[min(70vh,32rem)] w-72 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-md">
                        {/* Active account header */}
                        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
                            <span className="size-2 shrink-0 rounded-full bg-emerald-500"/>
                            <div className="min-w-0 flex-1">
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                                    {t("common.active")}
                                </div>
                                <div className="truncate font-mono text-xs text-primary">{activeAddress}</div>
                            </div>
                        </div>

                        {hasMultiple && (
                            <>
                                <div className="flex items-center justify-between px-3 pt-2 pb-1">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                                        {t("wallet.switch")}
                                    </span>
                                    <span className="font-mono text-[10px] text-muted">{accounts.length}</span>
                                </div>

                                {showFilter && (
                                    <div className="px-2 pb-1">
                                        <div className="flex items-center gap-2 rounded-lg border border-border bg-bg px-2.5 py-1.5">
                                            <Search size={12} className="shrink-0 text-muted"/>
                                            <input
                                                type="text"
                                                value={filter}
                                                onChange={e => setFilter(e.target.value)}
                                                placeholder={t("wallet.address-filter-placeholder")}
                                                className="w-full bg-transparent font-mono text-xs text-fg placeholder:text-muted focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="min-h-0 flex-1 overflow-y-auto p-1">
                                    {filteredOthers.length === 0 ? (
                                        <div className="px-3 py-4 text-center text-xs text-muted">
                                            {t("common.no-matches")}
                                        </div>
                                    ) : (
                                        filteredOthers.map((account) => (
                                            <button
                                                key={account.address}
                                                onClick={() => handleSwitchAccount(account.address)}
                                                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-fg transition hover:bg-bg"
                                            >
                                                <span className="size-1.5 shrink-0 rounded-full bg-border"/>
                                                <span className="truncate font-mono">
                                                    {account.address.slice(0, 8)}…{account.address.slice(-6)}
                                                </span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </>
                        )}

                        <button
                            onClick={handleDisconnect}
                            className="flex shrink-0 items-center gap-2 border-t border-border px-3 py-2.5 text-sm text-fg transition hover:bg-bg"
                        >
                            <LogOut size={14}/>
                            {t("common.disconnect")}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
