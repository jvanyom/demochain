import type { JSX } from 'react'

import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export function CTASection(): JSX.Element {
	const { t } = useTranslation()

	return (
		<section className="py-20">
			<div className="mx-auto max-w-5xl px-6">
				<div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-primary/90 to-accent/90 p-12 text-center shadow-glow">
					<div
						className="absolute inset-0 -z-10 opacity-20"
						style={{
							backgroundImage:
								'radial-gradient(circle at 20% 20%, white 0, transparent 40%), radial-gradient(circle at 80% 70%, white 0, transparent 40%)'
						}}
					/>

					<h2 className="font-display text-4xl font-semibold tracking-tight text-primary-fg sm:text-5xl">
						{t('landing.cta.title')}
					</h2>

					<p className="mx-auto mt-4 max-w-xl text-base text-primary-fg/90">{t('landing.cta.text')}</p>

					<Link
						to="/proposals/new"
						className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-bg px-6 text-sm font-semibold text-fg transition hover:-translate-y-0.5 hover:shadow-lg"
					>
						{t('landing.cta.button')}
						<ArrowRight size={16} />
					</Link>
				</div>
			</div>
		</section>
	)
}
