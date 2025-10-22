import { useMemo } from 'react'
import { usePromptStore } from '../store/promptStore'

const TOOL_DEFINITIONS = {
  search_web: {
    type: 'function',
    function: {
      name: 'search_web',
      description: 'Search the web for current information. Returns top results with titles, snippets, and URLs.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query to look up' },
          num_results: { type: 'integer', description: 'Number of results (1-5)', default: 3 },
        },
        required: ['query'],
      },
    },
  },
  get_current_time: {
    type: 'function',
    function: {
      name: 'get_current_time',
      description: 'Get the current date and time in UTC.',
      parameters: { type: 'object', properties: { timezone: { type: 'string', default: 'UTC' } }, required: [] },
    },
  },
  calculate: {
    type: 'function',
    function: {
      name: 'calculate',
      description: 'Safely evaluate a mathematical expression.',
      parameters: { type: 'object', properties: { expression: { type: 'string' } }, required: ['expression'] },
    },
  },
} as const

function toSchemas(names: string[]) {
  if (!names.length) return ''
  const schemas = names
    .map((n) => (TOOL_DEFINITIONS as any)[n])
    .filter(Boolean)
  return JSON.stringify(schemas)
}

export default function ToolSelector() {
  const toolSchemas = usePromptStore((s) => s.toolSchemas)
  const setToolSchemas = usePromptStore((s) => s.setToolSchemas)
  const model = usePromptStore((s) => s.model)
  const supported = usePromptStore((s) => s.supportedParameters)

  const supportsTools = useMemo(() => {
    // Prefer explicit metadata; fallback to heuristic by model id
    if (Array.isArray(supported) && supported.includes('tools')) return true
    const id = model.toLowerCase()
    return ['gpt', 'claude', 'gemini', 'grok', 'qwen'].some((k) => id.includes(k))
  }, [model, supported])

  if (!supportsTools) return null

  const enabled = useMemo(() => {
    try {
      return (JSON.parse(toolSchemas || '[]') as any[]).map((t) => t.function?.name).filter(Boolean)
    } catch {
      return [] as string[]
    }
  }, [toolSchemas])

  const toggle = (name: 'search_web' | 'get_current_time' | 'calculate') => {
    const next = enabled.includes(name) ? enabled.filter((n) => n !== name) : [...enabled, name]
    setToolSchemas(toSchemas(next))
  }

  const chip = (name: 'search_web' | 'get_current_time' | 'calculate', label: string) => (
    <button
      key={name}
      onClick={() => toggle(name)}
      className={`text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-md border ${
        enabled.includes(name)
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-300/50'
      }`}
      aria-pressed={enabled.includes(name)}
    >
      {label}
    </button>
  )

  return (
    <div className="flex items-center justify-between mb-2 mt-2">
      <div className="text-xs text-gray-600 dark:text-gray-300">Tools</div>
      <div className="flex items-center gap-2">
        {chip('search_web', 'Web')}
        {chip('get_current_time', 'Time')}
        {chip('calculate', 'Calc')}
      </div>
    </div>
  )
}











