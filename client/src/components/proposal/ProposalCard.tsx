import {Lock} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Link, useNavigate} from 'react-router-dom';

import {type Proposal, type OrganizationId, approvalPercentage} from '@/domain';

import {formatDatetime} from '@/utils/date';

import {ApprovalBar} from './ApprovalBar';
import {StatusBadge} from './StatusBadge';

interface Props {
    proposal: Proposal;
    orgName?: string;
    orgId?: OrganizationId;
    locked?: boolean;
}

export function ProposalCard({proposal, orgName, orgId, locked}: Props) {
    const {t, i18n} = useTranslation();

    const navigate = useNavigate();
    const locale = i18n.resolvedLanguage ?? 'en';
    const pct = approvalPercentage(proposal);

    return (
        <div
            onClick={() => navigate(`/proposals/${proposal.id}`)}
            role="link"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate(`/proposals/${proposal.id}`)}
            className={`group flex cursor-pointer flex-col rounded-2xl border border-border/70 bg-surface/80 p-6 transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-glow ${locked ? 'opacity-60' : ''}`}
        >
            <div className="flex items-start justify-between gap-2">
                <StatusBadge status={proposal.state.kind}/>
                <div className="flex shrink-0 items-center gap-1.5">
                    {locked && <Lock size={13} className="text-muted"/>}
                    {orgName && orgId != null && (
                        <Link
                            to={`/organizations/${orgId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-full border border-border px-2 py-0.5 text-xs text-muted transition hover:border-primary hover:text-primary"
                        >
                            {orgName}
                        </Link>
                    )}
                </div>
            </div>

            <h3 className="mt-4 font-display text-lg font-semibold text-fg group-hover:text-primary">
                {proposal.title}
            </h3>
            <p className="mt-1.5 line-clamp-2 text-sm text-muted">{proposal.description}</p>

            <div className="mt-5 flex items-center justify-between text-xs text-muted">
                <span>{formatDatetime(proposal.endDate, locale)}</span>
                <span className="tabular-nums">
                    {pct}% · {t('proposal.card.options', {count: proposal.options.length})}
                </span>
            </div>
            <div className="mt-2">
                <ApprovalBar yes={proposal.approvalTally.votesFor} total={proposal.memberCount} compact/>
            </div>
        </div>
    );
}
