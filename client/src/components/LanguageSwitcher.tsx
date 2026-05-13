import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useState } from 'react';

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'ca', label: 'CA' },
] as const;

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);

  const current = i18n.resolvedLanguage?.slice(0, 2) ?? 'en';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('language.label')}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-3 text-sm font-medium text-fg transition hover:border-primary hover:text-primary"
      >
        <Globe size={16} />
        <span className="uppercase">{current}</span>
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close language menu"
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-12 z-40 min-w-[140px] overflow-hidden rounded-xl border border-border bg-elevated shadow-lg">
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => {
                  i18n.changeLanguage(l.code);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-4 py-2 text-sm transition hover:bg-surface ${
                  current === l.code ? 'text-primary' : 'text-fg'
                }`}
              >
                <span>{t(`language.${l.code}`)}</span>
                <span className="text-xs font-semibold uppercase text-muted">{l.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
