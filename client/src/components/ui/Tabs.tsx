import type { ReactNode, JSX } from 'react'

interface TabsProps {
	children: ReactNode
	className?: string
}

export function Tabs({ children, className = '' }: TabsProps): JSX.Element {
	return <div className={className}>{children}</div>
}

interface TabListProps {
	children: ReactNode
	className?: string
}

export function TabList({ children, className = '' }: TabListProps): JSX.Element {
	return (
		<div role="tablist" className={`flex gap-1 border-b border-border ${className}`}>
			{children}
		</div>
	)
}

interface TabProps {
	active: boolean
	onClick: () => void
	label: string
	count?: number
}

export function Tab({ active, onClick, label, count }: TabProps): JSX.Element {
	return (
		<button
			type="button"
			role="tab"
			aria-selected={active}
			onClick={onClick}
			className={`relative inline-flex h-11 shrink-0 items-center gap-2 px-5 text-sm font-medium transition ${
				active ? 'text-fg' : 'text-muted hover:text-fg'
			}`}
		>
			<span>{label}</span>

			{typeof count === 'number' && (
				<span
					className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums transition ${
						active ? 'bg-primary/15 text-primary' : 'bg-elevated text-muted'
					}`}
				>
					{count}
				</span>
			)}

			{active && (
				<span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-primary to-accent" />
			)}
		</button>
	)
}

interface TabPanelProps {
	active: boolean
	children: ReactNode
	className?: string
}

export function TabPanel({ active, children, className = '' }: TabPanelProps): JSX.Element | null {
	if (!active) return null

	return (
		<div role="tabpanel" className={className}>
			{children}
		</div>
	)
}
