import {
  IconBrandAws,
  IconBrandAzure,
  IconBrandGoogle,
  IconServer,
} from "@tabler/icons-react";

const PROVIDER_ICONS = {
  aws: IconBrandAws,
  azure: IconBrandAzure,
  gcp: IconBrandGoogle,
  vps: IconServer,
};

const LOGO_BG = { aws: 'bg-[#ff7b23]', azure: 'bg-[#2a5ec4]', gcp: 'bg-[#1e8c4a]', vps: 'bg-[#5a3c9a]' };
const TINT = { aws: 'env-card-aws', azure: 'env-card-azure', gcp: 'env-card-gcp', vps: 'env-card-vps' };
const HEALTH_FILL = {
  aws: "bg-gradient-to-r from-[#ff7b23] to-[#ff9d5c]",
  azure: "bg-gradient-to-r from-[#2a5ec4] to-[#5f8ee8]",
  gcp: "bg-gradient-to-r from-[#1e8c4a] to-[#3dbb6b]",
  vps: "bg-gradient-to-r from-[#5a3c9a] to-[#8b6dd1]",
};

export function EnvCard({ env }) {
  const isHealthy = env.status === 'healthy';
  const ProviderIcon = PROVIDER_ICONS[env.id] || IconServer;
  return (
    <div className={`relative bg-raised border border-line rounded-md p-4 flex flex-col gap-3 overflow-hidden shadow-card h-full ${TINT[env.id]}`}>
      {/* header */}
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-md flex items-center justify-center text-white flex-none ${LOGO_BG[env.id] ?? "bg-slate-700"
            }`}
        >
          <ProviderIcon size={20} stroke={1.8} />
        </div>
        <div className="flex flex-col gap-1">
          <div className="font-bold text-[15px] tracking-tight">{env.name}</div>
          <div className="font-mono text-[10px] text-ink-mute uppercase tracking-widest">{env.kind}</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5 font-mono text-[11px] text-ink-soft">
          <span className={`w-1.5 h-1.5 rounded-full ${isHealthy ? 'bg-teal animate-pulse2' : 'bg-amber animate-pulse2'}`} />
          {env.status}
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="font-mono text-lg font-semibold tracking-tight">{env.instances}</div>
          <div className="font-mono text-[10px] text-ink-mute uppercase tracking-wide mt-0.5">Instances</div>
        </div>
        <div>
          <div className={`font-mono text-lg font-semibold tracking-tight ${env.errors > 0 ? 'text-coral-deep' : ''}`}>{env.errors}</div>
          <div className="font-mono text-[10px] text-ink-mute uppercase tracking-wide mt-0.5">Active errors</div>
        </div>
      </div>

      {/* health bar */}
      <div>
        <div className="h-1 bg-sunken rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${HEALTH_FILL[env.id] || HEALTH_FILL.aws
              }`}
            style={{ width: `${env.health}%` }}
          />
        </div>

        <div className="flex justify-between mt-1.5">
          <span className="font-mono text-[11px] text-ink-mute">
            Health
          </span>

          <span
            className="font-mono text-[11px] font-semibold"
            style={{
              color:
                env.id === "aws"
                  ? "#ff7b23"
                  : env.id === "azure"
                    ? "#2a5ec4"
                    : env.id === "gcp"
                      ? "#1e8c4a"
                      : "#5a3c9a",
            }}
          >
            {env.health}%
          </span>
        </div>
      </div>

      {/* region */}
      <div className="font-mono text-[11px] text-ink-soft border-t border-dashed border-line pt-2">{env.region}</div>
    </div>
  );
}
