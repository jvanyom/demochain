import type { JSX } from 'react'

import { m } from 'framer-motion'
import { ListOrdered, Users, Eye, ShieldCheck, Languages, Accessibility } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const icons = [ListOrdered, Users, Eye, ShieldCheck, Languages, Accessibility]

export function FeatureGrid(): JSX.Element {
	const { t } = useTranslation()

	// oxlint-disable-next-line no-unsafe-type-assertion
	const items = t('landing.features.items', { returnObjects: true }) as { title: string; text: string }[]

	return (
		<section className="py-24">
			<div className="mx-auto max-w-7xl px-6">
				<m.h2
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.6 }}
					className="mx-auto max-w-2xl text-center font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl"
				>
					{t('landing.features.title')}
				</m.h2>

				<div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{items.map((item, i) => {
						const Icon = icons[i] ?? Users

						return (
							<m.div
								key={item.title}
								initial={{ opacity: 0, y: 24 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.5, delay: i * 0.05 }}
								className="rounded-2xl border border-border/70 bg-surface/70 p-6 transition hover:border-primary/40 hover:shadow-glow"
							>
								<div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
									<Icon size={18} />
								</div>

								<h3 className="mb-1.5 font-display text-lg font-semibold text-fg">{item.title}</h3>

								<p className="text-sm leading-relaxed text-muted">{item.text}</p>
							</m.div>
						)
					})}
				</div>
			</div>
		</section>
	)
}
