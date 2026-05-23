import type { ProposalId, ProposalOption } from '@/domain'
import type { JSX } from 'react'

import { useCastRankedVote } from '@/algorand/mutations'
import { organizationQueries, proposalQueries, votingQueries } from '@/algorand/queries'
import { Button } from '@/components/ui/Button'
import { RankingList } from '@/components/vote/RankingList'
import { VoteReceipt } from '@/components/vote/VoteReceipt'
import { useAlgorand } from '@/hooks/useAlgorand'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BadgeCheck, Keyboard, Wallet, Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, Link, useLoaderData } from 'react-router-dom'

interface VoteCastPanelProps {
	options: ProposalOption[]
	onChangeOptions: (opts: ProposalOption[]) => void
	onSubmit: () => void
	isConnected: boolean
	isPending: boolean
	mutationError: Error | null
}

function VoteCastPanel({
	options,
	onChangeOptions,
	onSubmit,
	isConnected,
	isPending,
	mutationError
}: VoteCastPanelProps): JSX.Element {
	const { t } = useTranslation()

	return (
		<>
			<div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted">
				<Keyboard size={14} /> {t('vote.keyboard-hint')}
			</div>

			<div className="mt-8">
				<RankingList options={options} onChange={onChangeOptions} />
			</div>

			{mutationError !== null && (
				<p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
					{t(`errors.${mutationError.message}`, { defaultValue: t('errors.contract') })}
				</p>
			)}

			<div className="mt-10 flex items-center justify-end gap-3">
				{!isConnected && (
					<span className="flex items-center gap-1.5 text-sm text-muted">
						<Wallet size={14} /> {t('wallet.connect')}
					</span>
				)}

				<Button size="lg" onClick={onSubmit} disabled={!isConnected || isPending}>
					{t(isPending ? 'wallet.waiting-signature' : 'vote.submit')}
				</Button>
			</div>
		</>
	)
}

interface VoteStateContentProps {
	isMember: boolean
	hasVoted: boolean
	proposalId: ProposalId
	options: ProposalOption[]
	onChangeOptions: (opts: ProposalOption[]) => void
	onSubmit: () => void
	isConnected: boolean
	isPending: boolean
	mutationError: Error | null
}

function VoteStateContent({
	isMember,
	hasVoted,
	proposalId,
	options,
	onChangeOptions,
	onSubmit,
	isConnected,
	isPending,
	mutationError
}: VoteStateContentProps): JSX.Element {
	const { t } = useTranslation()

	if (!isMember)
		return (
			<div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-10 text-center">
				<Lock size={36} className="text-amber-500" />
				<p className="text-lg font-semibold text-amber-600 dark:text-amber-400">{t('org.not-member')}</p>
			</div>
		)

	if (hasVoted)
		return (
			<div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-10 text-center">
				<BadgeCheck size={36} className="text-emerald-500" />

				<p className="text-lg font-semibold text-emerald-500">{t('vote.already-voted')}</p>

				<p className="text-sm text-muted">{t('vote.already-voted-hint')}</p>

				<Link
					to={`/proposals/${proposalId}/results`}
					className="mt-2 inline-flex h-10 items-center gap-2 rounded-full border border-border px-5 text-sm font-medium text-muted transition hover:text-fg"
				>
					{t('vote.results.cta')}
				</Link>
			</div>
		)

	return (
		<VoteCastPanel
			options={options}
			onChangeOptions={onChangeOptions}
			onSubmit={onSubmit}
			isConnected={isConnected}
			isPending={isPending}
			mutationError={mutationError}
		/>
	)
}

export function VotePage(): JSX.Element {
	// oxlint-disable-next-line no-unsafe-type-assertion
	const id = useLoaderData() as ProposalId

	const { t } = useTranslation()
	const navigate = useNavigate()
	const { isConnected, address, signer } = useAlgorand()

	const {
		data: proposal = null,
		isPending,
		error
	} = useQuery({
		...proposalQueries.detail(id)
	})

	const { data: hasVoted = false } = useQuery({
		...votingQueries.electionVoted(address!, id),
		enabled: address !== null
	})

	const { data: isMember = false } = useQuery({
		...organizationQueries.isMember(address!, proposal!.orgId),
		enabled: address !== null && proposal?.orgId !== undefined
	})

	const castVoteMutation = useCastRankedVote()

	const [options, setOptions] = useState<ProposalOption[]>([])
	const [receipt, setReceipt] = useState<{ txId: string; ranking: ProposalOption[] } | null>(null)

	// Inicialitza les opcions una vegada la proposta es carregui
	useEffect(() => {
		if (proposal) setOptions(proposal.options)
	}, [proposal])

	if (isPending)
		return (
			<div className="mx-auto max-w-3xl px-6 py-14">
				<div className="mb-6 h-5 w-20 animate-pulse rounded-full bg-surface" />
				<div className="space-y-3">
					{['vp-a', 'vp-b', 'vp-c'].map(key => (
						<div key={key} className="h-16 animate-pulse rounded-2xl bg-surface" />
					))}
				</div>
			</div>
		)

	if (error || !proposal)
		return (
			<div className="mx-auto max-w-3xl px-6 py-20 text-center text-muted">
				{error?.message ?? 'Proposal not found.'}
			</div>
		)

	async function handleSubmit(): Promise<void> {
		if (!isConnected || !address || !proposal) return

		const preferenceOrder = options.map(option => option.id)

		try {
			const txId = await castVoteMutation.mutateAsync({
				signer,
				sender: address,
				proposalId: proposal.id,
				orgId: proposal.orgId,
				preferenceOrder
			})

			setReceipt({ txId, ranking: options })
		} catch {
			// Error is tracked by castVoteMutation.error
		}
	}

	return (
		<div className="mx-auto max-w-3xl px-6 py-14">
			<button
				type="button"
				onClick={() => navigate(-1)}
				className="mb-6 inline-flex items-center gap-2 text-sm text-muted transition hover:text-fg"
			>
				<ArrowLeft size={16} /> {t('common.back')}
			</button>

			<div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">{proposal.title}</div>

			<h1 className="font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
				{t('vote.title')}
			</h1>

			<p className="mt-3 text-muted">{t('vote.subtitle')}</p>

			<VoteStateContent
				isMember={isMember}
				hasVoted={hasVoted}
				proposalId={proposal.id}
				options={options}
				onChangeOptions={setOptions}
				onSubmit={handleSubmit}
				isConnected={isConnected}
				isPending={castVoteMutation.isPending}
				mutationError={castVoteMutation.error}
			/>

			{receipt && (
				<VoteReceipt
					open
					onClose={() => {
						setReceipt(null)
						navigate(`/proposals/${proposal.id}/results`)
					}}
					proposalTitle={proposal.title}
					ranking={receipt.ranking}
					txId={receipt.txId}
				/>
			)}
		</div>
	)
}
