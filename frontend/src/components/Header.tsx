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
    <header className="sticky top-0 z-20 border-b border-gray-200/70 dark:border-white/10 backdrop-blur bg-white/70 dark:bg-gray-950/60">
      <div className="h-14 flex items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-3">
          <Logo size="md" />
          <span className="font-semibold">Prompt Engineering Studio</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openPromptGuidance}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 dark:border-white/15 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <BookOpen className="h-4 w-4" />
            Prompt Guidance
          </button>
          <button
            onClick={openUserSettings}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 dark:border-white/15 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Settings
          </button>
          <button
            onClick={toggleTheme}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-white/15 p-2 text-sm hover:bg-gray-100 dark:hover:bg-white/10"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  )
}
