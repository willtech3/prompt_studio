import { useState, useRef, useCallback, useEffect } from 'react'
import { usePromptStore } from '../store/promptStore'
import { api } from '../services/api'
import { RunTrace, ToolExecutionTrace, SearchExecution } from '../types/models'
import { interpolate } from '../utils/interpolate'

export function useChatStream() {
  const systemPrompt = usePromptStore((s) => s.systemPrompt)
  const userPrompt = usePromptStore((s) => s.userPrompt)
  const variables = usePromptStore((s) => s.variables)
  const parameters = usePromptStore((s) => s.parameters)
  const reasoningEffort = usePromptStore((s) => s.reasoningEffort)
  const model = usePromptStore((s) => s.model)
  const isStreaming = usePromptStore((s) => s.isStreaming)
  const setIsStreaming = usePromptStore((s) => s.setIsStreaming)
  const setResponse = usePromptStore((s) => s.setResponse)
  const appendResponse = usePromptStore((s) => s.appendResponse)
  const addHistoryEntry = usePromptStore((s) => s.addHistoryEntry)
  const resetTick = usePromptStore((s) => s.resetTick)

  const currentStream = useRef<EventSource | null>(null)
  const [runTrace, setRunTrace] = useState<RunTrace | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [searchExecutions, setSearchExecutions] = useState<SearchExecution[]>([])
  
  // Reasoning state
  const [reasoningPhase, setReasoningPhase] = useState<number>(0)
  const [reasoningOpenMap, setReasoningOpenMap] = useState<Record<number, boolean>>({})
  const [reasoningTexts, setReasoningTexts] = useState<Record<number, string>>({})
  
  // Refs for event handlers
  const reasoningPhaseRef = useRef<number>(0)
  const pendingOpenSearchRef = useRef<boolean>(false)
  const reasoningSilenceTimerRef = useRef<number | null>(null)

  // Reset local state when resetTick changes
  useEffect(() => {
    setRunTrace(null)
    setReasoningPhase(0)
    setReasoningTexts({})
    setReasoningOpenMap({})
    setSearchExecutions([])
    setWarning(null)
  }, [resetTick])

  const nowIso = () => new Date().toISOString()
  
  const parseArgs = (args: string): Record<string, unknown> | null => {
    try { return JSON.parse(args) } catch { return { _raw: args } as any }
  }

  const extractLinks = (result: any) => {
    try {
      const out: Array<{ title: string; url: string; source?: string; snippet?: string }> = []
      const items = result?.result?.results || result?.results || []
      if (Array.isArray(items)) {
        for (const it of items) {
          if (it && typeof it.url === 'string') {
            out.push({ title: it.title || it.url, url: it.url, source: it.source, snippet: it.snippet })
          }
        }
      }
      if (out.length) return out
      if (typeof result?.url === 'string') return [{ title: result.title || result.url, url: result.url }]
      return []
    } catch { return [] }
  }

  const stop = useCallback(() => {
    if (currentStream.current) {
      api.stopStream(currentStream.current)
      currentStream.current = null
    }
    setIsStreaming(false)
    if (reasoningSilenceTimerRef.current) {
      window.clearTimeout(reasoningSilenceTimerRef.current)
      reasoningSilenceTimerRef.current = null
    }
  }, [setIsStreaming])

  const generate = useCallback(() => {
    if (isStreaming) return
    
    setResponse('')
    setWarning(null)
    setSearchExecutions([])
    setReasoningPhase(0)
    reasoningPhaseRef.current = 0
    pendingOpenSearchRef.current = false
    if (reasoningSilenceTimerRef.current) window.clearTimeout(reasoningSilenceTimerRef.current)
    reasoningSilenceTimerRef.current = null
    
    // Initialize phase 0 reasoning block
    setReasoningOpenMap({ 0: true })
    setReasoningTexts({})
    
    setRunTrace({
      runId: `run-${Date.now()}`,
      model,
      startedAt: nowIso(),
      tools: [],
      reasoning: [],
    })
    
    addHistoryEntry()
    setIsStreaming(true)

    const sys = interpolate(systemPrompt, variables)
    const usr = interpolate(userPrompt, variables)

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
      responseFormat: parameters.responseFormat,
      stop: parameters.stop,
      reasoningEffort: reasoningEffort,
    })

    currentStream.current = es

    es.addEventListener('message', (e) => {
      try {
        const parsed = JSON.parse(e.data)
        
        if (parsed.type === 'reasoning') {
          const chunk = typeof parsed.content === 'string' ? parsed.content : ''
          if (chunk) {
            const phase = reasoningPhaseRef.current
            setReasoningTexts((prev) => ({ ...prev, [phase]: (prev[phase] || '') + chunk }))
            setReasoningOpenMap((prev) => (prev[phase] ? prev : { ...prev, [phase]: true }))
            
            if (pendingOpenSearchRef.current) {
              if (reasoningSilenceTimerRef.current) window.clearTimeout(reasoningSilenceTimerRef.current)
              reasoningSilenceTimerRef.current = window.setTimeout(() => {
                setReasoningOpenMap((prev) => ({ ...prev, [phase]: false }))
                setSearchExecutions((prev) => {
                  if (prev.length === 0) return prev
                  const updated = [...prev]
                  updated[updated.length - 1] = { ...updated[updated.length - 1], open: true }
                  return updated
                })
                pendingOpenSearchRef.current = false
              }, 350)
            }
          }
        }
        else if (parsed.type === 'tool_calls') {
          const executions: ToolExecutionTrace[] = (parsed.calls || []).map((call: any) => ({
            id: call.id || `${call.name}-${Date.now()}`,
            name: call.name,
            displayName: call.name?.replace(/_/g, ' '),
            status: 'queued' as const,
            parameters: typeof call.arguments === 'string' ? parseArgs(call.arguments) : call.arguments,
            error: null,
          }))
          
          setRunTrace((prev) => prev ? { ...prev, tools: [...prev.tools, ...executions] } : prev)

          const searchTools = executions.filter((e) => e.name.toLowerCase().includes('search'))
          if (searchTools.length > 0) {
            setSearchExecutions((prev) => [
              ...prev,
              ...searchTools.map((tool) => ({
                id: tool.id,
                phase: reasoningPhaseRef.current,
                open: true,
              }))
            ])
          }
        }
        else if (parsed.type === 'tool_executing') {
          if ((parsed.category === 'search') || (typeof parsed.name === 'string' && parsed.name.toLowerCase().includes('search'))) {
            pendingOpenSearchRef.current = true
          }
          setRunTrace((prev) => {
            if (!prev) return prev
            const tools = prev.tools.map((t) => {
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
              const matchesId = parsed.id && t.id === parsed.id
              const matchesName = !parsed.id && t.name === parsed.name && (t.status === 'running' || t.status === 'queued')
              if (matchesId || matchesName) {
                const endedAt = nowIso()
                const durationMs = t.startedAt ? (new Date(endedAt).getTime() - new Date(t.startedAt).getTime()) : undefined
                return {
                  ...t,
                  status: succeeded ? 'completed' : 'failed',
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
          
          if ((parsed.category === 'search') || (typeof parsed.name === 'string' && parsed.name.toLowerCase().includes('search'))) {
            setSearchExecutions((prev) => prev.map((search) =>
              search.id === parsed.id ? { ...search, open: false } : search
            ))
            const nextPhase = reasoningPhaseRef.current + 1
            reasoningPhaseRef.current = nextPhase
            setReasoningOpenMap((prev) => ({ ...prev, [nextPhase]: true }))
            setReasoningPhase(nextPhase)
          }
        }
        else if (parsed.type === 'content') {
          appendResponse(parsed.content)
          setReasoningOpenMap((prev) => ({ ...prev, [reasoningPhaseRef.current]: false }))
          pendingOpenSearchRef.current = false
          if (reasoningSilenceTimerRef.current) window.clearTimeout(reasoningSilenceTimerRef.current)
          reasoningSilenceTimerRef.current = null
        }
        else if (parsed.type === 'done' || parsed.done) {
          setIsStreaming(false)
          setRunTrace((prev) => prev ? { ...prev, endedAt: nowIso() } : prev)
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
          const msg = parsed.error || parsed.message || 'Error'
          appendResponse(`\n\n**Error:** ${msg}`)
          setIsStreaming(false)
          if (currentStream.current) {
            api.stopStream(currentStream.current)
            currentStream.current = null
          }
        }
        else if (parsed.content) {
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

  }, [
    model, systemPrompt, userPrompt, variables, parameters, reasoningEffort,
    addHistoryEntry, appendResponse, setIsStreaming, setResponse, isStreaming
  ])

  return {
    runTrace,
    warning,
    reasoningPhase,
    reasoningTexts,
    reasoningOpenMap,
    setReasoningOpenMap,
    searchExecutions,
    setSearchExecutions,
    generate,
    stop
  }
}

