import { X } from 'lucide-react'
import { useUIStore } from '../store/uiStore'
import { useSettingsStore } from '../store/settingsStore'

export function UserSettingsScreen() {
  const open = useUIStore((s) => s.userSettingsOpen)
  const close = useUIStore((s) => s.closeUserSettings)
  const enabled = useSettingsStore((s) => s.enabledProviders)
  const toggle = useSettingsStore((s) => s.toggleProvider)
  const font = useSettingsStore((s) => s.font)
  const setFont = useSettingsStore((s) => s.setFont)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex">
      <div className="mx-auto my-8 w-[min(920px,94vw)] bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-white/10 shadow-xl flex flex-col">
        <div className="h-12 flex items-center justify-between px-4 border-b border-gray-200 dark:border-white/10">
          <div className="font-semibold">Prompt Studio Settings</div>
          <button onClick={close} className="rounded-md p-2 border border-gray-300 dark:border-white/15 hover:bg-gray-100 dark:hover:bg-white/10" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <section>
            <h3 className="font-medium mb-2">Providers</h3>
            <div className="space-y-2">
              {(['openai','anthropic','google','xai','deepseek'] as const).map((id) => (
                <label key={id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!enabled[id]} onChange={() => toggle(id)} className="accent-blue-600" />
                  <span className="capitalize">{id}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">Controls which providers are shown in the Settings drawer.</p>
          </section>
          <section>
            <h3 className="font-medium mb-2">Font</h3>
            <select value={font} onChange={(e) => setFont(e.target.value as any)} className="rounded-md bg-transparent border border-gray-300 dark:border-white/15 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="system">System default</option>
              <option value="inter">Inter (sans)</option>
              <option value="mono">Monospace</option>
            </select>
            <p className="text-xs text-gray-500 mt-2">Applies immediately; persisted locally.</p>
          </section>
        </div>
        <div className="px-4 py-3 border-t border-gray-200 dark:border-white/10 flex justify-end">
          <button onClick={close} className="rounded-md border border-gray-300 dark:border-white/15 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-white/10">Close</button>
        </div>
      </div>
    </div>
  )
}

