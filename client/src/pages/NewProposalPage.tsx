import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {ArrowLeft, ArrowRight, Check, Wallet} from 'lucide-react';

import {useQuery} from '@tanstack/react-query';

import {useForm, useFieldArray} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';

import {ProposalReceipt} from '@/components/proposal/ProposalReceipt';

import {WizardLayout} from '@/components/ui/WizardLayout';
import {Button} from '@/components/ui/Button';

import {
    BasicsStep,
    DatesStep,
    OptionsStep,
    OrgStep,
    ReviewStep,
    OrgStepFields,
    BasicsStepFields,
    DatesStepFields,
    OptionsStepFields,
} from '@/components/proposal/ProposalSteps';

import {asOrganizationId, proposalFormSchema, type ProposalFormValues} from '@/domain';

import {useAlgorand} from '@/hooks/useAlgorand';
import {useWizard} from '@/hooks/useWizard';

import {organizationQueries} from '@/algorand/queries';
import {useCreateProposal} from '@/algorand/mutations';

import {dateToUnix} from '@/utils/date';

const STEPS = ['org', 'basics', 'dates', 'options', 'review'] as const;

const DEV = import.meta.env.DEV;
const APPROVAL_BUFFER_DAYS = 3;

function minStartDateStr(): string {
    if (DEV) return '';
    const d = new Date();
    d.setDate(d.getDate() + APPROVAL_BUFFER_DAYS);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 16);
}

function classifyError(err: unknown): 'wallet.rejected' | 'network' | 'contract' | 'unknown' {
    const msg = err instanceof Error ? err.message.toLowerCase() : '';
    if (msg.includes('cancel') || msg.includes('rejected') || msg.includes('user rejected')) return 'wallet.rejected';
    if (msg.includes('network') || msg.includes('timeout') || msg.includes('fetch')) return 'network';
    if (err instanceof Error && err.message.startsWith('proposal.')) return 'contract';
    return 'unknown';
}

const STEP_FIELDS = [
    OrgStepFields,
    BasicsStepFields,
    DatesStepFields,
    OptionsStepFields,
    [],
] as const;

