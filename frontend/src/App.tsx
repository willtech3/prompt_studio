 
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
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100 antialiased font-sans use-app-font">
      <Header />
      <main>
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
    <div className="hidden lg:flex gap-0 relative items-stretch">
      {/* Left push drawer */}
      <aside 
        className={`relative flex-shrink-0 ${leftOpen ? 'self-stretch' : 'w-0 overflow-hidden'}`}
        style={{ width: leftOpen ? `${leftWidth}px` : undefined, transition: leftOpen ? 'none' : 'width 300ms ease-in-out' }}
      >
        {leftOpen && (
          <>
            <div className="h-full bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm border-r border-gray-200 dark:border-white/10">
              {/* Drawer header with close button */}
              <div className="h-10 flex items-center justify-between px-4 border-b border-gray-200 dark:border-white/10 sticky top-0 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm z-10">
                <button
                  onClick={toggleLeft}
                  className="p-1.5 -ml-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors"
                  aria-label="Close history"
                >
                  <PanelLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Library</span>
              </div>
              {/* Drawer content */}
              <div className="px-4 py-3">
                <HistoryPanel bare />
              </div>
            </div>
            {/* Resize handle */}
            <ResizeHandle side="right" onResize={setLeftWidth} currentWidth={leftWidth} />
          </>
        )}
      </aside>

      {/* Main work area with full-height divider between columns */}
      <section className="flex-1 min-w-0 min-h-[calc(100vh-3.5rem)] flex transition-all duration-300">
        <div className="flex-1 min-w-0 border-r border-gray-200 dark:border-white/10">
          <PromptEditor />
        </div>
        <div className="flex-1 min-w-0">
          <ResponsePanel />
        </div>
      </section>

      {/* Right push drawer */}
      <aside 
        className={`relative flex-shrink-0 ${settingsOpen ? 'self-stretch' : 'w-0 overflow-hidden'}`}
        style={{ width: settingsOpen ? `${rightWidth}px` : undefined, transition: settingsOpen ? 'none' : 'width 300ms ease-in-out' }}
      >
        {settingsOpen && (
          <>
            <div className="h-full bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm border-l border-gray-200 dark:border-white/10">
              {/* Drawer header with close button */}
              <div className="h-10 flex items-center justify-between px-4 border-b border-gray-200 dark:border-white/10 sticky top-0 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm z-10">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Model Settings</span>
                <button
                  onClick={toggleRight}
                  className="p-1.5 -mr-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors"
                  aria-label="Close settings"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
              </div>
              {/* Drawer content */}
              <div className="px-6 py-4">
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
      className={`absolute top-0 ${side === 'right' ? 'right-0' : 'left-0'} h-full w-1 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500 group z-20`}
      onMouseDown={handleMouseDown}
    >
      <div className={`sticky top-1/2 -translate-y-1/2 ${side === 'right' ? 'right-0.5' : 'left-0.5'} w-1 h-12 bg-gray-400 dark:bg-gray-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity`} />
    </div>
  )
}
