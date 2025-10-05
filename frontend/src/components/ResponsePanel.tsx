import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { useRef, useState } from 'react'
import { Copy, Save as SaveIcon, Settings2, Sparkles, Square } from 'lucide-react'
import { usePromptStore } from '../store/promptStore'
import { api } from '../services/api'
import { useToastStore } from '../store/toastStore'
import { useUIStore } from '../store/uiStore'
import 'highlight.js/styles/github.css' // Light theme
import 'highlight.js/styles/github-dark.css' // Dark theme

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
  const model = usePromptStore((s) => s.model)
  const settingsOpen = useUIStore((s) => s.settingsOpen)
  const toggleSettings = useUIStore((s) => s.toggleSettings)
  
  const currentStream = useRef<EventSource | null>(null)

  const onGenerate = () => {
    if (isStreaming) return
    setResponse('')
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
    })
    currentStream.current = es
    es.addEventListener('message', (e) => {
      try {
        const parsed = JSON.parse(e.data)
        if (parsed.done) {
          setIsStreaming(false)
          if (currentStream.current) {
            api.stopStream(currentStream.current)
            currentStream.current = null
          }
        } else if (parsed.content) {
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
      </div>
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
