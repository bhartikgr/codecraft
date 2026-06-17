import { useState, useMemo, useEffect } from 'react';
import { EnvBadge } from '../../components/Badges.jsx';
import { IconSearch, IconGit, IconRefresh } from '../../components/Icons.jsx';
import { fixedApp as getFixedAppAPI } from '../../services/fixFlowService';

export function FixedApps({ onRefix }) {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    let mounted = true;

    const fetchFixedApps = async () => {
      try {
        const res = await getFixedAppAPI();
        if (mounted) setItems(res.data || []);
      } catch (err) {
        console.error(err);
      }
    };

    fetchFixedApps();

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const t = q.toLowerCase();

    return items.filter(i =>
      i.app?.toLowerCase().includes(t) ||
      i.errorType?.toLowerCase().includes(t)
    );
  }, [items, q]);

  const { totalAdd, totalDel } = useMemo(() => {
    return (items || []).reduce(
      (acc, i) => {
        acc.totalAdd += i.additions || 0;
        acc.totalDel += i.deletions || 0;
        return acc;
      },
      { totalAdd: 0, totalDel: 0 }
    );
  }, [items]);

  return (
    <div>
      {/* Page header */}
      <div className="flex items-end justify-between gap-6 mb-7 pb-5 border-b border-line flex-wrap">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-mute mb-1.5">
            History
          </div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight m-0">
            Healed apps
          </h1>
          <p className="text-ink-soft mt-1.5 text-sm">
            Every fix Auro has shipped. Re-run if the issue returns.
          </p>
        </div>

        <div className="flex gap-7 items-center flex-wrap">
          <div className="text-right">
            <div className="font-mono text-[22px] font-semibold">
              {items.length}
            </div>
            <div className="font-mono text-[11px] text-ink-mute uppercase">
              Total fixes
            </div>
          </div>

          <div className="text-right">
            <div className="font-mono text-[22px] font-semibold text-teal-deep">
              +{totalAdd}
            </div>
            <div className="font-mono text-[11px] text-ink-mute uppercase">
              Lines added
            </div>
          </div>

          <div className="text-right">
            <div className="font-mono text-[22px] font-semibold text-coral-deep">
              −{totalDel}
            </div>
            <div className="font-mono text-[11px] text-ink-mute uppercase">
              Lines removed
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
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
          <table className="w-full min-w-[900px] text-sm border-collapse">
            {/* Header */}
            <thead>
              <tr className="bg-canvas border-b border-line">
                <th className="px-5 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-ink-mute font-medium">
                  APP
                </th>
                <th className="px-5 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-ink-mute font-medium">
                  ENVIRONMENT
                </th>
                <th className="px-5 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-ink-mute font-medium">
                  FIX SUMMARY
                </th>
                <th className="px-5 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-ink-mute font-medium">
                  DIFF
                </th>
                <th className="px-5 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-ink-mute font-medium">
                  COMMIT
                </th>
                <th className="px-5 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-ink-mute font-medium">
                  WHEN
                </th>
                <th className="px-5 py-3 text-right font-mono text-[10px] uppercase tracking-widest text-ink-mute font-medium">
                  ACTIONS
                </th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-line">
              {filtered.length > 0 ? (
                filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-muted/60 transition-colors group"
                  >
                    {/* App */}
                    <td className="px-5 py-4 font-semibold text-[14px] text-ink">
                      {item.app}
                    </td>

                    {/* Environment */}
                    <td className="px-5 py-4">
                      <EnvBadge env={item.env} />
                    </td>

                    {/* Fix Summary */}
                    <td className="px-5 py-4 max-w-md">
                      <div className="bg-sunken border font-mono border-line rounded p-3 text-[11px] text-ink-soft ">
                        <p className="line-clamp-2 overflow-hidden">
                          {item.summary}
                        </p>
                      </div>
                    </td>

                    {/* Diff */}
                    <td className="px-5 py-4">
                      <div className="font-mono text-[11px] bg-sunken px-3 py-1 rounded inline-flex items-center gap-1.5">
                        <span className="text-teal-deep font-medium">+{item.additions ?? 0}</span>
                        <span className="text-ink-faint">/</span>
                        <span className="text-coral-deep font-medium">−{item.deletions ?? 0}</span>
                      </div>
                    </td>

                    {/* Commit */}
                    <td className="px-5 py-4 font-mono text-[11px] text-ink-soft">
                      <div className="flex flex-col gap-2">
                        <IconGit className="w-3.5 h-3.5 opacity-70" />
                        <code className="bg-sunken p-3 rounded border border-line/60">
                          <p className="line-clamp-2 overflow-hidden">
                            {item.commit}
                          </p>
                        </code>
                        {item.branch && (
                          <div className='flex items-center gap-2'>
                            <span className="text-ink-faint">·</span>
                            <span>{item.branch}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* When */}
                    <td className="px-5 py-4 font-mono text-[11px] text-ink-soft whitespace-nowrap">
                      <div>
                        {new Date(item.fixedAt).toLocaleString('en-GB', {
                          timeZone: 'UTC',
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}{' '}
                        GMT
                      </div>
                      <div className="text-ink-faint text-[10px]">
                        {item.duration}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => onRefix(item)}
                        className="inline-flex items-center gap-1.5 bg-green-600 mx-auto hover:bg-sunken border border-line hover:border-line-strong px-3.5 py-2 rounded-md text-xs font-semibold text-white transition-all active:scale-95 shrink-0 w-[100px]"
                      >
                        <IconRefresh className="w-3.5 h-3.5" />
                        Fix again
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-ink-mute text-[13px]">
                    No fixes match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}