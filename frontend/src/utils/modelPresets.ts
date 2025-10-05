export type Provider = 'openai' | 'anthropic' | 'google' | 'xai' | 'deepseek'

export type ModelPreset = {
  provider: Provider
  recommended: {
    temperature?: number
    topP?: number
    topK?: number | null
    frequencyPenalty?: number | null
    presencePenalty?: number | null
  }
  explainer: string
}

function detectProvider(modelId: string): Provider {
  if (modelId.startsWith('openai/')) return 'openai'
  if (modelId.startsWith('anthropic/')) return 'anthropic'
  if (modelId.startsWith('google/')) return 'google'
  if (modelId.startsWith('xai/') || modelId.startsWith('x-ai/')) return 'xai'
  if (modelId.startsWith('deepseek/')) return 'deepseek'
  return 'openai'
}

export function getModelPreset(modelId: string): ModelPreset {
  const provider = detectProvider(modelId)
  switch (provider) {
    case 'anthropic':
      return {
        provider,
        recommended: { temperature: 0.5, topP: 1.0, topK: 40, frequencyPenalty: 0, presencePenalty: 0 },
        explainer: 'Claude: favor clarity, low temp for analysis, and top‑k≈40 for stability. Keep prompts structured (instructions/context/output).',
      }
    case 'google':
      return {
        provider,
        recommended: { temperature: 0.7, topP: 0.95, topK: null, frequencyPenalty: 0, presencePenalty: 0 },
        explainer: 'Gemini: budget tokens, ground with short passages, and request numbered bullets or JSON when needed.',
      }
    case 'xai':
      return {
        provider,
        recommended: { temperature: 0.6, topP: 1.0, topK: null, frequencyPenalty: 0, presencePenalty: 0 },
        explainer: 'Grok: be explicit about role + constraints; use strict JSON schemas for extraction tasks.',
      }
    case 'deepseek':
      return {
        provider,
        recommended: { temperature: 0.5, topP: 0.95, topK: null, frequencyPenalty: 0, presencePenalty: 0 },
        explainer: 'DeepSeek: state objective + constraints + eval criteria; keep outputs atomic and structured.',
      }
    case 'openai':
    default:
      return {
        provider: 'openai',
        recommended: { temperature: 0.7, topP: 1.0, topK: null, frequencyPenalty: 0, presencePenalty: 0 },
        explainer: 'OpenAI: specify role, task, constraints, success criteria; use JSON mode for structured outputs; plan → answer for complex tasks.',
      }
  }
}

