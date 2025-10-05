import { useEffect, useMemo, useState } from 'react'
import { usePromptStore } from '../store/promptStore'
import { api } from '../services/api'

export function HistoryPanel({ bare = false }: { bare?: boolean }) {
  const history = usePromptStore((s) => s.history)
  const clearHistory = usePromptStore((s) => s.clearHistory)
  const restoreFromHistory = usePromptStore((s) => s.restoreFromHistory)
  const reset = usePromptStore((s) => s.reset)
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const [saved, setSaved] = useState<Array<{id: string; title?: string; kind: string; provider?: string; model?: string; created_at: string}>>([])
  const [loadingSaved, setLoadingSaved] = useState(false)

  const loadSaved = async () => {
    try {
      setLoadingSaved(true)
      const items = await api.listSnapshots()
      setSaved(items)
    } catch (e) {
      console.error('load saved failed', e)
    } finally {
      setLoadingSaved(false)
    }
  }

  useEffect(() => {
    loadSaved()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return history
    return history.filter((h) =>
      h.title.toLowerCase().includes(q) ||
      h.userPrompt.toLowerCase().includes(q) ||
      h.systemPrompt.toLowerCase().includes(q)
    )
  }, [history, query])

  const Container = (bare ? 'div' : 'section') as any
  const containerClass = bare
    ? ''
    : 'rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 shadow'
  return (
    <Container className={containerClass}>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="text-sm font-medium text-left flex items-center gap-2"
          aria-expanded={!collapsed}
        >
          <span className="text-gray-500">{collapsed ? '▸' : '▾'}</span>
          <span>History</span>
        </button>
        <button
          onClick={() => clearHistory()}
          className="text-xs inline-flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-white/15 px-2.5 py-1.5 hover:bg-gray-100 dark:hover:bg-white/10"
        >Clear</button>
      </div>
      {!collapsed && (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search history"
            className="w-full mb-2 text-sm rounded-md bg-transparent border border-gray-300 dark:border-white/15 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {filtered.length === 0 ? (
            <div className="text-sm text-gray-600 dark:text-gray-300">No items yet.</div>
          ) : (
            <ul className="space-y-3">
              {filtered.map((h) => (
                <li key={h.id}>
                  <button
                    onClick={() => restoreFromHistory(h.id)}
                    className="w-full text-left rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 hover:bg-gray-50 dark:hover:bg-white/10 shadow-sm transition-all"
                  >
                    <div className="text-sm font-medium mb-2 line-clamp-2">{h.title || 'Untitled'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-2 gap-y-1">
                      <span>{new Date(h.createdAt).toLocaleString()}</span>
                      <span className="text-gray-400 dark:text-gray-500">·</span>
                      <span>{h.provider} · {h.model}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {/* Edge-to-edge divider using negative margin */}
      <div className="-mx-4 mt-6 pt-4 px-4 border-t border-gray-200 dark:border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium">Saved Snapshots</div>
          <button onClick={loadSaved} className="text-xs rounded-md border border-gray-300 dark:border-white/15 px-2.5 py-1.5 hover:bg-gray-100 dark:hover:bg-white/10">Refresh</button>
        </div>
        {loadingSaved ? (
          <div className="text-xs text-gray-500">Loading…</div>
        ) : saved.length === 0 ? (
          <div className="text-sm text-gray-600 dark:text-gray-300">No saved items yet.</div>
        ) : (
          <ul className="space-y-3">
            {saved.map((s) => (
              <li key={s.id}>
                <button
                  onClick={async () => {
                    try {
                      const full = await api.getSnapshot(s.id)
                      const st = usePromptStore.getState()
                      st.setProvider((full.provider || 'openai') as any)
                      if (full.model) st.setModel(full.model)
                      const d = full.data || {}
                      if (typeof d.system_prompt === 'string') st.setSystemPrompt(d.system_prompt)
                      if (typeof d.user_prompt === 'string') st.setUserPrompt(d.user_prompt)
                      if (typeof d.response === 'string') st.setResponse(d.response)
                      // parameters optional
                      if (d.parameters && typeof d.parameters === 'object') {
                        const p = d.parameters
                        if (typeof p.temperature === 'number') st.setTemperature(p.temperature)
                        if (typeof p.topP === 'number') st.setTopP(p.topP)
                        if (typeof p.maxTokens === 'number') st.setMaxTokens(p.maxTokens)
                      }
                    } catch (e) {
                      console.error('load snapshot failed', e)
                    }
                  }}
                  className="w-full text-left rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 hover:bg-gray-50 dark:hover:bg-white/10 shadow-sm transition-all"
                >
                  <div className="text-sm font-medium mb-2 line-clamp-2">{s.title || 'Untitled'}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-2 gap-y-1">
                    <span>{new Date(s.created_at).toLocaleString()}</span>
                    <span className="text-gray-400 dark:text-gray-500">·</span>
                    <span>{s.provider || '-'} · {s.model || '-'}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Container>
  )
}

