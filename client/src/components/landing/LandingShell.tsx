import type { ReactNode } from 'react';
import { HowItWorks } from './HowItWorks';
import { FeatureGrid } from './FeatureGrid';
import { CTASection } from './CTASection';

export function LandingShell({ hero }: { hero: ReactNode }) {
  return (
    <>
      {hero}
      <HowItWorks />
      <FeatureGrid />
      <CTASection />
    </>
  );
}
