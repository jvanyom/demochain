import {useTranslation} from 'react-i18next';
import {useNavigate} from 'react-router-dom';
import type {UseFormRegister} from 'react-hook-form';
import {Plus, Trash2, Wallet, Lock, Building2} from 'lucide-react';

import type {Organization, ProposalFormValues} from '@/domain';

import {DateTimePicker} from '@/components/ui/DateTimePicker';
import {Field, Input, Textarea} from '@/components/ui/Input';

export const OrgStepFields = ['orgId'] as const satisfies readonly (keyof ProposalFormValues)[];
export const BasicsStepFields = ['title', 'description'] as const satisfies readonly (keyof ProposalFormValues)[];
export const DatesStepFields = ['startDate', 'endDate'] as const satisfies readonly (keyof ProposalFormValues)[];
export const OptionsStepFields = ['options'] as const satisfies readonly (keyof ProposalFormValues)[];

interface OptionItem {
    id: string;
    value: string;
}

function formatDatetime(str: string): string {
    if (!str) return '—';
    const d = new Date(str);
    return isNaN(d.getTime()) ? str : d.toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'});
}

interface OrgStepProps {
    isConnected: boolean;
    eligibleOrgs: Organization[];
    selectedOrgId: string;
    onSelectOrg: (id: string) => void;
}

