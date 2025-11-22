import { SlidersHorizontal, BookOpen, Sun, Moon } from 'lucide-react'
import { useUIStore } from '../store/uiStore'
import { useThemeStore } from '../store/themeStore'
import { Logo } from './Logo'

export function Header() {
  const openUserSettings = useUIStore((s) => s.openUserSettings)
  const openPromptGuidance = useUIStore((s) => s.openPromptGuidance)
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)

  return (
    <header className="app-header">
      <div className="brand">
        <Logo size="md" />
        <div className="brand-text">
          <span className="title">Prompt Engineering Studio</span>
          <span className="subtitle">Material-inspired workspace</span>
        </div>
      </div>
      <div className="action-bar">
        <button
          onClick={openPromptGuidance}
          className="button tonal"
        >
          <BookOpen className="icon" />
          Prompt guidance
        </button>
        <button
          onClick={openUserSettings}
          className="button tonal"
        >
          <SlidersHorizontal className="icon" />
          Settings
        </button>
        <button
          onClick={toggleTheme}
          className="icon-button"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="icon" /> : <Moon className="icon" />}
        </button>
      </div>
    </header>
  )
}
