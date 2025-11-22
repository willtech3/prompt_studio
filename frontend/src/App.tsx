import { Header } from './components/Header'
import { PromptEditor } from './components/PromptEditor'
import { ResponsePanel } from './components/ResponsePanel'
import { ToastContainer } from './components/ToastContainer'
import { SettingsSheet } from './components/SettingsSheet'
import { LeftDrawer } from './components/LeftDrawer'
import { useUIStore } from './store/uiStore'
import { SettingsContent } from './components/SettingsContent'
import { UserSettingsScreen } from './components/UserSettingsScreen'
import { HistoryPanel } from './components/HistoryPanel'
import { PromptGuidanceModal } from './components/PromptGuidanceModal'
import { PanelLeft, Settings2 } from 'lucide-react'
import React from 'react'

export default function App() {
  return (
    <>
      <div className="app-shell">
        <Header />
        <main className="app-main">
          <DesktopPushLayout />
        </main>
      </div>
      <SettingsSheet />
      <LeftDrawer />
      <UserSettingsScreen />
      <PromptGuidanceModal />
      <ToastContainer />
    </>
  )
}

function DesktopPushLayout() {
  const leftOpen = useUIStore((s) => s.leftOpen)
  const settingsOpen = useUIStore((s) => s.settingsOpen)
  const toggleLeft = useUIStore((s) => s.toggleLeft)
  const toggleRight = useUIStore((s) => s.toggleSettings)
  const leftWidth = useUIStore((s) => s.leftWidth)
  const rightWidth = useUIStore((s) => s.rightWidth)
  const setLeftWidth = useUIStore((s) => s.setLeftWidth)
  const setRightWidth = useUIStore((s) => s.setRightWidth)

  return (
    <div className="workspace" aria-label="Prompt studio workspace">
      <aside
        className="drawer"
        style={{ width: leftOpen ? `${leftWidth}px` : undefined, transition: leftOpen ? 'none' : 'width 300ms ease-in-out' }}
      >
        {leftOpen && (
          <>
            <div className="drawer-surface">
              <div className="drawer-header">
                <button onClick={toggleLeft} className="md-icon-button" aria-label="Close library">
                  <PanelLeft className="h-4 w-4" />
                </button>
                <span className="drawer-title">Library</span>
              </div>
              <div className="drawer-body">
                <HistoryPanel bare />
              </div>
            </div>
            <ResizeHandle side="right" onResize={setLeftWidth} currentWidth={leftWidth} />
          </>
        )}
      </aside>

      <section className="panel-stack">
        <div className="panel-column">
          <PromptEditor />
        </div>
        <div className="panel-column">
          <ResponsePanel />
        </div>
      </section>

      <aside
        className="drawer"
        style={{ width: settingsOpen ? `${rightWidth}px` : undefined, transition: settingsOpen ? 'none' : 'width 300ms ease-in-out' }}
      >
        {settingsOpen && (
          <>
            <div className="drawer-surface">
              <div className="drawer-header">
                <span className="drawer-title">Model settings</span>
                <button onClick={toggleRight} className="md-icon-button" aria-label="Close settings">
                  <Settings2 className="h-4 w-4" />
                </button>
              </div>
              <div className="drawer-body">
                <SettingsContent />
              </div>
            </div>
            <ResizeHandle side="left" onResize={setRightWidth} currentWidth={rightWidth} />
          </>
        )}
      </aside>
    </div>
  )
}

function ResizeHandle({ side, onResize, currentWidth }: { side: 'left' | 'right', onResize: (width: number) => void, currentWidth: number }) {
  const handleMouseDown = (e: React.MouseEvent) => {
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
  }

  return (
    <div
      className="resize-handle"
      style={{ [side === 'right' ? 'right' : 'left']: 0 }}
      onMouseDown={handleMouseDown}
      aria-label="Resize panel"
      role="separator"
    />
  )
}
