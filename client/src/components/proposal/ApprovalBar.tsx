import {Check} from 'lucide-react';
import {useTranslation} from 'react-i18next';

interface Props {
    yes: number;
    total: number;
    compact?: boolean;
}

const THRESHOLD_PERCENTAGE = 2/3;

export function ApprovalBar({yes, total, compact = false}: Props) {
    const {t} = useTranslation();

    const percentage = total > 0 ? yes / total : 0;
    const reached = percentage >= THRESHOLD_PERCENTAGE;

    return (
        <div className="w-full">
            {!compact && (
                <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-muted">
                        {t('proposal.approval.label')}
                    </span>

                    <span className="tabular-nums text-muted">
                        {t('common.completeness', {current: yes, total})}
                    </span>
                </div>
            )}
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-border/70">
                <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all ${
                        reached ? 'bg-emerald-500' : 'bg-gradient-to-r from-primary to-accent'
                    }`}
                    style={{width: `${Math.min(percentage * 100, 100)}%`}}
                />
                {/* 2/3 marker */}
                <div
                    className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 bg-fg/70"
                    style={{left: `${THRESHOLD_PERCENTAGE * 100}%`}}
                    aria-hidden
                />
            </div>
            {!compact && (
                <div className="mt-1.5 flex items-center justify-between text-xs">
                    <span className="text-muted">
                        {t('proposal.approval.threshold')}
                    </span>

                    {reached && (
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-500">
                            <Check size={12}/>
                            {t('proposal.approval.reached')}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
