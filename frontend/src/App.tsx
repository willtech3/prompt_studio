 
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
    <div className="desktop-layout">
      <aside
        className={`side-panel left ${leftOpen ? 'open' : ''}`}
        style={{ width: leftOpen ? `${leftWidth}px` : undefined, transition: leftOpen ? 'none' : 'width 300ms ease-in-out' }}
        aria-hidden={!leftOpen}
      >
        {leftOpen && (
          <>
            <div className="panel-shell">
              <div className="panel-header compact">
                <button onClick={toggleLeft} className="icon-button" aria-label="Close history">
                  <PanelLeft className="icon" />
                </button>
                <span className="label">Library</span>
              </div>
              <div className="panel-body inset">
                <HistoryPanel bare />
              </div>
            </div>
            <ResizeHandle side="right" onResize={setLeftWidth} currentWidth={leftWidth} />
          </>
        )}
      </aside>

      <section className="workspace">
        <div className="workspace-column">
          <PromptEditor />
        </div>
        <div className="workspace-column">
          <ResponsePanel />
        </div>
      </section>

      <aside
        className={`side-panel right ${settingsOpen ? 'open' : ''}`}
        style={{ width: settingsOpen ? `${rightWidth}px` : undefined, transition: settingsOpen ? 'none' : 'width 300ms ease-in-out' }}
        aria-hidden={!settingsOpen}
      >
        {settingsOpen && (
          <>
            <div className="panel-shell">
              <div className="panel-header compact">
                <span className="label">Model Settings</span>
                <button onClick={toggleRight} className="icon-button" aria-label="Close settings">
                  <Settings2 className="icon" />
                </button>
              </div>
              <div className="panel-body inset">
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
      className={`resize-handle ${side}`}
      onMouseDown={handleMouseDown}
    >
      <div className="resize-grip" />
    </div>
  )
}
