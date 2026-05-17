import {useState} from 'react';
import {m} from 'framer-motion';
import {useTranslation} from 'react-i18next';
import {ShieldCheck, BadgeCheck, AlertCircle, Loader2} from 'lucide-react';

import type {Address, ProposalId, ProposalOption} from '@/domain';

import {useQuery} from '@tanstack/react-query';
import {votingQueries} from '@/algorand/queries';

import {Button} from '@/components/ui/Button';

interface VerificationPanelProps {
    proposalId: ProposalId;
    options: ProposalOption[];
}

export function VerificationPanel({proposalId, options}: VerificationPanelProps) {
    const {t} = useTranslation();

    const [input, setInput] = useState('');
    const [submittedAddress, setSubmittedAddress] = useState('');

    const {data: ballot, isFetching, isError} = useQuery({
        ...votingQueries.electionBallotForVoter(submittedAddress as Address, proposalId),
        enabled: Boolean(submittedAddress),
    });

    const handleVerify = () => {
        const trimmed = input.trim();
        if (trimmed) setSubmittedAddress(trimmed);
    };

    const hasResult = Boolean(submittedAddress) && !isFetching;
    const voted = hasResult && Array.isArray(ballot);

    return (
        <div className="mt-14 rounded-3xl border border-border bg-elevated p-6">
            <div className="mb-2 flex items-center gap-2">
                <ShieldCheck size={18} className="text-primary"/>
                <h3 className="font-display text-lg font-semibold text-fg">
                    {t('results.verify.title')}
                </h3>
            </div>

            <p className="mb-4 text-sm text-muted">
                {t('results.verify.text')}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
                <input
                    value={input}
                    onChange={(e) => {
                        setInput(e.target.value);
                        setSubmittedAddress('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                    placeholder={t('results.verify.placeholder')}
                    className="h-11 flex-1 rounded-full border border-border bg-surface px-5 font-mono text-sm text-fg placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <Button onClick={handleVerify} disabled={isFetching}>
                    {isFetching && <Loader2 size={14} className="animate-spin"/>}
                    {t('results.verify.button')}
                </Button>
            </div>

            {hasResult && !isError && voted && (
                <m.div
                    initial={{opacity: 0, y: 8}}
                    animate={{opacity: 1, y: 0}}
                    className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4"
                >
                    <div className="flex items-start gap-3">
                        <BadgeCheck className="mt-0.5 shrink-0 text-emerald-500" size={18}/>
                        <div className="flex-1">
                            <div className="text-sm font-semibold text-emerald-500">
                                {t('results.verify.success')}
                            </div>
                            <div className="mt-3">
                                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
                                    {t('results.verify.ranked')}
                                </div>
                                <ol className="space-y-1">
                                    {ballot.map((optionId, i) => {
                                        const opt = options.find((o) => o.id === optionId);
                                        return (
                                            <li key={optionId} className="flex items-baseline gap-2 text-xs text-fg">
                                                <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 font-bold leading-none text-emerald-400">
                                                    {i + 1}
                                                </span>
                                                {opt?.title ?? `Option ${optionId}`}
                                            </li>
                                        );
                                    })}
                                </ol>
                            </div>
                        </div>
                    </div>
                </m.div>
            )}

            {hasResult && !isError && !voted && (
                <m.div
                    initial={{opacity: 0, y: 8}}
                    animate={{opacity: 1, y: 0}}
                    className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4"
                >
                    <AlertCircle className="mt-0.5 shrink-0 text-amber-400" size={18}/>
                    <div className="text-sm text-amber-400">
                        {t('results.verify.not-voted')}
                    </div>
                </m.div>
            )}

            {isError && (
                <m.div
                    initial={{opacity: 0, y: 8}}
                    animate={{opacity: 1, y: 0}}
                    className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4"
                >
                    <AlertCircle className="mt-0.5 shrink-0 text-rose-400" size={18}/>
                    <div className="text-sm text-rose-400">
                        {t('errors.network')}
                    </div>
                </m.div>
            )}
        </div>
    );
}
