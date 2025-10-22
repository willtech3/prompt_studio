import { useMemo, useState } from 'react'
import type { RunTrace } from '../types/models'
import { Globe, ChevronDown, ChevronRight } from 'lucide-react'

interface Props { run?: RunTrace | null }

function faviconUrl(u?: string) {
  if (!u) return ''
  try {
    const host = new URL(u).hostname
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`
  } catch { return '' }
}

export default function SearchResultsInline({ run }: Props) {
  const links = useMemo(() => (run?.tools || []).flatMap(t => t.links || []), [run?.tools])
  const items = useMemo(() => {
    const map = new Map<string, { title: string; url: string; source?: string; snippet?: string }>()
    for (const l of links) {
      try {
        const u = new URL(l.url)
        const key = `${u.hostname}${u.pathname}`
        if (!map.has(key)) map.set(key, { title: l.title || l.url, url: l.url, source: l.source, snippet: l.snippet })
      } catch {
        const key = l.url
        if (!map.has(key)) map.set(key, { title: l.title || l.url, url: l.url, source: l.source, snippet: l.snippet })
      }
    }
    return Array.from(map.values())
  }, [links])

  const [open, setOpen] = useState(true)
  if (!items.length) return null
  return (
    <section className="mb-3">
      <button onClick={() => setOpen(o => !o)} className="w-full text-left text-sm flex items-center gap-2 text-gray-700 dark:text-gray-200">
        <Globe className="h-4 w-4" />
        <span className="font-medium">Searched the web</span>
        {open ? <ChevronDown className="h-3.5 w-3.5 opacity-70"/> : <ChevronRight className="h-3.5 w-3.5 opacity-70"/>}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {items.map((l, i) => (
            <a key={i} href={l.url} target="_blank" rel="noreferrer" className="block rounded-md border border-gray-200 dark:border-white/10 p-2 hover:bg-gray-50 dark:hover:bg-gray-900">
              <div className="flex items-start gap-2">
                <img src={faviconUrl(l.url)} alt="" className="h-4 w-4 mt-1 rounded-sm"/>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate text-blue-700 dark:text-blue-300">{l.title}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 truncate">{l.url}</div>
                  {l.snippet && <div className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 mt-0.5">{l.snippet}</div>}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  )
}


