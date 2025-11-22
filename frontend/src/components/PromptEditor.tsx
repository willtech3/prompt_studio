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
    <section className="panel">
      <div className="panel-header">
        <div className="panel-title">
          {!leftOpen && (
            <button onClick={toggleLeft} className="md-icon-button" aria-label="Open library">
              <PanelLeft className="icon-16" />
            </button>
          )}
          <span>Prompt editor</span>
        </div>
        <div className="meta-bar">
          <span>Estimated tokens: {estimatedTokens}</span>
          <button onClick={reset} className="md-button ghost">Clear</button>
        </div>
      </div>

      <div className="panel-body">
        <div className="card surface-muted">
          <div className="helper-row">
            <div>
              <div className="section-heading">System prompt</div>
              <div className="section-subtext">Optional guardrails and personality for the model.</div>
            </div>
            <div className="action-group">
              {originalSystemPrompt && (
                <button type="button" onClick={revertSystemPrompt} className="md-button ghost">
                  <Undo2 className="icon-16" />
                  Revert
                </button>
              )}
              <button
                type="button"
                onClick={() => optimizeField('system')}
                disabled={!systemPrompt.trim() || optimizing.system}
                className="md-button tonal"
              >
                <Wand2 className="icon-16" />
                {optimizing.system ? 'Optimizing…' : 'Optimize'}
              </button>
            </div>
          </div>
          <AutoGrowTextarea
            value={systemPrompt}
            onChange={setSystemPrompt}
            minHeight={100}
            placeholder="You are a helpful assistant..."
          />
          <SystemOptimizationNotes />
        </div>

        <div className="card surface-muted">
          <div className="helper-row">
            <div>
              <div className="section-heading">User prompt</div>
              <div className="section-subtext">What you want the model to do. Variables expand automatically.</div>
            </div>
            <div className="action-group">
              {originalUserPrompt && (
                <button type="button" onClick={revertUserPrompt} className="md-button ghost">
                  <Undo2 className="icon-16" />
                  Revert
                </button>
              )}
              <button
                type="button"
                onClick={() => optimizeField('user')}
                disabled={!userPrompt.trim() || optimizing.user}
                className="md-button primary"
              >
                <Wand2 className="icon-16" />
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
        </div>

        <details className="card" open={variables.length > 0}>
          <summary className="helper-row">
            <div className="panel-title" style={{ fontSize: '14px' }}>
              <Braces className="icon-16" />
              Variables
              <span className="tag">Use {'{{variable}}'} in prompts</span>
            </div>
            <button onClick={addVariable} className="md-button ghost" type="button">
              <Plus className="icon-16" />
              Add
            </button>
          </summary>
          <div className="card-content">
            {variables.length === 0 ? (
              <div className="subtle-text">No variables yet.</div>
            ) : (
              <div className="list-stack">
                {variables.map((v, i) => (
                  <div key={i} className="helper-row" style={{ gap: 10, alignItems: 'flex-start' }}>
                    <input
                      value={v.name}
                      onChange={(e) => updateVariableName(i, e.target.value)}
                      placeholder="name"
                      className="text-field"
                    />
                    <input
                      value={v.value}
                      onChange={(e) => updateVariableValue(i, e.target.value)}
                      placeholder="value"
                      className="text-field"
                    />
                    <button
                      onClick={() => removeVariable(i)}
                      aria-label="Remove variable"
                      className="md-icon-button"
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>

        <details className="card" open>
          <summary className="helper-row">
            <div className="panel-title" style={{ fontSize: '14px' }}>
              Prompt preview
            </div>
            <button
              onClick={async () => {
                const text = `System:\n${composedSystem || '(empty)'}\n\nUser:\n${composedUser || '(empty)'}\n`
                try { await navigator.clipboard.writeText(text) } catch {}
              }}
              aria-label="Copy composed prompt"
              title="Copy composed prompt"
              className="md-icon-button"
              type="button"
            >
              <Copy className="icon-16" />
            </button>
          </summary>
          <div className="card-content">
            {usedVars.length > 0 && (
              <div className="badge-row" style={{ marginBottom: 10 }}>
                {usedVars.map(v => (
                  <span key={v.name} className="tag">{v.name}: {v.value || '(empty)'}</span>
                ))}
              </div>
            )}
            <div className="section-subtext" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>System</div>
            <pre className="text-field" style={{ whiteSpace: 'pre-wrap', minHeight: 80 }}>{composedSystem || '(empty)'}</pre>
            <div className="section-subtext" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>User</div>
            <pre className="text-field" style={{ whiteSpace: 'pre-wrap', minHeight: 120 }}>{composedUser || '(empty)'}</pre>
          </div>
        </details>
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
      className="text-field"
      style={{ minHeight, resize: 'none' }}
      wrap="soft"
    />
  )
}

function SystemOptimizationNotes() {
  const info = usePromptStore((s) => s.systemOptInfo)
  if (!info) return null
  return (
    <div className="card" style={{ background: 'var(--accent-soft)', borderColor: 'color-mix(in srgb, var(--accent) 45%, var(--border-subtle))' }}>
      <div className="section-heading" style={{ fontSize: 13 }}>System prompt optimized</div>
      {info.changes.length > 0 && (
        <ul className="subtle-text" style={{ margin: '8px 0', paddingLeft: 18 }}>
          {info.changes.slice(0, 5).map((c, i) => (<li key={i}>{c}</li>))}
        </ul>
      )}
      {info.notes.length > 0 && (
        <div className="subtle-text">{info.notes.join(' ')}</div>
      )}
    </div>
  )
}

function UserOptimizationNotes() {
  const info = usePromptStore((s) => s.userOptInfo)
  if (!info) return null
  return (
    <div className="card" style={{ background: 'color-mix(in srgb, #3fb27f 12%, transparent)', borderColor: 'color-mix(in srgb, #3fb27f 45%, var(--border-subtle))' }}>
      <div className="section-heading" style={{ fontSize: 13 }}>User prompt optimized</div>
      {info.changes.length > 0 && (
        <ul className="subtle-text" style={{ margin: '8px 0', paddingLeft: 18 }}>
          {info.changes.slice(0, 5).map((c, i) => (<li key={i}>{c}</li>))}
        </ul>
      )}
      {info.notes.length > 0 && (
        <div className="subtle-text">{info.notes.join(' ')}</div>
      )}
    </div>
  )
}
