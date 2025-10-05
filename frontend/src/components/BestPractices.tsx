import { useEffect, useState } from 'react'
import { Copy } from 'lucide-react'
import { usePromptStore, type Provider } from '../store/promptStore'
import { api } from '../services/api'

type Curated = {
  title: string
  bullets: string[]
  structure: string[]
  why: string[]
  examples: { label: string; code: string }[]
  docPath: string
}

// Fallback data in case API fails
const fallbackByProvider: Record<string, Curated> = {
  openai: {
    title: 'OpenAI – Essentials',
    bullets: [
      'Be specific: role, task, audience, constraints, success criteria.',
      'Provide context and structure; ask for a format (JSON, bullets).',
      'For complex tasks: plan → answer; keep temperature + top_p sane.',
    ],
    structure: [
      'System: durable rules (tone, role, constraints).',
      'User: task + minimal context/examples.',
      'Output: strict format (JSON schema or bullets).',
    ],
    why: [
      'Specificity reduces ambiguity and off‑target generations.',
      'Structure helps the model allocate tokens and plan.',
      'Explicit formats make downstream parsing reliable.',
    ],
    examples: [
      {
        label: 'Message structure',
        code: `System: You are a precise technical assistant.\nUser:\nTask: <what to do>\nConstraints: <rules, tone, length>\nInput <<<...content...>>>`,
      },
      {
        label: 'Structured output',
        code: `Ask for JSON (response_format: json_object).\nSchema: {"field": string, "items": string[]}`,
      },
    ],
    docPath: 'https://platform.openai.com/docs/guides/prompt-engineering',
  },
  anthropic: {
    title: 'Anthropic (Claude) – Essentials',
    bullets: [
      'Keep durable rules in system; be explicit and concise.',
      'Use simple XML tags to structure tasks and outputs.',
      'Prefer low temperature for analytical tasks; stream when helpful.',
    ],
    structure: [
      '<instructions> rules and objective </instructions>',
      '<context> minimal grounding </context>',
      '<output> format + example </output>',
    ],
    why: [
      'XML tags give Claude stable anchors for sections.',
      'Short context avoids drowning the task with noise.',
      'Lower temperature increases determinism for evals.',
    ],
    examples: [
      {
        label: 'XML structure',
        code: `<instructions>Do X following Y rules</instructions>\n<context>short, relevant context</context>\n<output>Return JSON: {"a": string, "b": number}</output>`,
      },
      {
        label: 'Plan → answer',
        code: `First: outline steps as a numbered list.\nThen: produce the final answer only.`,
      },
    ],
    docPath: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering',
  },
  google: {
    title: 'Google (Gemini) – Essentials',
    bullets: [
      'Be explicit; include role, constraints, success criteria.',
      'Ground with short passages or examples; keep prompts lean.',
      'Use streaming for long outputs; specify token budgets.',
    ],
    structure: [
      'Role: <who should respond>',
      'Task: <what to produce> with limits',
      'Grounding: <<< short passage >>>',
      'Output: numbered bullets or JSON',
    ],
    why: [
      'Clear roles improve adherence to style/voice.',
      'Grounding boosts factuality without overloading context.',
      'Budgets prevent over‑long, meandering answers.',
    ],
    examples: [
      {
        label: 'Prompt skeleton',
        code: `Role: concise assistant\nTask: <task>\nConstraints: <= 200 tokens, bullet list\nGrounding: <<<short passage>>>\nOutput: - bullet 1`,
      },
    ],
    docPath: 'https://developers.google.com/machine-learning/resources/prompt-eng',
  },
  xai: {
    title: 'xAI (Grok) – Essentials',
    bullets: [
      'Specify role + task explicitly; ask for JSON when needed.',
      'Validate downstream; retry with corrective hints on schema errors.',
      'Tune a single stochastic param at a time (temperature/top_p).',
    ],
    structure: [
      'System: strict rules + safety + tone',
      'User: input + expected JSON keys/types',
      'Output: JSON only, no prose',
    ],
    why: [
      'JSON‑first prompts reduce scraping/cleanup work.',
      'Single‑parameter tuning isolates changes for evals.',
      'Explicit keys prevent missing fields in outputs.',
    ],
    examples: [
      {
        label: 'JSON extraction',
        code: `Return only JSON: {"title": string, "date": string, "bullets": string[]}`,
      },
    ],
    docPath: 'https://docs.x.ai/docs',
  },
  deepseek: {
    title: 'DeepSeek – Essentials',
    bullets: [
      'State objective, constraints, and evaluation criteria.',
      'Prefer short, iterative calls over one very long generation.',
      'Keep outputs structured and atomic for reliability.',
    ],
    structure: [
      'Goal: <clear objective>',
      'Constraints: <limits> (time/tokens/format)',
      'Eval: <what success looks like>',
      'Output: schema or bullets',
    ],
    why: [
      'Iterating reduces failure surface and cost.',
      'Atomic outputs are easier to verify and chain.',
      'Explicit eval criteria improve consistency.',
    ],
    examples: [
      {
        label: 'Prompt skeleton',
        code: `Role: senior analyst\nTask: extract fields\nSchema: {"company": string, "summary": string}\nText <<<...>>>`,
      },
    ],
    docPath: 'https://api-docs.deepseek.com',
  },
}

