import { PanelLeft, Settings2 } from 'lucide-react'
import { useUIStore } from '../store/uiStore'

export function EdgeHandles() {
  const toggleLeft = useUIStore((s) => s.toggleLeft)
  const leftOpen = useUIStore((s) => s.leftOpen)
  const toggleRight = useUIStore((s) => s.toggleSettings)
  const rightOpen = useUIStore((s) => s.settingsOpen)
  return (
    <div className="pointer-events-none select-none">
      <div className="fixed top-20 left-2 z-40 flex flex-col gap-2">
        <button
          onClick={toggleLeft}
          aria-label={leftOpen ? 'Close library' : 'Open library'}
          className="pointer-events-auto p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors"
          >
          <PanelLeft className="h-4 w-4" />
        </button>
      </div>
      <div className="fixed top-20 right-2 z-40">
        <button
          onClick={toggleRight}
          aria-label={rightOpen ? 'Close settings' : 'Open settings'}
          className="pointer-events-auto p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
