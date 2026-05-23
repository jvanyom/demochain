import { useState } from 'react'

interface WizardState {
	step: number
	submitting: boolean
	error: string | null
}

interface Wizard extends WizardState {
	isFirst: boolean
	isLast: boolean
	next: () => void
	prev: () => void
	startSubmit: () => void
	succeedSubmit: () => void
	failSubmit: (error: string) => void
}

export function useWizard(stepCount: number): Wizard {
	const [state, setState] = useState<WizardState>({
		step: 0,
		submitting: false,
		error: null
	})

	return {
		step: state.step,
		submitting: state.submitting,
		error: state.error,
		isFirst: state.step === 0,
		isLast: state.step === stepCount - 1,
		next: () =>
			setState(currentState => ({ ...currentState, step: Math.min(currentState.step + 1, stepCount - 1) })),
		prev: () => setState(currentState => ({ ...currentState, step: Math.max(currentState.step - 1, 0) })),
		startSubmit: () => setState(currentState => ({ ...currentState, submitting: true, error: null })),
		succeedSubmit: () => setState(currentState => ({ ...currentState, submitting: false })),
		failSubmit: (error: string) => setState(currentState => ({ ...currentState, submitting: false, error }))
	}
}
