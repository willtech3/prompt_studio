import { X } from 'lucide-react'
import { useUIStore } from '../store/uiStore'
import { BestPractices } from './BestPractices'

export function BestPracticesModal() {
  const open = useUIStore((s) => s.bestPracticesOpen)
  const close = useUIStore((s) => s.closeBestPractices)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex">
      <div className="mx-auto my-8 w-[min(1000px,95vw)] bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-white/10 shadow-xl overflow-hidden flex flex-col">
        <div className="h-12 flex items-center justify-between px-4 border-b border-gray-200 dark:border-white/10">
          <div className="font-semibold">Best Practices</div>
          <button onClick={close} className="rounded-md p-2 border border-gray-300 dark:border-white/15 hover:bg-gray-100 dark:hover:bg-white/10" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="h-[min(70vh,800px)] overflow-auto">
          <BestPractices />
        </div>
      </div>
    </div>
  )
}

