import type { JSX } from 'react'

import { AlertCircle, ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom'

function getMessage(error: unknown): string {
	if (isRouteErrorResponse(error)) return error.statusText

	if (error instanceof Error) return error.message

	return 'unknown'
}

export function RouteError(): JSX.Element {
	const { t } = useTranslation()

	const navigate = useNavigate()
	const error = useRouteError()

	const message = getMessage(error)

	return (
		<div className="mx-auto flex max-w-md flex-col items-center gap-6 px-6 py-20 text-center">
			<AlertCircle size={40} className="text-muted" />

			<p className="text-sm text-muted">{t(`errors.${message}`)}</p>

			<button
				type="button"
				onClick={() => navigate(-1)}
				className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted transition hover:text-fg"
			>
				<ArrowLeft size={14} /> {t('common.back')}
			</button>
		</div>
	)
}
