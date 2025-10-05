import { useEffect, useRef, useState } from 'react'
import { usePromptStore } from '../store/promptStore'
import { api } from '../services/api'
import { Wand2, Plus, Copy, Braces, PanelLeft } from 'lucide-react'
import { useToastStore } from '../store/toastStore'
import { estimateTokensApproximate } from '../utils/tokenEstimator'
import { useAutoGrow } from '../hooks/useAutoGrow'
import { useUIStore } from '../store/uiStore'

export function PromptEditor() {
  const systemPrompt = usePromptStore((s) => s.systemPrompt)
  const userPrompt = usePromptStore((s) => s.userPrompt)
  const setSystemPrompt = usePromptStore((s) => s.setSystemPrompt)
  const setUserPrompt = usePromptStore((s) => s.setUserPrompt)
  const provider = usePromptStore((s) => s.provider)
  const model = usePromptStore((s) => s.model)
  const setSystemOptInfo = usePromptStore((s) => s.setSystemOptInfo)
  const setUserOptInfo = usePromptStore((s) => s.setUserOptInfo)
  const reset = usePromptStore((s) => s.reset)
  const variables = usePromptStore((s) => s.variables)
  const addVariable = usePromptStore((s) => s.addVariable)
  const updateVariableName = usePromptStore((s) => s.updateVariableName)
  const updateVariableValue = usePromptStore((s) => s.updateVariableValue)
  const removeVariable = usePromptStore((s) => s.removeVariable)

  const estimatedTokens = estimateTokensApproximate(`${systemPrompt}\n${userPrompt}`)
  const [optimizing, setOptimizing] = useState<{ system?: boolean; user?: boolean }>({})
  const showToast = useToastStore((s) => s.show)

  const optimizeField = async (kind: 'system' | 'user') => {
    const target = kind === 'system' ? systemPrompt : userPrompt
    if (!target.trim()) return
    setOptimizing((s) => ({ ...s, [kind]: true }))
    try {
      const res = await api.optimizePrompt({
        model,
        provider,
        kind,
        prompt: target,
        system: systemPrompt || undefined,
      })
      const notes = Array.isArray(res.notes) ? res.notes : []
      const changes = Array.isArray(res.changes) ? res.changes : []
      if (kind === 'system') {
        setSystemPrompt(res.optimized)
        setSystemOptInfo({ time: Date.now(), notes, changes })
        showToast('System prompt optimized', 'success')
      } else {
        setUserPrompt(res.optimized)
        setUserOptInfo({ time: Date.now(), notes, changes })
        showToast('User prompt optimized', 'success')
      }
    } catch (e) {
      console.error('optimize failed', e)
      showToast('Optimization failed', 'error')
    } finally {
      setOptimizing((s) => ({ ...s, [kind]: false }))
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac')
      const isRun = (isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'enter'
      if (isRun) {
        e.preventDefault()
        const icon = document.querySelector('.lucide-play') as HTMLElement | null
        const btn = icon ? (icon.closest('button') as HTMLButtonElement | null) : null
        btn?.click() // trigger Run button if present
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const interpolate = (text: string) => {
    if (!text) return ''
    return text.replace(/\{\{\s*([a-zA-Z0-9_\-]+)\s*\}\}/g, (_, key) => {
      const found = variables.find(v => v.name.trim() === key)
      return found ? found.value : `{{${key}}}`
    })
  }

  const composedSystem = interpolate(systemPrompt)
  const composedUser = interpolate(userPrompt)
  const usedVars = Array.from(new Set((systemPrompt + ' ' + userPrompt).match(/\{\{\s*([a-zA-Z0-9_\-]+)\s*\}\}/g)?.map(s => s.replace(/\{|\}|\s/g, '')) || [])).map(name => ({
    name,
    value: variables.find(v => v.name.trim() === name)?.value ?? '',
  }))

  const leftOpen = useUIStore((s) => s.leftOpen)
  const toggleLeft = useUIStore((s) => s.toggleLeft)

  return (
    <section className="min-h-[calc(100vh-3.5rem)]">
      <div className="h-10 border-b border-gray-200 dark:border-white/10 flex items-center justify-between px-4 sticky top-0 bg-white dark:bg-gray-950 z-10">
        <div className="flex items-center gap-2">
          {!leftOpen && (
            <button
              onClick={toggleLeft}
              className="p-1 -ml-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors"
              aria-label="Open library"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )}
          <div className="font-medium">Prompt Editor</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-500 dark:text-gray-400">Estimated tokens: {estimatedTokens}</div>
          <button onClick={reset} className="text-xs rounded-md border border-gray-300 dark:border-white/15 px-2.5 py-1 hover:bg-gray-100 dark:hover:bg-white/10">Clear</button>
        </div>
      </div>
      <div className="px-4 py-3 overflow-hidden">
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm text-gray-600 dark:text-gray-300">System prompt (optional)</label>
        <button
          type="button"
          onClick={() => optimizeField('system')}
          disabled={!systemPrompt.trim() || optimizing.system}
          className="text-xs inline-flex items-center gap-1 rounded-md border border-gray-300 dark:border-white/15 px-2 py-1 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-white/10"
        >
          <Wand2 className="h-3.5 w-3.5" />
          {optimizing.system ? 'Optimizing…' : 'Optimize'}
        </button>
      </div>
      <AutoGrowTextarea
        value={systemPrompt}
        onChange={setSystemPrompt}
        minHeight={88}
        placeholder="You are a helpful assistant..."
      />
      {/* System optimization notes */}
      <SystemOptimizationNotes />
      <div className="flex items-center justify-between mt-4 mb-1">
        <label className="block text-sm text-gray-600 dark:text-gray-300">User prompt</label>
        <button
          type="button"
          onClick={() => optimizeField('user')}
          disabled={!userPrompt.trim() || optimizing.user}
          className="text-xs inline-flex items-center gap-1 rounded-md border border-gray-300 dark:border-white/15 px-2 py-1 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-white/10"
        >
          <Wand2 className="h-3.5 w-3.5" />
          {optimizing.user ? 'Optimizing…' : 'Optimize'}
        </button>
      </div>
      <AutoGrowTextarea
        value={userPrompt}
        onChange={setUserPrompt}
        minHeight={160}
        placeholder="Write a short summary about..."
      />
      <UserOptimizationNotes />

      {/* Variables editor */}
      <div className="mt-4">
        {/* Full-width divider line that reaches the column edge */}
        <div className="-mx-4 px-4">
          <div className="h-10 flex items-center justify-between border-b border-gray-200 dark:border-white/10 mb-2">
          <div className="flex items-center gap-2">
            <Braces className="h-4 w-4" />
            <div className="font-medium">Variables</div>
            <div className="text-xs text-gray-500">Use {'{{variable}}'} in prompts</div>
          </div>
          <button onClick={addVariable} className="text-xs inline-flex items-center gap-1 rounded-md border border-gray-300 dark:border-white/15 px-2 py-1 hover:bg-gray-100 dark:hover:bg-white/10">
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
          </div>
        </div>
        {variables.length === 0 ? (
          <div className="text-xs text-gray-500 px-1">No variables yet.</div>
        ) : (
          <div className="space-y-2">
            {variables.map((v, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center px-1">
                <input
                  value={v.name}
                  onChange={(e) => updateVariableName(i, e.target.value)}
                  placeholder="name"
                  className="col-span-5 text-sm rounded-md bg-transparent border border-gray-300 dark:border-white/15 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  value={v.value}
                  onChange={(e) => updateVariableValue(i, e.target.value)}
                  placeholder="value"
                  className="col-span-6 text-sm rounded-md bg-transparent border border-gray-300 dark:border-white/15 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => removeVariable(i)}
                  aria-label="Remove variable"
                  className="col-span-1 text-xs rounded-md border border-gray-300 dark:border-white/15 px-2 py-1 hover:bg-gray-100 dark:hover:bg-white/10"
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prompt Preview */}
      <div className="mt-4">
        {/* Full-width divider line that reaches the column edge */}
        <div className="-mx-4 px-4">
          <div className="h-10 flex items-center justify-between border-b border-gray-200 dark:border-white/10 mb-2">
          <div className="font-medium">Prompt Preview</div>
          <button
            onClick={async () => {
              const text = `System:\n${composedSystem || '(empty)'}\n\nUser:\n${composedUser || '(empty)'}\n`
              try { await navigator.clipboard.writeText(text) } catch {}
            }}
            aria-label="Copy composed prompt"
            title="Copy composed prompt"
            className="rounded-md p-2 border border-gray-300 dark:border-white/15 hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <Copy className="h-4 w-4" />
          </button>
          </div>
        </div>
        <div className="px-0 text-[13px] leading-snug whitespace-pre-wrap text-gray-800 dark:text-gray-100">
          {usedVars.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {usedVars.map(v => (
                <span key={v.name} className="text-[11px] px-2 py-0.5 rounded-full border border-gray-300 dark:border-white/15 bg-white/60 dark:bg-white/5">
                  {v.name}: {v.value || '(empty)'}
                </span>
              ))}
            </div>
          )}
          <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">System</div>
          <pre className="rounded-md border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 p-2 whitespace-pre-wrap break-words overflow-hidden"><code>{composedSystem || '(empty)'}</code></pre>
          <div className="h-2" />
          <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">User</div>
          <pre className="rounded-md border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 p-2 whitespace-pre-wrap break-words overflow-hidden"><code>{composedUser || '(empty)'}</code></pre>
        </div>
      </div>
      </div>
    </section>
  )
}

function AutoGrowTextarea({
  value,
  onChange,
  minHeight = 80,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  minHeight?: number
  placeholder?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null!)
  useAutoGrow(ref, value)
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full resize-none rounded-md bg-transparent border border-gray-300 dark:border-white/15 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 break-words overflow-hidden"
      style={{ minHeight }}
      wrap="soft"
    />
  )
}

function SystemOptimizationNotes() {
  const info = usePromptStore((s) => s.systemOptInfo)
  if (!info) return null
  return (
    <div className="mt-2 rounded-md border border-amber-300/40 dark:border-amber-300/20 bg-amber-50/60 dark:bg-amber-400/10 p-2">
      <div className="text-xs font-medium text-amber-900 dark:text-amber-200">System prompt optimized</div>
      {info.changes.length > 0 && (
        <ul className="list-disc pl-4 text-xs mt-1 space-y-0.5">
          {info.changes.slice(0, 5).map((c, i) => (<li key={i}>{c}</li>))}
        </ul>
      )}
      {info.notes.length > 0 && (
        <div className="text-[11px] text-amber-800/80 dark:text-amber-200/80 mt-1">{info.notes.join(' ')}</div>
      )}
    </div>
  )
}

function UserOptimizationNotes() {
  const info = usePromptStore((s) => s.userOptInfo)
  if (!info) return null
  return (
    <div className="mt-2 rounded-md border border-emerald-300/40 dark:border-emerald-300/20 bg-emerald-50/60 dark:bg-emerald-400/10 p-2">
      <div className="text-xs font-medium text-emerald-900 dark:text-emerald-200">User prompt optimized</div>
      {info.changes.length > 0 && (
        <ul className="list-disc pl-4 text-xs mt-1 space-y-0.5">
          {info.changes.slice(0, 5).map((c, i) => (<li key={i}>{c}</li>))}
        </ul>
      )}
      {info.notes.length > 0 && (
        <div className="text-[11px] text-emerald-800/80 dark:text-emerald-200/80 mt-1">{info.notes.join(' ')}</div>
      )}
    </div>
  )
}
