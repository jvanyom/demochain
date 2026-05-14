import {useTranslation} from "react-i18next";
import { AnimatePresence, m } from 'framer-motion';
import { useMemo, useRef, useEffect, useState } from 'react';
import { DayPicker, type ChevronProps } from 'react-day-picker';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

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

function NavChevron({ orientation }: ChevronProps) {
  return orientation === 'left' ? <ChevronLeft size={15} /> : <ChevronRight size={15} />;
}

export function DateTimePicker({ value, onChange, onBlur, min, placeholder, hasError }: DateTimePickerProps) {
  const {t} = useTranslation();

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Date | undefined>();
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [hourStr, setHourStr] = useState('12');
  const [minStr, setMinStr] = useState('00');
  const containerRef = useRef<HTMLDivElement>(null);

  const minDate = useMemo(() => parseStr(min ?? ''), [min]);

  function handleOpen() {
    const d = parseStr(value);
    const h = d?.getHours() ?? 12;
    const mi = d?.getMinutes() ?? 0;
    setSelected(d ?? undefined);
    setHour(h);
    setMinute(mi);
    setHourStr(String(h).padStart(2, '0'));
    setMinStr(String(mi).padStart(2, '0'));
    setOpen(true);
  }

  function handleCancel() {
    setOpen(false);
    onBlur?.();
  }

  function handleConfirm() {
    if (selected) onChange(toStr(selected, hour, minute));
    setOpen(false);
    onBlur?.();
  }

  function commitHour(raw: string) {
    const n = parseInt(raw, 10);
    const v = isNaN(n) ? hour : Math.min(23, Math.max(0, n));
    setHour(v);
    setHourStr(String(v).padStart(2, '0'));
  }

  function commitMin(raw: string) {
    const n = parseInt(raw, 10);
    const v = isNaN(n) ? minute : Math.min(59, Math.max(0, n));
    setMinute(v);
    setMinStr(String(v).padStart(2, '0'));
  }

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        onBlur?.();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onBlur]);

  const displayValue = useMemo(() => {
    const d = parseStr(value);
    return d ? d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';
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
        <CalendarDays size={14} className={displayValue ? 'text-primary' : 'text-muted'} />
        <span className={displayValue ? 'text-fg' : 'text-muted'}>
          {displayValue || placeholder}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 top-[calc(100%+6px)] z-50 w-[17rem] overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
          >
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={setSelected}
              disabled={minDate ? { before: minDate } : undefined}
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
              components={{ Chevron: NavChevron }}
            />

            <div className="border-t border-border bg-elevated/30 p-4">
              <div className="flex items-center justify-center gap-3">
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={hourStr}
                  onChange={(e) => {
                    setHourStr(e.target.value);
                    const n = parseInt(e.target.value, 10);
                    if (!isNaN(n) && n >= 0 && n <= 23) setHour(n);
                  }}
                  onBlur={(e) => commitHour(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className={timeInput}
                />
                <span className="select-none font-mono text-2xl font-bold text-muted">:</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={minStr}
                  onChange={(e) => {
                    setMinStr(e.target.value);
                    const n = parseInt(e.target.value, 10);
                    if (!isNaN(n) && n >= 0 && n <= 59) setMinute(n);
                  }}
                  onBlur={(e) => commitMin(e.target.value)}
                  onFocus={(e) => e.target.select()}
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
