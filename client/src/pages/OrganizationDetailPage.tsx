import type { CensusMode } from '@/components/organization/CensusManager'
import type { Address, OrganizationId } from '@/domain'
import type { JSX } from 'react'

import { organizationQueries, proposalQueries } from '@/algorand/queries'
import { CensusManager } from '@/components/organization/CensusManager'
import { CensusTab } from '@/components/organization/CensusTab'
import { OrganizationHero } from '@/components/organization/OrganizationHero'
import { ProposalsTab } from '@/components/organization/ProposalsTab'
import { Modal } from '@/components/ui/Modal'
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/Tabs'
import { useAlgorand } from '@/hooks/useAlgorand'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Lock } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLoaderData, useNavigate } from 'react-router-dom'

type ActiveTab = 'proposals' | 'census'

export function OrganizationDetailPage(): JSX.Element {
	// oxlint-disable-next-line no-unsafe-type-assertion
	const id = useLoaderData() as OrganizationId

	const { t } = useTranslation()
	const navigate = useNavigate()
	const { address, signer } = useAlgorand()

	const orgQuery = useQuery({
		...organizationQueries.detail(id)
	})

	const censusQuery = useQuery({
		...organizationQueries.census(id)
	})

	const { data: allProposals = [] } = useQuery(proposalQueries.all())

	const organization = orgQuery.data ?? null
	const censusMembers = censusQuery.data ?? []
	const orgLoading = orgQuery.isPending

	const [activeTab, setActiveTab] = useState<ActiveTab>('proposals')
	const [drawerOpen, setDrawerOpen] = useState(false)
	const [censusMode, setCensusMode] = useState<CensusMode>('add')
	const [removeSelected, setRemoveSelected] = useState<Set<Address>>(new Set())

	const orgProposals = useMemo(
		() => (organization ? allProposals.filter(proposal => proposal.orgId === organization.id) : []),
		[allProposals, organization]
	)

	const activeProposals = useMemo(
		() =>
			orgProposals.filter(proposal => proposal.state.kind === 'Open' || proposal.state.kind === 'PendingStart')
				.length,
		[orgProposals]
	)

	function handleModeChange(mode: CensusMode): void {
		setCensusMode(mode)
		setRemoveSelected(new Set())
	}

	function handleToggle(addr: Address): void {
		setRemoveSelected(prev => {
			const next = new Set(prev)
			if (next.has(addr)) next.delete(addr)
			else next.add(addr)
			return next
		})
	}

	function openDrawer(): void {
		setDrawerOpen(true)
	}

	function closeDrawer(): void {
		setDrawerOpen(false)
		setCensusMode('add')
		setRemoveSelected(new Set())
	}

	if (orgLoading)
		return (
			<div className="mx-auto max-w-6xl space-y-6 px-6 py-14">
				<div className="h-5 w-20 animate-pulse rounded-full bg-surface" />
				<div className="h-48 w-full animate-pulse rounded-3xl bg-surface" />
				<div className="h-12 w-full animate-pulse rounded-2xl bg-surface" />
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{['od-a', 'od-b', 'od-c'].map(key => (
						<div key={key} className="h-44 animate-pulse rounded-2xl bg-surface" />
					))}
				</div>
			</div>
		)

	if (!organization)
		return <div className="mx-auto max-w-4xl px-6 py-20 text-center text-muted">{t('org.not-found')}</div>

	const isOrganizer = address === organization.organizer
	const isMember = address ? censusMembers.includes(address) : false

	const stats = [
		{ label: t('common.members'), value: organization.memberCount, accent: true },
		{ label: t('common.proposals'), value: orgProposals.length },
		{ label: t('common.active', { count: 2 }), value: activeProposals }
	]

	return (
		<div className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
			<button
				type="button"
				onClick={() => navigate(-1)}
				className="mb-6 inline-flex items-center gap-2 text-sm text-muted transition hover:text-fg"
			>
				<ArrowLeft size={16} /> {t('common.back')}
			</button>

			<OrganizationHero
				name={organization.name}
				description={organization.description}
				isOrganizer={isOrganizer}
				isMember={isMember}
				stats={stats}
				newProposalHref={isMember || isOrganizer ? `/proposals/new?org=${organization.id}` : undefined}
			/>

			{!isMember && !isOrganizer && (
				<div className="mt-6 flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-600 dark:text-amber-400">
					<Lock size={16} className="shrink-0" />
					{t('org.not-member')}
				</div>
			)}

			<Tabs className="mt-10">
				<TabList className="mb-8">
					<Tab
						active={activeTab === 'proposals'}
						onClick={() => setActiveTab('proposals')}
						label={t('common.proposals')}
						count={orgProposals.length}
					/>
					<Tab
						active={activeTab === 'census'}
						onClick={() => setActiveTab('census')}
						label={t('common.census')}
						count={organization.memberCount}
					/>
				</TabList>

				<TabPanel active={activeTab === 'proposals'}>
					<ProposalsTab
						proposals={orgProposals}
						canCreate={isMember || isOrganizer}
						newProposalHref={`/proposals/new?org=${organization.id}`}
					/>
				</TabPanel>

				<TabPanel active={activeTab === 'census'}>
					<CensusTab census={censusMembers} isOrganizer={isOrganizer} onManageClick={openDrawer} />
				</TabPanel>
			</Tabs>

			{isOrganizer && address && (
				<Modal
					open={drawerOpen}
					onClose={closeDrawer}
					size="lg"
					title={t('org.census.manage')}
					description={t('org.census.manage-hint', { name: organization.name })}
				>
					<CensusManager
						census={censusMembers}
						orgName={organization.name}
						orgId={organization.id}
						signer={signer}
						sender={address}
						mode={censusMode}
						selected={removeSelected}
						onModeChange={handleModeChange}
						onToggle={handleToggle}
						onCensusChange={() => {
							setRemoveSelected(new Set())
							void orgQuery.refetch()
							void censusQuery.refetch()
						}}
					/>
				</Modal>
			)}
		</div>
	)
}
