import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
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
    openai: '',
    anthropic: '',
    google: '',
    xai: '',
    deepseek: '',
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
            const data = await api.getProviderBestPractices(id)
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

  // Fetch model-specific guidance when a model is selected
  useEffect(() => {
    const selectedModel = selectedModels[activeTab]
    if (!selectedModel || !open) return

    let cancelled = false
    ;(async () => {
      try {
        const data = await api.getProviderBestPractices(activeTab, selectedModel)
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
  }, [selectedModels, activeTab, open])

  if (!open) return null

  const activeContent = providerData[activeTab]?.general
  const activeModelContent = selectedModels[activeTab]
    ? providerData[activeTab]?.modelSpecific?.[selectedModels[activeTab]]
    : null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-[min(1200px,95vw)] h-[min(900px,90vh)] bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-white/10 shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-6 border-b border-gray-200 dark:border-white/10">
          <h2 className="text-lg font-semibold">Prompt Guidance</h2>
          <button
            onClick={close}
            className="rounded-md p-2 border border-gray-300 dark:border-white/15 hover:bg-gray-100 dark:hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-white/10 px-6">
          {PROVIDERS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 dark:text-gray-400">Loading...</div>
            </div>
          ) : activeContent ? (
            <div className="p-6 max-w-4xl mx-auto">
              {/* Model Selector */}
              <div className="mb-6">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Model-Specific Guidance (Optional)
                </label>
                <select
                  value={selectedModels[activeTab]}
                  onChange={(e) =>
                    setSelectedModels((prev) => ({ ...prev, [activeTab]: e.target.value }))
                  }
                  className="w-full max-w-sm px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-white/15 bg-white dark:bg-gray-900 hover:border-gray-400 dark:hover:border-white/25 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a model for additional guidance...</option>
                  {providerModels[activeTab].map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name || model.id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Official Documentation Link (at top) */}
              {activeContent.docPath && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <a
                    href={activeContent.docPath}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                  >
                    📚 Official Documentation ↗
                  </a>
                </div>
              )}

              {/* Provider Guidance Content */}
              <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-code:text-sm prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-900 dark:prose-pre:bg-gray-950 prose-pre:border prose-pre:border-gray-700">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                >
                  {activeContent.markdown}
                </ReactMarkdown>
              </div>

              {/* Model-Specific Guidance (if selected) */}
              {activeModelContent && (
                <div className="mt-8 pt-8 border-t-2 border-blue-200 dark:border-blue-800">
                  <h3 className="text-lg font-semibold mb-4 text-blue-600 dark:text-blue-400">
                    🎯 Model-Specific Guidance: {selectedModels[activeTab]}
                  </h3>

                  {activeModelContent.docPath && (
                    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                      <a
                        href={activeModelContent.docPath}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                      >
                        📚 Model Documentation ↗
                      </a>
                    </div>
                  )}

                  <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-code:text-sm prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-900 dark:prose-pre:bg-gray-950 prose-pre:border prose-pre:border-gray-700">
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
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 dark:text-gray-400">No content available</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
