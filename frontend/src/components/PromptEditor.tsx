import { useEffect, useRef, useState } from 'react'
import { usePromptStore } from '../store/promptStore'
import { api } from '../services/api'
import { Wand2, Plus, Copy, Braces, PanelLeft, Undo2 } from 'lucide-react'
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
  const applySystemOptimization = usePromptStore((s) => s.applySystemOptimization)
  const applyUserOptimization = usePromptStore((s) => s.applyUserOptimization)
  const originalSystemPrompt = usePromptStore((s) => s.originalSystemPrompt)
  const originalUserPrompt = usePromptStore((s) => s.originalUserPrompt)
  const revertSystemPrompt = usePromptStore((s) => s.revertSystemPrompt)
  const revertUserPrompt = usePromptStore((s) => s.revertUserPrompt)
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
      const info = { time: Date.now(), notes, changes }
      
      if (kind === 'system') {
        applySystemOptimization(systemPrompt, res.optimized, info)
        showToast('System prompt optimized', 'success')
      } else {
        applyUserOptimization(userPrompt, res.optimized, info)
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
    <section className="section-block prompt-panel">
      <div className="surface-row sticky top-0" style={{ background: 'var(--bg-raised)', zIndex: 2 }}>
        <div className="button-row">
          {!leftOpen && (
            <button onClick={toggleLeft} className="icon-button" aria-label="Open library">
              <PanelLeft className="icon" />
            </button>
          )}
          <div className="section-title">Prompt Editor</div>
        </div>
        <div className="button-row">
          <div className="meta-text">Estimated tokens: {estimatedTokens}</div>
          <button onClick={reset} className="tonal-button text-xs">Clear</button>
        </div>
      </div>
      <div className="panel-body inset">
      <div className="surface-row">
        <label className="section-title text-sm">System prompt (optional)</label>
        <div className="button-row">
          {originalSystemPrompt && (
            <button
              type="button"
              onClick={revertSystemPrompt}
              className="tonal-button text-xs"
              title="Revert to original"
            >
              <Undo2 className="icon" />
              Revert
            </button>
          )}
          <button
            type="button"
            onClick={() => optimizeField('system')}
            disabled={!systemPrompt.trim() || optimizing.system}
            className="primary-button text-xs"
          >
            <Wand2 className="icon" />
            {optimizing.system ? 'Optimizing…' : 'Optimize'}
          </button>
        </div>
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
        <div className="flex items-center gap-2">
          {originalUserPrompt && (
            <button
              type="button"
              onClick={revertUserPrompt}
              className="text-xs inline-flex items-center gap-1 rounded-md border border-gray-300 dark:border-white/15 px-2 py-1 hover:bg-gray-100 dark:hover:bg-white/10"
              title="Revert to original"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Revert
            </button>
          )}
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
        <details className="details-tile" open={variables.length > 0}>
          <summary data-chevron>{
            <div className="surface-row" style={{ marginBottom: 0 }}>
              <div className="button-row">
                <Braces className="icon" />
                <div className="section-title">Variables</div>
                <div className="meta-text">Use {'{{variable}}'} in prompts</div>
              </div>
              <button onClick={(e) => { e.preventDefault(); addVariable() }} className="tonal-button text-xs">
                <Plus className="icon" />
                Add
              </button>
            </div>
          }</summary>
          <div className="space-y-2 mt-2">
            {variables.length === 0 ? (
              <div className="meta-text">No variables yet.</div>
            ) : (
              variables.map((v, i) => (
                <div key={i} className="variable-row">
                  <input
                    value={v.name}
                    onChange={(e) => updateVariableName(i, e.target.value)}
                    placeholder="name"
                    className="input-field"
                  />
                  <input
                    value={v.value}
                    onChange={(e) => updateVariableValue(i, e.target.value)}
                    placeholder="value"
                    className="input-field"
                  />
                  <button
                    onClick={() => removeVariable(i)}
                    aria-label="Remove variable"
                    className="icon-button"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </details>
      </div>

      {/* Prompt Preview */}
      <div className="mt-4">
        <details className="details-tile" open>
          <summary data-chevron>
            <div className="surface-row" style={{ marginBottom: 0 }}>
              <div className="section-title">Prompt Preview</div>
              <button
                onClick={async (e) => {
                  e.preventDefault()
                  const text = `System:\n${composedSystem || '(empty)'}\n\nUser:\n${composedUser || '(empty)'}\n`
                  try { await navigator.clipboard.writeText(text) } catch {}
                }}
                aria-label="Copy composed prompt"
                title="Copy composed prompt"
                className="icon-button"
              >
                <Copy className="icon" />
              </button>
            </div>
          </summary>
          <div className="text-sm leading-snug whitespace-pre-wrap text-gray-800 dark:text-gray-100 mt-2">
            {usedVars.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {usedVars.map(v => (
                  <span key={v.name} className="chip-quiet">
                    {v.name}: {v.value || '(empty)'}
                  </span>
                ))}
              </div>
            )}
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">System</div>
            <pre className="rounded-md border p-2 whitespace-pre-wrap break-words overflow-hidden"><code>{composedSystem || '(empty)'}</code></pre>
            <div style={{ height: 8 }} />
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">User</div>
            <pre className="rounded-md border p-2 whitespace-pre-wrap break-words overflow-hidden"><code>{composedUser || '(empty)'}</code></pre>
          </div>
        </details>
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
      className="input-field"
      style={{ minHeight }}
      wrap="soft"
    />
  )
}

function SystemOptimizationNotes() {
  const info = usePromptStore((s) => s.systemOptInfo)
  if (!info) return null
  return (
    <div className="alert warning mt-2">
      <div className="text-xs font-medium">System prompt optimized</div>
      {info.changes.length > 0 && (
        <ul className="list-disc pl-4 text-xs mt-1 space-y-0.5">
          {info.changes.slice(0, 5).map((c, i) => (<li key={i}>{c}</li>))}
        </ul>
      )}
      {info.notes.length > 0 && (
        <div className="text-xs mt-1">{info.notes.join(' ')}</div>
      )}
    </div>
  )
}

function UserOptimizationNotes() {
  const info = usePromptStore((s) => s.userOptInfo)
  if (!info) return null
  return (
    <div className="alert success mt-2">
      <div className="text-xs font-medium">User prompt optimized</div>
      {info.changes.length > 0 && (
        <ul className="list-disc pl-4 text-xs mt-1 space-y-0.5">
          {info.changes.slice(0, 5).map((c, i) => (<li key={i}>{c}</li>))}
        </ul>
      )}
      {info.notes.length > 0 && (
        <div className="text-xs mt-1">{info.notes.join(' ')}</div>
      )}
    </div>
  )
}
