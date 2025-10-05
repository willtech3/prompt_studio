import { useEffect } from 'react'

export function useAutoGrow(ref: React.RefObject<HTMLTextAreaElement>, value: string, opts?: { maxHeight?: number }) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.overflow = 'hidden'
    const maxH = opts?.maxHeight
    if (maxH) {
      const next = Math.min(el.scrollHeight + 2, maxH)
      el.style.height = next + 'px'
      el.style.overflow = next >= maxH ? 'auto' : 'hidden'
    } else {
      // No max height - grow infinitely
      el.style.height = (el.scrollHeight + 2) + 'px'
    }
  }, [ref, value, opts?.maxHeight])
}

