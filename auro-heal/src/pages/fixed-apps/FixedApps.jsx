import { useState, useMemo } from 'react';
import { EnvBadge } from '../../components/Badges.jsx';
import { IconSearch, IconGit, IconRefresh } from '../../components/Icons.jsx';

export function FixedApps({ items, onRefix }) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    if (!q) return items;
    const t = q.toLowerCase();
    return items.filter(i => i.app.toLowerCase().includes(t) || i.errorType.toLowerCase().includes(t));
  }, [items, q]);

  const totalAdd = items.reduce((n, i) => n + i.additions, 0);
  const totalDel = items.reduce((n, i) => n + i.deletions, 0);

  return (
    <div>
      {/* Page header */}
      <div className="flex items-end justify-between gap-6 mb-7 pb-5 border-b border-line flex-wrap">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-mute mb-1.5">History</div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight m-0">Healed apps</h1>
          <p className="text-ink-soft mt-1.5 text-sm">Every fix Auro has shipped. Re-run if the issue returns or you want to try a different prompt.</p>
        </div>
        <div className="flex gap-7 items-center flex-wrap">
          <div className="text-right">
            <div className="font-mono text-[22px] font-semibold tracking-tight">{items.length}</div>
            <div className="font-mono text-[11px] text-ink-mute uppercase tracking-wide mt-1">Total fixes</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[22px] font-semibold tracking-tight text-teal-deep">+{totalAdd}</div>
            <div className="font-mono text-[11px] text-ink-mute uppercase tracking-wide mt-1">Lines added</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[22px] font-semibold tracking-tight text-coral-deep">−{totalDel}</div>
            <div className="font-mono text-[11px] text-ink-mute uppercase tracking-wide mt-1">Lines removed</div>
          </div>
        </div>
      </div>

      {/* Search + count */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <IconSearch className="absolute left-2.5 top-2 w-3.5 h-3.5 text-ink-mute" />
          <input
            className="w-full bg-raised border border-line rounded-md pl-7 pr-3 py-1.5 text-[13px] outline-none focus:border-teal-deep focus:ring-2 focus:ring-teal/20"
            placeholder="Filter by app or error type"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
        <span className="ml-auto font-mono text-[11px] text-ink-mute bg-sunken px-2.5 py-1 rounded">
          Showing {filtered.length} of {items.length}
        </span>
      </div>

      {/* Table */}
      <div className="bg-raised border border-line rounded-md overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          {/* Header */}
          <div className="grid gap-3 items-center px-4 py-2.5 bg-canvas border-b border-line font-mono text-[10px] uppercase tracking-[0.08em] text-ink-mute"
               style={{ gridTemplateColumns: '1.2fr 0.7fr 1.8fr 0.7fr 0.8fr 0.8fr 120px', minWidth: 800 }}>
            {['App', 'Env', 'Fix summary', 'Diff', 'Commit', 'When', ''].map((h, i) => <div key={i}>{h}</div>)}
          </div>

          {/* Rows */}
          <div style={{ minWidth: 800 }}>
            {filtered.map(item => (
              <div
                key={item.id}
                className="grid gap-3 items-center px-4 py-3.5 border-b border-lines last:border-0 text-[13px]"
                style={{ gridTemplateColumns: '1.2fr 0.7fr 1.8fr 0.7fr 0.8fr 0.8fr 120px' }}
              >
                <div>
                  <div className="font-semibold text-[14px]">{item.app}</div>
                </div>
                <div><EnvBadge env={item.env} /></div>
                <div className="text-ink-soft">{item.summary}</div>
                <div className="font-mono text-[11px] bg-sunken px-2 py-0.5 rounded inline-flex gap-1">
                  <span className="text-teal-deep">+{item.additions}</span>
                  <span className="text-ink-faint">/</span>
                  <span className="text-coral-deep">−{item.deletions}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-ink-soft">
                  <IconGit className="w-3 h-3 shrink-0" />
                  <code className="bg-sunken px-1.5 py-px rounded text-ink">{item.commit}</code>
                  <span className="text-ink-faint">·</span>
                  <span>{item.branch}</span>
                </div>
                <div className="font-mono text-[11px] text-ink-soft">
                  {item.fixedAt}
                  <br />
                  <span className="text-ink-faint">{item.duration}</span>
                </div>
                <div>
                  <button
                    className="inline-flex items-center gap-1.5 bg-raised border border-line px-2.5 py-1.5 rounded-md text-xs font-semibold text-ink-soft hover:bg-sunken transition-colors"
                    onClick={() => onRefix(item)}
                  >
                    <IconRefresh className="w-3 h-3" />Fix again
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="py-9 text-center text-ink-mute text-[13px]">No fixes match.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
