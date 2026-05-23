import type { JSX } from 'react'

import { useTheme } from '@/theme/ThemeProvider'
import { useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

import { HeroBackdrop, HeroCopy } from './HeroCopy'

interface Ripple {
	x: number
	y: number
	t: number
	color: string
	max: number
}

const COLORS = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#06B6D4']
const DEFAULT_COLOR = '#6366F1'

/**
 * V6 - Ripple Map: a grid of voter dots where every few hundred ms a new
 * vote sends a ripple expanding outward across the community. Dots light
 * up as the rings pass over them.
 */
export function RippleMapHero(): JSX.Element {
	const reduce = useReducedMotion()

	const { theme } = useTheme()

	const canvasRef = useRef<HTMLCanvasElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const ripplesRef = useRef<Ripple[]>([])

	const [counter, setCounter] = useState(8124)

	useEffect(() => {
		const canvas = canvasRef.current
		const host = containerRef.current

		if (canvas === null || host === null) return

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

		const COLS = 28
		const ROWS = 20

		const drawRippleRings = (t: number): void => {
			const alive: Ripple[] = []

			for (const ripple of ripplesRef.current) {
				const age = (t - ripple.t) / 1000
				const radius = age * 130

				if (radius > ripple.max) continue

				const fade = 1 - radius / ripple.max

				ctx.strokeStyle = ripple.color
				ctx.globalAlpha = fade * 0.45
				ctx.lineWidth = 1.5
				ctx.beginPath()
				ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2)
				ctx.stroke()

				ctx.globalAlpha = fade * 0.18
				ctx.lineWidth = 6
				ctx.beginPath()
				ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2)
				ctx.stroke()
				alive.push(ripple)
			}

			ctx.globalAlpha = 1
			ripplesRef.current = alive
		}

		const step = (t: number): void => {
			const width = canvas.width / dpr
			const height = canvas.height / dpr
			ctx.clearRect(0, 0, width, height)

			const pad = 24
			const gridW = width - pad * 2
			const gridH = height - pad * 2
			const dx = gridW / (COLS - 1)
			const dy = gridH / (ROWS - 1)

			if (!reduce && t - lastSpawn > 480) {
				const gx = Math.floor(Math.random() * COLS)
				const gy = Math.floor(Math.random() * ROWS)

				ripplesRef.current.push({
					x: pad + gx * dx,
					y: pad + gy * dy,
					t,
					color: COLORS[Math.floor(Math.random() * COLORS.length)] ?? DEFAULT_COLOR,
					max: 120 + Math.random() * 80
				})

				if (ripplesRef.current.length > 12) ripplesRef.current.shift()

				lastSpawn = t
				setCounter(count => count + 1)
			}

			// Draw grid of voter dots
			const dotBase = theme === 'dark' ? 'rgba(148,163,184,0.38)' : 'rgba(55,65,95,0.55)'

			for (let row = 0; row < ROWS; row++)
				for (let col = 0; col < COLS; col++) {
					const px = pad + col * dx
					const py = pad + row * dy

					// Find the strongest ripple influence on this dot
					let litColor: string | null = null
					let litAmount = 0

					for (const ripple of ripplesRef.current) {
						const age = (t - ripple.t) / 1000
						const radius = age * 130

						if (radius > ripple.max) continue

						const dist = Math.hypot(px - ripple.x, py - ripple.y)
						const band = Math.abs(dist - radius)

						if (band < 18) {
							const strength = (1 - band / 18) * (1 - radius / ripple.max)

							if (strength > litAmount) {
								litAmount = strength
								litColor = ripple.color
							}
						}
					}

					ctx.beginPath()

					if (litColor && litAmount > 0.05) {
						ctx.fillStyle = litColor
						ctx.globalAlpha = Math.min(1, 0.35 + litAmount * 0.9)
						ctx.arc(px, py, 1.6 + litAmount * 2.8, 0, Math.PI * 2)
					} else {
						ctx.fillStyle = dotBase
						ctx.globalAlpha = 1
						ctx.arc(px, py, 1.6, 0, Math.PI * 2)
					}

					ctx.fill()
				}

			ctx.globalAlpha = 1

			// Draw ripple rings
			drawRippleRings(t)

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

				<div ref={containerRef} className="relative aspect-[6/5] w-full max-w-[620px] justify-self-center">
					<canvas
						ref={canvasRef}
						aria-label="Animated map of voter activity rippling across a community"
						className="h-full w-full"
					/>
				</div>
			</div>
		</section>
	)
}
