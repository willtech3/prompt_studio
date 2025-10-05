import { SlidersHorizontal } from 'lucide-react'
import { useUIStore } from '../store/uiStore'

export function Header() {
  const openUserSettings = useUIStore((s) => s.openUserSettings)

  return (
    <header className="sticky top-0 z-20 border-b border-gray-200/70 dark:border-white/10 backdrop-blur bg-white/70 dark:bg-gray-950/60">
      <div className="h-14 flex items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-500 shadow" />
          <span className="font-semibold">Prompt Engineering Studio</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openUserSettings}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 dark:border-white/15 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Settings
          </button>
        </div>
      </div>
    </header>
  )
}
