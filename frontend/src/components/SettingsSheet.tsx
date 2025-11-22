import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useUIStore } from '../store/uiStore'
import { SettingsContent } from './SettingsContent'

// Minimal right-side sheet/drawer. Accessible enough for MVP.
export function SettingsSheet() {
  const open = useUIStore((s) => s.settingsOpen)
  const close = useUIStore((s) => s.closeSettings)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])


  if (!open) return null
  return (
    <div className="fixed inset-0 z-30 lg:hidden" aria-modal="true" role="dialog">
      <button
        className="drawer-scrim"
        aria-label="Close settings"
        onClick={close}
      />
      <div className="sheet-panel right">
        <div className="h-12 flex items-center justify-between px-4 border-b border-gray-200 dark:border-white/10">
          <div className="font-medium">Model & Settings</div>
          <button onClick={close} className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-white/10" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <SettingsContent />
      </div>
    </div>
  )
}
