import {useMemo} from 'react';

import {VoicesChorusHero} from '@/components/landing/VoicesChorusHero';
import {TallyMarksHero} from '@/components/landing/TallyMarksHero';
import {BallotBoxHero} from '@/components/landing/BallotBoxHero';
import {RippleMapHero} from '@/components/landing/RippleMapHero';
import {VoteBloomHero} from '@/components/landing/VoteBloomHero';
import {LandingShell} from '@/components/landing/LandingShell';

const HEROES = [BallotBoxHero, VoicesChorusHero, RippleMapHero, TallyMarksHero, VoteBloomHero];

export function LandingPage() {
    const Hero = useMemo(() => HEROES[Math.floor(Math.random() * HEROES.length)], []);

    return <LandingShell hero={<Hero/>}/>;
}
