import algosdk from 'algosdk';

import {type Address, isAddress} from '@/domain';

import rawDevAccounts from './dev-accounts.json';
import {algodClient} from './config';

interface DevAccountEntry {
    address: string;
    mnemonic: string;
}

interface ResolvedDevAccount {
    address: string;
    secretKey: Uint8Array;
}

const KMD_SERVER = import.meta.env.VITE_KMD_SERVER ?? 'http://localhost';
const KMD_PORT = Number(import.meta.env.VITE_KMD_PORT ?? 4002);
const KMD_TOKEN = import.meta.env.VITE_KMD_TOKEN ?? 'a'.repeat(64);
const KMD_WALLET_NAME = import.meta.env.VITE_KMD_WALLET_NAME ?? 'unencrypted-default-wallet';
const KMD_WALLET_PASSWORD = import.meta.env.VITE_KMD_WALLET_PASSWORD ?? '';

const DISPENSER_MIN_MICRO_ALGOS = 1_000_000_000_000n;
const FUND_TARGET_MICRO_ALGOS = 100_000_000n; // 100 ALGO
const FUND_THRESHOLD_MICRO_ALGOS = 10_000_000n; // 10 ALGO

export function getDevAddresses(): Address[] {
    return (rawDevAccounts as DevAccountEntry[]).flatMap(e =>
        e?.address && isAddress(e.address) ? [e.address] : []
    );
}

function resolveDevAccounts(entries: DevAccountEntry[]): ResolvedDevAccount[] {
    const resolved: ResolvedDevAccount[] = [];

    for (const entry of entries) {
        if (!entry?.address || !entry?.mnemonic) {
            console.warn('[devAccounts] skipping entry without address/mnemonic');
            continue;
        }

        if (!isAddress(entry.address)) {
            console.warn(`[devAccounts] invalid address: ${entry.address}`);
            continue;
        }

        let derived: { addr: string; sk: Uint8Array };

        try {
            const account = algosdk.mnemonicToSecretKey(entry.mnemonic);
            derived = {addr: account.addr.toString(), sk: account.sk};
        } catch (err) {
            console.warn(`[devAccounts] invalid mnemonic for ${entry.address}:`, err);
            continue;
        }

        if (derived.addr !== entry.address) {
            console.warn(
                `[devAccounts] mnemonic does not derive declared address ${entry.address} (got ${derived.addr})`,
            );
            continue;
        }

        resolved.push({address: entry.address, secretKey: derived.sk});
    }

    return resolved;
}

// ── KMD bootstrap helpers ────────────────────────────────────────────

async function isDispenser(addr: string): Promise<boolean> {
    try {
        const info = await algodClient.accountInformation(addr).do();
        return info.amount >= DISPENSER_MIN_MICRO_ALGOS;
    } catch (err) {
        console.warn(`[devAccounts] balance lookup failed for ${addr}, protecting:`, err);
        return true;
    }
}

async function findDispenser(
    kmd: algosdk.Kmd,
    walletHandle: string,
    candidates: string[],
): Promise<{ addr: string; sk: Uint8Array } | null> {
    const balances = await Promise.all(
        candidates.map(async addr => {
            try {
                const info = await algodClient.accountInformation(addr).do();
                return {addr, ok: info.amount >= DISPENSER_MIN_MICRO_ALGOS};
            } catch {
                return {addr, ok: false};
            }
        }),
    );

    const dispenserAddr = balances.find(b => b.ok)?.addr;

    if (!dispenserAddr) return null;

    try {
        const {private_key} = await kmd.exportKey(walletHandle, KMD_WALLET_PASSWORD, dispenserAddr);
        return {addr: dispenserAddr, sk: private_key};
    } catch {
        return null;
    }
}

