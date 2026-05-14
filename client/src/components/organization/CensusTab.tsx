import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Search, Settings2} from 'lucide-react';

import {CensusList} from './CensusList';

interface Props {
    census: string[];
    isOrganizer: boolean;
    onManageClick: () => void;
}

export function CensusTab({census, isOrganizer, onManageClick}: Props) {
    const {t} = useTranslation();
    const [query, setQuery] = useState('');

    const trimmed = query.trim().toLowerCase();
    const matchCount = trimmed
        ? census.filter((a) => a.toLowerCase().includes(trimmed)).length
        : census.length;

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[220px] flex-1">
                    <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"/>
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('org.census.search-placeholder')}
                        className="h-10 w-full rounded-full border border-border bg-surface pl-11 pr-4 font-mono text-xs text-fg placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                </div>

                <span className="text-xs tabular-nums text-muted">
                    {trimmed
                        ? t('org.census.match-of', {shown: matchCount, total: census.length})
                        : t('org.members', {count: census.length})
                    }
                </span>

                {isOrganizer && (
                    <button
                        type="button"
                        onClick={onManageClick}
                        className="inline-flex h-10 items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 text-xs font-semibold text-primary transition hover:bg-primary/15"
                    >
                        <Settings2 size={13}/> {t('org.census.manage')}
                    </button>
                )}
            </div>

            <CensusList census={census} query={query}/>
        </div>
    );
}
