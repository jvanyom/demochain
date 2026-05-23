import type { JSX, ReactNode } from 'react'

import { CTASection } from './CTASection'
import { FeatureGrid } from './FeatureGrid'
import { HowItWorks } from './HowItWorks'

export function LandingShell({ hero }: { hero: ReactNode }): JSX.Element {
	return (
		<>
			{hero}
			<HowItWorks />
			<FeatureGrid />
			<CTASection />
		</>
	)
}
