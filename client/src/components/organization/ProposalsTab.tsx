import type { Proposal } from '@/domain'
import type { JSX } from 'react'

import { ProposalCard } from '@/components/proposal/ProposalCard'
import { Plus, Search, FileX2 } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

type Filter = 'active' | 'all' | 'pending' | 'approved' | 'voting' | 'closed'

const FILTERS: Filter[] = ['active', 'pending', 'approved', 'voting', 'closed', 'all']

function proposalMatchesFilter(proposal: Proposal, filter: Filter): boolean {
	const filters: Record<Filter, boolean> = {
		all: true,
		active: proposal.state.kind !== 'Closed',
		pending: proposal.state.kind === 'PendingApproval',
		approved: proposal.state.kind === 'PendingStart',
		voting: proposal.state.kind === 'Open',
		closed: proposal.state.kind === 'Closed'
	}

	return filters[filter]
}

interface Props {
	proposals: Proposal[]
	canCreate: boolean
	newProposalHref: string
}

export function ProposalsTab({ proposals, canCreate, newProposalHref }: Props): JSX.Element {
	const { t } = useTranslation()
	const [filter, setFilter] = useState<Filter>('active')
	const [query, setQuery] = useState('')

	const filtered = useMemo(() => {
		const trimmedQuery = query.trim().toLowerCase()

		return proposals.filter(
			proposal =>
				proposalMatchesFilter(proposal, filter) &&
				!(trimmedQuery && !proposal.title.toLowerCase().includes(trimmedQuery))
		)
	}, [proposals, filter, query])

	if (proposals.length === 0)
		return (
			<div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border p-12 text-center">
				<FileX2 size={28} className="text-muted" />

				<p className="text-sm text-muted">{t('org.proposals.empty')}</p>

				{canCreate && (
					<Link
						to={newProposalHref}
						className="inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-br from-primary to-accent px-4 text-xs font-semibold text-primary-fg shadow-glow transition hover:brightness-110"
					>
						<Plus size={13} /> {t('proposal.new.short-title')}
					</Link>
				)}
			</div>
		)

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center gap-3">
				<div className="relative min-w-[220px] flex-1">
					<Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />

					<input
						aria-label="Cerca propostes existents"
						value={query}
						onChange={event => setQuery(event.target.value)}
						placeholder={t('org.proposals.search-placeholder')}
						className="h-10 w-full rounded-full border border-border bg-surface pl-11 pr-4 text-sm text-fg placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
					/>
				</div>

				<div className="flex flex-wrap gap-1.5">
					{FILTERS.map(currentFilter => (
						<button
							type="button"
							key={currentFilter}
							onClick={() => setFilter(currentFilter)}
							className={`h-9 rounded-full border px-3.5 text-xs font-medium transition ${
								currentFilter === currentFilter
									? 'border-primary bg-primary/10 text-primary'
									: 'border-border bg-surface text-muted hover:text-fg'
							}`}
						>
							{t(`proposal.filters.${currentFilter}`)}
						</button>
					))}
				</div>
			</div>

			{filtered.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted">
					{t('proposal.filters.no-match')}
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{filtered.map(proposal => (
						<ProposalCard key={proposal.id} proposal={proposal} />
					))}
				</div>
			)}
		</div>
	)
}
