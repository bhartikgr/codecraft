import { useState } from 'react'
import { useAppState } from './hooks/useAppState.js'
import { Sidebar } from './components/Sidebar.jsx'
import { Dashboard } from './pages/dashboard/Dashboard.jsx'
import { Alerts } from './pages/alerts/Alerts.jsx'
import { FixedApps } from './pages/fixed-apps/FixedApps.jsx'
import { LiveLogs } from './pages/live-logs/LiveLogs.jsx'
import { Settings } from './pages/settings/Settings.jsx'
import { FixFlow } from './pages/fix-flow/FixFlow.jsx'
import { IconMenu, IconBell, IconRefresh } from './components/Icons.jsx'

const PAGES = ['dashboard', 'alerts', 'fixed', 'live-logs', 'settings']

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tweaksOpen, setTweaksOpen] = useState(false)
  const [envEmphasis, setEnvEmphasis] = useState(null)

  const {
    loading,
    errorApps,
    fixedItems,
    dismissed,
    modalApp,
    activeAlerts,
    envData,
    setModalApp,
    handleFixed,
    handleRefix,
    handleDismiss,
    reset
  } = useAppState()

  const navigate = p => {
    setPage(p)
    setSidebarOpen(false)
  }

  return (
    <div className='min-h-screen bg-canvas font-sans text-ink flex'>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className='fixed inset-0 z-30 bg-ink/30 backdrop-blur-sm lg:hidden'
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        page={page}
        onNav={navigate}
        errorCount={errorApps.length}
        alertCount={activeAlerts.length}
        fixedCount={fixedItems.length}
        open={sidebarOpen}
      />

      {/* Main content */}
      <div className='flex-1 flex flex-col min-w-0'>
        {/* Mobile topbar */}
        <header className='lg:hidden sticky top-0 z-20 flex items-center gap-3 bg-raised/90 backdrop-blur border-b border-line px-4 h-14 shrink-0'>
          <button
            onClick={() => setSidebarOpen(true)}
            className='p-2 -ml-1 rounded-md text-ink-mute hover:text-ink hover:bg-sunken transition-colors'
          >
            <IconMenu className='w-5 h-5' />
          </button>
          <div className='flex-1 font-bold text-[15px] tracking-tight'>
            auro-heal
          </div>
          {activeAlerts.length > 0 && (
            <button
              onClick={() => navigate('alerts')}
              className='relative p-2 rounded-md text-ink-mute hover:text-ink hover:bg-sunken transition-colors'
            >
              <IconBell className='w-5 h-5' />
              <span className='absolute top-1 right-1 w-4 h-4 rounded-full bg-coral text-white font-mono text-[9px] flex items-center justify-center font-bold'>
                {activeAlerts.length}
              </span>
            </button>
          )}
        </header>

        {/* Page content */}
        <main className='flex-1 p-5 lg:p-8 max-w-6xl w-full mx-auto'>
          {page === 'dashboard' && (
            <Dashboard
              envData={envData}
              errorApps={errorApps}
              onFix={setModalApp}
              loading={loading}
              envEmphasis={envEmphasis}
            />
          )}
          {page === 'alerts' && (
            <Alerts
              errorApps={errorApps}
              dismissed={dismissed}
              onFix={setModalApp}
              onDismiss={handleDismiss}
            />
          )}
          {page === 'fixed' && (
            <FixedApps items={fixedItems} onRefix={handleRefix} />
          )}
          {page === 'live-logs' && <LiveLogs />}
          {page === 'settings' && <Settings />}
        </main>
      </div>

      {/* FixFlow modal */}
      <FixFlow
        key={modalApp?.id}
        app={modalApp}
        onClose={() => setModalApp(null)}
        onFixed={app =>
          handleFixed({
            id: app.id,
            app: app.name,
            env: app.env,
            errorType: app.error?.split(':')[0] ?? 'Error',
            summary: app.error ?? '',
            commit: 'abc' + Math.random().toString(36).slice(2, 7),
            branch: `fix/${app.name.toLowerCase().replace(/\s+/g, '-')}`,
            repo: app.repo ?? 'github.com/org/repo',
            fixedAt: new Date().toLocaleString()
          })
        }
      />

      {/* Tweaks panel */}
      {tweaksOpen && (
        <>
          <div
            className='fixed inset-0 z-40'
            onClick={() => setTweaksOpen(false)}
          />
          <aside className='fixed right-0 top-0 bottom-0 z-50 w-72 bg-raised border-l border-line shadow-2xl flex flex-col animate-slidein'>
            <div className='flex items-center justify-between px-5 py-4 border-b border-line'>
              <span className='font-bold text-[14px]'>Dev tweaks</span>
              <button
                onClick={() => setTweaksOpen(false)}
                className='text-ink-mute hover:text-ink'
              >
                ✕
              </button>
            </div>
            <div className='flex-1 overflow-y-auto p-5 space-y-4 text-[13px]'>
              <div>
                <div className='font-semibold mb-2'>Navigation</div>
                <div className='space-y-1'>
                  {PAGES.map(p => (
                    <button
                      key={p}
                      onClick={() => {
                        navigate(p)
                        setTweaksOpen(false)
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-md transition-colors ${page === p
                          ? 'bg-teal-soft text-teal-deep font-semibold'
                          : 'hover:bg-sunken text-ink-soft'
                        }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className='font-semibold mb-2'>Env emphasis</div>
                <div className='flex flex-wrap gap-1.5'>
                  {['aws', 'azure', 'gcp', 'vps', null].map(e => (
                    <button
                      key={String(e)}
                      onClick={() => setEnvEmphasis(e)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors ${envEmphasis === e
                          ? 'bg-teal-soft border-teal text-teal-deep'
                          : 'border-line text-ink-mute hover:bg-sunken'
                        }`}
                    >
                      {e ?? 'none'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className='font-semibold mb-2'>State</div>
                <button
                  onClick={() => {
                    reset()
                    setTweaksOpen(false)
                  }}
                  className='flex items-center gap-2 px-3 py-1.5 rounded-md border border-line text-ink-soft hover:bg-sunken transition-colors'
                >
                  <IconRefresh className='w-3.5 h-3.5' />
                  Reset seed data
                </button>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}
