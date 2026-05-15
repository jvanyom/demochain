import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {Clock, Lock, ThumbsDown, ThumbsUp, Wallet} from 'lucide-react';

import type {ProposalId} from "@/domain";

import {formatDatetime} from '@/utils/date';

interface PendingApprovalPanelProps {
    alreadyVoted: boolean;
    isConnected: boolean;
    isMember: boolean;
    voting: 'approve' | 'reject' | null;
    mutationError: Error | null;
    onVote: (approve: boolean) => void;
}

export function PendingApprovalPanel({
                                         alreadyVoted,
                                         isConnected,
                                         isMember,
                                         voting,
                                         mutationError,
                                         onVote,
                                     }: PendingApprovalPanelProps) {
    const {t} = useTranslation();

    return (
        <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                {t('proposal.approval.cta')}
            </h3>

            {alreadyVoted ? (
                <p className="text-sm text-emerald-500">{t('vote.already-voted')} ✓</p>
            ) : !isConnected ? (
                <p className="flex items-center gap-1.5 text-sm text-muted">
                    <Wallet size={14}/> {t('wallet.connect')}
                </p>
            ) : !isMember ? (
                <p className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
                    <Lock size={14}/> {t('org.not-member')}
                </p>
            ) : (
                <div className="flex gap-3">
                    <button
                        onClick={() => onVote(true)}
                        disabled={!!voting}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 py-2.5 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-500/20 disabled:opacity-50 dark:text-emerald-400"
                    >
                        <ThumbsUp size={15}/>
                        {voting === 'approve' ? '…' : t('common.approve')}
                    </button>
                    <button
                        onClick={() => onVote(false)}
                        disabled={!!voting}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/10 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-500/20 disabled:opacity-50 dark:text-rose-400"
                    >
                        <ThumbsDown size={15}/>
                        {voting === 'reject' ? '…' : t('common.reject')}
                    </button>
                </div>
            )}

            {mutationError && (
                <p className="mt-3 text-xs text-rose-500">
                    {mutationError.message ?? 'Transaction failed.'}
                </p>
            )}
        </div>
    );
}

interface PendingStartPanelProps {
    startDate: number;
    locale: string;
}

export function PendingStartPanel({startDate, locale}: PendingStartPanelProps) {
    const {t} = useTranslation();

    return (
        <div className="flex flex-1 flex-col justify-center rounded-2xl border border-primary/30 bg-primary/5 p-5">
            <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-primary">
                <Clock size={15}/>
                {t('proposal.waiting-to-start')}
            </div>
            <p className="text-sm text-muted">
                {t('vote.opens-on', {date: formatDatetime(startDate, locale)})}
            </p>
        </div>
    );
}

interface VoteCtaPanelProps {
    proposalId: ProposalId;
    stateKind: 'Open' | 'Closed';
    hasElectionVoted: boolean;
}

export function VoteCtaPanel({proposalId, stateKind, hasElectionVoted}: VoteCtaPanelProps) {
    const {t} = useTranslation();

    const voteLabel = t(`vote.${stateKind === 'Open' ? 'cta' : 'results.cta'}`);
    const voteTo = `/proposals/${proposalId}/${stateKind === 'Open' ? 'vote' : 'results'}`;

    if (stateKind === 'Closed') {
        return (
            <>
                <p className="text-sm text-muted">{t('vote.closed-notice')}</p>
                <Link
                    to={voteTo}
                    className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent px-6 text-sm font-semibold text-primary-fg shadow-glow transition hover:brightness-110"
                >
                    {voteLabel}
                </Link>
            </>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {hasElectionVoted ? (
                <p className="text-sm text-emerald-500">{t('vote.already-voted')} ✓</p>
            ) : (
                <Link
                    to={voteTo}
                    className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent px-6 text-sm font-semibold text-primary-fg shadow-glow transition hover:brightness-110"
                >
                    {voteLabel}
                </Link>
            )}
            <Link
                to={`/proposals/${proposalId}/results`}
                className="inline-flex h-10 items-center justify-center rounded-full border border-border px-6 text-sm font-medium text-muted transition hover:text-fg"
            >
                {t('vote.results.cta')}
            </Link>
        </div>
    );
}
