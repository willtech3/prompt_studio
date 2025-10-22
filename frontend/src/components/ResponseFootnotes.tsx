import { useMemo, useState } from 'react'
import type { RunTrace } from '../types/models'

interface Props { run?: RunTrace | null }

export function ResponseFootnotes({ run }: Props) {
  const links = run?.tools.flatMap(t => t.links || []) || []
  if (!links.length) return null
  const host = (url?: string) => { try { return new URL(url || '').hostname } catch { return '' } }

  const groups = useMemo(() => {
    const m = new Map<string, { title: string; url: string }[]>()
    for (const l of links) {
      const h = host(l.url) || 'other'
      if (!m.has(h)) m.set(h, [])
      m.get(h)!.push({ title: l.title || l.url, url: l.url })
    }
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length)
  }, [links])

  const [open, setOpen] = useState(false)

  return (
    <section className="mt-4">
      <button onClick={() => setOpen(o => !o)} className="text-xs text-gray-700 dark:text-gray-300 hover:underline">
        Sources ({links.length}) – {groups.slice(0, 4).map(([h, arr]) => `${h}×${arr.length}`).join(', ')}
      </button>
      {open && (
        <div className="mt-2">
          {groups.map(([h, arr], gi) => (
            <div key={gi} className="mb-2">
              <div className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">{h}</div>
              <ol className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                {arr.map((l, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="min-w-4">•</span>
                    <a className="hover:underline" href={l.url} target="_blank" rel="noreferrer">{l.title}</a>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default ResponseFootnotes


