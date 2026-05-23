import type { JSX } from 'react'

import { useTheme } from '@/theme/ThemeProvider'
import { useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

import { HeroBackdrop, HeroCopy } from './HeroCopy'

/**
 * Vote Bloom: una flor radial de sis pètals (un per opció). Vots
 * arriben com a partícules brillants a la vora exterior d'un pètal, llisquen cap a dins
 * al llarg del seu eix, i en arribar al nucli, són "absorbits" - creixent el
 * pètal i emetent un pols radial. Combina el recompte de la v4,
 * les partícules convergents de v2, la propagació radial de v3, i el
 * Focus central de V1 en una sola floració unificada.
 */

const PETALS = [
	{ label: 'A', color: '#6366f1' },
	{ label: 'B', color: '#ec4899' },
	{ label: 'C', color: '#10b981' },
	{ label: 'D', color: '#f59e0b' },
	{ label: 'E', color: '#06b6d4' },
	{ label: 'F', color: '#a855f7' }
]

const DEFAULT_COLOR = '#ec4899'

interface Particle {
	petal: number
	petalPosition: number // normalized position along the petal (1 = tip, 0 = core)
	speed: number
	color: string
	size: number
}

interface Pulse {
	born: number
	color: string
}

export function VoteBloomHero(): JSX.Element {
	const reduce = useReducedMotion()

	const { theme } = useTheme()

	const canvasRef = useRef<HTMLCanvasElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const particlesRef = useRef<Particle[]>([])
	const votesRef = useRef<number[]>([12, 8, 15, 6, 10, 4])
	const pulsesRef = useRef<Pulse[]>([])
	const rotRef = useRef(0)
	const coreFlashRef = useRef(0)

	const [counter, setCounter] = useState(2468)

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
		let lastTime = performance.now()

		// oxlint-disable-next-line max-statements
		const step = (time: number): void => {
			const width = canvas.width / dpr
			const height = canvas.height / dpr

			const cx = width / 2
			const cy = height / 2

			const dt = Math.min(64, time - lastTime)

			lastTime = time

			ctx.clearRect(0, 0, width, height)

			if (!reduce) rotRef.current += dt * 0.00014

			coreFlashRef.current = Math.max(0, coreFlashRef.current - dt / 450)

			// Spawn a new incoming vote
			if (!reduce && time - lastSpawn > 220) {
				lastSpawn = time
				const petal = Math.floor(Math.random() * PETALS.length)

				particlesRef.current.push({
					petal,
					petalPosition: 1.0,
					speed: 0.00055 + Math.random() * 0.00025,
					color: PETALS[petal]?.color ?? DEFAULT_COLOR,
					size: 1.8 + Math.random() * 1.6
				})

				setCounter(count => count + 1)
			}

			// Periodic soft normalization so a fast-growing petal doesn't dominate forever
			if (Math.random() < 0.0015)
				votesRef.current = votesRef.current.map(vote => Math.max(1, Math.floor(vote * 0.82)))

			const coreR = Math.min(width, height) * 0.09
			const maxR = Math.min(width, height) * 0.46

			const maxVotes = Math.max(20, ...votesRef.current)

			const petalLength = (i: number): number =>
				coreR + 10 + (votesRef.current[i]! / maxVotes) * (maxR - coreR - 24)

			// ---- background soft halo ----
			const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR)

			halo.addColorStop(0, theme === 'dark' ? 'rgba(99,102,241,0.18)' : 'rgba(79,70,229,0.12)')
			halo.addColorStop(1, 'rgba(99,102,241,0)')
			ctx.fillStyle = halo
			ctx.beginPath()
			ctx.arc(cx, cy, maxR, 0, Math.PI * 2)
			ctx.fill()

			// ---- outer guide ring (dashed) ----
			ctx.strokeStyle = theme === 'dark' ? 'rgba(180,190,255,0.18)' : 'rgba(79,70,229,0.22)'
			ctx.lineWidth = 1
			ctx.setLineDash([2, 6])
			ctx.beginPath()
			ctx.arc(cx, cy, maxR - 6, 0, Math.PI * 2)
			ctx.stroke()
			ctx.setLineDash([])

			// ---- radial pulses (ripples from the core) ----
			const alivePulses: Pulse[] = []

			for (const pulse of pulsesRef.current) {
				const age = (time - pulse.born) / 1000
				const radius = coreR + age * 260

				if (radius > maxR + 40) continue

				const fade = 1 - (radius - coreR) / (maxR - coreR)

				ctx.strokeStyle = pulse.color
				ctx.globalAlpha = Math.max(0, fade) * 0.4
				ctx.lineWidth = 2
				ctx.beginPath()
				ctx.arc(cx, cy, radius, 0, Math.PI * 2)
				ctx.stroke()
				ctx.globalAlpha = Math.max(0, fade) * 0.18
				ctx.lineWidth = 8
				ctx.beginPath()
				ctx.arc(cx, cy, radius, 0, Math.PI * 2)
				ctx.stroke()
				alivePulses.push(pulse)
			}

			ctx.globalAlpha = 1
			pulsesRef.current = alivePulses

			// ---- draw petals ----
			const rot = rotRef.current

			PETALS.forEach((pt, i) => {
				const angle = (i / PETALS.length) * Math.PI * 2 + rot
				const length = petalLength(i)

				ctx.save()
				ctx.translate(cx, cy)
				ctx.rotate(angle)

				const halfWidth = Math.min(length * 0.32, 38)

				// petal body gradient
				const petalGrad = ctx.createLinearGradient(coreR, 0, length, 0)
				petalGrad.addColorStop(0, `${pt.color}f2`)
				petalGrad.addColorStop(0.75, `${pt.color}55`)
				petalGrad.addColorStop(1, `${pt.color}10`)
				ctx.fillStyle = petalGrad

				ctx.beginPath()
				ctx.moveTo(coreR, 0)
				ctx.bezierCurveTo(coreR + length * 0.25, -halfWidth, coreR + length * 0.7, -halfWidth * 0.6, length, 0)

				ctx.bezierCurveTo(coreR + length * 0.7, halfWidth * 0.6, coreR + length * 0.25, halfWidth, coreR, 0)

				ctx.closePath()
				ctx.fill()

				// outline
				ctx.strokeStyle = pt.color
				ctx.globalAlpha = 0.7
				ctx.lineWidth = 1.5
				ctx.stroke()
				ctx.globalAlpha = 1

				// midrib
				ctx.strokeStyle = pt.color
				ctx.globalAlpha = 0.55
				ctx.lineWidth = 1
				ctx.beginPath()
				ctx.moveTo(coreR + 2, 0)
				ctx.lineTo(length - 4, 0)
				ctx.stroke()
				ctx.globalAlpha = 1

				ctx.restore()

				// vote count label at tip (un-rotated so it reads normally)
				const tipX = cx + Math.cos(angle) * (length + 18)
				const tipY = cy + Math.sin(angle) * (length + 18)

				ctx.fillStyle = pt.color
				ctx.beginPath()
				ctx.arc(tipX, tipY, 14, 0, Math.PI * 2)
				ctx.fill()
				ctx.strokeStyle = theme === 'dark' ? 'rgba(15,15,35,0.6)' : 'rgba(255,255,255,0.9)'
				ctx.lineWidth = 2
				ctx.stroke()
				ctx.fillStyle = '#ffffff'
				ctx.font = '700 11px "Space Grotesk", system-ui, sans-serif'
				ctx.textAlign = 'center'
				ctx.textBaseline = 'middle'
				ctx.fillText(String(votesRef.current[i]), tipX, tipY + 0.5)
			})

			// ---- update + draw particles ----
			const alive: Particle[] = []

			for (const particle of particlesRef.current) {
				particle.petalPosition -= particle.speed * dt

				if (particle.petalPosition <= 0) {
					votesRef.current[particle.petal]!++
					pulsesRef.current.push({ born: time, color: particle.color })
					coreFlashRef.current = 1
					continue
				}

				const petalAngle = (particle.petal / PETALS.length) * Math.PI * 2 + rot
				const radius = coreR + (petalLength(particle.petal) - coreR) * particle.petalPosition

				const px = cx + Math.cos(petalAngle) * radius
				const py = cy + Math.sin(petalAngle) * radius

				ctx.shadowColor = particle.color
				ctx.shadowBlur = 16
				ctx.fillStyle = particle.color
				ctx.beginPath()
				ctx.arc(px, py, particle.size, 0, Math.PI * 2)
				ctx.fill()
				ctx.shadowBlur = 0

				alive.push(particle)
			}

			particlesRef.current = alive

			// ---- central core ----
			const flashBoost = 1 + coreFlashRef.current * 0.6
			const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 1.8)

			if (theme === 'dark') {
				coreGrad.addColorStop(0, `rgba(224,231,255,${0.95 * flashBoost})`)
				coreGrad.addColorStop(0.35, 'rgba(129,140,248,0.7)')
				coreGrad.addColorStop(1, 'rgba(129,140,248,0)')
			} else {
				coreGrad.addColorStop(0, `rgba(255,255,255,${0.98 * flashBoost})`)
				coreGrad.addColorStop(0.35, 'rgba(79,70,229,0.65)')
				coreGrad.addColorStop(1, 'rgba(79,70,229,0)')
			}

			ctx.fillStyle = coreGrad
			ctx.beginPath()
			ctx.arc(cx, cy, coreR * 1.8, 0, Math.PI * 2)
			ctx.fill()

			ctx.fillStyle = theme === 'dark' ? '#f8fafc' : '#ffffff'
			ctx.strokeStyle = theme === 'dark' ? '#6366f1' : '#4f46e5'
			ctx.lineWidth = 2
			ctx.beginPath()
			ctx.arc(cx, cy, coreR, 0, Math.PI * 2)
			ctx.fill()
			ctx.stroke()

			const total = votesRef.current.reduce((prev, vote) => prev + vote, 0)

			ctx.fillStyle = theme === 'dark' ? '#4f46e5' : '#4f46e5'
			ctx.font = '800 22px "Space Grotesk", system-ui, sans-serif'
			ctx.textAlign = 'center'
			ctx.textBaseline = 'middle'
			ctx.fillText(String(total), cx, cy - 4)
			ctx.fillStyle = theme === 'dark' ? 'rgba(79,70,229,0.75)' : 'rgba(79,70,229,0.75)'
			ctx.font = '600 9px "Space Grotesk", system-ui, sans-serif'
			ctx.fillText('VOTES', cx, cy + 14)

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
