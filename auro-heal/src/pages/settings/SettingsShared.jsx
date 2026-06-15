/* Shared UI primitives used across all Settings tabs */

export function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5 mb-3.5">
      <label className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-mute">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-ink-mute">{hint}</p>}
    </div>
  );
}

export function FieldRow({ children }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-0">{children}</div>;
}

const STATUS = {
  connected:    { dot: 'bg-teal',  bg: 'bg-teal-soft',  text: 'text-teal-deep',  label: 'Connected'     },
  disconnected: { dot: 'bg-coral', bg: 'bg-coral-soft', text: 'text-coral-deep', label: 'Not connected' },
  testing:      { dot: 'bg-amber animate-pulse2', bg: 'bg-amber-soft', text: 'text-amber-deep', label: 'Testing…' },
};

export function ConnBadge({ status = 'disconnected' }) {
  const s = STATUS[status] ?? STATUS.disconnected;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[11px] font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function ActionsBar({ status, testing, saved, onTest, onSave }) {
  return (
    <div className="flex items-center gap-3 mt-5 flex-wrap">
      <ConnBadge status={status} />
      <button
        onClick={onTest}
        disabled={testing}
        className="inline-flex items-center gap-2 bg-raised border border-line px-3 py-1.5 rounded-md text-[13px] font-semibold text-ink-soft hover:bg-sunken disabled:opacity-50 transition-colors"
      >
        {testing ? (
          <><span className="w-3 h-3 rounded-full border-2 border-teal-deep border-t-transparent animate-spin" />Testing…</>
        ) : 'Test connection'}
      </button>
      <button
        onClick={onSave}
        className="inline-flex items-center gap-2 bg-teal-deep text-white px-3 py-1.5 rounded-md text-[13px] font-semibold hover:bg-teal-deep/90 transition-colors"
      >
        {saved ? '✓ Saved' : 'Save changes'}
      </button>
    </div>
  );
}

/* Shared input class — add to global CSS or use inline */
export const INPUT_CLS = 'w-full bg-raised border border-line rounded-md px-3 py-2 text-[13px] outline-none focus:border-teal-deep focus:ring-2 focus:ring-teal/20 transition';
export const INPUT_MONO = INPUT_CLS + ' font-mono text-[12px]';
