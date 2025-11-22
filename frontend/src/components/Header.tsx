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
    <header className="app-header" aria-label="Application toolbar">
      <div className="top-bar">
        <div className="brand">
          <Logo size="md" />
          <div>
            <div>Prompt Engineering Studio</div>
            <div className="inline-hint">Material-inspired workspace</div>
          </div>
        </div>
        <div className="action-group">
          <button onClick={openPromptGuidance} className="md-button tonal">
            <BookOpen className="icon-16" />
            Prompt guidance
          </button>
          <button onClick={openUserSettings} className="md-button">
            <SlidersHorizontal className="icon-16" />
            Settings
          </button>
          <button
            onClick={toggleTheme}
            className="md-icon-button"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun className="icon-16" /> : <Moon className="icon-16" />}
          </button>
        </div>
      </div>
    </header>
  )
}
