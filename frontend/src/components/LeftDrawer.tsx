import { X } from 'lucide-react'
import { useUIStore } from '../store/uiStore'
import { HistoryPanel } from './HistoryPanel'

export function LeftDrawer() {
  const open = useUIStore((s) => s.leftOpen)
  const close = useUIStore((s) => s.closeLeft)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-30 lg:hidden" aria-modal="true" role="dialog">
      <button className="drawer-scrim" aria-label="Close panels" onClick={close} />
      <div className="sheet-panel">
        <div className="h-12 flex items-center justify-between px-4 border-b border-gray-200 dark:border-white/10">
          <div className="font-medium">History</div>
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
