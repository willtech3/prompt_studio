export interface OpenRouterPricing {
  prompt?: string
  completion?: string
  request?: string
}

export interface OpenRouterTopProvider {
  context_length?: number
  max_completion_tokens?: number | null
}

export interface OpenRouterModel {
  id: string
  name?: string
  description?: string
  context_length?: number
  pricing?: OpenRouterPricing
  top_provider?: OpenRouterTopProvider
  supported_parameters?: string[]
}


