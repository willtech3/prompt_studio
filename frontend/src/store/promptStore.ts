import { create } from 'zustand'

export type Provider = 'openai' | 'anthropic' | 'google' | 'xai' | 'deepseek'

export interface ModelParameters {
  temperature: number
  maxTokens: number | null
  topP: number
  // Optional advanced params (null when unused)
  topK: number | null
  frequencyPenalty: number | null
  presencePenalty: number | null
  responseFormat: string | null
  stop: string | null
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
  toolSchemas: string
  response: string
  isStreaming: boolean
  history: HistoryItem[]
  modelInfo?: any
  supportedParameters: string[]
  systemOptInfo?: OptimizationInfo
  userOptInfo?: OptimizationInfo
  originalSystemPrompt?: string
  originalUserPrompt?: string
  presetExplainer?: string | null
  showPresetExplainer: boolean
  resetTick: number
}

interface PromptActions {
  setProvider: (p: Provider) => void
  setModel: (m: string) => void
  setSystemPrompt: (v: string) => void
  setUserPrompt: (v: string) => void
  setTemperature: (v: number) => void
  setMaxTokens: (v: number | null) => void
  setTopP: (v: number) => void
  setTopK: (v: number | null) => void
  setFrequencyPenalty: (v: number | null) => void
  setPresencePenalty: (v: number | null) => void
  setResponseFormat: (v: string | null) => void
  setStop: (v: string | null) => void
  addVariable: () => void
  updateVariableName: (index: number, name: string) => void
  updateVariableValue: (index: number, value: string) => void
  removeVariable: (index: number) => void
  setResponse: (v: string) => void
  appendResponse: (chunk: string) => void
  setIsStreaming: (v: boolean) => void
  setReasoningEffort: (v: 'auto' | 'low' | 'medium' | 'high') => void
  setToolSchemas: (v: string) => void
  setModelInfo: (info: any | undefined) => void
  setSupportedParameters: (params: string[]) => void
  setSystemOptInfo: (info: OptimizationInfo | undefined) => void
  setUserOptInfo: (info: OptimizationInfo | undefined) => void
  setOriginalSystemPrompt: (v: string | undefined) => void
  setOriginalUserPrompt: (v: string | undefined) => void
  revertSystemPrompt: () => void
  revertUserPrompt: () => void
  applySystemOptimization: (original: string, optimized: string, info: OptimizationInfo) => void
  applyUserOptimization: (original: string, optimized: string, info: OptimizationInfo) => void
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
    maxTokens: null,
    topP: 1,
    topK: null,
    frequencyPenalty: null,
    presencePenalty: null,
    responseFormat: null,
    stop: null,
  },
  reasoningEffort: 'auto',
  toolSchemas: '',
  response: '',
  isStreaming: false,
  history: [],
  modelInfo: undefined,
  supportedParameters: [],
  systemOptInfo: undefined,
  userOptInfo: undefined,
  originalSystemPrompt: undefined,
  originalUserPrompt: undefined,
  presetExplainer: null,
  showPresetExplainer: true,
  resetTick: 0,
  setProvider: (p) => set({ provider: p }),
  setModel: (m) => set({ model: m }),
  setSystemPrompt: (v) => set((s) => {
    // Only clear optimization info if user is actually editing (value changed) and there's something to clear
    const shouldClearOpt = v !== s.systemPrompt && (s.originalSystemPrompt !== undefined || s.systemOptInfo !== undefined)
    return {
      systemPrompt: v,
      ...(shouldClearOpt ? { originalSystemPrompt: undefined, systemOptInfo: undefined } : {}),
    }
  }),
  setUserPrompt: (v) => set((s) => {
    // Only clear optimization info if user is actually editing (value changed) and there's something to clear
    const shouldClearOpt = v !== s.userPrompt && (s.originalUserPrompt !== undefined || s.userOptInfo !== undefined)
    return {
      userPrompt: v,
      ...(shouldClearOpt ? { originalUserPrompt: undefined, userOptInfo: undefined } : {}),
    }
  }),
  setTemperature: (v) => set((s) => ({ parameters: { ...s.parameters, temperature: v } })),
  setMaxTokens: (v) => set((s) => ({ parameters: { ...s.parameters, maxTokens: v === null ? null : Math.max(1, Math.floor(v)) } })),
  setTopP: (v) => set((s) => ({ parameters: { ...s.parameters, topP: Math.min(1, Math.max(0, v)) } })),
  setTopK: (v) => set((s) => ({ parameters: { ...s.parameters, topK: v } })),
  setFrequencyPenalty: (v) => set((s) => ({ parameters: { ...s.parameters, frequencyPenalty: v } })),
  setPresencePenalty: (v) => set((s) => ({ parameters: { ...s.parameters, presencePenalty: v } })),
  setResponseFormat: (v) => set((s) => ({ parameters: { ...s.parameters, responseFormat: v } })),
  setStop: (v) => set((s) => ({ parameters: { ...s.parameters, stop: v } })),
  addVariable: () => set((s) => ({ variables: [...s.variables, { name: '', value: '' }] })),
  updateVariableName: (index, name) => set((s) => ({ variables: s.variables.map((v, i) => i === index ? { ...v, name } : v) })),
  updateVariableValue: (index, value) => set((s) => ({ variables: s.variables.map((v, i) => i === index ? { ...v, value } : v) })),
  removeVariable: (index) => set((s) => ({ variables: s.variables.filter((_, i) => i !== index) })),
  setResponse: (v) => set({ response: v }),
  appendResponse: (chunk) => set((s) => ({ response: s.response + chunk })),
  setIsStreaming: (v) => set({ isStreaming: v }),
  setReasoningEffort: (v) => set({ reasoningEffort: v }),
  setToolSchemas: (v) => set({ toolSchemas: v }),
  setModelInfo: (info) => set((s) => {
    // Auto-set maxTokens to model's max_completion_tokens if not already set
    const maxTokens = info?.max_completion_tokens || null
    return {
      modelInfo: info,
      parameters: {
        ...s.parameters,
        maxTokens: maxTokens,
      },
    }
  }),
  setSupportedParameters: (params) => set({ supportedParameters: params }),
  setSystemOptInfo: (info) => set({ systemOptInfo: info }),
  setUserOptInfo: (info) => set({ userOptInfo: info }),
  setOriginalSystemPrompt: (v) => set({ originalSystemPrompt: v }),
  setOriginalUserPrompt: (v) => set({ originalUserPrompt: v }),
  revertSystemPrompt: () => set((s) => ({
    systemPrompt: s.originalSystemPrompt ?? s.systemPrompt,
    originalSystemPrompt: undefined,
    systemOptInfo: undefined,
  })),
  revertUserPrompt: () => set((s) => ({
    userPrompt: s.originalUserPrompt ?? s.userPrompt,
    originalUserPrompt: undefined,
    userOptInfo: undefined,
  })),
  applySystemOptimization: (original: string, optimized: string, info: OptimizationInfo) => set({
    systemPrompt: optimized,
    originalSystemPrompt: original,
    systemOptInfo: info,
  }),
  applyUserOptimization: (original: string, optimized: string, info: OptimizationInfo) => set({
    userPrompt: optimized,
    originalUserPrompt: original,
    userOptInfo: info,
  }),
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
  reset: () => set((s) => ({ systemPrompt: '', userPrompt: '', response: '', resetTick: s.resetTick + 1 })),
}))
