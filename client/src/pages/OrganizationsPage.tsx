import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Users, Crown } from 'lucide-react';

import { useQuery } from '@tanstack/react-query';

import { Badge } from '@/components/ui/Badge';

import { organizationQueries } from '@/algorand/queries';
import { useAlgorand } from '@/hooks/useAlgorand';

export function OrganizationsPage() {
  const { t } = useTranslation();
  const { data: organizations = [] } = useQuery(organizationQueries.all());
  const { address } = useAlgorand();

  return (
    <div className="mx-auto max-w-7xl px-6 py-14">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
            {t('org.title')}
          </h1>
          <p className="mt-2 text-muted">{t('org.subtitle')}</p>
        </div>
        <Link
          to="/organizations/new"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-br from-primary to-accent px-5 text-sm font-semibold text-primary-fg shadow-glow transition hover:brightness-110"
        >
          <Plus size={16} />
          {t('org.new')}
        </Link>
      </div>

      {organizations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted">
          {t('org.empty')}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {organizations.map(org => {
            const isOrganizer = address === org.organizer;

            return (
              <Link
                key={org.id}
                to={`/organizations/${org.id}`}
                className="group flex flex-col rounded-2xl border border-border/70 bg-surface/80 p-6 transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-glow"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {isOrganizer && (
                    <Badge tone="warning">
                      <Crown size={11} />
                      {t('common.organizer')}
                    </Badge>
                  )}
                </div>

                <h3 className="font-display text-lg font-semibold text-fg group-hover:text-primary">
                  {org.name}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-sm text-muted">{org.description}</p>

                <div className="mt-5 flex items-center gap-1.5 text-xs text-muted">
                  <Users size={13} />
                  {t('org.members', { count: org.memberCount })}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
