import {useState} from "react";
import {useTranslation} from 'react-i18next';
import {Link, useLoaderData, useNavigate} from 'react-router-dom';
import {ArrowLeft, CalendarDays, Building2, RefreshCw} from 'lucide-react';

import type {ProposalId} from "@/domain";

import {PendingApprovalPanel, PendingStartPanel, VoteCtaPanel} from "@/components/proposal/ProposalStatePanels";
import {ApprovalBar} from '@/components/proposal/ApprovalBar';
import {StatusBadge} from '@/components/proposal/StatusBadge';

import {useProposalDetail} from '@/hooks/useProposalDetail';
import {useAlgorand} from "@/hooks/useAlgorand";

import {useCastApprovalVote} from "@/algorand/mutations";
import {formatDatetime} from '@/utils/date';

export function ProposalDetailPage() {
    const id = useLoaderData() as ProposalId;

    const {t, i18n} = useTranslation();
    const locale = i18n.resolvedLanguage ?? 'en';
    const navigate = useNavigate();

    const {
        proposal,
        organization: org,
        isMember,
        hasApprovalVoted,
        hasElectionVoted,
        isPending,
        error,
        refetch
    } = useProposalDetail(id);

    const {isConnected, address, signer} = useAlgorand();
    const approvalVoteMutation = useCastApprovalVote();
    const [voting, setVoting] = useState<'approve' | 'reject' | null>(null);

    const handleApprovalVote = async (approve: boolean) => {
        if (!isConnected || !address || !proposal) return;

        setVoting(approve ? 'approve' : 'reject');

        try {
            await approvalVoteMutation.mutateAsync({
                signer,
                sender: address,
                proposalId: proposal.id,
                orgId: proposal.orgId,
                approve,
            });
        } catch {
            // Error is tracked by approvalVoteMutation.error
        } finally {
            setVoting(null);
        }
    };

    if (isPending) {
        return (
            <div className="mx-auto max-w-4xl px-6 py-14">
                <div className="mb-8 h-5 w-20 animate-pulse rounded-full bg-surface"/>
                <div className="h-12 w-2/3 animate-pulse rounded-2xl bg-surface"/>
                <div className="mt-10 grid gap-6 md:grid-cols-[1.5fr_1fr]">
                    <div className="h-64 animate-pulse rounded-2xl bg-surface"/>
                    <div className="h-64 animate-pulse rounded-2xl bg-surface"/>
                </div>
            </div>
        );
    }

    if (error || !proposal) {
        return (
            <div className="mx-auto max-w-3xl px-6 py-20 text-center">
                <p className="mb-4 text-muted">{error?.message ?? t('proposal.not-found')}</p>
                <button
                    onClick={() => void refetch()}
                    className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted transition hover:text-fg"
                >
                    <RefreshCw size={14}/> {t('common.retry')}
                </button>
            </div>
        );
    }

    const stateKind = proposal.state.kind;

    return (
        <div className="mx-auto max-w-4xl px-6 py-14">
            <button
                onClick={() => navigate(-1)}
                className="mb-8 inline-flex items-center gap-2 text-sm text-muted transition hover:text-fg"
            >
                <ArrowLeft size={16}/> {t('common.back')}
            </button>

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <StatusBadge status={stateKind}/>
                {org && (
                    <Link
                        to={`/organizations/${org.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted transition hover:border-primary hover:text-primary"
                    >
                        <Building2 size={11}/> {org.name}
                    </Link>
                )}
            </div>

            <h1 className="font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
                {proposal.title}
            </h1>

            <div className="mt-5 inline-flex items-center gap-2 text-sm text-muted">
                <CalendarDays size={14}/>
                {formatDatetime(proposal.startDate, locale)} → {formatDatetime(proposal.endDate, locale)}
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-[1.5fr_1fr]">
                <div className="rounded-2xl border border-border bg-surface p-6">
                    {proposal.description && (
                        <>
                            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                                {t('common.summary')}
                            </h2>
                            <p className="leading-relaxed text-fg">{proposal.description}</p>
                        </>
                    )}

                    <h2 className="mb-3 mt-8 text-xs font-semibold uppercase tracking-wider text-muted">
                        {t('proposal.options')}
                    </h2>

                    <ul className="space-y-2">
                        {proposal.options.map((opt, i) => (
                            <li
                                key={opt.id}
                                className="flex items-start gap-3 rounded-xl border border-border bg-elevated px-4 py-3"
                            >
                                <span
                                    className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                    {i + 1}
                                </span>
                                <div>
                                    <div className="text-sm font-medium text-fg">{opt.title}</div>
                                    {opt.description && <div className="text-xs text-muted">{opt.description}</div>}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Sidebar */}
                <aside className="flex flex-col gap-5">
                    <div className="rounded-2xl border border-border bg-surface p-6">
                        <ApprovalBar yes={proposal.approvalTally.votesFor} total={proposal.memberCount}/>
                    </div>

                    {stateKind === 'PendingApproval' && (
                        <PendingApprovalPanel
                            alreadyVoted={approvalVoteMutation.isSuccess || hasApprovalVoted}
                            isConnected={isConnected}
                            isMember={isMember}
                            voting={voting}
                            mutationError={approvalVoteMutation.isError ? approvalVoteMutation.error : null}
                            onVote={handleApprovalVote}
                        />
                    )}

                    {stateKind === 'PendingStart' && (
                        <PendingStartPanel startDate={proposal.startDate} locale={locale}/>
                    )}

                    {(stateKind === 'Open' || stateKind === 'Closed') && (
                        <VoteCtaPanel
                            proposalId={proposal.id}
                            stateKind={stateKind}
                            hasElectionVoted={hasElectionVoted}
                        />
                    )}
                </aside>
            </div>
        </div>
    );
}
