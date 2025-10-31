import { Fragment } from 'react'
import { ExternalLink, Globe, Clock, Calculator, Wrench } from 'lucide-react'
import type { RunTrace, ToolExecutionTrace } from '../types/models'

interface Props {
  run?: RunTrace | null
  onOpen?: (toolId?: string) => void
}

function statusColor(status?: ToolExecutionTrace['status']) {
  switch (status) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-300/50'
    case 'running':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300/50'
    case 'failed':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-300/50'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-300/50'
  }
}

function iconForTool(name: string) {
  const id = name.toLowerCase()
  if (id.includes('search') || id.includes('web')) return <Globe className="h-3.5 w-3.5" />
  if (id.includes('time') || id.includes('date')) return <Clock className="h-3.5 w-3.5" />
  if (id.includes('calc')) return <Calculator className="h-3.5 w-3.5" />
  return <Wrench className="h-3.5 w-3.5" />
}

export function ToolChips({ run, onOpen }: Props) {
  if (!run || !run.tools?.length) return null
  const byName: Record<string, ToolExecutionTrace[]> = {}
  for (const t of run.tools) {
    // Hide utility tools from chips per visibility metadata when available
    if ((t.visibility === 'hidden') || (t.category === 'utility' && t.visibility !== 'primary')) continue
    byName[t.name] ||= []
    byName[t.name].push(t)
  }
  const names = Object.keys(byName)
  return (
    <div className="flex items-center gap-2">
      {names.map((name) => {
        const steps = byName[name]
        const last = steps[steps.length - 1]
        return (
          <button
            key={name}
            onClick={() => onOpen?.(last?.id)}
            className={`text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-md border ${statusColor(last?.status)} hover:opacity-90 transition-opacity`}
            title={`${name} · ${steps.length} call${steps.length>1?'s':''}`}
            aria-label={`Open ${name} details`}
          >
            {iconForTool(name)}
            <span className="font-medium capitalize">{last?.displayName || name.replace(/_/g,' ')}</span>
            <span className="opacity-70">{steps.length}</span>
          </button>
        )
      })}
      <button
        onClick={() => onOpen?.()}
        className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-md border bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-300/50 hover:opacity-90"
        title="Open Run details"
        aria-label="Open Run details"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        <span className="font-medium">Details</span>
      </button>
    </div>
  )
}

export default ToolChips

