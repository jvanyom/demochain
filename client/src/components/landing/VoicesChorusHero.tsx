import type { JSX } from 'react'

import { useTheme } from '@/theme/ThemeProvider'
import { useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

import { HeroBackdrop, HeroCopy } from './HeroCopy'

interface Particle {
	x: number
	y: number
	vx: number
	vy: number
	radius: number
	column: number
	life: number
}

const COLUMNS = [
	{ label: 'Option A', color: '#6366F1' },
	{ label: 'Option B', color: '#EC4899' },
	{ label: 'Option C', color: '#10B981' },
	{ label: 'Option D', color: '#F59E0B' }
]

const DEFAULT_COLUMN = {
	label: 'Option A',
	color: '#6366F1'
}

/**
 * Veus en un Cor: partícules que representen votants s'acosten des de
 * les vores, s'inclinen cap a una de les quatre columnes d'opcions, i es dissolen
 * en fer créixer els bars. Un "reinici" recurrent buida el chorus.
 */
export function VoicesChorusHero(): JSX.Element {
	const reduce = useReducedMotion()

	const { theme } = useTheme()

	const canvasRef = useRef<HTMLCanvasElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const particlesRef = useRef<Particle[]>([])
	const heightsRef = useRef<number[]>([0, 0, 0, 0])

	const [counter, setCounter] = useState(3892)

	useEffect(() => {
		const canvas = canvasRef.current
		const host = containerRef.current
		if (!canvas || !host) return

		const ctx = canvas.getContext('2d')
		if (!ctx) return

		const dpr = window.devicePixelRatio || 1

		const resize = (): void => {
			const rect = host.getBoundingClientRect()
			canvas.width = rect.width * dpr
			canvas.height = rect.height * dpr
			canvas.style.cssText = `width: ${rect.width}px; height: ${rect.height}px;`
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
		}

		resize()
		window.addEventListener('resize', resize)

		let raf = 0
		let lastSpawn = 0
		let lastReset = performance.now()

		const spawn = (width: number, height: number): void => {
			const edge = Math.floor(Math.random() * 3)
			const column = Math.floor(Math.random() * 4)

			let x = width + 20
			let y = Math.random() * height * 0.6

			if (edge === 0) {
				x = Math.random() * width
				y = -20
			} else if (edge === 1) {
				x = -20
				y = Math.random() * height * 0.6
			}

			particlesRef.current.push({
				x,
				y,
				vx: 0,
				vy: 0,
				radius: 2 + Math.random() * 2.5,
				column,
				life: 0
			})
		}

		const step = (t: number): void => {
			const width = canvas.width / dpr
			const height = canvas.height / dpr

			ctx.clearRect(0, 0, width, height)

			if (!reduce) {
				if (t - lastSpawn > 55) {
					for (let i = 0; i < 3; i++) spawn(width, height)
					lastSpawn = t
				}

				if (t - lastReset > 9000) {
					heightsRef.current = heightsRef.current.map(heightRef => heightRef * 0.2)
					lastReset = t
				}
			}

			const colWidth = width / 4
			const baseY = height - 20

			// Draw column bars first (behind particles)
			COLUMNS.forEach((col, i) => {
				const barHeight = Math.min(heightsRef.current[i] ?? Infinity, height - 80)
				const bx = i * colWidth + colWidth * 0.18
				const bw = colWidth * 0.64

				// glow
				ctx.fillStyle = `${col.color}25`
				ctx.beginPath()
				roundRect(ctx, bx - 6, baseY - barHeight - 6, bw + 12, barHeight + 12, 14)
				ctx.fill()

				// bar gradient
				const grad = ctx.createLinearGradient(0, baseY - barHeight, 0, baseY)
				grad.addColorStop(0, col.color)
				grad.addColorStop(1, `${col.color}aa`)
				ctx.fillStyle = grad
				ctx.beginPath()
				roundRect(ctx, bx, baseY - barHeight, bw, Math.max(barHeight, 2), 10)
				ctx.fill()

				// label
				ctx.fillStyle = theme === 'dark' ? 'rgba(237,240,252,0.72)' : 'rgba(15,15,35,0.72)'
				ctx.font = '600 10px "Space Grotesk", system-ui, sans-serif'
				ctx.textAlign = 'center'
				ctx.fillText(col.label.toUpperCase(), bx + bw / 2, baseY + 14)
			})

			// Update + draw particles
			const alive: Particle[] = []

			for (const particle of particlesRef.current) {
				const targetX = particle.column * colWidth + colWidth / 2
				const targetY = baseY - Math.min(heightsRef.current[particle.column] ?? Infinity, height - 90) - 8

				const dx = targetX - particle.x
				const dy = targetY - particle.y

				const dist = Math.hypot(dx, dy)

				particle.vx += (dx / (dist + 1)) * 0.35
				particle.vy += (dy / (dist + 1)) * 0.35
				particle.vx *= 0.94
				particle.vy *= 0.94
				particle.x += particle.vx
				particle.y += particle.vy
				particle.life += 1

				const col = COLUMNS[particle.column] ?? DEFAULT_COLUMN
				ctx.fillStyle = col.color
				ctx.globalAlpha = Math.min(1, particle.life / 6)
				ctx.beginPath()
				ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
				ctx.fill()
				ctx.globalAlpha = 1

				// trail
				ctx.strokeStyle = `${col.color}55`
				ctx.lineWidth = 1
				ctx.beginPath()
				ctx.moveTo(particle.x, particle.y)
				ctx.lineTo(particle.x - particle.vx * 2, particle.y - particle.vy * 2)
				ctx.stroke()

				if (dist < 10) {
					heightsRef.current[particle.column]! += 1.4
					continue
				}

				if (particle.life < 400) alive.push(particle)
			}

			particlesRef.current = alive

			if (Math.floor(t / 400) % 2 === 0 && Math.random() < 0.1) setCounter(count => count + 1)

			raf = requestAnimationFrame(step)
		}

		raf = requestAnimationFrame(step)

		// oxlint-disable-next-line consistent-return
		return (): void => {
			cancelAnimationFrame(raf)
			window.removeEventListener('resize', resize)
		}
	}, [reduce, theme])

	return (
		<section className="relative overflow-hidden">
			<HeroBackdrop />
			<div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 pb-24 pt-16 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:pt-24">
				<HeroCopy counter={counter} />

				<div ref={containerRef} className="relative aspect-square w-full max-w-[560px] justify-self-center">
					<canvas ref={canvasRef} className="h-full w-full" />
				</div>
			</div>
		</section>
	)
}

function roundRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	cornerRadius: number
): void {
	const radius = Math.min(cornerRadius, width / 2, height / 2)

	ctx.moveTo(x + radius, y)
	ctx.arcTo(x + width, y, x + width, y + height, radius)
	ctx.arcTo(x + width, y + height, x, y + height, radius)
	ctx.arcTo(x, y + height, x, y, radius)
	ctx.arcTo(x, y, x + width, y, radius)
}
