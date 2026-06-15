import { useState, useMemo } from 'react'
import { SevBadge, EnvBadge } from '../../components/Badges.jsx'
import { IconSpark } from '../../components/Icons.jsx'

const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

const DOT_CLASSES = {
  critical: 'bg-coral-deep ring-2 ring-coral-soft',
  high: 'bg-coral ring-2 ring-coral-soft',
  medium: 'bg-amber ring-2 ring-amber-soft',
  low: 'bg-ink-faint'
}

const BAR_CLASSES = {
  critical: 'bg-coral-deep',
  high: 'bg-coral',
  medium: 'bg-amber',
  low: 'bg-ink-faint'
}

const SUMMARY_CLASSES = {
  critical: { val: 'text-coral-deep', bg: 'border-l-4 border-coral-deep' },
  high: { val: 'text-coral', bg: 'border-l-4 border-coral' },
  medium: { val: 'text-amber-deep', bg: 'border-l-4 border-amber' },
  low: { val: 'text-ink-soft', bg: 'border-l-4 border-ink-faint' }
}

function AlertRow ({ app, onFix, onDismiss }) {
  return (
    <div
      className={`flex items-center gap-3.5 px-4 py-3.5 border-b border-lines last:border-0 relative`}
    >
      {/* severity bar */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-0.5 ${
          BAR_CLASSES[app.severity]
        }`}
      />

      {/* dot */}
      <div
        className={`w-2.5 h-2.5 rounded-full shrink-0 ml-2 ${
          DOT_CLASSES[app.severity]
        }`}
      />

      {/* content */}
      <div className='flex-1 min-w-0'>
        <div className='font-semibold text-[13px]'>{app.name}</div>
        <div className='flex items-center gap-2 mt-1 flex-wrap'>
          <EnvBadge env={app.env} />
          <SevBadge sev={app.severity} />
          <span className='font-mono text-[11px] text-ink-mute'>
            {app.errorType}
          </span>
          <span className='text-[11px] text-ink-mute'>
            {app.occurrences} hits · {app.lastSeen}
          </span>
        </div>
      </div>

      {/* actions */}
      <div className='flex items-center gap-1.5 shrink-0'>
        <button
          className='inline-flex items-center gap-1.5 bg-teal-deep text-white px-2.5 py-1.5 rounded-md text-xs font-semibold hover:bg-teal-deep/90 transition-colors'
          onClick={() => onFix(app)}
        >
          <IconSpark className='w-3 h-3' />
          Fix now
        </button>
        <button
          className='inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-semibold bg-raised border border-line text-ink-soft hover:bg-sunken transition-colors'
          onClick={() => onDismiss(app.id)}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

export function Alerts ({ errorApps, dismissed, onFix, onDismiss }) {
  const [filter, setFilter] = useState('all')

  const active = useMemo(
    () =>
      errorApps
        .filter(a => !dismissed.includes(a.id) && a.occurrences > 0)
        .sort((a, b) => {
          // highest errors first
          if (b.occurrences !== a.occurrences) {
            return b.occurrences - a.occurrences
          }

          // then severity
          return SEV_ORDER[a.severity] - SEV_ORDER[b.severity]
        }),
    [errorApps, dismissed]
  )

  const filtered =
    filter === 'all' ? active : active.filter(a => a.severity === filter)
  const countBy = sev => active.filter(a => a.severity === sev).length

  const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'critical', label: 'Critical' },
    { id: 'high', label: 'High' },
    { id: 'medium', label: 'Medium' },
    { id: 'low', label: 'Low' }
  ]

  return (
    <div>
      {/* Page header */}
      <div className='flex items-end justify-between gap-6 mb-7 pb-5 border-b border-line flex-wrap'>
        <div>
          <div className='font-mono text-[11px] uppercase tracking-[0.1em] text-ink-mute mb-1.5'>
            Monitoring · Live
          </div>
          <h1 className='text-2xl sm:text-[28px] font-bold tracking-tight m-0'>
            Active alerts
          </h1>
          <p className='text-ink-soft mt-1.5 text-sm'>
            All applications with detected errors, ranked by severity. Fix or
            dismiss to clear the queue.
          </p>
        </div>
        <div className='flex gap-7 items-center'>
          <div className='text-right'>
            <div className='font-mono text-[22px] font-semibold tracking-tight text-coral-deep'>
              {active.length}
            </div>
            <div className='font-mono text-[11px] text-ink-mute uppercase tracking-wide mt-1'>
              Active alerts
            </div>
          </div>
          <div className='text-right'>
            <div className='font-mono text-[22px] font-semibold tracking-tight text-ink-soft'>
              {dismissed.length}
            </div>
            <div className='font-mono text-[11px] text-ink-mute uppercase tracking-wide mt-1'>
              Dismissed
            </div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6'>
        {['critical', 'high', 'medium', 'low'].map(sev => (
          <div
            key={sev}
            className={`bg-raised border border-line rounded-md p-3.5 ${SUMMARY_CLASSES[sev].bg}`}
          >
            <div
              className={`font-mono text-[22px] font-bold ${SUMMARY_CLASSES[sev].val}`}
            >
              {countBy(sev)}
            </div>
            <div className='font-mono text-[10px] text-ink-mute uppercase tracking-wide mt-1 capitalize'>
              {sev}
            </div>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div className='flex gap-2 flex-wrap mb-4'>
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={[
              'px-3 py-1 rounded-full font-mono text-[11px] font-semibold border transition-colors',
              filter === id
                ? id === 'critical'
                  ? 'bg-coral-deep border-coral-deep text-white'
                  : id === 'high'
                  ? 'bg-coral border-coral text-white'
                  : id === 'medium'
                  ? 'bg-amber-deep border-amber-deep text-white'
                  : 'bg-ink border-ink text-raised'
                : 'bg-raised border-line text-ink-soft hover:bg-sunken'
            ].join(' ')}
          >
            {label} ({id === 'all' ? active.length : countBy(id)})
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div className=' rounded-md overflow-hidden shadow-card flex flex-col gap-4'>
        {filtered.map(a => (
          <AlertRow key={a.id} app={a} onFix={onFix} onDismiss={onDismiss} />
        ))}
        {filtered.length === 0 && (
          <div className='py-12 text-center text-ink-mute text-[13px]'>
            {active.length === 0
              ? '✓ No active alerts — all clear.'
              : `No ${filter} alerts.`}
          </div>
        )}
      </div>
    </div>
  )
}
