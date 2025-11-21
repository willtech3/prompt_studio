import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import React, { useState, useMemo, useCallback } from 'react'
import { Copy, Save as SaveIcon, Settings2, Sparkles, Square } from 'lucide-react'
import { usePromptStore } from '../store/promptStore'
import { api } from '../services/api'
import { useToastStore } from '../store/toastStore'
import { useUIStore } from '../store/uiStore'
import { useChatStream } from '../hooks/useChatStream'
import ToolChips from './ToolChips'
import RunInspectorDrawer from './RunInspectorDrawer'
import ResponseFootnotes from './ResponseFootnotes'
import SearchResultsInline from './SearchResultsInline'
import ReasoningBlock from './ReasoningBlock'
import 'highlight.js/styles/github-dark.css' // Dark theme only

export function ResponsePanel() {
  const response = usePromptStore((s) => s.response)
  const isStreaming = usePromptStore((s) => s.isStreaming)
  const reasoningEffort = usePromptStore((s) => s.reasoningEffort)
  const userPrompt = usePromptStore((s) => s.userPrompt)
  const systemPrompt = usePromptStore((s) => s.systemPrompt)
  const provider = usePromptStore((s) => s.provider)
  const model = usePromptStore((s) => s.model)
  const parameters = usePromptStore((s) => s.parameters)
  const variables = usePromptStore((s) => s.variables)
  
  const settingsOpen = useUIStore((s) => s.settingsOpen)
  const toggleSettings = useUIStore((s) => s.toggleSettings)
  const resetTick = usePromptStore((s) => s.resetTick)
  
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [focusToolId, setFocusToolId] = useState<string | undefined>()

  const {
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
  } = useChatStream()

  // Clear inspector when user presses Clear
  React.useEffect(() => { 
    setInspectorOpen(false)
    setFocusToolId(undefined) 
  }, [resetTick])

  const onCopy = async () => {
    if (!response) return
    try {
      await navigator.clipboard.writeText(response)
    } catch {
      // ignore for MVP
    }
  }

  // Memoize expensive computations to prevent unnecessary re-renders
  const sortedPhases = useMemo(() => {
    // Include phases that have text OR are open (for showing spinner on empty phases)
    const phases = new Set([
      ...Object.keys(reasoningTexts).map(Number),
      ...Object.keys(reasoningOpenMap).map(Number)
    ])
    return Array.from(phases).sort((a, b) => a - b)
  }, [reasoningTexts, reasoningOpenMap])

  const searchesByPhase = useMemo(() => {
    const map: Record<number, typeof searchExecutions> = {}
    searchExecutions.forEach((search) => {
      if (!map[search.phase]) map[search.phase] = []
      map[search.phase].push(search)
    })
    return map
  }, [searchExecutions])

  const handleSearchToggle = useCallback((searchId: string, open: boolean) => {
    setSearchExecutions((prev) => prev.map((s) => s.id === searchId ? { ...s, open } : s))
  }, [setSearchExecutions])

  const handleReasoningToggle = useCallback((phase: number) => {
    setReasoningOpenMap((m) => ({ ...m, [phase]: !m[phase] }))
  }, [setReasoningOpenMap])

  return (
    <section className="min-h-[calc(100vh-3.5rem)]">
      <div className="h-10 border-b border-gray-200 dark:border-white/10 flex items-center justify-between px-4 sticky top-0 bg-white dark:bg-gray-950 z-10">
        <div className="flex items-center gap-2">
          <div className="font-medium">Response</div>
          {isStreaming ? (
            <button 
              onClick={stop} 
              className="text-xs inline-flex items-center gap-1 rounded-md bg-gray-700 hover:bg-gray-800 text-white px-2.5 py-1.5 font-medium shadow-sm"
            >
              <Square className="h-3 w-3" />
              Stop
            </button>
          ) : (
            <button 
              id="generate-button"
              onClick={generate} 
              className="text-xs inline-flex items-center gap-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 font-medium shadow-sm transition-colors"
            >
              <Sparkles className="h-3 w-3" />
              Generate
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isStreaming && <div className="text-xs text-blue-600 animate-pulse">Generating…</div>}
          <SaveButton 
             userPrompt={userPrompt}
             systemPrompt={systemPrompt}
             response={response}
             provider={provider}
             model={model}
             parameters={parameters}
             reasoningEffort={reasoningEffort}
             variables={variables}
          />
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

        {/* Reasoning and search blocks in chronological order */}
        {sortedPhases.map((phase) => {
          const txt = reasoningTexts[phase] || ''
          const open = !!reasoningOpenMap[phase]
          const isActive = isStreaming && reasoningEffort && phase === reasoningPhase
          const searchesForPhase = searchesByPhase[phase] || []
          // Show reasoning block if it has content OR if it's the active phase and streaming
          const shouldShowReasoning = txt || (isActive && open)

          return (
            <React.Fragment key={`phase-${phase}`}>
              {/* Reasoning block for this phase */}
              {shouldShowReasoning && (
                <ReasoningBlock
                  content={txt}
                  isStreaming={Boolean(isActive)}
                  open={open}
                  onToggle={() => handleReasoningToggle(phase)}
                />
              )}

              {/* Search executions that happened during/after this phase */}
              {searchesForPhase.map((search) => {
                const tool = runTrace?.tools?.find((t) => t.id === search.id)
                const isRunning = tool?.status === 'running'

                return (
                  <SearchResultsInline
                    key={search.id}
                    run={runTrace ? { ...runTrace, tools: tool ? [tool] : [] } : null}
                    open={search.open}
                    onOpenChange={(open) => handleSearchToggle(search.id, open)}
                    isRunning={isRunning}
                  />
                )
              })}
            </React.Fragment>
          )
        })}

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

function SaveButton({ 
  userPrompt, systemPrompt, response, provider, model, parameters, reasoningEffort, variables 
}: {
  userPrompt: string, systemPrompt: string, response: string, provider: string, model: string, parameters: any, reasoningEffort: string, variables: any[]
}) {
  const showToast = useToastStore((s) => s.show)
  const [saving, setSaving] = useState(false)
  
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
