import { NavLink, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { ThemeToggle } from '../ThemeToggle';
import { Vote } from 'lucide-react';

export function Header() {
  const { t } = useTranslation();
  const linkBase =
    'text-sm font-medium transition hover:text-primary';
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-bg/70 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 text-fg">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-fg shadow-glow">
            <Vote size={18} />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">{t('brand')}</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <NavLink to="/" end className={({ isActive }) => `${linkBase} ${isActive ? 'text-primary' : 'text-fg'}`}>
            {t('nav.home')}
          </NavLink>
          <NavLink to="/organizations" className={({ isActive }) => `${linkBase} ${isActive ? 'text-primary' : 'text-fg'}`}>
            {t('org.title')}
          </NavLink>
          <NavLink to="/proposals" className={({ isActive }) => `${linkBase} ${isActive ? 'text-primary' : 'text-fg'}`}>
            {t('nav.proposals')}
          </NavLink>
          <NavLink to="/proposals/new" className={({ isActive }) => `${linkBase} ${isActive ? 'text-primary' : 'text-fg'}`}>
            {t('nav.newProposal')}
          </NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
