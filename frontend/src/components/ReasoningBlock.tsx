import { useState } from 'react'
import { Brain, ChevronDown, ChevronRight } from 'lucide-react'

interface Props {
  content: string
  index: number
}

export default function ReasoningBlock({ content, index }: Props) {
  const [open, setOpen] = useState(false)

  if (!content || !content.trim()) return null

  return (
    <section className="mb-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left text-sm flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-100"
      >
        <Brain className="h-4 w-4" />
        <span className="font-medium">Reasoning</span>
        {open ? <ChevronDown className="h-3.5 w-3.5 opacity-70" /> : <ChevronRight className="h-3.5 w-3.5 opacity-70" />}
      </button>
      {open && (
        <div className="mt-2 rounded-md border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-900/50 p-3">
          <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {content}
          </div>
        </div>
      )}
    </section>
  )
}
