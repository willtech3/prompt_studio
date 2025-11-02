import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import React, { useRef, useState } from 'react'
import { Copy, Save as SaveIcon, Settings2, Sparkles, Square } from 'lucide-react'
import { usePromptStore } from '../store/promptStore'
import { api } from '../services/api'
import { useToastStore } from '../store/toastStore'
import { useUIStore } from '../store/uiStore'
import { RunTrace, ToolExecutionTrace } from '../types/models'
import ToolChips from './ToolChips'
import RunInspectorDrawer from './RunInspectorDrawer'
import ResponseFootnotes from './ResponseFootnotes'
import SearchResultsInline from './SearchResultsInline'
import ReasoningBlock from './ReasoningBlock'
import 'highlight.js/styles/github-dark.css' // Dark theme only

export function ResponsePanel() {
  const response = usePromptStore((s) => s.response)
  const isStreaming = usePromptStore((s) => s.isStreaming)
  const setIsStreaming = usePromptStore((s) => s.setIsStreaming)
  const setResponse = usePromptStore((s) => s.setResponse)
  const appendResponse = usePromptStore((s) => s.appendResponse)
  const addHistoryEntry = usePromptStore((s) => s.addHistoryEntry)
  const systemPrompt = usePromptStore((s) => s.systemPrompt)
  const userPrompt = usePromptStore((s) => s.userPrompt)
  const variables = usePromptStore((s) => s.variables)
  const parameters = usePromptStore((s) => s.parameters)
  const reasoningEffort = usePromptStore((s) => s.reasoningEffort)
  const toolSchemas = usePromptStore((s) => s.toolSchemas)
  const model = usePromptStore((s) => s.model)
  const settingsOpen = useUIStore((s) => s.settingsOpen)
  const toggleSettings = useUIStore((s) => s.toggleSettings)
  const resetTick = usePromptStore((s) => s.resetTick)
  
  const currentStream = useRef<EventSource | null>(null)
  const [runTrace, setRunTrace] = useState<RunTrace | null>(null)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [focusToolId, setFocusToolId] = useState<string | undefined>()
  const [warning, setWarning] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState<boolean>(true)
  const [reasoningPhase, setReasoningPhase] = useState<number>(0)
  const nextReasoningPhaseRef = useRef<number>(0)
  const pendingOpenSearchRef = useRef<boolean>(false)
  const reasoningSilenceTimerRef = useRef<number | null>(null)
  const [reasoningOpenMap, setReasoningOpenMap] = useState<Record<number, boolean>>({})
  const [reasoningTexts, setReasoningTexts] = useState<Record<number, string>>({})

  const nowIso = () => new Date().toISOString()
  const parseArgs = (args: string): Record<string, unknown> | null => {
    try { return JSON.parse(args) } catch { return { _raw: args } as any }
  }
  const extractLinks = (result: any) => {
    try {
      const out: Array<{ title: string; url: string; source?: string; snippet?: string }> = []
      // Common shape: { success, result: { results: [{ title, url, source, snippet }] } }
      const items = result?.result?.results || result?.results || []
      if (Array.isArray(items)) {
        for (const it of items) {
          if (it && typeof it.url === 'string') {
            out.push({ title: it.title || it.url, url: it.url, source: it.source, snippet: it.snippet })
          }
        }
      }
      if (out.length) return out
      // Fallback: a direct url field
      if (typeof result?.url === 'string') return [{ title: result.title || result.url, url: result.url }]
      return []
    } catch { return [] }
  }

  // Clear tool traces when user presses Clear
  // resetTick increments in store.reset()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { setRunTrace(null); setInspectorOpen(false); setFocusToolId(undefined) }, [resetTick])

  const onGenerate = () => {
    if (isStreaming) return
    setResponse('')
    setWarning(null)
    setSearchOpen(true)
    setReasoningPhase(0)
    nextReasoningPhaseRef.current = 0
    pendingOpenSearchRef.current = false
    if (reasoningSilenceTimerRef.current) window.clearTimeout(reasoningSilenceTimerRef.current)
    reasoningSilenceTimerRef.current = null
    setReasoningOpenMap({})
    setReasoningTexts({})
    
    // Seed a placeholder reasoning block if reasoning is requested
    if (reasoningEffort && reasoningEffort.toLowerCase() !== 'auto') {
      setReasoningOpenMap({ 0: true })
      setReasoningTexts({ 0: '' })
    }
    
    setRunTrace({
      runId: `run-${Date.now()}`,
      model,
      startedAt: nowIso(),
      tools: [],
      reasoning: [],
    })
    addHistoryEntry()
    setIsStreaming(true)

    const interpolate = (text?: string | null) => {
      if (!text) return ''
      return text.replace(/\{\{\s*([a-zA-Z0-9_\-]+)\s*\}\}/g, (_m, key) => {
        const found = variables.find((v) => v.name.trim() === key)
        return found ? found.value : _m
      })
    }
    const sys = interpolate(systemPrompt)
    const usr = interpolate(userPrompt)
    const es = api.streamChat({
      model,
      prompt: usr,
      system: sys || undefined,
      temperature: parameters.temperature,
      topP: parameters.topP,
      maxTokens: parameters.maxTokens,
      topK: parameters.topK,
      frequencyPenalty: parameters.frequencyPenalty,
      presencePenalty: parameters.presencePenalty,
      repetitionPenalty: parameters.repetitionPenalty,
      minP: parameters.minP,
      topA: parameters.topA,
      seed: parameters.seed,
      logitBiasJson: parameters.logitBiasJson,
      logprobs: parameters.logprobs,
      topLogprobs: parameters.topLogprobs,
      responseFormat: parameters.responseFormat,
      stop: parameters.stop,
      reasoningEffort: reasoningEffort,
      tools: toolSchemas || null,
      toolChoice: toolSchemas ? 'auto' : null,
    })
    currentStream.current = es
    es.addEventListener('message', (e) => {
      try {
        const parsed = JSON.parse(e.data)
        
        // Handle different message types
        if (parsed.type === 'reasoning') {
          const chunk = typeof parsed.content === 'string' ? parsed.content : ''
          if (chunk) {
            const phase = nextReasoningPhaseRef.current
            if (phase !== reasoningPhase) setReasoningPhase(phase)
            setReasoningTexts((prev) => ({ ...prev, [phase]: (prev[phase] || '') + chunk }))
            // Open the reasoning panel for this phase on first token arrival
            setReasoningOpenMap((prev) => (prev[phase] ? prev : { ...prev, [phase]: true }))
            // If a search is pending, only open it after a brief silence in reasoning
            if (pendingOpenSearchRef.current) {
              if (reasoningSilenceTimerRef.current) window.clearTimeout(reasoningSilenceTimerRef.current)
              reasoningSilenceTimerRef.current = window.setTimeout(() => {
                setReasoningOpenMap((prev) => ({ ...prev, [phase]: false }))
                setSearchOpen(true)
                pendingOpenSearchRef.current = false
              }, 350)
            }
          }
        }
        else if (parsed.type === 'tool_calls') {
          // Model wants to call tools
          const executions: ToolExecutionTrace[] = (parsed.calls || []).map((call: any) => ({
            id: call.id || `${call.name}-${Date.now()}`,
            name: call.name,
            displayName: call.name?.replace(/_/g, ' '),
            status: 'queued' as const,
            parameters: typeof call.arguments === 'string' ? parseArgs(call.arguments) : call.arguments,
            error: null,
          }))
          setRunTrace((prev) => prev ? { ...prev, tools: [...prev.tools, ...executions] } : prev)
        }
        else if (parsed.type === 'tool_executing') {
          // Tool is being executed — queue search panel until reasoning finishes (brief silence)
          if ((parsed.category === 'search') || (typeof parsed.name === 'string' && parsed.name.toLowerCase().includes('search'))) {
            pendingOpenSearchRef.current = true
          }
          setRunTrace((prev) => {
            if (!prev) return prev
            const tools = prev.tools.map((t) => {
              // Match by ID first (if available), fallback to name for backward compatibility
              const matchesId = parsed.id && t.id === parsed.id
              const matchesName = !parsed.id && t.name === parsed.name && (t.status === 'queued' || t.status === 'running')
              if (matchesId || matchesName) {
                return { 
                  ...t, 
                  status: 'running' as const, 
                  startedAt: t.startedAt || nowIso(),
                  category: parsed.category || t.category,
                  visibility: parsed.visibility || t.visibility,
                }
              }
              return t
            })
            return { ...prev, tools }
          })
        }
        else if (parsed.type === 'tool_result') {
          const succeeded = parsed.result?.success !== false
          setRunTrace((prev) => {
            if (!prev) return prev
            const tools = prev.tools.map((t) => {
              // Match by ID first (if available), fallback to name for backward compatibility
              const matchesId = parsed.id && t.id === parsed.id
              const matchesName = !parsed.id && t.name === parsed.name && (t.status === 'running' || t.status === 'queued')
              if (matchesId || matchesName) {
                const endedAt = nowIso()
                const durationMs = t.startedAt ? (new Date(endedAt).getTime() - new Date(t.startedAt).getTime()) : undefined
                const newStatus: ToolExecutionTrace['status'] = succeeded ? 'completed' : 'failed'
                return {
                  ...t,
                  status: newStatus,
                  endedAt,
                  durationMs,
                  outputRaw: parsed.result,
                  links: extractLinks(parsed.result),
                  outputSummary: Array.isArray(parsed.result?.result?.results) ? `${parsed.result.result.results.length} results` : undefined,
                  error: succeeded ? null : { message: parsed.result?.error || 'Tool failed' },
                  category: parsed.category || t.category,
                  visibility: parsed.visibility || t.visibility,
                }
              }
              return t
            })
            return { ...prev, tools }
          })
          // Search finished: prepare for next reasoning phase (keep search panel open)
          if ((parsed.category === 'search') || (typeof parsed.name === 'string' && parsed.name.toLowerCase().includes('search'))) {
            const nextPhase = Math.max(0, ...Object.keys(reasoningTexts).map(Number)) + 1
            nextReasoningPhaseRef.current = nextPhase
            // Seed a placeholder for the next reasoning phase if reasoning is enabled
            if (reasoningEffort && reasoningEffort.toLowerCase() !== 'auto') {
              setReasoningPhase(nextPhase)
              setReasoningOpenMap((prev) => ({ ...prev, [nextPhase]: true }))
              setReasoningTexts((prev) => ({ ...prev, [nextPhase]: '' }))
            }
          }
        }
        else if (parsed.type === 'content') {
          // Regular content
          appendResponse(parsed.content)
          // Content implies reasoning has ended for current phase
          setReasoningOpenMap((prev) => ({ ...prev, [reasoningPhase]: false }))
          // Auto-collapse search panel when main response starts
          setSearchOpen(false)
          pendingOpenSearchRef.current = false
          if (reasoningSilenceTimerRef.current) window.clearTimeout(reasoningSilenceTimerRef.current)
          reasoningSilenceTimerRef.current = null
        }
        else if (parsed.type === 'done' || parsed.done) {
          // Stream complete
          setIsStreaming(false)
          setRunTrace((prev) => prev ? { ...prev, endedAt: nowIso() } : prev)
          // Collapse any open reasoning blocks on completion (keep visible)
          setReasoningOpenMap((prev) => Object.fromEntries(Object.keys(prev).map((k) => [Number(k), false])) as Record<number, boolean>)
          pendingOpenSearchRef.current = false
          if (reasoningSilenceTimerRef.current) window.clearTimeout(reasoningSilenceTimerRef.current)
          reasoningSilenceTimerRef.current = null
          if (currentStream.current) {
            api.stopStream(currentStream.current)
            currentStream.current = null
          }
        }
        else if (parsed.type === 'warning') {
          setWarning(parsed.message || 'Warning')
        }
        else if (parsed.type === 'error') {
          // Error occurred
          appendResponse(`\n\n**Error:** ${parsed.error}`)
          setIsStreaming(false)
          if (currentStream.current) {
            api.stopStream(currentStream.current)
            currentStream.current = null
          }
        }
        else if (parsed.content) {
          // Legacy format (backward compatibility)
          appendResponse(parsed.content)
        }
      } catch (err) {
        console.error('stream message parse failed', err)
      }
    })
    es.addEventListener('error', () => {
      setIsStreaming(false)
      if (currentStream.current) {
        api.stopStream(currentStream.current)
        currentStream.current = null
      }
    })
  }

  const onStop = () => {
    if (currentStream.current) {
      api.stopStream(currentStream.current)
      currentStream.current = null
    }
    setIsStreaming(false)
  }

  const onCopy = async () => {
    if (!response) return
    try {
      await navigator.clipboard.writeText(response)
    } catch {
      // ignore for MVP
    }
  }

  return (
    <section className="min-h-[calc(100vh-3.5rem)]">
      <div className="h-10 border-b border-gray-200 dark:border-white/10 flex items-center justify-between px-4 sticky top-0 bg-white dark:bg-gray-950 z-10">
        <div className="flex items-center gap-2">
          <div className="font-medium">Response</div>
          {isStreaming ? (
            <button 
              onClick={onStop} 
              className="text-xs inline-flex items-center gap-1 rounded-md bg-gray-700 hover:bg-gray-800 text-white px-2.5 py-1.5 font-medium shadow-sm"
            >
              <Square className="h-3 w-3" />
              Stop
            </button>
          ) : (
            <button 
              onClick={onGenerate} 
              className="text-xs inline-flex items-center gap-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 font-medium shadow-sm transition-colors"
            >
              <Sparkles className="h-3 w-3" />
              Generate
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isStreaming && <div className="text-xs text-blue-600 animate-pulse">Generating…</div>}
          <SaveButton />
          <button
            onClick={onCopy}
            disabled={!response}
            aria-label="Copy response"
            title="Copy"
            className="rounded-md p-2 border border-gray-300 dark:border-white/15 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <Copy className="h-4 w-4" />
          </button>
          {!settingsOpen && (
            <button
              onClick={toggleSettings}
              className="p-2 rounded-md border border-gray-300 dark:border-white/15 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors"
              aria-label="Open settings"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div className="px-4 py-3 overflow-hidden">
        {/* Warning banner */}
        {warning && (
          <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 text-amber-900 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200 px-3 py-2 text-xs">
            {warning}
          </div>
        )}
        {/* Tool Chips summary */}
        {runTrace?.tools?.length ? (
          <div className="mb-3 flex justify-end">
            <ToolChips run={runTrace} onOpen={(id) => { setInspectorOpen(true); setFocusToolId(id) }} />
          </div>
        ) : null}

        {/* Reasoning panels (phase 0) shown before Search; later phases after Search */}
        {(() => {
          const keys = Object.keys(reasoningTexts).map(Number).sort((a,b)=>a-b)
          const pre = keys.filter((k) => k === 0)
          const post = keys.filter((k) => k > 0)
          return (
            <>
              {/* Pre-tool reasoning (phase 0) */}
              {pre.map((phase) => {
                const txt = reasoningTexts[phase]
                const open = !!reasoningOpenMap[phase]
                const isActive = isStreaming && reasoningEffort && phase === reasoningPhase
                return (
                  <ReasoningBlock
                    key={`reasoning-pre-${phase}`}
                    content={txt}
                    isStreaming={Boolean(isActive)}
                    open={open}
                    onToggle={() => setReasoningOpenMap((m) => ({ ...m, [phase]: !m[phase] }))}
                  />
                )
              })}

              {/* Search results preview (T3-style) */}
              <SearchResultsInline
                run={runTrace}
                open={searchOpen}
                onOpenChange={setSearchOpen}
                isRunning={Boolean(runTrace?.tools?.some(t => (t.status === 'running') && ((t.category === 'search') || t.name.toLowerCase().includes('search'))))}
              />

              {/* Post-tool reasoning (phase > 0) */}
              {post.map((phase) => {
                const txt = reasoningTexts[phase]
                const open = !!reasoningOpenMap[phase]
                const isActive = isStreaming && reasoningEffort && phase === reasoningPhase
                return (
                  <ReasoningBlock
                    key={`reasoning-post-${phase}`}
                    content={txt}
                    isStreaming={Boolean(isActive)}
                    open={open}
                    onToggle={() => setReasoningOpenMap((m) => ({ ...m, [phase]: !m[phase] }))}
                  />
                )
              })}

            </>
          )
        })()}

        {/* Response Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none break-words" aria-live="polite">
          {response ? (
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {response}
            </ReactMarkdown>
          ) : (
            <p className="text-gray-500">No response yet. Press Generate to create.</p>
          )}
        </div>
        <ResponseFootnotes run={runTrace} />
      </div>
      <RunInspectorDrawer open={inspectorOpen} onClose={() => setInspectorOpen(false)} run={runTrace} focusToolId={focusToolId} onFocusTool={(id) => setFocusToolId(id)} />
    </section>
  )
}

function SaveButton() {
  const response = usePromptStore((s) => s.response)
  const provider = usePromptStore((s) => s.provider)
  const model = usePromptStore((s) => s.model)
  const systemPrompt = usePromptStore((s) => s.systemPrompt)
  const userPrompt = usePromptStore((s) => s.userPrompt)
  const parameters = usePromptStore((s) => s.parameters)
  const reasoningEffort = usePromptStore((s) => s.reasoningEffort)
  const variables = usePromptStore((s) => s.variables)
  const showToast = useToastStore((s) => s.show)
  const [saving, setSaving] = useState(false)
  // inline minimal save without coupling to Header state
  const onSave = async () => {
    try {
      setSaving(true)
      const titleBase = userPrompt.trim() || systemPrompt.trim() || 'Untitled'
      const title = titleBase.length > 80 ? titleBase.slice(0, 77) + '…' : titleBase
      const payload: any = {
        title,
        kind: 'state',
        provider,
        model,
        data: {
          system_prompt: systemPrompt,
          user_prompt: userPrompt,
          response,
          parameters,
          reasoning_effort: reasoningEffort,
          variables,
        },
      }
      await api.saveSnapshot(payload)
      showToast('Saved snapshot', 'success')
    } catch (e) {
      showToast('Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }
  return (
    <button
      onClick={onSave}
      disabled={!response || saving}
      aria-label="Save snapshot"
      title={saving ? 'Saving…' : 'Save'}
      className="rounded-md p-2 border border-gray-300 dark:border-white/15 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-white/10"
    >
      <SaveIcon className="h-4 w-4" />
    </button>
  )
}