export function OrgStep({isConnected, eligibleOrgs, selectedOrgId, onSelectOrg}: OrgStepProps) {
    const {t} = useTranslation();
    const navigate = useNavigate();

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted">{t('proposal.new.org.hint')}</p>
            {!isConnected ? (
                <div className="flex items-center gap-2 rounded-xl border border-border bg-elevated px-4 py-3 text-sm text-muted">
                    <Wallet size={14}/> {t('wallet.connect')}
                </div>
            ) : eligibleOrgs.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
                    <Lock size={14}/>
                    <span>
                        {t('proposal.new.org.empty')}{' '}
                        <button
                            type="button"
                            onClick={() => navigate('/organizations')}
                            className="underline hover:no-underline"
                        >
                            {t('proposal.new.org.browse')}
                        </button>
                    </span>
                </div>
            ) : (
                <div className="space-y-2">
                    {eligibleOrgs.map(org => (
                        <label
                            key={org.id}
                            htmlFor={`org-${org.id}`}
                            aria-label={org.name}
                            className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition ${
                                selectedOrgId === String(org.id)
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/40'
                            }`}
                        >
                            <input
                                id={`org-${org.id}`}
                                type="radio"
                                name="org"
                                value={String(org.id)}
                                checked={selectedOrgId === String(org.id)}
                                onChange={() => onSelectOrg(String(org.id))}
                                className="accent-primary"
                            />
                            <span>
                                <span className="flex items-center gap-2 font-medium text-fg">
                                    <Building2 size={14} className="text-muted"/>
                                    {org.name}
                                </span>
                                <span className="mt-0.5 block text-xs text-muted line-clamp-1">{org.description}</span>
                            </span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}

interface BasicsStepProps {
    title: string;
    description: string;
    onChangeTitle: (v: string) => void;
    onChangeDescription: (v: string) => void;
    onTouch: (field: string) => void;
    fieldError: (field: string) => string | undefined;
}

export function BasicsStep({
                               title,
                               description,
                               onChangeTitle,
                               onChangeDescription,
                               onTouch,
                               fieldError,
                           }: BasicsStepProps) {
    const {t} = useTranslation();
    return (
        <>
            <Field label={t('proposal.new.fields.title')}>
                <Input
                    value={title}
                    onChange={(e) => onChangeTitle(e.target.value)}
                    onBlur={() => onTouch('title')}
                    placeholder={t('proposal.new.fields.title-placeholder')}
                    className={fieldError('title') ? 'border-rose-500' : ''}
                />
                {fieldError('title') && (
                    <span className="mt-1 block text-xs text-rose-500">
                        {t(`errors.${fieldError('title')}`)}
                    </span>
                )}
            </Field>
            <Field label={t('proposal.new.fields.description')}>
                <Textarea
                    value={description}
                    onChange={(e) => onChangeDescription(e.target.value)}
                    onBlur={() => onTouch('description')}
                    placeholder={t('proposal.new.fields.description-placeholder')}
                    rows={5}
                    className={fieldError('description') ? 'border-rose-500' : ''}
                />
                {fieldError('description') && (
                    <span className="mt-1 block text-xs text-rose-500">
                        {t(`errors.${fieldError('description')}`)}
                    </span>
                )}
            </Field>
        </>
    );
}

interface DatesStepProps {
    start: string;
    end: string;
    minStartDate: string;
    showDevWarning: boolean;
    onChangeStart: (v: string) => void;
    onChangeEnd: (v: string) => void;
    onTouch: (field: string) => void;
    fieldError: (field: string) => string | undefined;
}

export function DatesStep({
                              start,
                              end,
                              minStartDate,
                              showDevWarning,
                              onChangeStart,
                              onChangeEnd,
                              onTouch,
                              fieldError,
                          }: DatesStepProps) {
    const {t} = useTranslation();
    return (
        <div className="space-y-4">
            <div className="grid gap-6 sm:grid-cols-2">
                <Field label={t('proposal.new.fields.start')}>
                    <DateTimePicker
                        value={start}
                        min={minStartDate}
                        onChange={onChangeStart}
                        onBlur={() => onTouch('startDate')}
                        placeholder={t('proposal.new.fields.start-placeholder')}
                        hasError={!!fieldError('startDate')}
                    />
                    {fieldError('startDate') && (
                        <span className="mt-1 block text-xs text-rose-500">
                            {t(`errors.${fieldError('startDate')}`)}
                        </span>
                    )}
                </Field>
                <Field label={t('proposal.new.fields.end')}>
                    <DateTimePicker
                        value={end}
                        min={start || minStartDate}
                        onChange={onChangeEnd}
                        onBlur={() => onTouch('endDate')}
                        placeholder={t('proposal.new.fields.end-placeholder')}
                        hasError={!!fieldError('endDate')}
                    />
                    {fieldError('endDate') && (
                        <span className="mt-1 block text-xs text-rose-500">
                            {t(`errors.${fieldError('endDate')}`)}
                        </span>
                    )}
                </Field>
            </div>
            {showDevWarning && (
                <p className="text-xs text-muted">{t('errors.proposal.starting-too-soon')}</p>
            )}
        </div>
    );
}

interface OptionsStepProps {
    fields: {id: string}[];
    register: UseFormRegister<ProposalFormValues>;
    onRemoveOption: (id: string) => void;
    onAddOption: () => void;
    onTouch: (field: string) => void;
    fieldError: (field: string) => string | undefined;
}

export function OptionsStep({fields, register, onRemoveOption, onAddOption, onTouch, fieldError}: OptionsStepProps) {
    const {t} = useTranslation();

    return (
        <div className="space-y-3">
            {fields.map((field, i) => (
                <div key={field.id} className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {i + 1}
                    </span>

                    <Input
                        {...register(`options.${i}.value`)}
                        onBlur={() => onTouch('options')}
                        placeholder={t('proposal.new.fields.option-placeholder')}
                    />

                    {fields.length > 2 && (
                        <button
                            type="button"
                            onClick={() => onRemoveOption(field.id)}
                            className="flex size-10 items-center justify-center rounded-full text-muted transition hover:bg-bg hover:text-rose-500"
                            aria-label={t('proposal.new.fields.remove-option')}
                        >
                            <Trash2 size={16}/>
                        </button>
                    )}
                </div>
            ))}

            {fieldError('options') && (
                <p className="text-xs text-rose-500">
                    {t(`errors.${fieldError('options')}`)}
                </p>
            )}

            <button
                type="button"
                onClick={onAddOption}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-dashed border-border px-4 text-sm text-muted transition hover:border-primary hover:text-primary"
            >
                <Plus size={14}/> {t('proposal.new.fields.add-option')}
            </button>
        </div>
    );
}

interface ReviewStepProps {
    orgName: string;
    title: string;
    description: string;
    start: string;
    end: string;
    options: OptionItem[];
    submitError: string | null;
    submitting: boolean;
    onRetry: () => void;
}

export function ReviewStep({
                               orgName,
                               title,
                               description,
                               start,
                               end,
                               options,
                               submitError,
                               submitting,
                               onRetry,
                           }: ReviewStepProps) {
    const {t} = useTranslation();
    return (
        <div className="space-y-5">
            <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted">{t('org.title')}</div>
                <div className="mt-1 text-sm text-fg">{orgName}</div>
            </div>
            <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted">{t('common.title')}</div>
                <div className="mt-1 font-display text-xl text-fg">{title || '-'}</div>
            </div>
            <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted">{t('common.description')}</div>
                <p className="mt-1 text-sm text-muted">{description || '-'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted">{t('common.start-date')}</div>
                    <div className="mt-1 text-sm text-fg">{formatDatetime(start)}</div>
                </div>
                <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted">{t('common.end-date')}</div>
                    <div className="mt-1 text-sm text-fg">{formatDatetime(end)}</div>
                </div>
            </div>
            <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{t('common.options')}</div>
                <ul className="space-y-2">
                    {options.flatMap((opt, idx) => {
                        const trimmed = opt.value.trim();
                        if (!trimmed) return [];

                        return [
                            <li
                                key={opt.id}
                                className="flex items-center gap-3 rounded-xl border border-border bg-elevated px-4 py-2 text-sm text-fg"
                            >
                                <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                    {idx + 1}
                                </span>
                                {trimmed}
                            </li>,
                        ];
                    })}
                </ul>
            </div>

            {submitError && (
                <div className="space-y-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
                    <p className="text-sm text-rose-500">{submitError}</p>
                    <button
                        type="button"
                        onClick={onRetry}
                        disabled={submitting}
                        className="text-xs font-semibold text-rose-500 underline hover:no-underline disabled:opacity-50"
                    >
                        {t('common.submit')}
                    </button>
                </div>
            )}
        </div>
    );
}
