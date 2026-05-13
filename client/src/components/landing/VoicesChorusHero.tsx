import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useTheme } from '../../theme/ThemeProvider';
import { HeroBackdrop, HeroCopy } from './HeroCopy';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  column: number;
  life: number;
}

const COLUMNS = [
  { label: 'Option A', color: '#6366F1' },
  { label: 'Option B', color: '#EC4899' },
  { label: 'Option C', color: '#10B981' },
  { label: 'Option D', color: '#F59E0B' },
];

/**
 * V3 — Voices into a Chorus: particles representing voters drift in from
 * the edges, gravitate toward one of four option columns, and dissolve
 * into growing bars. A recurring "reset" empties the chorus.
 */
export function VoicesChorusHero() {
  const reduce = useReducedMotion();
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const heightsRef = useRef<number[]>([0, 0, 0, 0]);
  const [counter, setCounter] = useState(3892);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = containerRef.current;
    if (!canvas || !host) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = host.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.cssText = `width: ${rect.width}px; height: ${rect.height}px;`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    let lastSpawn = 0;
    let lastReset = performance.now();

    const spawn = (w: number, h: number) => {
      const edge = Math.floor(Math.random() * 3);
      const column = Math.floor(Math.random() * 4);
      let x = 0;
      let y = 0;
      if (edge === 0) {
        x = Math.random() * w;
        y = -20;
      } else if (edge === 1) {
        x = -20;
        y = Math.random() * h * 0.6;
      } else {
        x = w + 20;
        y = Math.random() * h * 0.6;
      }
      particlesRef.current.push({
        x,
        y,
        vx: 0,
        vy: 0,
        r: 2 + Math.random() * 2.5,
        column,
        life: 0,
      });
    };

    const step = (t: number) => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      if (!reduce) {
        if (t - lastSpawn > 55) {
          for (let i = 0; i < 3; i++) spawn(w, h);
          lastSpawn = t;
        }
        if (t - lastReset > 9000) {
          heightsRef.current = heightsRef.current.map((v) => v * 0.2);
          lastReset = t;
        }
      }

      const colWidth = w / 4;
      const baseY = h - 20;

      // Draw column bars first (behind particles)
      COLUMNS.forEach((col, i) => {
        const barHeight = Math.min(heightsRef.current[i], h - 80);
        const bx = i * colWidth + colWidth * 0.18;
        const bw = colWidth * 0.64;
        // glow
        ctx.fillStyle = col.color + '25';
        ctx.beginPath();
        roundRect(ctx, bx - 6, baseY - barHeight - 6, bw + 12, barHeight + 12, 14);
        ctx.fill();
        // bar gradient
        const grad = ctx.createLinearGradient(0, baseY - barHeight, 0, baseY);
        grad.addColorStop(0, col.color);
        grad.addColorStop(1, col.color + 'aa');
        ctx.fillStyle = grad;
        ctx.beginPath();
        roundRect(ctx, bx, baseY - barHeight, bw, Math.max(barHeight, 2), 10);
        ctx.fill();
        // label
        ctx.fillStyle = theme === 'dark' ? 'rgba(237,240,252,0.72)' : 'rgba(15,15,35,0.72)';
        ctx.font = '600 10px "Space Grotesk", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(col.label.toUpperCase(), bx + bw / 2, baseY + 14);
      });

      // Update + draw particles
      const alive: Particle[] = [];
      for (const p of particlesRef.current) {
        const targetX = p.column * colWidth + colWidth / 2;
        const targetY = baseY - Math.min(heightsRef.current[p.column], h - 90) - 8;
        const dx = targetX - p.x;
        const dy = targetY - p.y;
        const dist = Math.hypot(dx, dy);
        p.vx += (dx / (dist + 1)) * 0.35;
        p.vy += (dy / (dist + 1)) * 0.35;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.x += p.vx;
        p.y += p.vy;
        p.life += 1;

        const col = COLUMNS[p.column];
        ctx.fillStyle = col.color;
        ctx.globalAlpha = Math.min(1, p.life / 6);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        // trail
        ctx.strokeStyle = col.color + '55';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2);
        ctx.stroke();

        if (dist < 10) {
          heightsRef.current[p.column] += 1.4;
          continue;
        }
        if (p.life < 400) alive.push(p);
      }
      particlesRef.current = alive;

      if (Math.floor(t / 400) % 2 === 0 && Math.random() < 0.1) setCounter((c) => c + 1);

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [reduce, theme]);

  return (
    <section className="relative overflow-hidden">
      <HeroBackdrop />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 pb-24 pt-16 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:pt-24">
        <HeroCopy counter={counter} />

        <div
          ref={containerRef}
          className="relative aspect-square w-full max-w-[560px] justify-self-center"
        >
          <canvas ref={canvasRef} className="h-full w-full" />
        </div>
      </div>
    </section>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
}
