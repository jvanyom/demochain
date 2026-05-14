import {Crown, Plus} from 'lucide-react';
import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';

import {Badge} from '@/components/ui/Badge';

interface Stat {
    label: string;
    value: number | string;
    accent?: boolean;
}

interface Props {
    name: string;
    description: string;
    isOrganizer: boolean;
    isMember: boolean;
    stats: Stat[];
    newProposalHref?: string;
}

function initials(name: string): string {
    const parts = name.trim().split(/[\s-]+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function OrganizationHero({name, description, isOrganizer, isMember, stats, newProposalHref}: Props) {
    const {t} = useTranslation();

    return (
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-surface via-surface/95 to-elevated/60 p-6 shadow-xl backdrop-blur-sm sm:p-8">
            <div
                aria-hidden
                className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-gradient-to-br from-primary/25 via-accent/15 to-transparent blur-3xl"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute -left-32 bottom-0 size-56 rounded-full bg-gradient-to-tr from-accent/15 to-transparent blur-3xl"
            />

            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start">
                <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:items-start">
                    <div
                        aria-hidden
                        className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent font-display text-xl font-bold text-primary-fg shadow-glow"
                    >
                        {initials(name)}
                    </div>
                </div>

                <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                        {isOrganizer ? (
                            <Badge tone="warning">
                                <Crown size={11}/> {t('common.organizer')}
                            </Badge>
                        ) : isMember ? (
                            <Badge tone="success">{t('common.member')}</Badge>
                        ) : (
                            <Badge tone="neutral">{t('org.not-member-short')}</Badge>
                        )}
                    </div>

                    <h1 className="font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl lg:text-5xl">
                        {name}
                    </h1>

                    {description && (
                        <div className="relative mt-5 max-w-3xl">
                            <div
                                aria-hidden
                                className="absolute -inset-y-2 -left-3 -right-6 rounded-2xl bg-gradient-to-r from-primary/[0.06] via-accent/[0.03] to-transparent"
                            />
                            <div className="relative py-1 pl-6">
                                <span
                                    aria-hidden
                                    className="absolute inset-y-1 left-0 w-1 rounded-full bg-gradient-to-b from-primary via-accent to-primary/30"
                                />
                                <span
                                    aria-hidden
                                    className="absolute inset-y-1 left-0 w-1 rounded-full bg-gradient-to-b from-primary to-accent opacity-60 blur-md"
                                />
                                <p className="text-base leading-relaxed text-fg/85 sm:text-[17px] sm:leading-[1.8]">
                                    {description}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border/60 pt-5">
                        {stats.map(s => (
                            <div key={s.label} className="flex items-baseline gap-2">
                                <span
                                    className={`font-display text-2xl font-bold tabular-nums ${
                                        s.accent ? 'bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent' : 'text-fg'
                                    }`}
                                >
                                    {s.value}
                                </span>
                                <span className="text-xs uppercase tracking-wide text-muted">{s.label}</span>
                            </div>
                        ))}
                        {newProposalHref && (
                            <Link
                                to={newProposalHref}
                                className="ml-auto inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-br from-primary to-accent px-4 text-xs font-semibold text-primary-fg shadow-glow transition hover:brightness-110"
                            >
                                <Plus size={13}/> {t('proposal.new.short-title')}
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
