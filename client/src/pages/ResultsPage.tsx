import {m} from 'framer-motion';
import {useTranslation} from 'react-i18next';
import {useLoaderData, useNavigate} from 'react-router-dom';
import {ArrowLeft, Radio, RefreshCw, Trophy, Users} from 'lucide-react';

import {useQuery} from '@tanstack/react-query';
import {proposalQueries, votingQueries} from '@/algorand/queries';

import type {ProposalId} from "@/domain";

import {VerificationPanel} from '@/components/results/VerificationPanel';

import {formatDatetime} from '@/utils/date';

export function ResultsPage() {
    const id = useLoaderData() as ProposalId;

    const {t, i18n} = useTranslation();
    const locale = i18n.resolvedLanguage ?? 'en';
    const navigate = useNavigate();

    const {data: proposal = null, isPending, error, refetch} = useQuery({
        ...proposalQueries.detail(id)
    });

    const isLive = proposal?.state.kind === 'Open';
    const isClosed = proposal?.state.kind === 'Closed';

    const {data: voterCount = 0} = useQuery({
        ...votingQueries.electionVoterCount(id),
        refetchInterval: isLive ? 5000 : false,
    });

    const {data: electionResults = null, isPending: resultsLoading, error: resultsError} = useQuery({
        ...votingQueries.electionResults(id, proposal?.options.length ?? 0),
        enabled: isClosed
    });

    const results = electionResults?.ranking ?? [];
    const totalVoters = electionResults?.totalVoters ?? 0;

    if (isPending) {
        return (
            <div className="mx-auto max-w-4xl px-6 py-14">
                <div className="mb-6 h-5 w-20 animate-pulse rounded-full bg-surface"/>
                <div className="h-10 w-1/2 animate-pulse rounded-2xl bg-surface"/>
                <div className="mt-10 h-40 animate-pulse rounded-3xl bg-surface"/>
            </div>
        );
    }

    if (error || !proposal) {
        return (
            <div className="mx-auto max-w-3xl px-6 py-20 text-center">
                <p className="mb-4 text-muted">{error?.message ?? 'Proposal not found.'}</p>
                <button
                    onClick={() => void refetch()}
                    className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted transition hover:text-fg"
                >
                    <RefreshCw size={14}/> {t('common.retry')}
                </button>
            </div>
        );
    }

    const displayVoters = isClosed ? totalVoters : voterCount;

    return (
        <div className="mx-auto max-w-4xl px-6 py-14">
            <button
                onClick={() => navigate(-1)}
                className="mb-6 inline-flex items-center gap-2 text-sm text-muted transition hover:text-fg"
            >
                <ArrowLeft size={16}/> {t('common.back')}
            </button>

            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                {proposal.title}
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
                    {t('vote.results.title')}
                </h1>
                {isLive && (
                    <span
                        className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-500">
                        <Radio size={11} className="animate-pulse"/> {t('common.live')}
                    </span>
                )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted">
                <span>{formatDatetime(proposal.startDate, locale)} → {formatDatetime(proposal.endDate, locale)}</span>
                <span className="inline-flex items-center gap-1.5">
                    <Users size={13}/>
                    {t('vote.results.voters', {count: displayVoters})}
                </span>
            </div>

            {/* ── Election in progress ── */}
            {isLive && (
                <m.div
                    initial={{opacity: 0, y: 16}}
                    animate={{opacity: 1, y: 0}}
                    className="mt-10 rounded-3xl border border-border bg-surface p-10 text-center"
                >
                    <Radio size={32} className="mx-auto mb-4 animate-pulse text-primary"/>

                    <h2 className="font-display text-2xl font-semibold text-fg">
                        {t('vote.results.in-progress')}
                    </h2>

                    <p className="mt-2 text-sm text-muted">
                        {t('vote.results.in-progress-hint')}
                    </p>

                    <p className="mt-5 font-display text-5xl font-bold tabular-nums text-fg">
                        {voterCount}
                    </p>

                    <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted">
                        {t('vote.results.voters-label')}
                    </p>
                </m.div>
            )}

            {/* ── Final results (closed) ── */}
            {isClosed && (
                <>
                    {resultsLoading && (
                        <div className="mt-10 space-y-3">
                            {['rs-a', 'rs-b', 'rs-c'].map((k) => (
                                <div key={k} className="h-16 animate-pulse rounded-2xl bg-surface"/>
                            ))}
                        </div>
                    )}

                    {resultsError && <p className="mt-10 text-center text-sm text-muted">{resultsError.message}</p>}

                    {!resultsLoading && !resultsError && results.length === 0 && (
                        <div
                            className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center text-muted">
                            {t('results.no-votes')}
                        </div>
                    )}

                    {!resultsLoading && results.length > 0 && (() => {
                        const winner = results[0];
                        const winnerOpt = proposal.options.find((o) => o.id === winner.optionId);
                        const maxVotes = results[0].firstChoiceVotes || 1;

                        return (
                            <>
                                {/* Winner card */}
                                <m.div
                                    initial={{opacity: 0, y: 20}}
                                    animate={{opacity: 1, y: 0}}
                                    transition={{duration: 0.5}}
                                    className="relative mt-10 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/20 via-surface to-accent/20 p-8"
                                >
                                    <div className="absolute -right-20 -top-20 size-64 rounded-full bg-primary/20 blur-3xl"/>
                                    <div className="relative flex flex-wrap items-center justify-between gap-6">
                                        <div>
                                            <div
                                                className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary"
                                            >
                                                <Trophy size={14}/> {t('results.winner')}
                                            </div>
                                            <h2 className="font-display text-3xl font-semibold text-fg sm:text-4xl">
                                                {winnerOpt?.title}
                                            </h2>
                                        </div>

                                        <div className="text-right">
                                            <div className="text-xs font-semibold uppercase tracking-wider text-muted">
                                                {t('results.first-choice-votes')}
                                            </div>

                                            <div className="font-display text-5xl font-bold tabular-nums text-fg">
                                                {winner.firstChoiceVotes}
                                            </div>
                                        </div>
                                    </div>
                                </m.div>

                                {/* Full ranking */}
                                <h3 className="mb-4 mt-12 text-xs font-semibold uppercase tracking-wider text-muted">
                                    {t('results.ranking')}
                                </h3>

                                <ul className="space-y-3">
                                    {results.map((r, i) => {
                                        const opt = proposal.options.find(o =>
                                            o.id === r.optionId
                                        );

                                        const widthPct = (r.firstChoiceVotes / maxVotes) * 100;

                                        return (
                                            <m.li
                                                key={r.optionId}
                                                initial={{opacity: 0, x: -10}}
                                                animate={{opacity: 1, x: 0}}
                                                transition={{duration: 0.4, delay: i * 0.05}}
                                                className="relative overflow-hidden rounded-2xl border border-border bg-surface p-4"
                                            >
                                                <div className="relative flex items-center gap-4">
                                                    <div
                                                        className={`flex size-10 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${
                                                            i === 0
                                                                ? 'bg-gradient-to-br from-primary to-accent text-primary-fg'
                                                                : 'bg-primary/10 text-primary'
                                                        }`}
                                                    >
                                                        {i + 1}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="truncate text-sm font-semibold text-fg">
                                                                {opt?.title}
                                                            </span>

                                                            <span className="tabular-nums text-sm text-muted">
                                                                {r.firstChoiceVotes} {t('results.first-choice-short')}
                                                            </span>
                                                        </div>
                                                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                                                            <m.div
                                                                initial={{width: 0}}
                                                                animate={{width: `${widthPct}%`}}
                                                                transition={{
                                                                    duration: 0.8,
                                                                    delay: 0.2 + i * 0.08,
                                                                    ease: 'easeOut'
                                                                }}
                                                                className={`h-full rounded-full ${
                                                                    i === 0 ? 'bg-gradient-to-r from-primary to-accent' : 'bg-primary/60'
                                                                }`}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </m.li>
                                        );
                                    })}
                                </ul>

                                <p className="mt-4 text-center text-xs text-muted">
                                    {t('results.schulze-note')}
                                </p>
                            </>
                        );
                    })()}
                </>
            )}

            <VerificationPanel/>
        </div>
    );
}
