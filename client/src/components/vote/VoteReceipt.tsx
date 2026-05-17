import {useState} from 'react';
import {useTranslation} from "react-i18next";
import {CheckCircle2, Copy, Check, ExternalLink} from 'lucide-react';
import {m, AnimatePresence, useMotionValue, useTransform} from 'framer-motion';

import type {ProposalOption} from '@/domain';

interface VoteReceiptProps {
    open: boolean;
    onClose: () => void;
    proposalTitle: string;
    ranking: ProposalOption[];
    txId: string;
}

const LORA_BASE = 'https://lora.algokit.io/localnet/transaction';
const DISMISS_THRESHOLD = 120;

export function VoteReceipt({open, onClose, proposalTitle, ranking, txId}: VoteReceiptProps) {
    const {t} = useTranslation();

    const [copied, setCopied] = useState(false);
    const y = useMotionValue(0);
    const opacity = useTransform(y, [0, DISMISS_THRESHOLD], [1, 0.3]);

    const copyTxId = async () => {
        try {
            await navigator.clipboard.writeText(txId);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch { /* noop */
        }
    };

    const shortTxId = txId.length > 16 ? `${txId.slice(0, 8)}...${txId.slice(-8)}` : txId;

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <m.div
                        key="backdrop"
                        className="fixed inset-0 z-40 bg-fg/30 backdrop-blur-sm"
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        exit={{opacity: 0}}
                        onClick={onClose}
                    />

                    {/* Sheet */}
                    <m.div
                        key="sheet"
                        className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg rounded-t-3xl border border-border bg-surface shadow-2xl"
                        style={{y, opacity}}
                        initial={{y: '100%'}}
                        animate={{y: 0}}
                        exit={{y: '100%'}}
                        transition={{type: 'spring', damping: 30, stiffness: 300}}
                        drag="y"
                        dragConstraints={{top: 0}}
                        dragElastic={{top: 0, bottom: 0.3}}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > DISMISS_THRESHOLD) onClose();
                        }}
                    >
                        {/* Drag handle */}
                        <div className="flex cursor-grab justify-center pt-4 pb-2 active:cursor-grabbing">
                            <div className="h-1 w-10 rounded-full bg-border"/>
                        </div>

                        <div className="px-6 pb-8 pt-2">
                            {/* Header */}
                            <div className="mb-6 flex items-center gap-3">
                                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                                    <CheckCircle2 size={26} className="text-emerald-500"/>
                                </div>
                                <div>
                                    <div className="font-display text-lg font-semibold text-fg">
                                        {t('vote.confirmed')}
                                    </div>

                                    <div className="text-sm text-muted">
                                        {proposalTitle}
                                    </div>
                                </div>
                            </div>

                            {/* Ranking */}
                            <div className="mb-5">
                                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                                    {t('vote.ranking')}
                                </div>
                                <ol className="space-y-1.5">
                                    {ranking.map((opt, i) => (
                                        <li
                                            key={opt.id}
                                            className="flex items-center gap-3 rounded-xl border border-border bg-elevated px-3 py-2"
                                        >
                                            <span
                                                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                                    i === 0
                                                        ? 'bg-gradient-to-br from-primary to-accent text-primary-fg'
                                                        : 'bg-primary/10 text-primary'
                                                }`}
                                            >
                                                {i + 1}
                                            </span>
                                            <span className="text-sm text-fg">
                                                {opt.title}
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            </div>

                            {/* Transaction ID */}
                            <div className="mb-6 rounded-xl border border-border bg-elevated p-3">
                                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                                    {t('wallet.txid')}
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <code className="font-mono text-xs text-fg">{shortTxId}</code>
                                    <button
                                        onClick={copyTxId}
                                        className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border px-2.5 text-xs font-medium text-muted transition hover:border-primary hover:text-primary"
                                    >
                                        {copied ? <Check size={11}/> : <Copy size={11}/>}
                                        {t(`common.${copied ? 'copied' : 'copy'}`)}
                                    </button>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <a
                                    href={`${LORA_BASE}/${txId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium text-fg transition hover:border-primary hover:text-primary"
                                >
                                    <ExternalLink size={14}/>
                                    {t('wallet.view-on-lora')}
                                </a>
                                <button
                                    onClick={onClose}
                                    className="inline-flex flex-1 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-fg shadow-glow transition hover:brightness-110"
                                >
                                    {t('wallet.close-receipt')}
                                </button>
                            </div>
                        </div>
                    </m.div>
                </>
            )}
        </AnimatePresence>
    );
}
