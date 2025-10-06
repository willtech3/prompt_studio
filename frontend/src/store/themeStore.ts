import { create } from 'zustand'

export type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

function getInitialTheme(): Theme {
  // Check if we're in browser environment
  if (typeof window === 'undefined') return 'dark'

  // Check if theme is already applied to document (from inline script)
  const hasClass = document.documentElement.classList.contains('dark')
  if (hasClass) return 'dark'

  // Otherwise default to light
  return 'light'
}

function applyThemeToDOM(theme: Theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitialTheme(),

  setTheme: (theme: Theme) => {
    applyThemeToDOM(theme)
    try {
      localStorage.setItem('theme', theme)
    } catch (e) {
      console.error('Failed to save theme to localStorage:', e)
    }
    set({ theme })
  },

  toggleTheme: () => {
    const current = get().theme
    const next: Theme = current === 'dark' ? 'light' : 'dark'
    applyThemeToDOM(next)
    try {
      localStorage.setItem('theme', next)
    } catch (e) {
      console.error('Failed to save theme to localStorage:', e)
    }
    set({ theme: next })
  },
}))