export function NewProposalPage() {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const {address, isConnected, signer} = useAlgorand();

    const {data: eligibleOrgs = []} = useQuery({
        ...organizationQueries.forUser(address!),
        enabled: address !== null,
    });

    const preselectedOrgId = searchParams.get('org') ?? '';
    const createProposalMutation = useCreateProposal();

    const initialOrgId = String(
        eligibleOrgs.find((o) => String(o.id) === preselectedOrgId)?.id ?? eligibleOrgs[0]?.id ?? '',
    );

    const {
        watch,
        setValue,
        trigger,
        control,
        getValues,
        register,
        formState: {errors},
    } = useForm<ProposalFormValues>({
        resolver: zodResolver(proposalFormSchema),
        defaultValues: {
            orgId: initialOrgId,
            title: '',
            description: '',
            startDate: '',
            endDate: '',
            options: [{value: ''}, {value: ''}],
        },
    });

    const {fields, append, remove} = useFieldArray({control, name: 'options'});

    const wizard = useWizard(STEPS.length);
    const [proposalId, setProposalId] = useState<number | null>(null);
    const [confirmedTxId, setConfirmedTxId] = useState('');

    const orgId = watch('orgId');
    const title = watch('title');
    const description = watch('description');
    const startDate = watch('startDate');
    const endDate = watch('endDate');

    const watchedOptions = watch('options');

    const canNext =
        wizard.step === 0 ? !!orgId && eligibleOrgs.length > 0
            : wizard.step === 1 ? !!(title.trim() && description.trim())
                : wizard.step === 2 ? !!(startDate && endDate)
                    : wizard.step === 3 ? watchedOptions.filter((o) => o?.value?.trim()).length >= 2
                        : true;

    function fieldError(field: string): string | undefined {
        if (field === 'options') return errors.options?.message;
        const key = field as Exclude<keyof ProposalFormValues, 'options'>;
        return errors[key]?.message;
    }

    async function tryAdvance() {
        const stepFields = STEP_FIELDS[wizard.step];
        const valid = stepFields.length > 0 ? await trigger(stepFields as unknown as (keyof ProposalFormValues)[]) : true;
        if (valid) wizard.next();
    }

    function onTouch(field: string) {
        void trigger(field as keyof ProposalFormValues);
    }

    const handleSubmit = async () => {
        if (!isConnected || !address || !orgId) return;
        wizard.startSubmit();

        try {
            const values = getValues();
            const startUnix = dateToUnix(new Date(values.startDate));
            const endUnix = dateToUnix(new Date(values.endDate));
            const cleanOptions = values.options.flatMap((o) => {
                const trimmed = o.value.trim();
                return trimmed ? [trimmed] : [];
            });

            const {proposalId: newId, txId} = await createProposalMutation.mutateAsync({
                signer,
                sender: address,
                orgId: asOrganizationId(parseInt(orgId, 10)),
                title: values.title,
                description: values.description,
                options: cleanOptions,
                startingDate: startUnix,
                endingDate: endUnix,
            });

            setProposalId(newId);
            setConfirmedTxId(txId);
            wizard.succeedSubmit();
        } catch (err) {
            const kind = classifyError(err);

            const messageKey = kind === 'contract' && err instanceof Error ? err.message : kind;

            wizard.failSubmit(t(`errors.${messageKey}`));
        }
    };

    if (proposalId !== null) {
        return (
            <>
                <div className="mx-auto max-w-3xl px-6 py-14 opacity-40 pointer-events-none select-none">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                        {t('common.step', {current: STEPS.length, total: STEPS.length})}
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
        );
    }

    const optionItems = fields.map((f, idx) => ({id: f.id, value: watchedOptions[idx]?.value ?? ''}));

    return (
        <div className="mx-auto max-w-3xl px-6 py-14">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                {t('common.step', {current: wizard.step + 1, total: STEPS.length})}
            </div>
            <h1 className="mb-8 font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
                {t('proposal.new.title')}
            </h1>

            <WizardLayout
                steps={STEPS}
                currentStep={wizard.step}
                stepLabel={s => t(`common.${s}`)}
                submitError={wizard.error}
                footer={
                    <>
                        <Button
                            variant="ghost"
                            onClick={wizard.prev}
                            disabled={wizard.isFirst || wizard.submitting}
                            leftIcon={<ArrowLeft size={16}/>}
                        >
                            {t('common.previous')}
                        </Button>

                        {!wizard.isLast ? (
                            <Button onClick={tryAdvance} disabled={!canNext} rightIcon={<ArrowRight size={16}/>}>
                                {t('common.next')}
                            </Button>
                        ) : !isConnected ? (
                            <span className="flex items-center gap-1.5 text-sm text-muted">
                                <Wallet size={14}/> {t('wallet.connect')}
                            </span>
                        ) : (
                            <Button rightIcon={<Check size={16}/>} onClick={handleSubmit} disabled={wizard.submitting}>
                                {wizard.submitting ? t('wallet.waiting-signature') : t('proposal.new.submit')}
                            </Button>
                        )}
                    </>
                }
            >
                {wizard.step === 0 && (
                    <OrgStep
                        isConnected={isConnected}
                        eligibleOrgs={eligibleOrgs}
                        selectedOrgId={orgId}
                        onSelectOrg={(id) => setValue('orgId', id)}
                    />
                )}
                {wizard.step === 1 && (
                    <BasicsStep
                        title={title}
                        description={description}
                        onChangeTitle={(v) => setValue('title', v)}
                        onChangeDescription={(v) => setValue('description', v)}
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
                        onChangeStart={(v) => setValue('startDate', v)}
                        onChangeEnd={(v) => setValue('endDate', v)}
                        onTouch={onTouch}
                        fieldError={fieldError}
                    />
                )}
                {wizard.step === 3 && (
                    <OptionsStep
                        fields={fields}
                        register={register}
                        onRemoveOption={id => {
                            const idx = fields.findIndex((f) => f.id === id);
                            if (idx !== -1) remove(idx);
                        }}
                        onAddOption={() => append({value: ''})}
                        onTouch={onTouch}
                        fieldError={fieldError}
                    />
                )}
                {wizard.step === 4 && (
                    <ReviewStep
                        orgName={eligibleOrgs.find((o) => String(o.id) === orgId)?.name ?? '-'}
                        title={title}
                        description={description}
                        start={startDate}
                        end={endDate}
                        options={optionItems}
                        submitError={wizard.error}
                        submitting={wizard.submitting}
                        onRetry={handleSubmit}
                    />
                )}
            </WizardLayout>
        </div>
    );
}
