import { useState } from 'react';
import { ConnBadge, Field, FieldRow } from './SettingsShared.jsx';
import { IconServer, IconPlus, IconTrash } from '../../components/Icons.jsx';

const INITIAL = [
  { id: 1, label: 'hetzner-de-01', host: '65.108.200.12',   user: 'root',   port: 22,   status: 'connected' },
  { id: 2, label: 'do-nyc-02',     host: '192.241.200.88',  user: 'deploy', port: 2222, status: 'connected' },
];

export function VpsTab() {
  const [servers,    setServers]    = useState(INITIAL);
  const [addMode,    setAddMode]    = useState(false);
  const [newServer,  setNewServer]  = useState({ label: '', host: '', user: 'root', port: 22 });
  const [sshCopied,  setSshCopied]  = useState(false);

  const addServer = () => {
    if (!newServer.host || !newServer.label) return;
    setServers(s => [...s, { ...newServer, id: Date.now(), port: Number(newServer.port) || 22, status: 'connected' }]);
    setNewServer({ label: '', host: '', user: 'root', port: 22 });
    setAddMode(false);
  };

  const removeServer = (id) => setServers(s => s.filter(v => v.id !== id));

  const copyKey = () => {
    navigator.clipboard?.writeText('ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHb8Q9v2... auro-heal@ai2dev');
    setSshCopied(true);
    setTimeout(() => setSshCopied(false), 2000);
  };

  const inputCls = 'w-full bg-canvas border border-line rounded-md px-3 py-2 text-[13px] font-mono outline-none focus:border-teal-deep focus:ring-2 focus:ring-teal/20';

  return (
    <div className="space-y-4">
      {/* Server list */}
      <div className="bg-raised border border-line rounded-md p-5">
        <h3 className="font-bold text-[14px] mb-1">VPS / Self-hosted servers</h3>
        <p className="text-[12px] text-ink-mute mb-5">Auro connects via SSH to tail logs and apply patches. Add each server's connection details.</p>

        <div className="space-y-2 mb-3">
          {servers.map(s => (
            <div key={s.id} className="flex items-center gap-3 bg-canvas border border-line rounded-md px-3.5 py-2.5">
              <IconServer className="w-4 h-4 text-ink-mute shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[12px] font-semibold">{s.user}@{s.host}:{s.port}</div>
                <div className="text-[11px] text-ink-mute mt-0.5">{s.label} · SSH</div>
              </div>
              <ConnBadge status={s.status} />
              <button
                onClick={() => removeServer(s.id)}
                className="p-1.5 rounded-md text-ink-mute hover:text-coral-deep hover:bg-coral-soft transition-colors"
                title="Remove server"
              >
                <IconTrash className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {addMode ? (
          <div className="border border-line rounded-md p-4 bg-canvas space-y-3">
            <div className="font-semibold text-[13px]">Add server</div>
            <FieldRow>
              <Field label="Label">
                <input className={inputCls} value={newServer.label} onChange={e => setNewServer(n => ({ ...n, label: e.target.value }))} placeholder="hetzner-fra-01" />
              </Field>
              <Field label="Host / IP">
                <input className={inputCls} value={newServer.host} onChange={e => setNewServer(n => ({ ...n, host: e.target.value }))} placeholder="203.0.113.10" />
              </Field>
            </FieldRow>
            <FieldRow>
              <Field label="SSH user">
                <input className={inputCls} value={newServer.user} onChange={e => setNewServer(n => ({ ...n, user: e.target.value }))} placeholder="root" />
              </Field>
              <Field label="SSH port">
                <input className={inputCls} type="number" value={newServer.port} onChange={e => setNewServer(n => ({ ...n, port: e.target.value }))} />
              </Field>
            </FieldRow>
            <div className="flex gap-2 pt-1">
              <button onClick={addServer} className="bg-teal-deep text-white px-3 py-1.5 rounded-md text-[13px] font-semibold hover:bg-teal-deep/90 transition-colors">Add server</button>
              <button onClick={() => setAddMode(false)} className="bg-raised border border-line px-3 py-1.5 rounded-md text-[13px] font-semibold text-ink-soft hover:bg-sunken transition-colors">Cancel</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddMode(true)}
            className="w-full flex items-center justify-center gap-2 border border-dashed border-line rounded-md py-2.5 text-[13px] text-ink-mute hover:bg-sunken hover:text-ink hover:border-ink-faint transition-colors"
          >
            <IconPlus className="w-3.5 h-3.5" />Add server
          </button>
        )}
      </div>

      {/* SSH key */}
      <div className="bg-raised border border-line rounded-md p-5">
        <h3 className="font-bold text-[14px] mb-1">SSH public key</h3>
        <p className="text-[12px] text-ink-mute mb-4">Add this key to <code className="bg-sunken px-1 rounded font-mono text-[11px]">~/.ssh/authorized_keys</code> on each server. The private key stays in the secure vault.</p>
        <div className="bg-[#0e1210] rounded-md p-4 font-mono text-[11px] border border-[#1e2620]">
          <div className="text-[#4a6a58] mb-1">/* add to ~/.ssh/authorized_keys */</div>
          <div className="text-[#7a9a88]">ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHb8Q9v2... auro-heal@ai2dev</div>
        </div>
        <button
          onClick={copyKey}
          className="mt-3 bg-raised border border-line px-3 py-1.5 rounded-md text-xs font-semibold text-ink-soft hover:bg-sunken transition-colors"
        >
          {sshCopied ? '✓ Copied' : 'Copy public key'}
        </button>
      </div>
    </div>
  );
}
