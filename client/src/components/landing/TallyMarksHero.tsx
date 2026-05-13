import { useEffect, useRef, useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { HeroBackdrop, HeroCopy } from './HeroCopy';

/**
 * Classic tally-mark vote counting. Four candidate rows; groups of five
 * marks (four vertical + one diagonal crossing) accumulate as votes come
 * in. The old-school way of counting votes on paper.
 */

const CANDIDATES = [
  { name: 'Option A', hue: 230 },
  { name: 'Option B', hue: 280 },
  { name: 'Option C', hue: 330 },
  { name: 'Option D', hue: 190 },
];

export function TallyMarksHero() {
  const reduce = useReducedMotion();
  const [counts, setCounts] = useState<number[]>([6, 4, 8, 3]);
  const [counter, setCounter] = useState(1284);
  const lastAdded = useRef<number>(-1);

  useEffect(() => {
    if (reduce) return;
    const t = window.setInterval(() => {
      const weights = [0.35, 0.2, 0.3, 0.15];
      const r = Math.random();
      let acc = 0;
      let pick = 0;
      for (let i = 0; i < weights.length; i++) {
        acc += weights[i];
        if (r < acc) {
          pick = i;
          break;
        }
      }
      lastAdded.current = pick;
      setCounts((c) => {
        const next = [...c];
        next[pick]++;
        if (next.some((v) => v > 32)) return [0, 0, 0, 0];
        return next;
      });
      setCounter((c) => c + 1);
    }, 520);
    return () => window.clearInterval(t);
  }, [reduce]);

  return (
    <section className="relative overflow-hidden">
      <HeroBackdrop />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 pb-24 pt-16 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:pt-24">
        <HeroCopy counter={counter} />
        <div className="relative aspect-square w-full max-w-[560px] justify-self-center">
          <div className="flex h-full w-full flex-col justify-center gap-5 p-2">
            {CANDIDATES.map((c, i) => (
              <TallyRow
                key={c.name}
                name={c.name}
                hue={c.hue}
                count={counts[i]}
                flash={lastAdded.current === i}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TallyRow({
  name,
  hue,
  count,
  flash,
}: {
  name: string;
  hue: number;
  count: number;
  flash: boolean;
}) {
  const groups = Math.floor(count / 5);
  const remainder = count % 5;
  const marks: { id: string; type: 'group' | 'partial'; count: number }[] = [];
  for (let g = 0; g < groups; g++) marks.push({ id: `group-${g}`, type: 'group', count: 5 });
  if (remainder > 0) marks.push({ id: 'partial', type: 'partial', count: remainder });

  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <span
          className="size-3 rounded-full"
          style={{ background: `hsl(${hue} 80% 60%)`, boxShadow: `0 0 12px hsl(${hue} 90% 60%)` }}
        />
        <span className="text-sm font-semibold text-fg">{name}</span>
        <m.span
          key={count}
          initial={flash ? { scale: 1.4, color: `hsl(${hue} 85% 60%)` } : false}
          animate={{ scale: 1, color: 'rgb(var(--muted))' }}
          transition={{ duration: 0.35 }}
          className="ml-auto tabular-nums text-xs font-semibold"
        >
          {count}
        </m.span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {marks.map((mark) => (
          <TallyGroup key={mark.id} hue={hue} count={mark.count} />
        ))}
      </div>
    </div>
  );
}

function TallyGroup({ hue, count }: { hue: number; count: number }) {
  const color = `hsl(${hue} 80% 65%)`;
  return (
    <svg width="44" height="36" viewBox="0 0 44 36">
      {['tally-1', 'tally-2', 'tally-3', 'tally-4'].map((tag, i) =>
        i < Math.min(count, 4) ? (
          <m.line
            key={tag}
            x1={4 + i * 8}
            y1="4"
            x2={4 + i * 8}
            y2="32"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.25, delay: i * 0.04 }}
          />
        ) : null,
      )}
      {count >= 5 && (
        <m.line
          x1="0"
          y1="30"
          x2="40"
          y2="6"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </svg>
  );
}
