import type { JSX } from 'react'

import { LazyMotion, MotionConfig, domAnimation, useReducedMotion } from 'framer-motion'
import { Outlet } from 'react-router-dom'

import { Footer } from './components/layout/Footer'
import { Header } from './components/layout/Header'

export default function App(): JSX.Element {
	const reduced = useReducedMotion()

	return (
		<LazyMotion features={domAnimation} strict>
			<MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
				<div className="flex min-h-full flex-col">
					<Header />
					<main className="flex-1">
						<Outlet />
					</main>
					<Footer />
				</div>
			</MotionConfig>
		</LazyMotion>
	)
}
