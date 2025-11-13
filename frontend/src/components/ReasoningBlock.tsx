import { Brain, ChevronDown, ChevronRight } from 'lucide-react'

interface Props {
  content: string
  isStreaming?: boolean
  open: boolean
  onToggle: () => void
}

export default function ReasoningBlock({ content, isStreaming, open, onToggle }: Props) {
  const hasContent = !!(content && content.trim())

  return (
    <section className="mb-3">
      <button
        onClick={onToggle}
        className="w-full text-left text-sm flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-100"
      >
        <Brain className="h-4 w-4" />
        <span className="font-medium">Reasoning</span>
        {isStreaming && (
          <span className="inline-flex items-center gap-2 text-xs text-blue-600 dark:text-blue-300">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            thinking…
          </span>
        )}
        {open ? <ChevronDown className="h-3.5 w-3.5 opacity-70 ml-auto" /> : <ChevronRight className="h-3.5 w-3.5 opacity-70 ml-auto" />}
      </button>
      {open && (hasContent || isStreaming) && (
        <div className="mt-2 rounded-md border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-900/50 p-3">
          {hasContent ? (
            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {content}
            </div>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400 italic">
              Waiting for reasoning tokens…
            </div>
          )}
        </div>
      )}
    </section>
  )
}
