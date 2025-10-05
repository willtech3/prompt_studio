import { create } from 'zustand'

export type Provider = 'openai' | 'anthropic' | 'google' | 'xai' | 'deepseek'

export interface ModelParameters {
  temperature: number
  maxTokens: number
  topP: number
  streaming: boolean
  // Optional advanced params (null when unused)
  topK: number | null
  frequencyPenalty: number | null
  presencePenalty: number | null
  repetitionPenalty: number | null
  minP: number | null
  topA: number | null
  seed: number | null
  responseFormat: string | null
  stop: string | null
  logprobs: boolean | null
  topLogprobs: number | null
  logitBiasJson: string | null
}

export interface OptimizationInfo {
  time: number
  notes: string[]
  changes: string[]
}

export interface HistoryItem {
  id: string
  title: string
  createdAt: number
  provider: Provider
  model: string
  systemPrompt: string
  userPrompt: string
}

export interface PromptState {
  provider: Provider
  model: string
  systemPrompt: string
  userPrompt: string
  variables: { name: string; value: string }[]
  parameters: ModelParameters
  reasoningEffort: 'auto' | 'low' | 'medium' | 'high'
  response: string
  isStreaming: boolean
  history: HistoryItem[]
  modelInfo?: any
  supportedParameters: string[]
  systemOptInfo?: OptimizationInfo
  userOptInfo?: OptimizationInfo
  presetExplainer?: string | null
  showPresetExplainer: boolean
}

interface PromptActions {
  setProvider: (p: Provider) => void
  setModel: (m: string) => void
  setSystemPrompt: (v: string) => void
  setUserPrompt: (v: string) => void
  setTemperature: (v: number) => void
  setMaxTokens: (v: number) => void
  setTopP: (v: number) => void
  setStreaming: (v: boolean) => void
  setTopK: (v: number | null) => void
  setFrequencyPenalty: (v: number | null) => void
  setPresencePenalty: (v: number | null) => void
  setRepetitionPenalty: (v: number | null) => void
  setMinP: (v: number | null) => void
  setTopA: (v: number | null) => void
  setSeed: (v: number | null) => void
  setResponseFormat: (v: string | null) => void
  setStop: (v: string | null) => void
  setLogprobs: (v: boolean | null) => void
  setTopLogprobs: (v: number | null) => void
  setLogitBiasJson: (v: string | null) => void
  addVariable: () => void
  updateVariableName: (index: number, name: string) => void
  updateVariableValue: (index: number, value: string) => void
  removeVariable: (index: number) => void
  setResponse: (v: string) => void
  appendResponse: (chunk: string) => void
  setIsStreaming: (v: boolean) => void
  setReasoningEffort: (v: 'auto' | 'low' | 'medium' | 'high') => void
  setModelInfo: (info: any | undefined) => void
  setSupportedParameters: (params: string[]) => void
  setSystemOptInfo: (info: OptimizationInfo | undefined) => void
  setUserOptInfo: (info: OptimizationInfo | undefined) => void
  applyModelPresets: (preset: {
    temperature?: number
    topP?: number
    topK?: number | null
    frequencyPenalty?: number | null
    presencePenalty?: number | null
  }, explainer?: string | null) => void
  dismissPresetExplainer: () => void
  addHistoryEntry: () => void
  restoreFromHistory: (id: string) => void
  clearHistory: () => void
  reset: () => void
}

