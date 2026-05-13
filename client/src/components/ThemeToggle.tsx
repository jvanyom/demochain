import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeProvider';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t('theme.toggle')}
      className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-surface text-fg transition hover:border-primary hover:text-primary"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
