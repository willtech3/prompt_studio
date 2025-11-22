import { useEffect, useState } from 'react'
import { X, ChevronDown, ChevronRight } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'
import { useUIStore } from '../store/uiStore'
import { type Provider } from '../store/promptStore'
import { api } from '../services/api'

type ProviderContent = {
  title: string
  markdown: string
  docPath: string
}

type ProviderData = {
  general: ProviderContent | null
  modelSpecific: Record<string, ProviderContent> | null
}

const PROVIDERS: { id: Provider; label: string }[] = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'google', label: 'Google' },
  { id: 'xai', label: 'xAI' },
  { id: 'deepseek', label: 'DeepSeek' },
]

export function PromptGuidanceModal() {
  const open = useUIStore((s) => s.promptGuidanceOpen)
  const close = useUIStore((s) => s.closePromptGuidance)
  const [activeTab, setActiveTab] = useState<Provider>('openai')
  const [selectedModels, setSelectedModels] = useState<Record<Provider, string>>({
    openai: 'openai/gpt-5',
    anthropic: 'anthropic/claude-sonnet-4.5',
    google: 'google/gemini-2.5-pro',
    xai: 'x-ai/grok-4',
    deepseek: 'deepseek/deepseek-chat',
  })
  const [providerData, setProviderData] = useState<Record<Provider, ProviderData>>({
    openai: { general: null, modelSpecific: null },
    anthropic: { general: null, modelSpecific: null },
    google: { general: null, modelSpecific: null },
    xai: { general: null, modelSpecific: null },
    deepseek: { general: null, modelSpecific: null },
  })
  const [providerModels, setProviderModels] = useState<Record<Provider, Array<{ id: string; name?: string }>>>({
    openai: [],
    anthropic: [],
    google: [],
    xai: [],
    deepseek: [],
  })
  const [loading, setLoading] = useState(true)
  const [generalExpanded, setGeneralExpanded] = useState(false)
  const [modelSpecificExpanded, setModelSpecificExpanded] = useState(false)

  // Load all provider content and models on mount
  useEffect(() => {
    if (!open) return

    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)

        // Load models and filter by provider
        try {
          const allModels = await api.getModels()
          const modelsByProvider: Record<Provider, Array<{ id: string; name?: string }>> = {
            openai: [],
            anthropic: [],
            google: [],
            xai: [],
            deepseek: [],
          }

          allModels.forEach((model) => {
            if (model.id.startsWith('openai/')) modelsByProvider.openai.push(model)
            else if (model.id.startsWith('anthropic/')) modelsByProvider.anthropic.push(model)
            else if (model.id.startsWith('google/')) modelsByProvider.google.push(model)
            else if (model.id.startsWith('x-ai/')) modelsByProvider.xai.push(model)
            else if (model.id.startsWith('deepseek/')) modelsByProvider.deepseek.push(model)
          })

          if (!cancelled) setProviderModels(modelsByProvider)
        } catch (err) {
          console.error('Failed to load models:', err)
        }

        // Load content for all providers
        const contentPromises = PROVIDERS.map(async ({ id }) => {
          try {
            const data = await api.getProviderPromptingGuides(id)
            return {
              provider: id,
              content: {
                title: data.title || '',
                markdown: data.content?.markdown || '',
                docPath: data.doc_url || '',
              } as ProviderContent,
            }
          } catch (err) {
            console.error(`Failed to load ${id} guidance:`, err)
            return { provider: id, content: null }
          }
        })

        const results = await Promise.all(contentPromises)

        if (!cancelled) {
          const newData: Record<Provider, ProviderData> = {
            openai: { general: null, modelSpecific: null },
            anthropic: { general: null, modelSpecific: null },
            google: { general: null, modelSpecific: null },
            xai: { general: null, modelSpecific: null },
            deepseek: { general: null, modelSpecific: null },
          }

          results.forEach(({ provider, content }) => {
            newData[provider].general = content
          })

          setProviderData(newData)
        }
      } catch (err) {
        console.error('Failed to load provider guidance:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [open])

  // Fetch model-specific guidance when a model is selected or tab changes
  useEffect(() => {
    const selectedModel = selectedModels[activeTab]
    if (!selectedModel || !open) return

    // Skip if we already have this model's data
    if (providerData[activeTab]?.modelSpecific?.[selectedModel]) return

    let cancelled = false
    ;(async () => {
      try {
        const data = await api.getProviderPromptingGuides(activeTab, selectedModel)
        if (!cancelled && data.model_specific) {
          setProviderData((prev) => ({
            ...prev,
            [activeTab]: {
              ...prev[activeTab],
              modelSpecific: {
                ...prev[activeTab].modelSpecific,
                [selectedModel]: {
                  title: data.model_specific.title || '',
                  markdown: data.model_specific.content?.markdown || '',
                  docPath: data.model_specific.doc_url || '',
                },
              },
            },
          }))
        }
      } catch (err) {
        console.error('Failed to load model-specific guidance:', err)
      }
    })()

    return () => { cancelled = true }
  }, [selectedModels, activeTab, open, providerData])

  if (!open) return null

  const activeContent = providerData[activeTab]?.general
  const activeModelContent = selectedModels[activeTab]
    ? providerData[activeTab]?.modelSpecific?.[selectedModels[activeTab]]
    : null

  return (
    <div className="modal-layer" style={{ padding: '16px' }}>
      <div className="guidance-surface">
        {/* Header with Tabs */}
        <div className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-white/10">
          {/* Title and Close */}
          <div className="h-14 flex items-center justify-between px-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Prompt Guidance</h2>
            <button
              onClick={close}
              className="rounded-md p-2 border border-gray-300 dark:border-white/15 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-900 dark:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex px-6">
            {PROVIDERS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400 bg-blue-50 dark:bg-white/5'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#1a1d29]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-600 dark:text-gray-400">Loading...</div>
            </div>
          ) : activeContent ? (
            <div className="p-6 max-w-4xl mx-auto">
              {/* Model Selector */}
              <div className="mb-6">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-2">
                  Select Model
                </label>
                <select
                  value={selectedModels[activeTab]}
                  onChange={(e) => {
                    setSelectedModels((prev) => ({ ...prev, [activeTab]: e.target.value }))
                    if (e.target.value) {
                      setModelSpecificExpanded(true)
                    }
                  }}
                  className="w-full max-w-sm px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-white/15 bg-white dark:bg-[#0f1117] text-gray-900 dark:text-white hover:border-gray-400 dark:hover:border-white/25 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {providerModels[activeTab].map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name || model.id}
                    </option>
                  ))}
                </select>
              </div>

              {/* General Provider Guidance - Collapsible */}
              <div className="mb-6">
                <button
                  onClick={() => setGeneralExpanded(!generalExpanded)}
                  className="w-full flex items-center justify-between p-4 bg-white dark:bg-[#0f1117] hover:bg-gray-100 dark:hover:bg-[#14161f] rounded-lg border border-gray-300 dark:border-white/10 transition-colors mb-2"
                >
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    General {PROVIDERS.find(p => p.id === activeTab)?.label} Prompting Guide
                  </h3>
                  {generalExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  )}
                </button>

                {generalExpanded && (
                  <div className="p-4">
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-a:text-blue-400 prose-code:text-sm prose-code:bg-[#0a0c10] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-[#0a0c10] prose-pre:border-0">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                      >
                        {activeContent.markdown}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>

              {/* Model-Specific Guidance - Collapsible */}
              {activeModelContent && (
                <div className="mb-6">
                  <button
                    onClick={() => setModelSpecificExpanded(!modelSpecificExpanded)}
                    className="w-full flex items-center justify-between p-4 bg-white dark:bg-[#0f1117] hover:bg-gray-100 dark:hover:bg-[#14161f] rounded-lg border border-gray-300 dark:border-white/10 transition-colors mb-2"
                  >
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      {providerModels[activeTab].find(m => m.id === selectedModels[activeTab])?.name || selectedModels[activeTab].split('/').pop()} Specific Guidance
                    </h3>
                    {modelSpecificExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    )}
                  </button>

                  {modelSpecificExpanded && (
                    <div className="p-4">
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-a:text-blue-400 prose-code:text-sm prose-code:bg-[#0a0c10] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-[#0a0c10] prose-pre:border-0">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                        >
                          {activeModelContent.markdown}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-600 dark:text-gray-400">No content available</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