export const usePromptStore = create<PromptState & PromptActions>((set) => ({
  provider: 'openai',
  model: 'openai/gpt-4o',
  systemPrompt: '',
  userPrompt: '',
  variables: [],
  parameters: {
    temperature: 0.7,
    maxTokens: 8000,
    topP: 1,
    streaming: true,
    topK: null,
    frequencyPenalty: null,
    presencePenalty: null,
    repetitionPenalty: null,
    minP: null,
    topA: null,
    seed: null,
    responseFormat: null,
    stop: null,
    logprobs: null,
    topLogprobs: null,
    logitBiasJson: null,
  },
  reasoningEffort: 'auto',
  response: '',
  isStreaming: false,
  history: [],
  modelInfo: undefined,
  supportedParameters: [],
  systemOptInfo: undefined,
  userOptInfo: undefined,
  presetExplainer: null,
  showPresetExplainer: true,
  setProvider: (p) => set({ provider: p }),
  setModel: (m) => set({ model: m }),
  setSystemPrompt: (v) => set({ systemPrompt: v }),
  setUserPrompt: (v) => set({ userPrompt: v }),
  setTemperature: (v) => set((s) => ({ parameters: { ...s.parameters, temperature: v } })),
  setMaxTokens: (v) => set((s) => ({ parameters: { ...s.parameters, maxTokens: Math.max(1, Math.floor(v)) } })),
  setTopP: (v) => set((s) => ({ parameters: { ...s.parameters, topP: Math.min(1, Math.max(0, v)) } })),
  setStreaming: (v) => set((s) => ({ parameters: { ...s.parameters, streaming: v } })),
  setTopK: (v) => set((s) => ({ parameters: { ...s.parameters, topK: v } })),
  setFrequencyPenalty: (v) => set((s) => ({ parameters: { ...s.parameters, frequencyPenalty: v } })),
  setPresencePenalty: (v) => set((s) => ({ parameters: { ...s.parameters, presencePenalty: v } })),
  setRepetitionPenalty: (v) => set((s) => ({ parameters: { ...s.parameters, repetitionPenalty: v } })),
  setMinP: (v) => set((s) => ({ parameters: { ...s.parameters, minP: v } })),
  setTopA: (v) => set((s) => ({ parameters: { ...s.parameters, topA: v } })),
  setSeed: (v) => set((s) => ({ parameters: { ...s.parameters, seed: v } })),
  setResponseFormat: (v) => set((s) => ({ parameters: { ...s.parameters, responseFormat: v } })),
  setStop: (v) => set((s) => ({ parameters: { ...s.parameters, stop: v } })),
  setLogprobs: (v) => set((s) => ({ parameters: { ...s.parameters, logprobs: v } })),
  setTopLogprobs: (v) => set((s) => ({ parameters: { ...s.parameters, topLogprobs: v } })),
  setLogitBiasJson: (v) => set((s) => ({ parameters: { ...s.parameters, logitBiasJson: v } })),
  addVariable: () => set((s) => ({ variables: [...s.variables, { name: '', value: '' }] })),
  updateVariableName: (index, name) => set((s) => ({ variables: s.variables.map((v, i) => i === index ? { ...v, name } : v) })),
  updateVariableValue: (index, value) => set((s) => ({ variables: s.variables.map((v, i) => i === index ? { ...v, value } : v) })),
  removeVariable: (index) => set((s) => ({ variables: s.variables.filter((_, i) => i !== index) })),
  setResponse: (v) => set({ response: v }),
  appendResponse: (chunk) => set((s) => ({ response: s.response + chunk })),
  setIsStreaming: (v) => set({ isStreaming: v }),
  setReasoningEffort: (v) => set({ reasoningEffort: v }),
  setModelInfo: (info) => set({ modelInfo: info }),
  setSupportedParameters: (params) => set({ supportedParameters: params }),
  setSystemOptInfo: (info) => set({ systemOptInfo: info }),
  setUserOptInfo: (info) => set({ userOptInfo: info }),
  applyModelPresets: (preset, explainer) => set((s) => ({
    parameters: {
      ...s.parameters,
      temperature: preset.temperature ?? s.parameters.temperature,
      topP: typeof preset.topP === 'number' ? preset.topP : s.parameters.topP,
      topK: typeof preset.topK === 'number' ? preset.topK : preset.topK === null ? null : s.parameters.topK,
      frequencyPenalty: typeof preset.frequencyPenalty === 'number' ? preset.frequencyPenalty : s.parameters.frequencyPenalty,
      presencePenalty: typeof preset.presencePenalty === 'number' ? preset.presencePenalty : s.parameters.presencePenalty,
    },
    presetExplainer: explainer ?? s.presetExplainer,
    showPresetExplainer: true,
  })),
  dismissPresetExplainer: () => set({ showPresetExplainer: false }),
  addHistoryEntry: () => set((s) => {
    const titleBase = s.userPrompt.trim() || s.systemPrompt.trim() || 'Untitled'
    const title = titleBase.length > 60 ? titleBase.slice(0, 57) + '…' : titleBase
    const entry: HistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      createdAt: Date.now(),
      provider: s.provider,
      model: s.model,
      systemPrompt: s.systemPrompt,
      userPrompt: s.userPrompt,
    }
    return { history: [entry, ...s.history] }
  }),
  restoreFromHistory: (id) => set((s) => {
    const item = s.history.find((h) => h.id === id)
    if (!item) return {}
    return {
      provider: item.provider,
      model: item.model,
      systemPrompt: item.systemPrompt,
      userPrompt: item.userPrompt,
    }
  }),
  clearHistory: () => set({ history: [] }),
  reset: () => set({ systemPrompt: '', userPrompt: '', response: '' }),
}))
