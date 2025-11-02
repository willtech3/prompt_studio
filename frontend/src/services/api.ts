export class APIClient {
  streamChat(request: {
    model: string
    prompt: string
    system?: string | null
    temperature?: number
    maxTokens?: number | null
    topP?: number
    reasoningEffort?: 'auto' | 'low' | 'medium' | 'high'
    // Optional advanced params (pass-through)
    topK?: number | null
    frequencyPenalty?: number | null
    presencePenalty?: number | null
    responseFormat?: string | null
    stop?: string | null
    // Tool calling
    tools?: string | null
    toolChoice?: string | null
  }): EventSource {
    const params = new URLSearchParams()
    params.set('model', request.model)
    params.set('prompt', request.prompt || '')
    if (request.system) params.set('system', request.system)
    if (typeof request.temperature === 'number') params.set('temperature', String(request.temperature))
    if (typeof request.topP === 'number') params.set('top_p', String(request.topP))
    if (request.maxTokens) params.set('max_tokens', String(request.maxTokens))
    if (request.reasoningEffort && request.reasoningEffort !== 'auto') params.set('reasoning_effort', request.reasoningEffort)
    if (request.topK != null) params.set('top_k', String(request.topK))
    if (request.frequencyPenalty != null) params.set('frequency_penalty', String(request.frequencyPenalty))
    if (request.presencePenalty != null) params.set('presence_penalty', String(request.presencePenalty))
    if (request.responseFormat) params.set('response_format', request.responseFormat)
    if (request.stop) params.set('stop', request.stop)
    if (request.tools) params.set('tools', request.tools)
    if (request.toolChoice) params.set('tool_choice', request.toolChoice)

    // Use relative path so Vite proxy forwards to backend
    return new EventSource(`/api/chat/stream?${params.toString()}`)
  }

  async getModels(): Promise<{ id: string; name?: string }[]> {
    const res = await fetch('/api/models')
    if (!res.ok) throw new Error('Failed to fetch models')
    const data = await res.json()
    return data?.data ?? []
  }

  async getModelInfo(modelId: string): Promise<any> {
    const encoded = encodeURIComponent(modelId)
    const res = await fetch(`/api/models/${encoded}/info`)
    if (!res.ok) throw new Error('Failed to fetch model info')
    return await res.json()
  }

  async optimizePrompt(input: {
    model: string
    provider?: string
    kind: 'system' | 'user'
    prompt: string
    system?: string | null
  }): Promise<{ optimized: string; changes?: string[]; notes?: string[] }> {
    const res = await fetch('/api/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: input.model,
        provider: input.provider,
        kind: input.kind,
        prompt: input.prompt,
        system: input.system ?? undefined,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(err || 'Failed to optimize prompt')
    }
    return res.json()
  }

  stopStream(es?: EventSource) {
    try { es?.close() } catch { /* noop */ }
  }

  async saveSnapshot(input: {
    title?: string
    kind?: string
    provider?: string
    model?: string
    data: any
  }): Promise<{ id: string }> {
    const res = await fetch('/api/saves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }

  async listSnapshots(): Promise<Array<{ id: string; title?: string; kind: string; provider?: string; model?: string; created_at: string }>> {
    const res = await fetch('/api/saves')
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }

  async getSnapshot(id: string): Promise<any> {
    const res = await fetch(`/api/saves/${id}`)
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }

  async getProviders(): Promise<Array<{ id: string; name: string; model_count: number }>> {
    const res = await fetch('/api/providers')
    if (!res.ok) throw new Error(await res.text())
    const data = await res.json()
    return data?.data ?? []
  }

  async getProviderPromptingGuides(providerId: string, modelId?: string): Promise<any> {
    const url = modelId
      ? `/api/providers/${providerId}/prompting-guides?model_id=${encodeURIComponent(modelId)}`
      : `/api/providers/${providerId}/prompting-guides`
    const res = await fetch(url)
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }
}

export const api = new APIClient()
