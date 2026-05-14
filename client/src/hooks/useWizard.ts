import { useState } from 'react';

interface WizardState {
  step: number;
  submitting: boolean;
  error: string | null;
}

export function useWizard(stepCount: number) {
  const [state, setState] = useState<WizardState>({
    step: 0,
    submitting: false,
    error: null,
  });

  return {
    step: state.step,
    submitting: state.submitting,
    error: state.error,
    isFirst: state.step === 0,
    isLast: state.step === stepCount - 1,
    next: () => setState((s) => ({ ...s, step: Math.min(s.step + 1, stepCount - 1) })),
    prev: () => setState((s) => ({ ...s, step: Math.max(s.step - 1, 0) })),
    startSubmit: () => setState((s) => ({ ...s, submitting: true, error: null })),
    succeedSubmit: () => setState((s) => ({ ...s, submitting: false })),
    failSubmit: (error: string) => setState((s) => ({ ...s, submitting: false, error })),
  };
}
