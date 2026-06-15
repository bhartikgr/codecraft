import { useState } from 'react';
import { ActionsBar, Field, FieldRow } from './SettingsShared.jsx';

export function AzureTab() {
  const [form, setForm] = useState({
    tenantId:       '12345678-1234-1234-1234-123456789abc',
    clientId:       '87654321-4321-4321-4321-cba987654321',
    clientSecret:   '',
    subscriptionId: '11111111-2222-3333-4444-555555555555',
  });
  const [status,  setStatus]  = useState('connected');
  const [testing, setTesting] = useState(false);
  const [saved,   setSaved]   = useState(false);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const testConn = () => { setTesting(true); setStatus('testing'); setTimeout(() => { setTesting(false); setStatus('connected'); }, 1800); };
  const save     = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="bg-raised border border-line rounded-md p-5">
      <h3 className="font-bold text-[14px] mb-1">Azure service principal</h3>
      <p className="text-[12px] text-ink-mute mb-5">App registration with <em>Monitoring Reader</em> and <em>Log Analytics Reader</em> roles assigned.</p>

      <FieldRow>
        <Field label="Tenant ID">
          <input className="w-full bg-canvas border border-line rounded-md px-3 py-2 text-[12px] font-mono outline-none focus:border-teal-deep focus:ring-2 focus:ring-teal/20" value={form.tenantId} onChange={e => set('tenantId')(e.target.value)} />
        </Field>
        <Field label="Subscription ID">
          <input className="w-full bg-canvas border border-line rounded-md px-3 py-2 text-[12px] font-mono outline-none focus:border-teal-deep focus:ring-2 focus:ring-teal/20" value={form.subscriptionId} onChange={e => set('subscriptionId')(e.target.value)} />
        </Field>
      </FieldRow>

      <FieldRow>
        <Field label="Client ID (Application ID)">
          <input className="w-full bg-canvas border border-line rounded-md px-3 py-2 text-[12px] font-mono outline-none focus:border-teal-deep focus:ring-2 focus:ring-teal/20" value={form.clientId} onChange={e => set('clientId')(e.target.value)} />
        </Field>
        <Field label="Client secret">
          <input className="w-full bg-canvas border border-line rounded-md px-3 py-2 text-[12px] font-mono outline-none focus:border-teal-deep focus:ring-2 focus:ring-teal/20" type="password" value={form.clientSecret} onChange={e => set('clientSecret')(e.target.value)} placeholder="Enter client secret…" />
        </Field>
      </FieldRow>

      <ActionsBar status={status} testing={testing} saved={saved} onTest={testConn} onSave={save} />
    </div>
  );
}
