 
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

export default function App() {
  return (
    <>
    <div className="app-shell">
      <Header />
      <main className="workspace" aria-label="Prompt Studio workspace">
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
    <div className="layout-grid">
      {/* Left push drawer */}
      <aside
        className={`drawer ${leftOpen ? 'drawer-open' : 'drawer-closed'}`}
        style={{ width: leftOpen ? `${leftWidth}px` : undefined, transition: leftOpen ? 'none' : 'width 280ms ease-in-out' }}
      >
        {leftOpen && (
          <>
            <div className="drawer-surface" aria-label="History drawer">
              <div className="drawer-header">
                <button
                  onClick={toggleLeft}
                  className="icon-button"
                  aria-label="Close history"
                >
                  <PanelLeft className="icon" />
                </button>
                <span className="label">Library</span>
              </div>
              <div className="drawer-content">
                <HistoryPanel bare />
              </div>
            </div>
            {/* Resize handle */}
            <ResizeHandle side="right" onResize={setLeftWidth} currentWidth={leftWidth} />
          </>
        )}
      </aside>

      {/* Main work area with full-height divider between columns */}
      <section className="canvas">
        <div className="panel">
          <PromptEditor />
        </div>
        <div className="panel">
          <ResponsePanel />
        </div>
      </section>

      {/* Right push drawer */}
      <aside
        className={`drawer ${settingsOpen ? 'drawer-open' : 'drawer-closed'}`}
        style={{ width: settingsOpen ? `${rightWidth}px` : undefined, transition: settingsOpen ? 'none' : 'width 280ms ease-in-out' }}
      >
        {settingsOpen && (
          <>
            <div className="drawer-surface" aria-label="Model settings">
              <div className="drawer-header">
                <span className="label">Model settings</span>
                <button
                  onClick={toggleRight}
                  className="icon-button"
                  aria-label="Close settings"
                >
                  <Settings2 className="icon" />
                </button>
              </div>
              <div className="drawer-content padded">
                <SettingsContent />
              </div>
            </div>
            {/* Resize handle */}
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
      className={`resize-handle ${side === 'right' ? 'right-handle' : 'left-handle'}`}
      onMouseDown={handleMouseDown}
    >
      <div className="resize-indicator" />
    </div>
  )
}
