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
    <section className="surface-card prompt-editor">
      <div className="section-header">
        <div className="section-title">
          {!leftOpen && (
            <button
              onClick={toggleLeft}
              className="icon-button"
              aria-label="Open library"
            >
              <PanelLeft className="icon" />
            </button>
          )}
          <div className="title">Prompt editor</div>
        </div>
        <div className="meta-row">
          <div className="meta">Estimated tokens: {estimatedTokens}</div>
          <button onClick={reset} className="button text">Clear</button>
        </div>
      </div>
      <div className="section-body">
      <div className="section-subheader">
        <div className="label-group">
          <label className="label">System prompt (optional)</label>
          <span className="helper">Set the model role and boundaries.</span>
        </div>
        <div className="action-group">
          {originalSystemPrompt && (
            <button
              type="button"
              onClick={revertSystemPrompt}
              className="button text"
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
            className="button tonal"
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
      <div className="section-subheader">
        <div className="label-group">
          <label className="label">User prompt</label>
          <span className="helper">Give the model the exact task.</span>
        </div>
        <div className="action-group">
          {originalUserPrompt && (
            <button
              type="button"
              onClick={revertUserPrompt}
              className="button text"
              title="Revert to original"
            >
              <Undo2 className="icon" />
              Revert
            </button>
          )}
          <button
            type="button"
            onClick={() => optimizeField('user')}
            disabled={!userPrompt.trim() || optimizing.user}
            className="button tonal"
          >
            <Wand2 className="icon" />
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
        <div className="section-divider">
          <div className="section-subheader">
          <div className="label-group">
            <div className="label with-icon">
              <Braces className="icon" />
              Variables
            </div>
            <div className="helper">Use {'{{variable}}'} in prompts</div>
          </div>
          <button onClick={addVariable} className="button tonal">
            <Plus className="icon" />
            Add
          </button>
          </div>
        </div>
        {variables.length === 0 ? (
          <div className="empty-state">No variables yet.</div>
        ) : (
          <div className="variable-grid">
            {variables.map((v, i) => (
              <div key={i} className="variable-row">
                <input
                  value={v.name}
                  onChange={(e) => updateVariableName(i, e.target.value)}
                  placeholder="name"
                  className="text-input"
                />
                <input
                  value={v.value}
                  onChange={(e) => updateVariableValue(i, e.target.value)}
                  placeholder="value"
                  className="text-input"
                />
                <button
                  onClick={() => removeVariable(i)}
                  aria-label="Remove variable"
                  className="icon-button subtle"
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prompt Preview */}
      <div className="mt-4">
        <div className="section-divider">
          <div className="section-subheader">
          <div className="label">Prompt preview</div>
          <button
            onClick={async () => {
              const text = `System:\n${composedSystem || '(empty)'}\n\nUser:\n${composedUser || '(empty)'}\n`
              try { await navigator.clipboard.writeText(text) } catch {}
            }}
            aria-label="Copy composed prompt"
            title="Copy composed prompt"
            className="icon-button subtle"
          >
            <Copy className="icon" />
          </button>
          </div>
        </div>
        <div className="preview-block">
          {usedVars.length > 0 && (
            <div className="chip-row">
              {usedVars.map(v => (
                <span key={v.name} className="chip">
                  {v.name}: {v.value || '(empty)'}
                </span>
              ))}
            </div>
          )}
          <div className="preview-section">
            <div className="preview-label">System</div>
            <pre className="preview-text"><code>{composedSystem || '(empty)'}</code></pre>
          </div>
          <div className="preview-section">
            <div className="preview-label">User</div>
            <pre className="preview-text"><code>{composedUser || '(empty)'}</code></pre>
          </div>
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
      className="textarea"
      style={{ minHeight }}
      wrap="soft"
    />
  )
}

function SystemOptimizationNotes() {
  const info = usePromptStore((s) => s.systemOptInfo)
  if (!info) return null
  return (
    <div className="callout warning">
      <div className="callout-title">System prompt optimized</div>
      {info.changes.length > 0 && (
        <ul className="callout-list">
          {info.changes.slice(0, 5).map((c, i) => (<li key={i}>{c}</li>))}
        </ul>
      )}
      {info.notes.length > 0 && (
        <div className="callout-notes">{info.notes.join(' ')}</div>
      )}
    </div>
  )
}

function UserOptimizationNotes() {
  const info = usePromptStore((s) => s.userOptInfo)
  if (!info) return null
  return (
    <div className="callout success">
      <div className="callout-title">User prompt optimized</div>
      {info.changes.length > 0 && (
        <ul className="callout-list">
          {info.changes.slice(0, 5).map((c, i) => (<li key={i}>{c}</li>))}
        </ul>
      )}
      {info.notes.length > 0 && (
        <div className="callout-notes">{info.notes.join(' ')}</div>
      )}
    </div>
  )
}