async function fundDevAccounts(
    kmd: algosdk.Kmd,
    walletHandle: string,
    kmdAddresses: string[],
    resolved: ResolvedDevAccount[],
): Promise<void> {
    if (resolved.length === 0) return;

    const balanceResults = await Promise.all(
        resolved.map(async (account) => {
            try {
                const info = await algodClient.accountInformation(account.address).do();
                return {address: account.address, amount: info.amount as bigint};
            } catch (err) {
                console.warn(`[devAccounts] balance lookup failed for ${account.address}:`, err);
                return null;
            }
        }),
    );

    const underfunded = balanceResults.flatMap(r =>
        r !== null && r.amount < FUND_THRESHOLD_MICRO_ALGOS ? [r.address] : [],
    );

    if (underfunded.length === 0) return;

    const dispenser = await findDispenser(kmd, walletHandle, kmdAddresses);
    if (!dispenser) {
        console.warn('[devAccounts] no dispenser available — skipping auto-fund');
        return;
    }

    const fundResults = await Promise.all(
        underfunded.map(async address => {
            try {
                const sp = await algodClient.getTransactionParams().do();

                const tx = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
                    sender: dispenser.addr,
                    receiver: address,
                    amount: FUND_TARGET_MICRO_ALGOS,
                    suggestedParams: sp,
                });

                const signed = tx.signTxn(dispenser.sk);
                const {txid} = await algodClient.sendRawTransaction(signed).do();

                await algosdk.waitForConfirmation(algodClient, txid, 4);

                return true;
            } catch (err) {
                console.warn(`[devAccounts] auto-fund failed for ${address}:`, err);
                return false;
            }
        }),
    );

    console.info(
        `[devAccounts] auto-funded ${fundResults.filter(Boolean).length}/${underfunded.length} dev accounts`,
    );
}

// ── Public bootstrap (derives keys lazily, only called on LocalNet) ──

export async function bootstrapDevAccountsToKmd(): Promise<void> {
    const resolved = resolveDevAccounts(rawDevAccounts as DevAccountEntry[]);
    const target = new Set(resolved.map((a) => a.address));
    const kmd = new algosdk.Kmd(KMD_TOKEN, KMD_SERVER, KMD_PORT);

    let walletHandle: string | null = null;

    try {
        const {wallets} = await kmd.listWallets();
        const wallet = wallets.find((w: { name: string; id: string }) => w.name === KMD_WALLET_NAME);

        if (!wallet) {
            console.warn(`[devAccounts] KMD wallet "${KMD_WALLET_NAME}" not found`);
            return;
        }

        const handleResp = await kmd.initWalletHandle(wallet.id, KMD_WALLET_PASSWORD);
        walletHandle = handleResp.wallet_handle_token as string;
        const handle = walletHandle;

        const {addresses} = await kmd.listKeys(handle);
        const present = new Set<string>(addresses);

        const orphans = [...present].filter((a) => !target.has(a));
        const removeResults = await Promise.all(
            orphans.map(async addr => {
                if (await isDispenser(addr)) return null;
                try {
                    await kmd.deleteKey(handle, KMD_WALLET_PASSWORD, addr);
                    return addr;
                } catch (err) {
                    console.warn(`[devAccounts] delete failed for ${addr}:`, err);
                    return null;
                }
            }),
        );

        let removed = 0;

        for (const addr of removeResults) {
            if (addr) {
                present.delete(addr);
                removed++;
            }
        }

        const toImport = resolved.filter((a) => !present.has(a.address));
        const skipped = resolved.length - toImport.length;

        const importResults = await Promise.all(
            toImport.map(async account => {
                try {
                    await kmd.importKey(handle, account.secretKey);
                    return true;
                } catch (err) {
                    console.warn(`[devAccounts] import failed for ${account.address}:`, err);
                    return false;
                }
            }),
        );

        const imported = importResults.filter(Boolean).length;

        console.info(
            `[devAccounts] KMD reconciled: ${imported} imported, ${skipped} already present, ${removed} orphaned removed, ${resolved.length} target`,
        );

        await fundDevAccounts(kmd, handle, [...present], resolved);
    } catch (err) {
        console.warn('[devAccounts] bootstrap failed:', err);
    } finally {
        if (walletHandle) {
            try {
                await kmd.releaseWalletHandle(walletHandle);
            } catch {
                // ignore
            }
        }
    }
}
