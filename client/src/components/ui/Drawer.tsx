import type { ReactNode, JSX } from 'react'

import { AnimatePresence, m } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useEffectEvent } from 'react'

interface Props {
	open: boolean
	onClose: () => void
	title?: string
	description?: string
	children: ReactNode
}

export function Drawer({ open, onClose, title, description, children }: Props): JSX.Element {
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
					className="fixed inset-0 z-50"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
				>
					<button
						type="button"
						aria-label="Close drawer"
						className="absolute inset-0 bg-black/50 backdrop-blur-sm"
						onClick={onClose}
					/>

					<m.dialog
						aria-modal="true"
						aria-label={title}
						initial={{ x: '100%' }}
						animate={{ x: 0 }}
						exit={{ x: '100%' }}
						transition={{ type: 'spring', stiffness: 320, damping: 34 }}
						className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-border bg-bg shadow-2xl sm:max-w-lg"
					>
						<header className="flex items-start justify-between gap-3 border-b border-border/60 px-6 py-5">
							<div className="min-w-0">
								{title && <h2 className="font-display text-lg font-semibold text-fg">{title}</h2>}

								{description && <p className="mt-1 text-xs text-muted">{description}</p>}
							</div>

							<button
								type="button"
								onClick={onClose}
								aria-label="Close"
								className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-fg"
							>
								<X size={16} />
							</button>
						</header>

						<div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
					</m.dialog>
				</m.div>
			)}
		</AnimatePresence>
	)
}
