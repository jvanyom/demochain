import {useLoaderData, useNavigate} from 'react-router-dom';
import {useState} from 'react';

import {useTranslation} from 'react-i18next';
import {ArrowLeft, Lock} from 'lucide-react';

import {useQuery} from '@tanstack/react-query';

import {organizationQueries} from '@/algorand/queries';

import {useAlgorand} from '@/hooks/useAlgorand';

import {OrganizationHero} from '@/components/organization/OrganizationHero';
import {Tabs, TabList, Tab, TabPanel} from '@/components/ui/Tabs';

type ActiveTab = 'proposals' | 'census';

export function OrganizationDetailPage() {
    const id = useLoaderData() as number

    const {t} = useTranslation();
    const navigate = useNavigate();
    const {address} = useAlgorand();

    const orgQuery = useQuery({
        ...organizationQueries.detail(id)
    });

    const censusQuery = useQuery({
        ...organizationQueries.census(id)
    });

    const organization = orgQuery.data ?? null;
    const censusMembers = censusQuery.data ?? [];
    const orgLoading = orgQuery.isPending;

    const [activeTab, setActiveTab] = useState<ActiveTab>('proposals');

    if (orgLoading) {
        return (
            <div className="mx-auto max-w-6xl space-y-6 px-6 py-14">
                <div className="h-5 w-20 animate-pulse rounded-full bg-surface"/>
                <div className="h-48 w-full animate-pulse rounded-3xl bg-surface"/>
                <div className="h-12 w-full animate-pulse rounded-2xl bg-surface"/>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {['od-a', 'od-b', 'od-c'].map(k => (
                        <div key={k} className="h-44 animate-pulse rounded-2xl bg-surface"/>
                    ))}
                </div>
            </div>
        );
    }

    if (!organization) {
        return (
            <div className="mx-auto max-w-4xl px-6 py-20 text-center text-muted">
                {t('org.not-found')}
            </div>
        );
    }

    const isOrganizer = address === organization.organizer;
    const isMember = address ? censusMembers.includes(address) : false;

    const stats = [
        {label: t('commom.members'), value: organization.memberCount, accent: true},
        {label: t('common.proposals'), value: /*TODO*/-1},
        {label: t('common.active', {count: 2}), value: /*TODO*/-1},
    ];

    return (
        <div className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
            <button
                onClick={() => navigate(-1)}
                className="mb-6 inline-flex items-center gap-2 text-sm text-muted transition hover:text-fg"
            >
                <ArrowLeft size={16}/> {t('common.back')}
            </button>

            <OrganizationHero
                name={organization.name}
                description={organization.description}
                isOrganizer={isOrganizer}
                isMember={isMember}
                stats={stats}
            />

            {!isMember && !isOrganizer && (
                <div
                    className="mt-6 flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-600 dark:text-amber-400">
                    <Lock size={16} className="shrink-0"/>
                    {t('org.not-member')}
                </div>
            )}

            <Tabs className="mt-10">
                <TabList className="mb-8">
                    <Tab
                        active={activeTab === 'proposals'}
                        onClick={() => setActiveTab('proposals')}
                        label={t('common.proposals')}
                        count={/*TODO*/-1}
                    />
                    <Tab
                        active={activeTab === 'census'}
                        onClick={() => setActiveTab('census')}
                        label={t('common.census')}
                        count={organization.memberCount}
                    />
                </TabList>

                <TabPanel active={activeTab === 'proposals'}>
                    <>
                        TODO
                    </>
                </TabPanel>

                <TabPanel active={activeTab === 'census'}>
                    <>
                        TODO
                    </>
                </TabPanel>
            </Tabs>
        </div>
    );
}
