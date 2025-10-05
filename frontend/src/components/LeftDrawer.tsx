import { X, BookOpen } from 'lucide-react'
import { useUIStore } from '../store/uiStore'
import { HistoryPanel } from './HistoryPanel'

export function LeftDrawer() {
  const open = useUIStore((s) => s.leftOpen)
  const close = useUIStore((s) => s.closeLeft)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-30 lg:hidden" aria-modal="true" role="dialog">
      <button className="absolute inset-0 bg-black/30 backdrop-blur-sm" aria-label="Close panels" onClick={close} />
      <div className="absolute left-0 top-0 h-full w-[min(92vw,420px)] bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-md border-r border-gray-200 dark:border-white/10 shadow-xl flex flex-col">
        <div className="h-12 flex items-center justify-between px-4 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="font-medium">History</div>
            <button
              onClick={() => useUIStore.getState().openBestPractices()}
              className="p-1 hover:opacity-80"
              aria-label="Open best practices"
              title="Best Practices"
            >
              <BookOpen className="h-4 w-4" />
            </button>
          </div>
          <button onClick={close} className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-white/10" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <HistoryPanel bare />
        </div>
      </div>
    </div>
  )
}
