import type { ReactNode, JSX } from 'react'

import { AnimatePresence, m } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useEffectEvent } from 'react'

interface Props {
	open: boolean
	onClose: () => void
	title?: string
	description?: string
	size?: 'md' | 'lg'
	children: ReactNode
}

export function Modal({ open, onClose, title, description, size = 'md', children }: Props): JSX.Element {
	const handleClose = useEffectEvent(() => onClose())

	useEffect(() => {
		if (!open) return

		function onKey(event: KeyboardEvent): void {
			if (event.key === 'Escape') handleClose()
		}

		window.addEventListener('keydown', onKey)
		const prev = document.body.style.overflow
		document.body.style.overflow = 'hidden'

		// oxlint-disable-next-line consistent-return
		return (): void => {
			window.removeEventListener('keydown', onKey)
			document.body.style.overflow = prev
		}
	}, [open])

	return (
		<AnimatePresence>
			{open && (
				<m.div
					className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
				>
					<button
						type="button"
						aria-label="Close modal"
						onClick={onClose}
						className="absolute inset-0 bg-black/60 backdrop-blur-sm"
					/>

					<m.dialog
						open
						aria-modal="true"
						aria-label={title}
						initial={{ opacity: 0, y: 32, scale: 0.97 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 16, scale: 0.98 }}
						transition={{ type: 'spring', stiffness: 280, damping: 28 }}
						className={`relative z-10 flex w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-elevated shadow-2xl sm:rounded-2xl ${
							size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg'
						} max-h-[92vh]`}
					>
						<div className="flex shrink-0 items-start justify-between gap-4 border-b border-border/60 px-6 py-5">
							<div className="min-w-0">
								{title && <h2 className="font-display text-lg font-semibold text-fg">{title}</h2>}
								{description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
							</div>

							<button
								type="button"
								onClick={onClose}
								className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-fg"
								aria-label="Close"
							>
								<X size={16} />
							</button>
						</div>

						<div className="flex-1 overflow-y-auto p-6">{children}</div>
					</m.dialog>
				</m.div>
			)}
		</AnimatePresence>
	)
}
