import type { Proposal, ElectionResults } from '@/domain'
import type { JSX } from 'react'

import { PairwiseGrid } from '@/components/results/PairwiseGrid'
import { m } from 'framer-motion'
import { Plus, Scale, Trophy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

interface ClosedResultsProps {
	proposal: Proposal
	electionResults: ElectionResults | null
	resultsLoading: boolean
	resultsError: Error | null
}

export function ClosedResults({
	proposal,
	electionResults,
	resultsLoading,
	resultsError
}: ClosedResultsProps): JSX.Element {
	const { t } = useTranslation()

	const results = electionResults?.ranking ?? []
	const pairwiseMatrix = electionResults?.pairwiseMatrix ?? []

	if (resultsLoading)
		return (
			<div className="mt-10 space-y-3">
				{['rs-a', 'rs-b', 'rs-c'].map(k => (
					<div key={k} className="h-16 animate-pulse rounded-2xl bg-surface" />
				))}
			</div>
		)

	if (resultsError) return <p className="mt-10 text-center text-sm text-muted">{resultsError.message}</p>

	const [winner] = results

	if (!winner)
		return (
			<div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center text-muted">
				{t('results.no-votes')}
			</div>
		)

	const winnerOpt = proposal.options.find(option => option.id === winner.optionId)
	const optionCount = proposal.options.length
	const maxPairwiseWins = optionCount - 1
	const isTied = electionResults?.isTied ?? false
	const maxFirstChoice = Math.max(...results.map(result => result.firstChoiceVotes), 1)
	void maxFirstChoice

	const totalPrefs = new Map<number, number>()

	for (const option of proposal.options) {
		const row = pairwiseMatrix[option.id] ?? []

		totalPrefs.set(
			option.id,
			row.reduce((sum, currentValue, currentIndex) => (currentIndex !== option.id ? sum + currentValue : sum), 0)
		)
	}

	const maxTotalPrefs = Math.max(...totalPrefs.values(), 1)

	return (
		<>
			{isTied ? (
				<m.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="mt-10 flex flex-col items-center rounded-3xl border border-amber-400 bg-amber-50 p-8 text-center dark:border-amber-500/25 dark:bg-amber-500/5"
				>
					<Scale size={32} className="mb-4 text-amber-600 dark:text-amber-400" />

					<h2 className="font-display text-2xl font-semibold text-fg">{t('results.tie-title')}</h2>

					<p className="mt-2 max-w-xl text-sm text-muted">{t('results.tie-description')}</p>

					<p className="mt-10 max-w-sm text-sm text-muted">{t('results.tie-suggestion')}</p>

					<Link
						to="/proposals/new"
						className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-500 bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-200 dark:border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25"
					>
						<Plus size={14} /> {t('results.tie-new-proposal')}
					</Link>
				</m.div>
			) : (
				<m.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="relative mt-10 overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/20 via-surface to-accent/20 p-8 dark:border-border dark:from-primary/20 dark:via-surface dark:to-accent/20"
				>
					<div className="absolute -right-20 -top-20 size-64 rounded-full bg-primary/30 blur-3xl dark:bg-primary/20" />

					<div className="relative flex flex-wrap items-center justify-between gap-6">
						<div>
							<div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-500 bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-400">
								<Trophy size={14} /> {t('results.winner')}
							</div>

							<h2 className="font-display text-3xl font-semibold text-fg sm:text-4xl">
								{winnerOpt?.title}
							</h2>
						</div>

						<div className="text-right">
							<div className="text-xs font-semibold uppercase tracking-wider text-muted">
								{t('results.pairwise-wins', { wins: winner.pairwiseWins, total: maxPairwiseWins })}
							</div>

							<div className="mt-1 text-xs text-muted/60">
								{t('results.first-choice-secondary', { count: winner.firstChoiceVotes })}
							</div>
						</div>
					</div>
				</m.div>
			)}

			<h3 className="mb-4 mt-12 text-xs font-semibold uppercase tracking-wider text-muted">
				{isTied ? t('results.all-options') : t('results.ranking')}
			</h3>

			<ul className="space-y-4">
				{results.map((result, i) => {
					const opt = proposal.options.find(option => option.id === result.optionId)
					const prefs = totalPrefs.get(result.optionId) ?? 0
					const barPct = (prefs / maxTotalPrefs) * 100

					return (
						<m.li
							key={result.optionId}
							initial={{ opacity: 0, x: -10 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.4, delay: i * 0.05 }}
							className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
						>
							<div className="flex items-start gap-4">
								<div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
									{i + 1}
								</div>

								<div className="min-w-0 flex-1">
									<span className="block truncate font-semibold text-fg">{opt?.title}</span>

									<div className="mt-3 flex flex-wrap gap-2">
										<span className="inline-flex items-center rounded-full border border-sky-400 bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400">
											{t('results.stat-duels', {
												wins: result.pairwiseWins,
												total: maxPairwiseWins
											})}
										</span>

										<span className="inline-flex items-center rounded-full border border-amber-400 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
											{t('results.stat-first-choice', { count: result.firstChoiceVotes })}
										</span>

										<span className="inline-flex items-center rounded-full border border-violet-400 bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-400">
											{t('results.stat-total-prefs', { count: prefs })}
										</span>
									</div>

									<div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
										<m.div
											initial={{ width: 0 }}
											animate={{ width: `${barPct}%` }}
											transition={{ duration: 0.8, delay: 0.2 + i * 0.08, ease: 'easeOut' }}
											className="h-full rounded-full bg-gradient-to-r from-violet-500/80 to-primary/60"
										/>
									</div>
								</div>
							</div>
						</m.li>
					)
				})}
			</ul>

			<p className="mt-4 text-center text-xs text-muted">{t('results.schulze-note')}</p>

			{pairwiseMatrix.length > 0 && <PairwiseGrid options={proposal.options} pairwiseMatrix={pairwiseMatrix} />}
		</>
	)
}
