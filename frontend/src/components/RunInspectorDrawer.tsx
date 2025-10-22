import { useEffect, useMemo, useState } from 'react'
import { X, Clock, FileText, Globe, TerminalSquare, ListTree } from 'lucide-react'
import type { RunTrace, ToolExecutionTrace } from '../types/models'

interface Props {
  open: boolean
  onClose: () => void
  run?: RunTrace | null
  focusToolId?: string
  onFocusTool?: (toolId?: string) => void
}

export function RunInspectorDrawer({ open, onClose, run, focusToolId, onFocusTool }: Props) {
  const focusTool = useMemo(() => run?.tools.find(t => t.id === focusToolId), [run, focusToolId])
  const host = (url?: string) => {
    if (!url) return ''
    try { return new URL(url).hostname } catch { return '' }
  }
  // Auto-focus first tool when opening if none selected
  useEffect(() => {
    if (open && !focusToolId && run?.tools?.length) {
      onFocusTool?.(run.tools[0].id)
    }
  }, [open, focusToolId, run?.tools?.length])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-[820px] max-w-[96vw] bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-white/10 shadow-xl flex flex-col">
        <div className="h-12 flex items-center justify-between px-4 border-b border-gray-200 dark:border-white/10">
          <div className="font-medium">Run details</div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded hover:bg-gray-100 dark:hover:bg-white/10"><X className="h-4 w-4"/></button>
        </div>
        <div className="p-4 overflow-y-auto">
          {/* Summary */}
          <div className="mb-3 text-xs text-gray-600 dark:text-gray-300 flex items-center gap-2"><Clock className="h-3 w-3"/> Started {run?.startedAt} • Model <span className="font-medium text-gray-800 dark:text-gray-100">{run?.model}</span></div>

          {/* Two-column layout: Timeline + Inspector */}
          <div className="grid grid-cols-12 gap-4">
            <section className="col-span-6">
              <div className="flex items-center gap-2 mb-2"><ListTree className="h-4 w-4"/><div className="font-medium">Timeline</div></div>
              <div className="space-y-2">
                {run?.tools.map((t) => (
                  <button key={t.id} onClick={() => onFocusTool?.(t.id)} className={`w-full text-left border rounded-md px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-900 border-gray-200 dark:border-white/10 ${focusTool?.id===t.id?'ring-2 ring-blue-500':''}`}>
                    <div className="text-sm font-medium">{t.displayName || t.name}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{t.status} · {t.durationMs ? `${t.durationMs}ms` : '—'} {t.outputSummary ? `· ${t.outputSummary}` : ''}</div>
                  </button>
                ))}
                {!run?.tools?.length && <div className="text-sm text-gray-500">No tools used.</div>}
              </div>
            </section>

            <section className="col-span-6">
              <div className="flex items-center gap-2 mb-2"><TerminalSquare className="h-4 w-4"/><div className="font-medium">Inspector</div></div>
              {focusTool ? (
              <div className="border rounded-md border-gray-200 dark:border-white/10 sticky top-12">
                <div className="px-3 py-2 border-b border-gray-200 dark:border-white/10">
                  <div className="text-sm font-medium">{focusTool.displayName || focusTool.name}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{focusTool.status} · {focusTool.durationMs ? `${focusTool.durationMs}ms` : '—'}</div>
                </div>
                <div className="p-3 space-y-3">
                  {focusTool.links?.length ? (
                    <div>
                      <div className="text-xs font-medium mb-1">Result</div>
                      <div className="space-y-2">
                        {focusTool.links.map((l, i) => (
                          <a key={i} href={l.url} target="_blank" rel="noreferrer" className="block p-2 rounded border hover:bg-gray-50 dark:hover:bg-gray-900 border-gray-200 dark:border-white/10">
                            <div className="text-sm font-medium">{l.title || l.url}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">{l.source || host(l.url)}</div>
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {!!focusTool.parameters && (
                    <details onToggle={(e) => { /* lazy render via details open state */ }}>
                      <summary className="text-xs font-medium cursor-pointer">Params</summary>
                      <pre className="mt-1 text-xs p-2 rounded bg-gray-50 dark:bg-gray-900 overflow-auto">{JSON.stringify(focusTool.parameters, null, 2)}</pre>
                    </details>
                  )}
                  {!!focusTool.outputRaw && (
                    <details>
                      <summary className="text-xs font-medium cursor-pointer">Raw</summary>
                      <pre className="mt-1 text-xs p-2 rounded bg-gray-50 dark:bg-gray-900 overflow-auto">{JSON.stringify(focusTool.outputRaw, null, 2)}</pre>
                    </details>
                  )}
                  {focusTool.error && (
                    <div className="text-xs text-red-600">{focusTool.error.message}</div>
                  )}
                </div>
              </div>
              ) : (
                <div className="text-sm text-gray-500">Select a step to view details.</div>
              )}
            </section>
          </div>

          {/* Sources */}
          <section className="mt-6">
            <div className="flex items-center gap-2 mb-2"><Globe className="h-4 w-4"/><div className="font-medium">Sources</div></div>
            <div className="space-y-2">
              {run?.tools.flatMap(t => t.links || []).map((link, idx) => (
                <a key={idx} href={link.url} target="_blank" rel="noreferrer" className="block p-2 rounded border hover:bg-gray-50 dark:hover:bg-gray-900 border-gray-200 dark:border-white/10">
                  <div className="text-sm font-medium">{link.title || link.url}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{link.source || host(link.url)}</div>
                </a>
              ))}
              {!run?.tools?.some(t => t.links?.length) && (
                <div className="text-sm text-gray-500">No sources.</div>
              )}
            </div>
          </section>
        </div>
      </aside>
    </div>
  )
}

export default RunInspectorDrawer


