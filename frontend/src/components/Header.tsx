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
      <div className="topbar">
        <div className="topbar-brand">
          <Logo size="md" />
          <span className="brand-title">Prompt Engineering Studio</span>
        </div>
        <div className="topbar-actions">
          <button onClick={openPromptGuidance} className="chip-button">
            <BookOpen className="icon" />
            Prompt Guidance
          </button>
          <button onClick={openUserSettings} className="chip-button">
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
      </div>
    </header>
  )
}
