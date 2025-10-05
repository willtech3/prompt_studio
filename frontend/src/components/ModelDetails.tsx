import { useState } from 'react'
import { usePromptStore } from '../store/promptStore'

export function ModelDetails() {
  const provider = usePromptStore((s) => s.provider)
  const model = usePromptStore((s) => s.model)
  const info = usePromptStore((s) => s.modelInfo)
  const supported = usePromptStore((s) => s.supportedParameters)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const contextLen = info?.top_provider?.context_length ?? info?.context_length
  const maxComp = info?.top_provider?.max_completion_tokens ?? null
  const pricingPrompt = info?.pricing?.prompt
  const pricingCompletion = info?.pricing?.completion

  return (
    <section className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">Model Details</div>
        <button
          type="button"
          className="text-xs rounded-md border border-gray-300 dark:border-white/15 px-2 py-0.5 hover:bg-gray-100 dark:hover:bg-white/10"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced ? 'Hide details for nerds' : 'Show details for nerds'}
        </button>
      </div>
      <div className="text-sm text-gray-700 dark:text-gray-200">
        <div className="font-medium">{info?.name || model}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{provider} · {model}</div>
        {typeof contextLen === 'number' && (
          <div className="text-sm">Context: {contextLen.toLocaleString()} tokens{typeof maxComp === 'number' ? ` · max completion ${maxComp.toLocaleString()}` : ''}</div>
        )}
        {(pricingPrompt || pricingCompletion) && (
          <div className="text-sm">Pricing: {pricingPrompt ? `prompt ${pricingPrompt}` : ''}{pricingPrompt && pricingCompletion ? ' · ' : ''}{pricingCompletion ? `completion ${pricingCompletion}` : ''}</div>
        )}
        {info?.description && (
          <p className="text-sm mt-2 line-clamp-5">{info.description}</p>
        )}

        {showAdvanced && (
          <div className="mt-3 space-y-3">
            {supported?.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Supported parameters</div>
                <div className="flex flex-wrap gap-1.5">
                  {supported.slice(0, 24).map((p: string) => (
                    <span key={p} className="text-[11px] px-2 py-0.5 rounded-full border border-gray-300 dark:border-white/15">{p}</span>
                  ))}
                  {supported.length > 24 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full border border-gray-300 dark:border-white/15">+{supported.length - 24} more</span>
                  )}
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <div><span className="font-medium text-gray-600 dark:text-gray-300">temperature</span>: randomness; 0.2–0.5 analysis, 0.7–1.0 creative</div>
              <div><span className="font-medium text-gray-600 dark:text-gray-300">top_p</span>: nucleus sampling; 1.0 default</div>
              <div><span className="font-medium text-gray-600 dark:text-gray-300">top_k</span>: cap candidate pool; optional (e.g., 40)</div>
              <div><span className="font-medium text-gray-600 dark:text-gray-300">stop</span>: stop early on any sequence</div>
              <div><span className="font-medium text-gray-600 dark:text-gray-300">reasoning</span>: request deeper chain‑of‑thought signals (where supported)</div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

