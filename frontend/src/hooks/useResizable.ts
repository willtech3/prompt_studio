import { useCallback } from 'react'

interface UseResizeHandlerOptions {
  side: 'left' | 'right'
  onResize: (width: number) => void
  currentWidth: number
}

export function useResizeHandler({ side, onResize, currentWidth }: UseResizeHandlerOptions) {
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = currentWidth

    const handleMouseMove = (e: MouseEvent) => {
      const delta = side === 'right' ? e.clientX - startX : startX - e.clientX
      onResize(startWidth + delta)
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [side, onResize, currentWidth])

  return handleMouseDown
}


