import {m} from "framer-motion";

import {useTranslation} from "react-i18next";

import type {Proposal} from "@/domain";

interface PairwiseGridProps {
    options: Proposal['options'];
    pairwiseMatrix: number[][];
}

export function PairwiseGrid({options, pairwiseMatrix}: PairwiseGridProps) {
    const {t} = useTranslation();

    return (
        <m.div
            initial={{opacity: 0, y: 12}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.5, delay: 0.3}}
            className="mt-10"
        >
            <div className="mb-5">
                <h3 className="text-sm font-semibold text-fg">
                    {t('results.pairwise-section')}
                </h3>

                <p className="mt-1 text-xs leading-relaxed text-muted/80">
                    {t('results.pairwise-explanation')}
                </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {options.flatMap((optA, ai) =>
                    options.slice(ai + 1).map((optB) => {
                        const votesA = pairwiseMatrix[optA.id]?.[optB.id] ?? 0;
                        const votesB = pairwiseMatrix[optB.id]?.[optA.id] ?? 0;
                        const isWinA = votesA > votesB;
                        const isWinB = votesB > votesA;
                        const isTied = votesA === votesB;

                        return (
                            <div key={`${optA.id}-${optB.id}`}
                                 className="overflow-hidden rounded-2xl border border-border bg-surface">
                                <div className="flex items-center gap-3 px-4 pb-3 pt-4">
                                    <span
                                        className={`flex-1 truncate text-sm font-semibold ${isWinA ? 'text-emerald-400' : isTied ? 'text-amber-400' : 'text-rose-400/50'}`}
                                    >
                                        {optA.title}
                                    </span>
                                    <span
                                        className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs font-bold text-muted/40">
                                        vs
                                    </span>
                                    <span
                                        className={`flex-1 truncate text-right text-sm font-semibold ${isWinB ? 'text-emerald-400' : isTied ? 'text-amber-400' : 'text-rose-400/50'}`}
                                    >
                                        {optB.title}
                                    </span>
                                </div>

                                <div className="mx-4 flex h-14 gap-1 overflow-hidden rounded-xl">
                                    <div
                                        style={{flex: votesA + 1}}
                                        className={`flex items-center justify-center font-display text-2xl font-bold tabular-nums ${isWinA ? 'bg-emerald-500/35 text-emerald-100' : isTied ? 'bg-amber-500/25 text-amber-100' : 'bg-rose-500/20 text-rose-300/60'}`}
                                    >
                                        {votesA}
                                    </div>
                                    <div style={{flex: votesB + 1}}
                                         className={`flex items-center justify-center font-display text-2xl font-bold tabular-nums ${isWinB ? 'bg-emerald-500/35 text-emerald-100' : isTied ? 'bg-amber-500/25 text-amber-100' : 'bg-rose-500/20 text-rose-300/60'}`}
                                    >
                                        {votesB}
                                    </div>
                                </div>

                                <div className="px-4 pb-4 pt-3 text-center">
                                    {isTied ? (
                                        <span
                                            className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-300"
                                        >
                                            {t('results.pairwise-legend-tie')}
                                        </span>
                                    ) : (
                                        <span
                                            className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300"
                                        >
                                            {t('results.pairwise-matchup-win', {name: isWinA ? optA.title : optB.title})}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </m.div>
    );
}