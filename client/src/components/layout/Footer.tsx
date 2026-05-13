import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';

function subscribe() {
  return () => {};
}

function getYear() {
  return new Date().getFullYear();
}

function getServerYear() {
  return 0;
}

export function Footer() {
  const { t } = useTranslation();
  const year = useSyncExternalStore(subscribe, getYear, getServerYear);

  return (
    <footer className="border-t border-border/60 bg-surface/40">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted md:flex-row">
        <div className="flex items-center gap-2">
          <span className="font-display text-fg">{t('brand')}</span>
          <span>· {t('landing.footer.tagline')}</span>
        </div>
        <div suppressHydrationWarning>
          {year > 0 && <>© {year} · </>}
          {t('landing.footer.rights')}
        </div>
      </div>
    </footer>
  );
}
