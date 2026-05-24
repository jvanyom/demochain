import type { ProposalFormValues } from '@/domain'
import type { JSX } from 'react'

import { useCreateProposal } from '@/algorand/mutations'
import { organizationQueries } from '@/algorand/queries'
import { ProposalReceipt } from '@/components/proposal/ProposalReceipt'
import {
	BasicsStep,
	DatesStep,
	OptionsStep,
	OrgStep,
	ReviewStep,
	OrgStepFields,
	BasicsStepFields,
	DatesStepFields,
	OptionsStepFields
} from '@/components/proposal/ProposalSteps'
import { Button } from '@/components/ui/Button'
import { WizardLayout } from '@/components/ui/WizardLayout'
import { asOrganizationId, proposalFormSchema } from '@/domain'
import { useAlgorand } from '@/hooks/useAlgorand'
import { useWizard } from '@/hooks/useWizard'
import { dateToUnix } from '@/utils/date'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Check, Wallet } from 'lucide-react'
import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'

const STEPS = ['org', 'basics', 'dates', 'options', 'review'] as const

const { DEV } = import.meta.env
const APPROVAL_BUFFER_DAYS = 3

function minStartDateStr(): string {
	if (DEV) return ''
	const date = new Date()
	date.setDate(date.getDate() + APPROVAL_BUFFER_DAYS)
	date.setHours(0, 0, 0, 0)
	return date.toISOString().slice(0, 16)
}

const STEP_FIELDS = [OrgStepFields, BasicsStepFields, DatesStepFields, OptionsStepFields, []] as const

interface NextActionButtonProps {
	isLast: boolean
	isConnected: boolean
	submitting: boolean
	canNext: boolean
	tryAdvance: () => Promise<void>
	handleSubmit: () => Promise<void>
}

function NextActionButton({
	isLast,
	isConnected,
	tryAdvance,
	canNext,
	handleSubmit,
	submitting
}: NextActionButtonProps): JSX.Element {
	const { t } = useTranslation()

	if (!isConnected)
		return (
			<span className="flex items-center gap-1.5 text-sm text-muted">
				<Wallet size={14} /> {t('wallet.connect')}
			</span>
		)

	if (!isLast)
		return (
			<Button onClick={tryAdvance} disabled={!canNext} rightIcon={<ArrowRight size={16} />}>
				{t('common.next')}
			</Button>
		)

	return (
		<Button onClick={handleSubmit} disabled={submitting} rightIcon={<Check size={16} />}>
			{submitting ? t('wallet.waiting-signature') : t('proposal.new.submit')}
		</Button>
	)
}

function getCanNext(
	step: number,
	orgId: string,
	eligibleOrgsCount: number,
	title: string,
	description: string,
	startDate: string,
	endDate: string,
	options: { value: string }[]
): boolean {
	const canNext = [
		(): boolean => Boolean(orgId) && eligibleOrgsCount > 0,
		(): boolean => Boolean(title.trim() && description.trim()),
		(): boolean => Boolean(startDate && endDate),
		(): boolean => options.filter(option => option?.value?.trim()).length >= 2
	]

	return canNext[step]?.() ?? false
}

