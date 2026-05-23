import type { JSX, ReactNode } from 'react'

import { createContext, use, useCallback, useEffect, useState, useMemo } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
	theme: Theme
	toggle: () => void
	setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getInitial(): Theme {
	if (typeof window === 'undefined') return 'light'
	const saved = localStorage.getItem('theme')
	if (saved === 'light' || saved === 'dark') return saved
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
	const [themeState, setThemeState] = useState<Theme>(getInitial)

	useEffect(() => {
		const root = document.documentElement
		root.classList.toggle('dark', themeState === 'dark')
		localStorage.setItem('theme', themeState)
	}, [themeState])

	const setTheme = useCallback((theme: Theme) => setThemeState(theme), [])
	const toggle = useCallback(() => setThemeState(t => (t === 'dark' ? 'light' : 'dark')), [])

	const value = useMemo(() => ({ theme: themeState, setTheme, toggle }), [themeState, toggle, setTheme])

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
	const ctx = use(ThemeContext)
	if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
	return ctx
}
