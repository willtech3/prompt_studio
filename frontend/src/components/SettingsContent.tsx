import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'
import { ParametersPanel } from './ParametersPanel'
import { ModelDetails } from './ModelDetails'
import { usePromptStore, type Provider } from '../store/promptStore'
import { getModelPreset } from '../utils/modelPresets'
import { useSettingsStore, type ProviderID } from '../store/settingsStore'

const KNOWN_PROVIDERS: Record<ProviderID, true> = {
  openai: true,
  anthropic: true,
  google: true,
  xai: true,
  deepseek: true,
}

const isKnownProvider = (id: string): id is ProviderID => id in KNOWN_PROVIDERS

export function SettingsContent() {
  const provider = usePromptStore((s) => s.provider)
  const model = usePromptStore((s) => s.model)
  const setProvider = usePromptStore((s) => s.setProvider)
  const setModel = usePromptStore((s) => s.setModel)
  const setModelInfo = usePromptStore((s) => s.setModelInfo)
  const setSupportedParameters = usePromptStore((s) => s.setSupportedParameters)
  const applyModelPresets = usePromptStore((s) => s.applyModelPresets)

  const [models, setModels] = useState<Array<{ id: string; name?: string }>>([])
  const [providers, setProviders] = useState<Array<{ id: string; name: string }>>([])
  const enabled = useSettingsStore((s) => s.enabledProviders)
  const modelsForProvider = useMemo(() => {
    // Handle provider prefix mapping (xai uses 'x-ai/' in model IDs)
    const prefixes = provider === 'xai' ? ['xai/', 'x-ai/'] : [provider + '/']
    return models.filter((m) => prefixes.some(prefix => m.id.startsWith(prefix)))
  }, [models, provider])

  // Load models/providers once
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [modelList, providerList] = await Promise.all([
          api.getModels(),
          api.getProviders(),
        ])
        if (!cancelled) {
          setModels(modelList)
          // filter providers by user settings
          const filtered = providerList.filter((p) => {
            if (isKnownProvider(p.id)) {
              return enabled[p.id] !== false
            }
            return true
          })
          setProviders(filtered)
        }
      } catch {
        if (!cancelled) {
          setModels([])
          setProviders([])
        }
      }
    })()
    return () => { cancelled = true }
  }, [enabled])

  // Ensure a valid model when provider changes
  useEffect(() => {
    const prefixes = provider === 'xai' ? ['xai/', 'x-ai/'] : [provider + '/']
    const hasValidModel = prefixes.some(prefix => model.startsWith(prefix))
    if (!hasValidModel) {
      const first = models.find((m) => prefixes.some(prefix => m.id.startsWith(prefix)))?.id
      if (first) setModel(first)
    }
  }, [provider, models])

  // Fetch model info + supported params on model change
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!model) return
      try {
        const info = await api.getModelInfo(model)
        if (cancelled) return
        setModelInfo(info)
        const supported = Array.isArray(info?.supported_parameters) ? info.supported_parameters : []
        setSupportedParameters(supported)
        const preset = getModelPreset(model)
        applyModelPresets(preset.recommended, preset.explainer)
      } catch {
        if (cancelled) return
        setModelInfo(undefined)
        setSupportedParameters(['temperature', 'top_p', 'max_tokens', 'top_k', 'stop', 'reasoning', 'include_reasoning'])
        const preset = getModelPreset(model)
        applyModelPresets(preset.recommended, preset.explainer)
      }
    })()
    return () => { cancelled = true }
  }, [model])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Provider</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as Provider)}
            className="w-full text-sm rounded-md bg-transparent border border-gray-300 dark:border-white/15 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full text-sm rounded-md bg-transparent border border-gray-300 dark:border-white/15 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {modelsForProvider.map((m) => {
              const fallback = m.id.includes('/') ? m.id.split('/')[1] : m.id
              const label = m.name && m.name.trim().length > 0 ? m.name : fallback
              return <option key={m.id} value={m.id}>{label}</option>
            })}
          </select>
        </div>
      </div>

      <ParametersPanel />
      <ModelDetails />
    </div>
  )
}
