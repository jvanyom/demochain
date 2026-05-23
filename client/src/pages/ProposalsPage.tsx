import type { Proposal, Organization, OrganizationId, ProposalFilter } from '@/domain'
import type { JSX } from 'react'

import { proposalQueries, organizationQueries } from '@/algorand/queries'
import { ProposalCard } from '@/components/proposal/ProposalCard'
import { PROPOSAL_FILTERS, proposalMatchesFilter } from '@/domain'
import { useAlgorand } from '@/hooks/useAlgorand'
import { useQuery } from '@tanstack/react-query'
import { Plus, RefreshCw, Lock, Search } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

interface ProposalGridProps {
	proposals: Proposal[]
	organizationsById: Map<OrganizationId, Organization>
	locked?: boolean
}

function ProposalGrid({ proposals, organizationsById, locked }: ProposalGridProps): JSX.Element {
	return (
		<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
			{proposals.map(proposal => {
				const org = organizationsById.get(proposal.orgId)

				return (
					<ProposalCard
						key={proposal.id}
						proposal={proposal}
						orgName={org?.name}
						orgId={org?.id}
						locked={locked}
					/>
				)
			})}
		</div>
	)
}

export function ProposalsPage(): JSX.Element {
	const { t } = useTranslation()

	const { address, isConnected } = useAlgorand()

	const [filter, setFilter] = useState<ProposalFilter>('active')
	const [query, setQuery] = useState('')

	const { data: proposals = [], isPending, error, refetch } = useQuery(proposalQueries.all())
	const { data: organizations = [] } = useQuery(organizationQueries.all())
	const { data: userOrganizations = [] } = useQuery({
		...organizationQueries.forUser(address!),
		enabled: address !== null
	})

	const organizationsById = useMemo(() => new Map(organizations.map(org => [org.id, org])), [organizations])

	const userOrgIds = useMemo(() => new Set(userOrganizations.map(org => org.id)), [userOrganizations])

	function applyFilters(list: Proposal[]): Proposal[] {
		return list.filter(proposal => {
			if (!proposalMatchesFilter(proposal, filter)) return false

			return (
				!query ||
				proposal.title.toLowerCase().includes(query.toLowerCase()) ||
				proposal.description.toLowerCase().includes(query.toLowerCase())
			)
		})
	}

	const myProposals = isConnected ? applyFilters(proposals.filter(proposal => userOrgIds.has(proposal.orgId))) : []

	const otherProposals = isConnected
		? applyFilters(proposals.filter(proposal => !userOrgIds.has(proposal.orgId)))
		: applyFilters(proposals)

	return (
		<div className="mx-auto max-w-7xl px-6 py-14">
			<div className="mb-10 flex flex-wrap items-end justify-between gap-6">
				<div>
					<h1 className="font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
						{t('common.proposals')}
					</h1>
					<p className="mt-2 text-muted">{t('proposal.subtitle')}</p>
				</div>
				<Link
					to="/proposals/new"
					className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-br from-primary to-accent px-5 text-sm font-semibold text-primary-fg shadow-glow transition hover:brightness-110"
				>
					<Plus size={16} />
					{t('proposal.new.short-title')}
				</Link>
			</div>

			<div className="mb-10 flex flex-wrap items-center gap-3">
				<div className="relative min-w-[240px] flex-1">
					<Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
					<input
						aria-label="Cerca una proposta"
						value={query}
						onChange={event => setQuery(event.target.value)}
						placeholder={t('common.search')}
						className="h-11 w-full rounded-full border border-border bg-surface pl-11 pr-4 text-sm text-fg placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
					/>
				</div>
				<div className="flex flex-wrap gap-2">
					{PROPOSAL_FILTERS.map(proposalFilter => (
						<button
							type="button"
							key={proposalFilter}
							onClick={() => setFilter(proposalFilter)}
							className={`h-10 rounded-full border px-4 text-sm font-medium transition ${
								filter === proposalFilter
									? 'border-primary bg-primary text-primary-fg'
									: 'border-border bg-surface text-muted hover:text-fg'
							}`}
						>
							{t(`proposal.filters.${proposalFilter}`)}
						</button>
					))}
				</div>
			</div>

			{isPending && (
				<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
					{['pp-a', 'pp-b', 'pp-c'].map(k => (
						<div key={k} className="h-48 animate-pulse rounded-2xl border border-border bg-surface" />
					))}
				</div>
			)}

			{error && !isPending && (
				<div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border p-12 text-center">
					<p className="text-sm text-muted">{error.message}</p>
					<button
						type="button"
						onClick={() => void refetch()}
						className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted transition hover:text-fg"
					>
						<RefreshCw size={14} /> {t('common.retry')}
					</button>
				</div>
			)}

			{!isPending && !error && !isConnected && (
				<>
					<div className="mb-8 flex items-center gap-3 rounded-2xl border border-border/60 bg-surface/60 px-5 py-4 text-sm text-muted">
						<Lock size={16} className="shrink-0 text-muted" />
						{t('wallet.connect-notice')}
					</div>
					{otherProposals.length === 0 ? (
						<div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted">
							{t('proposal.filters.no-match')}
						</div>
					) : (
						<ProposalGrid proposals={otherProposals} organizationsById={organizationsById} />
					)}
				</>
			)}

			{!isPending && !error && isConnected && (
				<div className="space-y-12">
					<section>
						<h2 className="mb-5 font-display text-xl font-semibold text-fg">{t('org.my-organizations')}</h2>
						{myProposals.length === 0 ? (
							<div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted">
								{t('org.my-organizations-empty')}
							</div>
						) : (
							<ProposalGrid proposals={myProposals} organizationsById={organizationsById} />
						)}
					</section>

					{otherProposals.length > 0 && (
						<section>
							<div className="mb-5 flex flex-wrap items-baseline gap-3">
								<h2 className="font-display text-xl font-semibold text-fg">
									{t('org.other-organizations')}
								</h2>
								<span className="flex items-center gap-1.5 text-xs text-muted">
									<Lock size={11} />
									{t('org.other-organizations-hint')}
								</span>
							</div>
							<ProposalGrid proposals={otherProposals} organizationsById={organizationsById} locked />
						</section>
					)}
				</div>
			)}
		</div>
	)
}
