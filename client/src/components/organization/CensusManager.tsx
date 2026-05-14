import { useReducer, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Trash2, Upload, AlertCircle, Search } from 'lucide-react';

import { parseAddressList } from '@/domain';

import { useCensusApply } from '@/hooks/useCensusApply';

import { Field, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

import { CensusList } from './CensusList';

export type CensusMode = 'add' | 'remove' | 'replace';

interface Props {
  census: string[];
  orgName: string;
  orgId: number;
  signer: import('algosdk').TransactionSigner;
  sender: string;
  mode: CensusMode;
  selected: Set<string>;
  onModeChange: (m: CensusMode) => void;
  onToggle: (addr: string) => void;
  onCensusChange: () => void;
}

interface State {
  addressText: string;
  warnings: string[];
  showConfirm: boolean;
  successMsg: string | null;
  removeQuery: string;
}

type Action =
  | { type: 'setAddressText'; value: string }
  | { type: 'setWarnings'; warnings: string[] }
  | { type: 'showConfirm'; value: boolean }
  | { type: 'setRemoveQuery'; value: string }
  | { type: 'resetForMode' }
  | { type: 'setSuccess'; message: string }
  | { type: 'clearSuccess' };

const initialState: State = {
  addressText: '',
  warnings: [],
  showConfirm: false,
  successMsg: null,
  removeQuery: '',
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'setAddressText':
      return { ...state, addressText: action.value };
    case 'setWarnings':
      return { ...state, warnings: action.warnings };
    case 'showConfirm':
      return { ...state, showConfirm: action.value };
    case 'setRemoveQuery':
      return { ...state, removeQuery: action.value };
    case 'resetForMode':
      return { ...state, addressText: '', warnings: [], removeQuery: '' };
    case 'setSuccess':
      return { ...state, addressText: '', successMsg: action.message };
    case 'clearSuccess':
      return { ...state, successMsg: null };
  }
}

export function CensusManager({
  census,
  orgName,
  orgId,
  signer,
  sender,
  mode,
  selected,
  onModeChange,
  onToggle,
  onCensusChange,
}: Props) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { addressText, warnings, showConfirm, successMsg, removeQuery } = state;

  const { valid: parsedAddresses, invalid } = parseAddressList(addressText);

  const { apply, applying, progress, error: applyError } = useCensusApply({
    orgId,
    census,
    signer,
    sender,
    onSuccess: (message) => {
      dispatch({ type: 'setSuccess', message });
      onCensusChange();
      setTimeout(() => dispatch({ type: 'clearSuccess' }), 4000);
    },
  });

  function handleCsvUpload(file: File) {
    const reader = new FileReader();

    reader.onload = e => {
      const text = e.target?.result as string;
      const { valid, invalid: inv } = parseAddressList(text);
      dispatch({ type: 'setAddressText', value: valid.join('\n') });
      dispatch({
        type: 'setWarnings',
        warnings: inv.length > 0 ? [`${inv.length} ${t('org.csv.skipped-rows')}`] : [],
      });
    };

    reader.readAsText(file);
  }

  function switchMode(m: CensusMode) {
    onModeChange(m);
    dispatch({ type: 'resetForMode' });
  }

  function handleApply() {
    void apply({
      mode,
      addresses: parsedAddresses,
      selected,
      onProgress: () => {},
      successMessages: {
        add: t('org.census.added', { count: parsedAddresses.length }),
        remove: t('org.census.removed', { count: selected.size }),
        replace: t('org.census.replaced', { count: parsedAddresses.length }),
      },
    });
  }

  const MODES: { id: CensusMode; label: string }[] = [
    { id: 'add', label: t('common.add') },
    { id: 'remove', label: t('common.remove') },
    { id: 'replace', label: t('common.replace-all') },
  ];

  const canSubmit = mode === 'remove' ? selected.size > 0 : parsedAddresses.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-full border border-border bg-elevated p-1">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => switchMode(m.id)}
            className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition ${
              mode === m.id
                ? 'bg-gradient-to-br from-primary to-accent text-primary-fg shadow-glow'
                : 'text-muted hover:text-fg'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-500">
          <Check size={13} /> {successMsg}
        </div>
      )}

      {applyError && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-500">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{applyError}</span>
        </div>
      )}

      {applying && (
        <div className="rounded-xl border border-border bg-elevated px-3 py-2.5 text-sm text-muted">
          {progress
            ? t('common.progress', {done: progress.done, total: progress.total})
            : t('wallet.waiting-signature')}
        </div>
      )}

      {mode === 'remove' ? (
        <div className="space-y-3">
          <p className="text-xs text-muted">{t('org.census.remove-hint')}</p>
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={removeQuery}
              onChange={e => dispatch({ type: 'setRemoveQuery', value: e.target.value })}
              placeholder={t('org.census.search-placeholder')}
              className="h-9 w-full rounded-full border border-border bg-surface pl-9 pr-3 font-mono text-xs text-fg placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <CensusList
            census={census}
            selectMode
            selected={selected}
            onToggle={onToggle}
            query={removeQuery}
          />
          <div className="rounded-xl border border-border bg-elevated px-3 py-2.5 text-xs text-muted">
            {t('org.census.selected-count', {count: selected.size})}
          </div>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Trash2 size={13} />}
            disabled={selected.size === 0 || applying}
            onClick={handleApply}
            className="w-full"
          >
            {applying
              ? t('common.waiting')
              : t('org.census.remove-selected', { count: selected.size })}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted transition hover:border-primary hover:text-primary"
            >
              <Upload size={12} /> {t('org.csv.upload')}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleCsvUpload(file);
                e.target.value = '';
              }}
            />
          </div>
          <Field label={t('common.addresses')}>
            <Textarea
              value={addressText}
              onChange={e => dispatch({ type: 'setAddressText', value: e.target.value })}
              placeholder={t('org.fields.addresses-placeholder')}
              rows={6}
              className="font-mono text-xs"
            />
          </Field>
          {warnings.map((w) => (
            <p key={w} className="text-xs text-amber-500">
              {w}
            </p>
          ))}
          {parsedAddresses.length > 0 && invalid.length === 0 && (
            <p className="text-xs text-emerald-500">
              {t('org.valid-addresses', { count: parsedAddresses.length })}
            </p>
          )}
          <Button
            size="sm"
            disabled={!canSubmit || applying}
            onClick={() => (mode === 'replace' ? dispatch({ type: 'showConfirm', value: true }) : handleApply())}
            className="w-full"
          >
            {applying
              ? t('common.waiting')
              : mode === 'add'
                ? t('org.census.add', { count: parsedAddresses.length })
                : t('org.census.replace', { count: parsedAddresses.length })}
          </Button>
        </div>
      )}

      <Modal
        open={showConfirm}
        onClose={() => dispatch({ type: 'showConfirm', value: false })}
        title={t('org.replace-confirm.title')}
      >
        <p className="mb-6 text-sm text-muted">
          {t('org.replace-confirm.text', {
            current: census.length,
            next: parsedAddresses.length,
            name: orgName,
          })}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'showConfirm', value: false })}>
            {t('common.cancel')}
          </Button>
          <Button size="sm" onClick={handleApply}>
            {t('common.confirm')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