export function NewProposalPage(): JSX.Element {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	const { address, isConnected, signer } = useAlgorand()

	const { data: eligibleOrgs = [], isPending: orgsLoading } = useQuery({
		...organizationQueries.forUser(address!),
		enabled: address !== null
	})

	const preselectedOrgId = searchParams.get('org') ?? ''
	const createProposalMutation = useCreateProposal()

	const initialOrgId = String(
		eligibleOrgs.find(org => String(org.id) === preselectedOrgId)?.id ?? eligibleOrgs[0]?.id ?? ''
	)

	const {
		watch,
		setValue,
		trigger,
		control,
		getValues,
		register,
		formState: { errors }
	} = useForm<ProposalFormValues>({
		resolver: zodResolver(proposalFormSchema),
		defaultValues: {
			orgId: initialOrgId,
			title: '',
			description: '',
			startDate: '',
			endDate: '',
			options: [{ value: '' }, { value: '' }]
		}
	})

	const { fields, append, remove } = useFieldArray({ control, name: 'options' })

	const wizard = useWizard(STEPS.length)
	const [proposalId, setProposalId] = useState<number | null>(null)
	const [confirmedTxId, setConfirmedTxId] = useState('')

	const orgId = watch('orgId')
	const title = watch('title')
	const description = watch('description')
	const startDate = watch('startDate')
	const endDate = watch('endDate')

	const watchedOptions = watch('options')

	const canNext = getCanNext(
		wizard.step,
		orgId,
		eligibleOrgs.length,
		title,
		description,
		startDate,
		endDate,
		watchedOptions
	)

	function fieldError(field: string): string | undefined {
		if (field === 'options') return errors.options?.root?.message ?? errors.options?.message
		// oxlint-disable-next-line no-unsafe-type-assertion
		const key = field as Exclude<keyof ProposalFormValues, 'options'>
		return errors[key]?.message
	}

	async function tryAdvance(): Promise<void> {
		const stepFields = STEP_FIELDS[wizard.step]
		const valid =
			stepFields && stepFields.length > 0
				? // oxlint-disable-next-line no-unsafe-type-assertion
					await trigger(stepFields as unknown as (keyof ProposalFormValues)[])
				: true
		if (valid) wizard.next()
	}

	function onTouch(field: string): void {
		// oxlint-disable-next-line no-unsafe-type-assertion
		void trigger(field as keyof ProposalFormValues)
	}

	async function handleSubmit(): Promise<void> {
		if (!isConnected || !address || !orgId) return
		wizard.startSubmit()

		try {
			const values = getValues()
			const startUnix = dateToUnix(new Date(values.startDate))
			const endUnix = dateToUnix(new Date(values.endDate))

			const cleanOptions = values.options.flatMap(option => {
				const trimmed = option.value.trim()
				return trimmed ? [trimmed] : []
			})

			const { proposalId: newId, txId } = await createProposalMutation.mutateAsync({
				signer,
				sender: address,
				orgId: asOrganizationId(parseInt(orgId, 10)),
				title: values.title,
				description: values.description,
				options: cleanOptions,
				startingDate: startUnix,
				endingDate: endUnix
			})

			setProposalId(newId)
			setConfirmedTxId(txId)
			wizard.succeedSubmit()
		} catch (err) {
			wizard.failSubmit(
				t(`errors.${err instanceof Error ? err.message : 'contract'}`, { defaultValue: t('errors.contract') })
			)
		}
	}

	if (proposalId !== null)
		return (
			<>
				<div className="pointer-events-none mx-auto max-w-3xl select-none px-6 py-14 opacity-40">
					<div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
						{t('common.step', { current: STEPS.length, total: STEPS.length })}
					</div>

					<h1 className="mb-8 font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
						{t('proposal.new.title')}
					</h1>
				</div>

				<ProposalReceipt
					open
					proposalTitle={title}
					proposalId={proposalId}
					txId={confirmedTxId}
					onViewProposal={() => navigate(`/proposals/${proposalId}`)}
				/>
			</>
		)

	const optionItems = fields.map((field, idx) => ({ id: field.id, value: watchedOptions[idx]?.value ?? '' }))

	return (
		<div className="mx-auto max-w-3xl px-6 py-14">
			<div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
				{t('common.step', { current: wizard.step + 1, total: STEPS.length })}
			</div>

			<h1 className="mb-8 font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
				{t('proposal.new.title')}
			</h1>

			<WizardLayout
				steps={STEPS}
				currentStep={wizard.step}
				stepLabel={step => t(`common.${step}`)}
				submitError={wizard.error}
				footer={
					<>
						<Button
							variant="ghost"
							// oxlint-disable-next-line react/jsx-handler-names
							onClick={wizard.prev}
							disabled={wizard.isFirst || wizard.submitting}
							leftIcon={<ArrowLeft size={16} />}
						>
							{t('common.previous')}
						</Button>

						<NextActionButton
							isLast={wizard.isLast}
							isConnected={isConnected}
							submitting={wizard.submitting}
							canNext={canNext}
							tryAdvance={tryAdvance}
							handleSubmit={handleSubmit}
						/>
					</>
				}
			>
				{wizard.step === 0 && (
					<OrgStep
						isConnected={isConnected}
						isLoading={orgsLoading}
						eligibleOrganizations={eligibleOrgs}
						selectedOrgId={orgId}
						onSelectOrg={id => setValue('orgId', id)}
					/>
				)}

				{wizard.step === 1 && (
					<BasicsStep
						title={title}
						description={description}
						onChangeTitle={value => setValue('title', value)}
						onChangeDescription={value => setValue('description', value)}
						onTouch={onTouch}
						fieldError={fieldError}
					/>
				)}

				{wizard.step === 2 && (
					<DatesStep
						start={startDate}
						end={endDate}
						minStartDate={minStartDateStr()}
						showDevWarning={!DEV}
						onChangeStart={value => setValue('startDate', value)}
						onChangeEnd={value => setValue('endDate', value)}
						onTouch={onTouch}
						fieldError={fieldError}
					/>
				)}

				{wizard.step === 3 && (
					<OptionsStep
						fields={fields}
						register={register}
						onRemoveOption={id => {
							const idx = fields.findIndex(field => field.id === id)
							if (idx !== -1) remove(idx)
						}}
						onAddOption={() => append({ value: '' })}
						onTouch={onTouch}
						fieldError={fieldError}
					/>
				)}
				{wizard.step === 4 && (
					<ReviewStep
						orgName={eligibleOrgs.find(org => String(org.id) === orgId)?.name ?? '-'}
						title={title}
						description={description}
						start={startDate}
						end={endDate}
						options={optionItems}
					/>
				)}
			</WizardLayout>
		</div>
	)
}
