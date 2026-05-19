import {useTranslation} from "react-i18next";
import {AnimatePresence, m} from 'framer-motion';
import {DayPicker, type ChevronProps} from 'react-day-picker';
import {CalendarDays, ChevronLeft, ChevronRight} from 'lucide-react';
import {useMemo, useRef, useEffect, useReducer, useEffectEvent} from 'react';

interface DateTimePickerProps {
    value: string;        // "YYYY-MM-DDTHH:mm" or ""
    onChange: (value: string) => void;
    onBlur?: () => void;
    min?: string;         // "YYYY-MM-DDTHH:mm"
    placeholder?: string;
    hasError?: boolean;
}

function parseStr(str: string): Date | null {
    if (!str) return null;
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
}

function toStr(date: Date, hour: number, minute: number): string {
    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${mo}-${d}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function NavChevron({orientation}: ChevronProps) {
    return orientation === 'left' ? <ChevronLeft size={15}/> : <ChevronRight size={15}/>;
}

type PickerState = {
    open: boolean;
    selected: Date | undefined;
    hourStr: string;
    minStr: string;
};

type PickerAction =
    | { type: 'open'; selected: Date | undefined; hourStr: string; minStr: string }
    | { type: 'close' }
    | { type: 'select'; date: Date | undefined }
    | { type: 'setHourStr'; value: string }
    | { type: 'setMinStr'; value: string }
    | { type: 'commitHour'; raw: string }
    | { type: 'commitMin'; raw: string };

function pickerReducer(state: PickerState, action: PickerAction): PickerState {
    switch (action.type) {
        case 'open':
            return {open: true, selected: action.selected, hourStr: action.hourStr, minStr: action.minStr};
        case 'close':
            return {...state, open: false};
        case 'select':
            return {...state, selected: action.date};
        case 'setHourStr':
            return {...state, hourStr: action.value};
        case 'setMinStr':
            return {...state, minStr: action.value};
        case 'commitHour': {
            const n = parseInt(action.raw, 10);
            const v = isNaN(n) ? parseInt(state.hourStr, 10) : Math.min(23, Math.max(0, n));
            return {...state, hourStr: String(v).padStart(2, '0')};
        }
        case 'commitMin': {
            const n = parseInt(action.raw, 10);
            const v = isNaN(n) ? parseInt(state.minStr, 10) : Math.min(59, Math.max(0, n));
            return {...state, minStr: String(v).padStart(2, '0')};
        }
    }
}

const initialPickerState: PickerState = {open: false, selected: undefined, hourStr: '12', minStr: '00'};

export function DateTimePicker({value, onChange, onBlur, min, placeholder, hasError}: DateTimePickerProps) {
    const {t} = useTranslation();
    const [{open, selected, hourStr, minStr}, dispatch] = useReducer(pickerReducer, initialPickerState);
    const containerRef = useRef<HTMLDivElement>(null);

    const minDate = useMemo(() => parseStr(min ?? ''), [min]);

    function handleOpen() {
        const d = parseStr(value);
        const h = d?.getHours() ?? 12;
        const mi = d?.getMinutes() ?? 0;

        dispatch({
            type: 'open',
            selected: d ?? undefined,
            hourStr: String(h).padStart(2, '0'),
            minStr: String(mi).padStart(2, '0')
        });
    }

    function handleCancel() {
        dispatch({type: 'close'});
        onBlur?.();
    }

    function handleConfirm() {
        if (selected) onChange(toStr(selected, parseInt(hourStr, 10) || 0, parseInt(minStr, 10) || 0));
        dispatch({type: 'close'});
        onBlur?.();
    }

    const handleOutsideClick = useEffectEvent((e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
            dispatch({type: 'close'});
            onBlur?.();
        }
    });

    useEffect(() => {
        if (!open) return;
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [open]);

    const displayValue = useMemo(() => {
        const d = parseStr(value);
        return d ? d.toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'}) : '';
    }, [value]);

    const timeInput =
        'h-11 w-14 rounded-xl border border-border bg-surface font-mono text-2xl font-bold text-fg text-center transition ' +
        'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ' +
        '[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [appearance:textfield]';

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => (open ? handleCancel() : handleOpen())}
                className={[
                    'flex w-full items-center gap-2.5 rounded-xl border bg-surface px-4 py-3 text-left text-sm transition',
                    'focus:outline-none focus:ring-2 focus:ring-primary/30',
                    hasError
                        ? 'border-rose-500'
                        : open
                            ? 'border-primary ring-2 ring-primary/30'
                            : 'border-border hover:border-primary/50',
                ].join(' ')}
            >
                <CalendarDays size={14} className={displayValue ? 'text-primary' : 'text-muted'}/>

                <span className={displayValue ? 'text-fg' : 'text-muted'}>
                    {displayValue || placeholder}
                </span>
            </button>

            <AnimatePresence>
                {open && (
                    <m.div
                        initial={{opacity: 0, y: -8, scale: 0.97}}
                        animate={{opacity: 1, y: 0, scale: 1}}
                        exit={{opacity: 0, y: -8, scale: 0.97}}
                        transition={{duration: 0.15, ease: 'easeOut'}}
                        className="absolute left-0 top-[calc(100%+6px)] z-50 w-[17rem] overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
                    >
                        <DayPicker
                            mode="single"
                            selected={selected}
                            onSelect={date => dispatch({type: 'select', date})}
                            disabled={minDate ? {before: minDate} : undefined}
                            showOutsideDays
                            classNames={{
                                root: 'px-3 pt-3 pb-1',
                                month_caption: 'flex items-center justify-between pb-3 border-b border-border mb-2',
                                caption_label: 'text-sm font-semibold capitalize text-fg',
                                nav: 'flex gap-1',
                                button_previous: 'flex size-7 items-center justify-center rounded-lg text-muted transition hover:bg-elevated hover:text-fg',
                                button_next: 'flex size-7 items-center justify-center rounded-lg text-muted transition hover:bg-elevated hover:text-fg',
                                month_grid: 'w-full',
                                weekdays: '',
                                weekday: 'py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted',
                                weeks: '',
                                week: '',
                                day: 'p-0.5 text-center',
                                day_button: 'mx-auto flex size-8 items-center justify-center rounded-full text-xs font-medium transition text-fg hover:bg-elevated focus:outline-none',
                                selected: '[&>button]:bg-gradient-to-br [&>button]:from-primary [&>button]:to-accent [&>button]:text-primary-fg [&>button]:shadow-glow [&>button]:hover:brightness-110',
                                today: '[&>button]:border [&>button]:border-primary/50 [&>button]:font-semibold [&>button]:text-primary',
                                outside: '[&>button]:text-muted/30 [&>button]:pointer-events-none',
                                disabled: '[&>button]:text-muted/30 [&>button]:pointer-events-none',
                            }}
                            components={{Chevron: NavChevron}}
                        />

                        <div className="border-t border-border bg-elevated/30 p-4">
                            <div className="flex items-center justify-center gap-3">
                                <input
                                    type="number"
                                    min={0}
                                    max={23}
                                    value={hourStr}
                                    onChange={e => dispatch({type: 'setHourStr', value: e.target.value})}
                                    onBlur={e => dispatch({type: 'commitHour', raw: e.target.value})}
                                    onFocus={e => e.target.select()}
                                    className={timeInput}
                                />

                                <span className="select-none font-mono text-2xl font-bold text-muted">:</span>

                                <input
                                    type="number"
                                    min={0}
                                    max={59}
                                    value={minStr}
                                    onChange={e => dispatch({type: 'setMinStr', value: e.target.value})}
                                    onBlur={e => dispatch({type: 'commitMin', raw: e.target.value})}
                                    onFocus={e => e.target.select()}
                                    className={timeInput}
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 border-t border-border px-4 py-3">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="flex-1 rounded-full border border-border py-2 text-xs font-medium text-muted transition hover:border-primary/40 hover:text-fg"
                            >
                                {t('common.cancel')}
                            </button>

                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={!selected}
                                className="flex-1 rounded-full bg-gradient-to-br from-primary to-accent py-2 text-xs font-semibold text-primary-fg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {t('common.confirm')}
                            </button>
                        </div>
                    </m.div>
                )}
            </AnimatePresence>
        </div>
    );
}
