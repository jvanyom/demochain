import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { m, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import { HeroBackdrop, HeroCopy } from './HeroCopy';

const VB = { w: 600, h: 460 };
const F = { x1: 180, y1: 200, x2: 420, y2: 360 };
const DV = { x: 44, y: -56 };

const C = {
  fTL: { x: F.x1, y: F.y1 },
  fTR: { x: F.x2, y: F.y1 },
  fBL: { x: F.x1, y: F.y2 },
  fBR: { x: F.x2, y: F.y2 },
  bTL: { x: F.x1 + DV.x, y: F.y1 + DV.y },
  bTR: { x: F.x2 + DV.x, y: F.y1 + DV.y },
  bBL: { x: F.x1 + DV.x, y: F.y2 + DV.y },
  bBR: { x: F.x2 + DV.x, y: F.y2 + DV.y },
};

const LID_OVER = 14;
const SLOT = { x: (F.x1 + F.x2) / 2 + DV.x / 2, y: F.y1 + DV.y / 2 };
const TOP_MATRIX = `matrix(1 0 ${DV.x / (F.y2 - F.y1)} ${DV.y / (F.y2 - F.y1)} ${F.x1} ${F.y1})`;

interface Flying {
  id: number;
  startX: number;
  startY: number;
  startRot: number;
  hue: number;
}

function BallotDefs() {
  return (
    <defs>
      <linearGradient id="bb-glass-front" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="rgb(var(--primary))" stopOpacity="0.55" />
        <stop offset="55%" stopColor="rgb(var(--primary))" stopOpacity="0.3" />
        <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="0.45" />
      </linearGradient>
      <linearGradient id="bb-glass-side" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="rgb(var(--primary))" stopOpacity="0.65" />
        <stop offset="100%" stopColor="rgb(var(--primary))" stopOpacity="0.18" />
      </linearGradient>
      <linearGradient id="bb-lid" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="rgb(var(--primary))" />
        <stop offset="55%" stopColor="rgb(var(--accent))" />
        <stop offset="100%" stopColor="rgb(var(--primary))" />
      </linearGradient>
      <linearGradient id="bb-slot" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#030315" />
        <stop offset="50%" stopColor="#0a0a24" />
        <stop offset="100%" stopColor="#1a1a40" />
      </linearGradient>
      <radialGradient id="bb-halo" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="rgb(var(--primary))" stopOpacity="0.38" />
        <stop offset="100%" stopColor="rgb(var(--primary))" stopOpacity="0" />
      </radialGradient>
      <filter id="bb-shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="8" />
      </filter>
    </defs>
  );
}

function BallotBoxGeometry() {
  return (
    <>
      <circle cx={VB.w / 2} cy={260} r={230} fill="url(#bb-halo)" />

      <ellipse
        cx={VB.w / 2 + 8}
        cy={398}
        rx={200}
        ry={16}
        fill="rgb(0 0 0 / 0.5)"
        filter="url(#bb-shadow)"
      />

      <polygon
        points={`${C.fTR.x},${C.fTR.y} ${C.bTR.x},${C.bTR.y} ${C.bBR.x},${C.bBR.y} ${C.fBR.x},${C.fBR.y}`}
        fill="url(#bb-glass-side)"
        stroke="rgb(var(--primary) / 0.7)"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />

      <rect
        x={F.x1}
        y={F.y1}
        width={F.x2 - F.x1}
        height={F.y2 - F.y1}
        rx="6"
        fill="url(#bb-glass-front)"
        stroke="rgb(var(--primary) / 0.6)"
        strokeWidth="1.5"
      />
      <rect
        x={F.x1 + 12}
        y={F.y1 + 10}
        width="3"
        height={F.y2 - F.y1 - 20}
        rx="1.5"
        fill="rgb(255 255 255 / 0.35)"
      />
      <rect
        x={F.x2 - 14}
        y={F.y1 + 14}
        width="1.5"
        height={F.y2 - F.y1 - 30}
        rx="1"
        fill="rgb(255 255 255 / 0.18)"
      />

      <line x1={C.fTR.x} y1={C.fTR.y} x2={C.bTR.x} y2={C.bTR.y} stroke="rgb(var(--primary) / 0.55)" strokeWidth="1.1" />
      <line x1={C.fBR.x} y1={C.fBR.y} x2={C.bBR.x} y2={C.bBR.y} stroke="rgb(var(--primary) / 0.38)" strokeWidth="1" />

      <line x1={C.bTL.x} y1={C.bTL.y} x2={C.bBL.x} y2={C.bBL.y} stroke="rgb(var(--primary) / 0.45)" strokeWidth="1" strokeDasharray="4 3" />
      <line x1={C.fBL.x} y1={C.fBL.y} x2={C.bBL.x} y2={C.bBL.y} stroke="rgb(var(--primary) / 0.38)" strokeWidth="1" strokeDasharray="4 3" />
      <line x1={C.bBL.x} y1={C.bBL.y} x2={C.bBR.x} y2={C.bBR.y} stroke="rgb(var(--primary) / 0.38)" strokeWidth="1" strokeDasharray="4 3" />

      <g transform={`translate(${(F.x1 + F.x2) / 2 - 30}, ${F.y2 - 52})`}>
        <rect x="0" y="0" width="60" height="30" rx="5" fill="rgb(var(--elevated) / 0.97)" stroke="rgb(var(--primary) / 0.9)" strokeWidth="1.3" />
        <polyline points="14,17 23,25 46,9" fill="none" stroke="rgb(var(--primary))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </>
  );
}

function BallotLid() {
  return (
    <g transform={TOP_MATRIX}>
      <rect
        x={-LID_OVER + 2}
        y={-LID_OVER + 4}
        width={F.x2 - F.x1 + LID_OVER * 2}
        height={F.y2 - F.y1 + LID_OVER * 2}
        rx="4"
        fill="rgb(0 0 0 / 0.35)"
      />
      <rect
        x={-LID_OVER}
        y={-LID_OVER}
        width={F.x2 - F.x1 + LID_OVER * 2}
        height={F.y2 - F.y1 + LID_OVER * 2}
        rx="4"
        fill="url(#bb-lid)"
        stroke="rgb(var(--primary))"
        strokeWidth="1.4"
      />
      <rect
        x={-LID_OVER + 8}
        y={-LID_OVER + 6}
        width={F.x2 - F.x1 + LID_OVER * 2 - 16}
        height="5"
        rx="2"
        fill="rgb(255 255 255 / 0.25)"
      />
      <rect
        x={(F.x2 - F.x1) / 2 - 70}
        y={(F.y2 - F.y1) / 2 - 10}
        width="140"
        height="20"
        rx="6"
        fill="url(#bb-slot)"
        stroke="rgb(0 0 0 / 0.75)"
        strokeWidth="2"
      />
      <rect
        x={(F.x2 - F.x1) / 2 - 68}
        y={(F.y2 - F.y1) / 2 - 8}
        width="136"
        height="4"
        rx="2"
        fill="rgb(0 0 0 / 0.7)"
      />
      <rect
        x={(F.x2 - F.x1) / 2 - 68}
        y={(F.y2 - F.y1) / 2 + 6}
        width="136"
        height="1.5"
        rx="0.75"
        fill="rgb(255 255 255 / 0.2)"
      />
    </g>
  );
}

function FlyingBallot({ ballot, onDone }: { ballot: Flying; onDone: (id: number) => void }) {
  return (
    <m.g
      initial={{ x: ballot.startX, y: ballot.startY, rotate: ballot.startRot, opacity: 0 }}
      animate={{ x: SLOT.x, y: SLOT.y, rotate: 0, opacity: [0, 1, 1, 0] }}
      transition={{
        duration: 1.8,
        x: { duration: 1.8, ease: 'easeOut' },
        y: { duration: 1.8, ease: [0.55, 0.05, 0.85, 0.3] },
        rotate: { duration: 1.8, ease: 'easeOut' },
        opacity: { duration: 1.8, times: [0, 0.12, 0.9, 1] },
      }}
      onAnimationComplete={() => onDone(ballot.id)}
    >
      <g transform="translate(-22, -15)">
        <rect x="0" y="0" width="44" height="30" rx="3" fill="rgb(var(--elevated))" stroke={`hsl(${ballot.hue} 55% 40%)`} strokeWidth="1" />
        <rect x="0" y="0" width="44" height="8" rx="3" fill={`hsl(${ballot.hue} 75% 60%)`} />
        <rect x="0" y="6" width="44" height="2" fill={`hsl(${ballot.hue} 60% 45%)`} />
        <rect x="4" y="13" width="9" height="9" rx="1" fill={`hsl(${ballot.hue} 80% 55%)`} stroke={`hsl(${ballot.hue} 60% 40%)`} strokeWidth="0.6" />
        <polyline points="5.5,17 8,19.5 12,14.5" fill="none" stroke="rgb(255 255 255)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="16" y1="15" x2="40" y2="15" stroke={`hsl(${ballot.hue} 25% 45%)`} strokeWidth="1.2" strokeLinecap="round" />
        <line x1="16" y1="19" x2="34" y2="19" stroke={`hsl(${ballot.hue} 20% 55%)`} strokeWidth="1" strokeLinecap="round" />
        <line x1="4" y1="25" x2="36" y2="25" stroke={`hsl(${ballot.hue} 20% 60%)`} strokeWidth="0.8" strokeLinecap="round" />
      </g>
    </m.g>
  );
}

export function BallotBoxHero() {
  const reduce = useReducedMotion();
  const [flying, setFlying] = useState<Flying[]>([]);
  const [counter, setCounter] = useState(1284);
  const idRef = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 140, damping: 18, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 140, damping: 18, mass: 0.6 });
  const rotateY = useTransform(sx, [-1, 1], [-16, 16]);
  const rotateX = useTransform(sy, [-1, 1], [10, -10]);

  useEffect(() => {
    if (reduce) return;
    const spawn = () => {
      const id = ++idRef.current;
      setFlying((prev) => [
        ...prev,
        {
          id,
          startX: 120 + Math.random() * 360,
          startY: 20 + Math.random() * 40,
          startRot: (Math.random() - 0.5) * 140,
          hue: 210 + Math.random() * 140,
        },
      ]);
      setCounter((c) => c + 1);
    };
    spawn();
    const t = window.setInterval(spawn, 1050);
    return () => window.clearInterval(t);
  }, [reduce]);

  const onDone = (id: number) => setFlying((prev) => prev.filter((b) => b.id !== id));

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    px.set(Math.max(-1, Math.min(1, nx)));
    py.set(Math.max(-1, Math.min(1, ny)));
  };

  const handlePointerLeave = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <section className="relative overflow-hidden">
      <HeroBackdrop />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 pb-24 pt-16 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:pt-24">
        <HeroCopy counter={counter} />

        <div
          ref={containerRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          className="relative aspect-[600/460] w-full max-w-[620px] justify-self-center"
          style={{ perspective: 1100 }}
        >
          <m.svg
            viewBox={`0 0 ${VB.w} ${VB.h}`}
            className="h-full w-full"
            style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
          >
            <BallotDefs />
            <BallotBoxGeometry />
            <BallotLid />
            {flying.map((b) => (
              <FlyingBallot key={b.id} ballot={b} onDone={onDone} />
            ))}
          </m.svg>
        </div>
      </div>
    </section>
  );
}
