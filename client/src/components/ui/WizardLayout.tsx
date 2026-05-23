import type { JSX, ReactNode } from 'react'

import { m, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'

interface WizardLayoutProps<Step extends string = string> {
	steps: readonly Step[]
	currentStep: number
	stepLabel: (step: Step) => string
	children: ReactNode
	footer: ReactNode
	submitError?: string | null
}

export function WizardLayout<Step extends string>({
	steps,
	currentStep,
	stepLabel,
	children,
	footer,
	submitError
}: WizardLayoutProps<Step>): JSX.Element {
	return (
		<>
			<div className="mb-10 flex items-center gap-2">
				{steps.map((step, i) => (
					<div key={step} className="flex flex-1 items-center gap-2">
						<div
							className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition ${
								i <= currentStep
									? 'bg-gradient-to-br from-primary to-accent text-primary-fg'
									: 'border border-border bg-surface text-muted'
							}`}
						>
							{i < currentStep ? <Check size={14} /> : i + 1}
						</div>

						<div className="text-xs text-muted">{stepLabel(step)}</div>

						{i < steps.length - 1 && <div className="h-px flex-1 bg-border" />}
					</div>
				))}
			</div>

			<div className="rounded-2xl border border-border bg-surface p-8">
				<AnimatePresence mode="wait">
					<m.div
						key={currentStep}
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: -20 }}
						transition={{ duration: 0.25 }}
						className="space-y-6"
					>
						{children}
					</m.div>
				</AnimatePresence>

				{submitError && (
					<p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
						{submitError}
					</p>
				)}

				<div className="mt-10 flex items-center justify-between">{footer}</div>
			</div>
		</>
	)
}
