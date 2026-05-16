import {useState} from 'react';
import {m} from 'framer-motion';
import {useTranslation} from 'react-i18next';
import {ShieldCheck, BadgeCheck} from 'lucide-react';

import {Button} from '@/components/ui/Button';

export function VerificationPanel() {
    const {t} = useTranslation();

    const [value, setValue] = useState('');
    const [verified, setVerified] = useState(false);

    return (
        <div className="mt-14 rounded-3xl border border-border bg-elevated p-6">
            <div className="mb-2 flex items-center gap-2">
                <ShieldCheck size={18} className="text-primary"/>
                <h3 className="font-display text-lg font-semibold text-fg">
                    {t('results.verify.title')}
                </h3>
            </div>

            <p className="mb-4 text-sm text-muted">
                {t('results.verify.text')}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
                <input
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value);
                        setVerified(false);
                    }}
                    placeholder={t('results.verify.placeholder')}
                    className="h-11 flex-1 rounded-full border border-border bg-surface px-5 font-mono text-sm text-fg placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <Button onClick={() => setVerified(Boolean(value.trim()))}>
                    {t('results.verify.button')}
                </Button>
            </div>

            {verified && (
                <m.div
                    initial={{opacity: 0, y: 8}}
                    animate={{opacity: 1, y: 0}}
                    className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4"
                >
                    <BadgeCheck className="mt-0.5 shrink-0 text-emerald-500" size={18}/>
                    <div>
                        <div className="text-sm font-semibold text-emerald-500">
                            {t('results.verify.success')}
                        </div>

                        <div className="mt-0.5 text-xs text-muted">
                            {t('results.verify.ranked')} {value}
                        </div>
                    </div>
                </m.div>
            )}
        </div>
    );
}
