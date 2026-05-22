import {useState, useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {useNavigate} from 'react-router-dom';
import {ArrowLeft, ArrowRight, Check, Upload, Users} from 'lucide-react';

import {NetworkId, useNetwork} from "@txnlab/use-wallet-react";

import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';

import {organizationDraftSchema, type OrganizationDraft, parseAddressList} from '@/domain';

import {Field, Input, Textarea} from '@/components/ui/Input';
import {WizardLayout} from '@/components/ui/WizardLayout';
import {Button} from '@/components/ui/Button';

import {useAlgorand} from "@/hooks/useAlgorand";
import {useWizard} from '@/hooks/useWizard';

import {useAddToCensus, useCreateOrganization} from "@/algorand/mutations";
import {getDevAddresses} from "@/algorand/dev-accounts";

const STEPS = ['basics', 'census', 'review'] as const;

export function NewOrganizationPage() {
    const {t} = useTranslation();
    const navigate = useNavigate();

    const {address, isConnected, signer} = useAlgorand();
    const {activeNetwork} = useNetwork();
    const devAddresses = getDevAddresses();
    const showDevAddresses = activeNetwork === NetworkId.LOCALNET && devAddresses.length > 0;

    const fileRef = useRef<HTMLInputElement>(null);

    const createOrgMutation = useCreateOrganization();
    const addCensusMutation = useAddToCensus();

    const {
        watch,
        setValue,
        trigger,
        getValues,
        formState: {errors},
    } = useForm<OrganizationDraft>({
        resolver: zodResolver(organizationDraftSchema),
        defaultValues: {name: '', description: ''},
        mode: 'onBlur',
    });

    const wizard = useWizard(STEPS.length);
    const [censusText, setCensusText] = useState('');
    const [censusWarnings, setCensusWarnings] = useState<string[]>([]);
    const [confirmed, setConfirmed] = useState(false);

    const name = watch('name');
    const description = watch('description');

    const canNext = wizard.step === 0 ? !!(name.trim() && description.trim()) : true;

    const {valid: validAddresses} = parseAddressList(censusText);

    async function tryAdvance() {
        if (wizard.step === 0) {
            const valid = await trigger(['name', 'description']);
            if (valid) wizard.next();
        } else {
            wizard.next();
        }
    }

    function mergeAddresses(addresses: string[]) {
        const existing = censusText.trim() ? censusText.trim().split('\n') : [];
        const merged = Array.from(new Set([...existing, ...addresses]));
        setCensusText(merged.join('\n'));
    }

    function handleCsvUpload(file: File) {
        const reader = new FileReader();

        reader.onload = e => {
            const text = e.target?.result as string;
            const {valid, invalid} = parseAddressList(text);
            mergeAddresses(valid);
            setCensusWarnings(invalid.length > 0 ? [`${invalid.length} ${t('org.csv.skippedRows')}`] : []);
        };

        reader.readAsText(file);
    }

    function handleLoadDevAddresses() {
        mergeAddresses(devAddresses);
        setCensusWarnings([]);
    }

    const handleSubmit = async () => {
        if (!isConnected || !address) return;
        wizard.startSubmit();

        const values = getValues();

        try {
            const {orgId} = await createOrgMutation.mutateAsync({
                signer,
                sender: address,
                name: values.name,
                description: values.description,
            });

            const extraMembers = validAddresses.filter(a => a !== address);

            if (extraMembers.length > 0) {
                await addCensusMutation.mutateAsync({signer, sender: address, orgId, members: extraMembers});
            }

            wizard.succeedSubmit();
            setConfirmed(true);
        } catch (err) {
            wizard.failSubmit(t(`errors.${err instanceof Error ? err.message : 'contract'}`, {defaultValue: t('errors.contract')}));
        }
    };

    return (
        <div className="mx-auto max-w-3xl px-6 py-14">
            {confirmed ? (
                <div className="rounded-2xl border border-border bg-surface p-10 text-center space-y-6">
                    <div className="flex size-16 mx-auto items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
                        <Check size={28} className="text-primary-fg"/>
                    </div>
                    <h1 className="font-display text-3xl font-semibold text-fg">{t('org.confirmed.title')}</h1>
                    <p className="text-sm text-muted">{t('org.confirmed.text', {name})}</p>
                    <Button onClick={() => navigate('/organizations')}>{t('org.confirmed.cta')}</Button>
                </div>
            ) : (
                <>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                        {t('common.step', {current: wizard.step + 1, total: STEPS.length})}
                    </div>
                    <h1 className="mb-8 font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
                        {t('org.new')}
                    </h1>

                    <WizardLayout
                        steps={STEPS}
                        currentStep={wizard.step}
                        stepLabel={(s) => t(`org.steps.${s}`)}
                        submitError={wizard.error}
                        footer={
                            <>
                                <Button
                                    variant="ghost"
                                    onClick={() => (wizard.isFirst ? navigate('/organizations') : wizard.prev())}
                                    leftIcon={<ArrowLeft size={16}/>}
                                >
                                    {wizard.isFirst ? t('common.cancel') : t('common.previous')}
                                </Button>

                                {!wizard.isLast ? (
                                    <Button onClick={tryAdvance} disabled={!canNext} rightIcon={<ArrowRight size={16}/>}>
                                        {t('common.next')}
                                    </Button>
                                ) : !isConnected ? (
                                    <span className="text-sm text-muted">{t('wallet.connect')}</span>
                                ) : (
                                    <Button rightIcon={<Check size={16}/>} onClick={handleSubmit} disabled={wizard.submitting}>
                                        {wizard.submitting ? t('common.waiting') : t('org.submit')}
                                    </Button>
                                )}
                            </>
                        }
                    >
                        {wizard.step === 0 && (
                            <>
                                <Field label={t('org.fields.name')}>
                                    <Input
                                        value={name}
                                        onChange={(e) => setValue('name', e.target.value)}
                                        onBlur={() => trigger('name')}
                                        placeholder={t('org.fields.name-placeholder')}
                                        className={errors.name ? 'border-rose-500' : ''}
                                    />
                                    {errors.name && (
                                        <span className="mt-1 block text-xs text-rose-500">
                                            {t(`errors.${errors.name.message}`)}
                                        </span>
                                    )}
                                </Field>
                                <Field label={t('common.description')}>
                                    <Textarea
                                        value={description}
                                        onChange={(e) => setValue('description', e.target.value)}
                                        onBlur={() => trigger('description')}
                                        placeholder={t('org.fields.description-placeholder')}
                                        rows={4}
                                        className={errors.description ? 'border-rose-500' : ''}
                                    />
                                    {errors.description && (
                                        <span className="mt-1 block text-xs text-rose-500">
                                            {t(`errors.${errors.description.message}`)}
                                        </span>
                                    )}
                                </Field>
                            </>
                        )}

                        {wizard.step === 1 && (
                            <div className="space-y-4">
                                <p className="text-sm text-muted">{t('org.census-hint')}</p>

                                <div className="flex flex-wrap items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => fileRef.current?.click()}
                                        className="inline-flex items-center gap-2 rounded-full border border-dashed border-border px-4 py-2 text-sm text-muted transition hover:border-primary hover:text-primary"
                                    >
                                        <Upload size={14}/> {t('org.csv.upload')}
                                    </button>
                                    {showDevAddresses && (
                                        <button
                                            type="button"
                                            onClick={handleLoadDevAddresses}
                                            className="inline-flex items-center gap-2 rounded-full border border-dashed border-primary/40 px-4 py-2 text-sm text-primary transition hover:bg-primary/10"
                                            title={t('org.dev-addresses.hint')}
                                        >
                                            <Users size={14}/> {t('org.dev-addresses.load')} ({devAddresses.length})
                                        </button>
                                    )}
                                    <span className="text-xs text-muted">{t('org.csv.hint')}</span>
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        accept=".csv,text/csv"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleCsvUpload(file);
                                            e.target.value = '';
                                        }}
                                    />
                                </div>

                                {censusWarnings.map(w => (
                                    <p key={w} className="text-xs text-amber-500">{w}</p>
                                ))}

                                <Field label={t('common.addresses')}>
                                    <Textarea
                                        value={censusText}
                                        onChange={(e) => setCensusText(e.target.value)}
                                        placeholder={t('org.fields.addresses-placeholder')}
                                        rows={8}
                                        className="font-mono text-xs"
                                    />
                                </Field>

                                {validAddresses.length > 0 && (
                                    <p className="text-xs text-emerald-500">
                                        {t('org.valid-addresses', {count: validAddresses.length})}
                                    </p>
                                )}
                            </div>
                        )}

                        {wizard.step === 2 && (
                            <div className="space-y-5">
                                <div>
                                    <div className="text-xs font-semibold uppercase tracking-wider text-muted">
                                        {t('common.title')}
                                    </div>
                                    <div className="mt-1 font-display text-xl text-fg">{name || '-'}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold uppercase tracking-wider text-muted">
                                        {t('common.description')}
                                    </div>
                                    <p className="mt-1 text-sm text-muted">{description || '-'}</p>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold uppercase tracking-wider text-muted">
                                        {t('common.census')}
                                    </div>
                                    <p className="mt-1 text-sm text-fg">
                                        {t('org.members', {count: validAddresses.length})}
                                    </p>
                                </div>
                            </div>
                        )}
                    </WizardLayout>
                </>
            )}
        </div>
    );
}
