import {m} from 'framer-motion';
import {useTranslation} from 'react-i18next';
import {useLoaderData, useNavigate} from 'react-router-dom';
import {ArrowLeft, Radio, RefreshCw, Users} from 'lucide-react';

import {useQuery} from '@tanstack/react-query';
import {proposalQueries, votingQueries} from '@/algorand/queries';

import type {ProposalId} from "@/domain";

import {VerificationPanel} from '@/components/results/VerificationPanel';
import {ClosedResults} from "@/components/results/ClosedResults";

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

    const displayVoters = isClosed ? (electionResults?.totalVoters ?? 0) : voterCount;

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
                        className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-500"
                    >
                        <Radio size={11} className="animate-pulse"/> {t('common.live')}
                    </span>
                )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted">
                <span>
                    {formatDatetime(proposal.startDate, locale)} → {formatDatetime(proposal.endDate, locale)}
                </span>

                <span className="inline-flex items-center gap-1.5">
                    <Users size={13}/>
                    {t('vote.results.voters', {count: displayVoters})}
                </span>
            </div>

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

            {isClosed && (
                <ClosedResults
                    proposal={proposal}
                    electionResults={electionResults}
                    resultsLoading={resultsLoading}
                    resultsError={resultsError}
                />
            )}

            <VerificationPanel
                proposalId={id}
                options={proposal.options}
            />
        </div>
    );
}
