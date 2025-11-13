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


// Tool executions and run trace (for Run Inspector UI)
export type ToolStatus = 'queued' | 'running' | 'completed' | 'failed'

export interface ToolLink {
  title: string
  url: string
  source?: string
  snippet?: string
  faviconUrl?: string
}

export interface ToolExecutionTrace {
  id: string
  name: string
  displayName?: string
  status: ToolStatus
  startedAt?: string
  endedAt?: string
  durationMs?: number
  parameters?: Record<string, unknown> | null
  outputSummary?: string
  links?: ToolLink[]
  outputRaw?: unknown
  error?: { message: string; code?: string } | null
  category?: 'search' | 'utility' | 'other'
  visibility?: 'primary' | 'secondary' | 'hidden'
}

export interface ReasoningBlock {
  id: string
  content: string
  timestamp: string
}

export interface RunTrace {
  runId: string
  model: string
  startedAt: string
  endedAt?: string
  totalDurationMs?: number
  tokens?: { input?: number; output?: number; total?: number; costUsd?: number }
  tools: ToolExecutionTrace[]
  reasoning: ReasoningBlock[]
}

export interface SearchExecution {
  id: string
  phase: number
  open: boolean
}

