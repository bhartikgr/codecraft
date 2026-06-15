import { IconDashboard, IconFixed, IconBell, IconSettings, IconPulse } from './Icons.jsx';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', Icon: IconDashboard, countKey: 'errorCount' },
  { id: 'alerts', label: 'Alerts', Icon: IconBell, countKey: 'alertCount', alertStyle: true },
  { id: 'fixed', label: 'Fixed apps', Icon: IconFixed, countKey: 'fixedCount' },
  { id: 'live-logs', label: 'Live logs', Icon: IconPulse },
];

export function Sidebar({ page, onNav, errorCount, alertCount, fixedCount, open }) {
  const counts = { errorCount, alertCount, fixedCount };

  return (
    <aside className={[
      'w-[232px] shrink-0 border-r border-line bg-raised',
      'flex flex-col gap-7 py-5 px-4',
      'sticky top-0 h-screen overflow-y-auto z-50 transition-transform duration-300 ease-out',
      'max-lg:fixed max-lg:top-0 max-lg:left-0 max-lg:h-screen max-lg:shadow-modal',
      open ? 'translate-x-0' : 'max-lg:-translate-x-full',
    ].join(' ')}>

      {/* Brand */}
      <div className="flex items-center gap-2.5 px-1.5">
        <div className="w-10 h-10 rounded-md bg-ink relative flex items-center justify-center shrink-0">
          <div className="w-5 h-5 rounded-full border-2 border-teal border-b-transparent rotate-[-25deg]" />
        </div>
        <div>
          <div className="font-bold text-[15px] tracking-tight">Auro Heal</div>
          <div className="font-mono text-[10px] text-ink-mute uppercase tracking-wider">AI2DEV · v0.4</div>
        </div>
      </div>

      {/* Main nav */}
      <div className="flex flex-col gap-0.5">
        <div className="text-[10px] text-ink-mute font-bold uppercase tracking-[0.08em] px-2 pb-1.5">Workspace</div>
        {NAV.map(({ id, label, Icon, countKey, alertStyle }) => {
          const count = countKey ? counts[countKey] : null;
          const isActive = page === id;
          return (
            <button
              key={id}
              onClick={() => onNav(id)}
              className={[
                "flex items-center w-full px-4 py-3 rounded-md text-sm font-semibold transition-all",
                isActive
                  ? "bg-[#EEF9F8]"
                  : "text-slate-500 hover:bg-slate-100",
              ].join(" ")}
            >
              <Icon
                className={[
                  "w-4 h-4 shrink-0",
                  isActive ? "text-[#2AA79B]" : "text-slate-400",
                ].join(" ")}
              />

              <span
                className={[
                  "ml-2 text-xs ",
                  isActive ? "text-[#2AA79B]" : "text-slate-600",
                ].join(" ")}
              >
                {label}
              </span>

              {count != null && (
                <span
                  className={[
                    "ml-auto flex items-center justify-center px-2 rounded-full text-xs font-semibold",
                    isActive
                      ? "bg-[#DDF3F0] text-[#2AA79B]"
                      : alertStyle && count > 0
                        ? "bg-red-100 text-red-600"
                        : "bg-slate-100 text-slate-500",
                  ].join(" ")}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Account nav */}
      <div className="flex flex-col gap-0.5">
        <div className="font-mono text-[10px] text-ink-mute uppercase tracking-[0.08em] px-2 pb-1.5">Account</div>
        <button
          onClick={() => onNav('settings')}
          className={[
            'flex items-center text-xs gap-2.5 px-4 py-3.5 rounded-md font-medium w-full text-left',
            page === 'settings' ? 'bg-teal-600 text-raised' : 'text-slate-500 hover:bg-slate-100',
          ].join(' ')}
        >
          <IconSettings className="w-4 h-4 shrink-0" />
          Settings
        </button>
      </div>

      {/* User footer */}
      <div className="mt-auto p-3 border border-line rounded-md bg-canvas flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-teal to-teal-deep text-white flex items-center justify-center font-bold text-xs shrink-0">
          RR
        </div>
        <div>
          <div className="font-semibold text-[13px]">Raj R.</div>
          <div className="font-mono text-[10px] text-ink-mute">SRE · auro.dev</div>
        </div>
      </div>
    </aside>
  );
}
