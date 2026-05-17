import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Check, ChevronDown, ChevronUp, Copy, SearchX} from 'lucide-react';

import type {Address} from "@/domain";

interface Props {
    census: Address[];
    selectMode?: boolean;
    selected?: Set<Address>;
    onToggle?: (addr: Address) => void;
    query?: string;
}

const INITIAL_SHOW = 24;
const EMPTY_SELECTION: Set<Address> = new Set();

export function CensusList({census, selectMode = false, selected = EMPTY_SELECTION, onToggle, query = ''}: Props) {
    const {t} = useTranslation();

    const [expanded, setExpanded] = useState(false);
    const [copiedAddr, setCopiedAddr] = useState<Address | null>(null);

    function copyAddress(addr: Address) {
        navigator.clipboard.writeText(addr);
        setCopiedAddr(addr);
        setTimeout(() => setCopiedAddr(null), 1500);
    }

    const trimmed = query.trim().toLowerCase();

    const filtered = trimmed
        ? census.filter((a) => a.toLowerCase().includes(trimmed))
        : census;

    const visible = expanded ? filtered : filtered.slice(0, INITIAL_SHOW);

    if (census.length === 0) {
        return (
            <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted">
                {t('org.census.empty')}
            </p>
        );
    }

    if (filtered.length === 0) {
        return (
            <div
                className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted"
            >
                <SearchX size={20}/>
                {t('org.census.empty-search')}
            </div>
        );
    }

    return (
        <div>
            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map(addr => {
                    const isSelected = selectMode && selected.has(addr);
                    const className = `group flex items-center gap-2 rounded-xl border px-3 py-2 text-left font-mono text-xs transition ${
                        selectMode ? 'cursor-pointer select-none' : ''
                    } ${
                        isSelected
                            ? 'border-rose-500/60 bg-rose-500/10 text-rose-400'
                            : 'border-border bg-elevated text-muted'
                    } ${selectMode && !isSelected ? 'hover:border-rose-400/40 hover:text-fg' : ''}`;

                    const content = (
                        <>
                            {selectMode && (
                                <span
                                    className={`flex size-4 shrink-0 items-center justify-center rounded border transition ${
                                        isSelected ? 'border-rose-500 bg-rose-500 text-white' : 'border-border'
                                    }`}
                                >
                                    {isSelected && <Check size={10}/>}
                                </span>
                            )}

                            <span className="truncate">{addr}</span>

                            {!selectMode && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        copyAddress(addr);
                                    }}
                                    className="ml-auto shrink-0 rounded p-0.5 text-muted opacity-0 transition hover:text-fg group-hover:opacity-100"
                                    title={t('common.copy', 'Copiar')}
                                >
                                    {copiedAddr === addr ? (
                                        <Check size={12} className="text-green-400"/>
                                    ) : (
                                        <Copy size={12}/>
                                    )}
                                </button>
                            )}
                        </>
                    );

                    return selectMode ? (
                        <button
                            key={addr}
                            type="button"
                            onClick={() => onToggle?.(addr)}
                            className={className}
                        >
                            {content}
                        </button>
                    ) : (
                        <div key={addr} className={className}>
                            {content}
                        </div>
                    );
                })}
            </div>

            {filtered.length > INITIAL_SHOW && (
                <button
                    onClick={() => setExpanded((v) => !v)}
                    className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted transition hover:text-fg"
                >
                    {expanded ? (
                        <><ChevronUp size={13}/> {t('common.hide', 'Amagar')}</>
                    ) : (
                        <><ChevronDown size={13}/> {t('org.show-all-members', {count: filtered.length})}</>
                    )}
                </button>
            )}
        </div>
    );
}