export function BestPractices({ bare = false }: { bare?: boolean }) {
  const provider = usePromptStore((s) => s.provider)
  const [curated, setCurated] = useState<Curated | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const data = await api.getProviderBestPractices(provider)
        if (!cancelled) {
          setCurated({
            title: data.title || '',
            bullets: data.content?.bullets || [],
            structure: data.content?.structure || [],
            why: data.content?.why || [],
            examples: data.content?.examples || [],
            docPath: data.doc_url || ''
          })
        }
      } catch (err) {
        console.error('Failed to load best practices:', err)
        if (!cancelled) {
          // Fallback to hardcoded data
          setCurated(fallbackByProvider[provider] || null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [provider])

  if (loading || !curated) {
    return null
  }

  const onCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // noop for MVP
    }
  }

  const Container: React.ElementType = bare ? 'div' : 'section'
  const containerClass = bare
    ? 'p-4 max-h-[calc(100vh-7rem)] overflow-auto'
    : 'rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 shadow max-h-[calc(100vh-7rem)] overflow-auto'

  return (
    <Container className={containerClass}>
      <div className="mb-3">
        {!bare && (<div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Best Practices</div>)}
        <h3 className="font-semibold mt-1">{curated.title}</h3>
      </div>

      {/* Core Principles */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Core principles</div>
        <ul className="list-disc pl-5 text-sm space-y-1">
          {curated.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </div>

      <div className="h-5" />

      {/* Recommended Structure */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Recommended structure</div>
        <ul className="list-disc pl-5 text-sm space-y-1">
          {curated.structure.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>

      <div className="h-5" />

      {/* Why it works */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Why this works</div>
        <ul className="list-disc pl-5 text-sm space-y-1">
          {curated.why.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </div>

      <div className="h-5" />

      {/* Examples */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Example prompts</div>
        <div className="space-y-3">
          {curated.examples.map((ex) => (
            <div key={ex.label} className="rounded-md border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/5">
              <div className="flex items-center justify-between px-3 py-2 text-xs font-medium">
                <span>{ex.label}</span>
                <button
                  onClick={() => onCopy(ex.code)}
                  className="rounded-md p-1.5 border border-gray-300 dark:border-white/15 hover:bg-gray-100 dark:hover:bg-white/10"
                  aria-label="Copy example"
                  title="Copy"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <pre className="px-3 pb-3 text-xs whitespace-pre-wrap leading-snug"><code>{ex.code}</code></pre>
            </div>
          ))}
        </div>
      </div>

      <div className="h-5" />

      <a
        href={curated.docPath}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-blue-600 hover:underline"
      >
        View full guide ↗
      </a>
    </Container>
  )
}
