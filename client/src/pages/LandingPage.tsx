import type { JSX } from 'react'

import { BallotBoxHero } from '@/components/landing/BallotBoxHero'
import { LandingShell } from '@/components/landing/LandingShell'
import { RippleMapHero } from '@/components/landing/RippleMapHero'
import { TallyMarksHero } from '@/components/landing/TallyMarksHero'
import { VoicesChorusHero } from '@/components/landing/VoicesChorusHero'
import { VoteBloomHero } from '@/components/landing/VoteBloomHero'
import { useMemo } from 'react'

const HEROES = [BallotBoxHero, VoicesChorusHero, RippleMapHero, TallyMarksHero, VoteBloomHero]

export function LandingPage(): JSX.Element {
	const Hero = useMemo(() => HEROES[Math.floor(Math.random() * HEROES.length)], [])!

	return <LandingShell hero={<Hero />} />
}
