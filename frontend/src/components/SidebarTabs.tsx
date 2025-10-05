import { useMemo, useState } from 'react'
import { usePromptStore } from '../store/promptStore'
import { HistoryPanel } from './HistoryPanel'
import { BestPractices } from './BestPractices'

type TabKey = 'history' | 'best'

export function SidebarTabs({ bare = false }: { bare?: boolean }) {
  const historyCount = usePromptStore((s) => s.history.length)
  const initialTab = useMemo<TabKey>(() => (historyCount > 0 ? 'history' : 'best'), [historyCount])
  const [tab, setTab] = useState<TabKey>(initialTab)

  const btnBase = 'flex-1 text-sm rounded-md px-3 py-1.5 transition-colors'

  const containerClass = bare
    ? 'overflow-hidden'
    : 'rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow overflow-hidden'

  return (
    <section className={containerClass}>
      <div className="p-2 border-b border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <button
            className={`${btnBase} ${tab === 'history' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'hover:bg-gray-100 dark:hover:bg-white/10'}`}
            onClick={() => setTab('history')}
          >
            History{historyCount > 0 ? ` (${historyCount})` : ''}
          </button>
          <button
            className={`${btnBase} ${tab === 'best' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'hover:bg-gray-100 dark:hover:bg-white/10'}`}
            onClick={() => setTab('best')}
          >
            Best Practices
          </button>
        </div>
      </div>
      <div className="max-h-[calc(100vh-9rem)] overflow-auto">
        {tab === 'history' ? (
          <HistoryPanel bare />
        ) : (
          <BestPractices bare />
        )}
      </div>
    </section>
  )
}

