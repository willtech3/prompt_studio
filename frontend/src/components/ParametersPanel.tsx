import { useMemo, useState } from 'react'
import { getModelPreset } from '../utils/modelPresets'
import { usePromptStore } from '../store/promptStore'

export function ParametersPanel() {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showTools, setShowTools] = useState(false)
  const [toolSchemas, setToolSchemas] = useState('')
  const [toolsError, setToolsError] = useState<string | null>(null)
  const parameters = usePromptStore((s) => s.parameters)
  const supported = usePromptStore((s) => s.supportedParameters)
  const model = usePromptStore((s) => s.model)
  const modelInfo = usePromptStore((s) => s.modelInfo)
  const setTemperature = usePromptStore((s) => s.setTemperature)
  const setMaxTokens = usePromptStore((s) => s.setMaxTokens)
  const setTopP = usePromptStore((s) => s.setTopP)
  const setStreaming = usePromptStore((s) => s.setStreaming)
  const setTopK = usePromptStore((s) => s.setTopK)
  const setFrequencyPenalty = usePromptStore((s) => s.setFrequencyPenalty)
  const setPresencePenalty = usePromptStore((s) => s.setPresencePenalty)
  const setRepetitionPenalty = usePromptStore((s) => s.setRepetitionPenalty)
  const setMinP = usePromptStore((s) => s.setMinP)
  const setTopA = usePromptStore((s) => s.setTopA)
  const setSeed = usePromptStore((s) => s.setSeed)
  const setResponseFormat = usePromptStore((s) => s.setResponseFormat)
  const setStop = usePromptStore((s) => s.setStop)
  const setLogprobs = usePromptStore((s) => s.setLogprobs)
  const setTopLogprobs = usePromptStore((s) => s.setTopLogprobs)
  const setLogitBiasJson = usePromptStore((s) => s.setLogitBiasJson)
  const reasoningEffort = usePromptStore((s) => s.reasoningEffort)
  const setReasoningEffort = usePromptStore((s) => s.setReasoningEffort)
  const presetExplainer = usePromptStore((s) => s.presetExplainer)
  const showPresetExplainer = usePromptStore((s) => s.showPresetExplainer)
  const dismissPresetExplainer = usePromptStore((s) => s.dismissPresetExplainer)

  const preset = useMemo(() => getModelPreset(model), [model])

  const has = useMemo(() => {
    const set = new Set(supported || [])
    const check = (key: string) => set.has(key)
    return {
      temperature: true,
      top_p: true,
      max_tokens: true,
      top_k: showAdvanced && check('top_k'),
      frequency_penalty: showAdvanced && check('frequency_penalty'),
      presence_penalty: showAdvanced && check('presence_penalty'),
      // prune less prompt-centric knobs from UI by default
      repetition_penalty: false,
      min_p: false,
      top_a: false,
      seed: showAdvanced && check('seed'),
      response_format: showAdvanced && check('response_format'),
      stop: showAdvanced && check('stop'),
      // analysis/debug
      logprobs: false,
      top_logprobs: false,
      logit_bias: false,
      reasoning: check('include_reasoning') || check('reasoning'),
    }
  }, [supported, showAdvanced])

  return (
    <section className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="font-medium">Parameters</div>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="text-xs rounded-md border border-gray-300 dark:border-white/15 px-2.5 py-1 hover:bg-gray-100 dark:hover:bg-white/10"
        >
          {showAdvanced ? 'Hide details for nerds' : 'Show details for nerds'}
        </button>
      </div>
      {showPresetExplainer && presetExplainer && (
        <div className="mb-3 rounded-md border border-blue-300/40 dark:border-blue-300/20 bg-blue-50/60 dark:bg-blue-400/10 p-2">
          <div className="flex items-start justify-between gap-2">
            <div className="text-xs text-blue-950 dark:text-blue-200">{presetExplainer}</div>
            <button onClick={dismissPresetExplainer} className="text-[11px] rounded border border-blue-300/60 px-1.5 py-0.5 hover:bg-blue-100/60 dark:hover:bg-blue-300/20">Dismiss</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {has.reasoning && (
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Reasoning effort</label>
            <select
              className="w-full rounded-md bg-transparent border border-gray-300 dark:border-white/15 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={reasoningEffort}
              onChange={(e) => setReasoningEffort(e.target.value as any)}
            >
              <option value="auto">Auto</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        )}

        {has.temperature && (
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Temperature ({parameters.temperature.toFixed(2)})</label>
            <input
              type="range"
              className="w-full accent-blue-600"
              value={parameters.temperature}
              min={0}
              max={2}
              step={0.01}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
            />
            <p className="text-xs text-gray-500 mt-1">Lower = more deterministic; higher = more creative.</p>
          </div>
        )}

        {has.top_p && (
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Top‑p ({parameters.topP.toFixed(2)})</label>
            <input
              type="range"
              className="w-full accent-blue-600"
              value={parameters.topP}
              min={0}
              max={1}
              step={0.01}
              onChange={(e) => setTopP(parseFloat(e.target.value))}
            />
            <p className="text-xs text-gray-500 mt-1">Keep at 1.0 unless tuning for style/stability.</p>
          </div>
        )}

        {has.max_tokens && (
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Max tokens</label>
            <input
              type="number"
              className="w-full rounded-md bg-transparent border border-gray-300 dark:border-white/15 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={parameters.maxTokens ?? ''}
              min={1}
              placeholder={modelInfo?.max_completion_tokens ? String(modelInfo.max_completion_tokens) : 'Model max'}
              onChange={(e) => setMaxTokens(e.target.value === '' ? null : Number(e.target.value))}
            />
            <p className="text-xs text-gray-500 mt-1">
              {modelInfo?.max_completion_tokens 
                ? `Using model maximum (${modelInfo.max_completion_tokens.toLocaleString()}). Set lower to reduce cost.`
                : 'Using model maximum tokens. Set lower to reduce cost.'}
            </p>
          </div>
        )}

        {has.top_k && (
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Top‑k</label>
            <input
              type="number"
              className="w-full rounded-md bg-transparent border border-gray-300 dark:border-white/15 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={parameters.topK ?? ''}
              min={0}
              placeholder={preset.provider === 'anthropic' ? 'e.g., 40 (Claude default); blank = provider default' : 'Blank = provider default'}
              onChange={(e) => setTopK(e.target.value === '' ? null : Number(e.target.value))}
            />
            <p className="text-xs text-gray-500 mt-1">Limits candidate tokens before sampling; improves determinism.</p>
          </div>
        )}

        {has.frequency_penalty && (
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Frequency penalty</label>
            <input
              type="number"
              step={0.01}
              className="w-full rounded-md bg-transparent border border-gray-300 dark:border-white/15 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={parameters.frequencyPenalty ?? ''}
              placeholder="0 (OpenAI default)"
              onChange={(e) => setFrequencyPenalty(e.target.value === '' ? null : parseFloat(e.target.value))}
            />
            <p className="text-xs text-gray-500 mt-1">Discourages repetition; keep 0 unless responses loop.</p>
          </div>
        )}

        {has.presence_penalty && (
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Presence penalty</label>
            <input
              type="number"
              step={0.01}
              className="w-full rounded-md bg-transparent border border-gray-300 dark:border-white/15 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={parameters.presencePenalty ?? ''}
              placeholder="0 (OpenAI default)"
              onChange={(e) => setPresencePenalty(e.target.value === '' ? null : parseFloat(e.target.value))}
            />
            <p className="text-xs text-gray-500 mt-1">Encourages new topics; keep 0 unless model fixates.</p>
          </div>
        )}

        {has.repetition_penalty && (
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Repetition penalty</label>
            <input
              type="number"
              step={0.01}
              className="w-full rounded-md bg-transparent border border-gray-300 dark:border-white/15 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={parameters.repetitionPenalty ?? ''}
              onChange={(e) => setRepetitionPenalty(e.target.value === '' ? null : parseFloat(e.target.value))}
            />
          </div>
        )}

        {has.min_p && (
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Min‑p</label>
            <input
              type="number"
              step={0.001}
              className="w-full rounded-md bg-transparent border border-gray-300 dark:border-white/15 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={parameters.minP ?? ''}
              onChange={(e) => setMinP(e.target.value === '' ? null : parseFloat(e.target.value))}
            />
          </div>
        )}

        {has.top_a && (
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Top‑a</label>
            <input
              type="number"
              step={0.01}
              className="w-full rounded-md bg-transparent border border-gray-300 dark:border-white/15 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={parameters.topA ?? ''}
              onChange={(e) => setTopA(e.target.value === '' ? null : parseFloat(e.target.value))}
            />
          </div>
        )}

        {has.seed && (
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Seed</label>
            <input
              type="number"
              className="w-full rounded-md bg-transparent border border-gray-300 dark:border-white/15 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={parameters.seed ?? ''}
              placeholder="Deterministic runs when supported"
              onChange={(e) => setSeed(e.target.value === '' ? null : Number(e.target.value))}
            />
            <p className="text-xs text-gray-500 mt-1">For reproducibility on models that support seeding.</p>
          </div>
        )}

        {has.response_format && (
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Response format</label>
            <input
              type="text"
              placeholder="e.g., json_object (strict JSON mode)"
              className="w-full rounded-md bg-transparent border border-gray-300 dark:border-white/15 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={parameters.responseFormat ?? ''}
              onChange={(e) => setResponseFormat(e.target.value || null)}
            />
            <p className="text-xs text-gray-500 mt-1">Use when you need machine‑parsable JSON output.</p>
          </div>
        )}

        {has.stop && (
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Stop sequences (comma or newline separated)</label>
            <textarea
              className="w-full min-h-[64px] rounded-md bg-transparent border border-gray-300 dark:border-white/15 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={parameters.stop ?? ''}
              onChange={(e) => setStop(e.target.value || null)}
            />
            <p className="text-xs text-gray-500 mt-1">Stops early when any match occurs; helpful for tool fences.</p>
          </div>
        )}

        {/* analysis/debug-only fields removed from UI: logprobs, top_logprobs, logit_bias */}

        {/* Tool Schemas (Experimental) */}
        {showAdvanced && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm text-gray-600 dark:text-gray-300">Tool Schemas (Experimental)</label>
              <button
                type="button"
                onClick={() => setShowTools(!showTools)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showTools ? 'Hide' : 'Show example'}
              </button>
            </div>
            <textarea
              className="w-full min-h-[80px] font-mono text-xs rounded-md bg-transparent border border-gray-300 dark:border-white/15 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder='[{"type":"function","function":{"name":"search_web","description":"Search the web","parameters":{"type":"object","properties":{"query":{"type":"string"}},"required":["query"]}}}]'
              value={toolSchemas}
              onChange={(e) => {
                setToolSchemas(e.target.value)
                // Validate JSON
                if (e.target.value.trim()) {
                  try {
                    JSON.parse(e.target.value)
                    setToolsError(null)
                  } catch {
                    setToolsError('Invalid JSON')
                  }
                } else {
                  setToolsError(null)
                }
              }}
            />
            {toolsError && <p className="text-xs text-red-600 mt-1">{toolsError}</p>}
            {showTools && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer text-gray-700 dark:text-gray-300">Built-in tools</summary>
                <pre className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded overflow-x-auto border border-gray-200 dark:border-gray-700">
{`[
  {
    "type": "function",
    "function": {
      "name": "search_web",
      "description": "Search the web for current information",
      "parameters": {
        "type": "object",
        "properties": {
          "query": {"type": "string"},
          "num_results": {"type": "integer", "default": 3}
        },
        "required": ["query"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "get_current_time",
      "description": "Get current date and time",
      "parameters": {"type": "object", "properties": {}}
    }
  },
  {
    "type": "function",
    "function": {
      "name": "calculate",
      "description": "Evaluate math expression",
      "parameters": {
        "type": "object",
        "properties": {
          "expression": {"type": "string"}
        },
        "required": ["expression"]
      }
    }
  }
]`}
                </pre>
              </details>
            )}
            <p className="text-xs text-gray-500 mt-1">Paste OpenAI-format tool schemas to test tool calling. Only built-in tools (search_web, get_current_time, calculate) are executed.</p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            id="streaming"
            type="checkbox"
            className="accent-blue-600"
            checked={parameters.streaming}
            onChange={(e) => setStreaming(e.target.checked)}
          />
          <label htmlFor="streaming" className="text-sm">Streaming</label>
        </div>
      </div>
    </section>
  )
}

// Export tool schemas for use by ResponsePanel
export function useToolSchemas() {
  const [toolSchemas, setToolSchemas] = useState('')
  return { toolSchemas, setToolSchemas }
}
