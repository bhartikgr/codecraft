import { useState } from 'react';
import { AwsTab } from './AwsTab.jsx';
import { AzureTab } from './AzureTab.jsx';
import { GcpTab } from './GcpTab.jsx';
import { VpsTab } from './VpsTab.jsx';

const TABS = [
  { id: 'aws',   label: 'AWS' },
  { id: 'azure', label: 'Azure' },
  { id: 'gcp',   label: 'GCP' },
  { id: 'vps',   label: 'VPS / Self-hosted' },
];

export function Settings() {
  const [tab, setTab] = useState('aws');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight mb-0.5">Settings</h1>
        <p className="text-[13px] text-ink-mute">Configure cloud provider credentials and server connections.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-sunken border border-line rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${
              tab === t.id
                ? 'bg-raised border border-line text-ink shadow-sm'
                : 'text-ink-mute hover:text-ink hover:bg-raised/60'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Active tab */}
      {tab === 'aws'   && <AwsTab />}
      {tab === 'azure' && <AzureTab />}
      {tab === 'gcp'   && <GcpTab />}
      {tab === 'vps'   && <VpsTab />}
    </div>
  );
}
