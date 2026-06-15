const SEV_CLASSES = {
  critical: 'bg-coral-soft text-coral-deep border-coral/30',
  high: 'bg-coral-soft text-coral-deep border-coral/20',
  medium: 'bg-amber-soft text-amber-deep border-amber/25',
  low: 'bg-sunken text-ink-soft border-line',
};

const ENV_CLASSES = {
  aws: "bg-gradient-to-r from-[#ff7b23] to-[#ff9d5c] text-white",
  azure: "bg-gradient-to-r from-[#2a5ec4] to-[#5f8ee8] text-white",
  gcp: "bg-gradient-to-r from-[#1e8c4a] to-[#3dbb6b] text-white",
  vps: "bg-gradient-to-r from-[#5a3c9a] to-[#8b6dd1] text-white",
};

export function SevBadge({ sev }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-medium uppercase tracking-wide border ${SEV_CLASSES[sev] ?? SEV_CLASSES.low}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {sev}
    </span>
  );
}

export function EnvBadge({ env }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-medium uppercase tracking-wide ${ENV_CLASSES[env] ?? ENV_CLASSES.vps}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {env?.toUpperCase()}
    </span>
  );
}
