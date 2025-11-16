type BestPracticesProps = {
  bare?: boolean
}

const tips: Array<{ title: string; bullets: string[] }> = [
  {
    title: 'Set context up front',
    bullets: [
      'Describe the goal, audience, and any domain constraints.',
      'Explain why you are asking so the model can reason about trade-offs.',
    ],
  },
  {
    title: 'Show, do, refine',
    bullets: [
      'Provide a short example of the tone or structure you want.',
      'Ask the model to critique its own answer and suggest an iteration.',
    ],
  },
  {
    title: 'Constrain the output format',
    bullets: [
      'List required sections, bullet counts, or JSON keys explicitly.',
      'Mention what should be avoided (jargon, speculation, etc.).',
    ],
  },
  {
    title: 'Capture evaluation signals',
    bullets: [
      'Define what “good” looks like in one or two measurable sentences.',
      'Call out the most important fact(s) or citations to verify.',
    ],
  },
]

export function BestPractices({ bare = false }: BestPracticesProps) {
  return (
    <div className={`space-y-4 text-sm ${bare ? 'p-4' : 'p-6'}`}>
      <p className="text-gray-600 dark:text-gray-300">
        Quick reminders for crafting prompts that are easier to iterate on.
        Use them as a checklist while you experiment in the workspace.
      </p>
      <div className="space-y-3">
        {tips.map((tip) => (
          <article
            key={tip.title}
            className="rounded-lg border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/5 p-3"
          >
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{tip.title}</h3>
            <ul className="list-disc pl-4 space-y-1 text-gray-600 dark:text-gray-300">
              {tip.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Need deeper guidance? Check the prompt guides in the docs folder for provider-specific tips.
      </p>
    </div>
  )
}


