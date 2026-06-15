import { useState } from 'react';
import { ActionsBar, Field, FieldRow } from './SettingsShared.jsx';

export function GcpTab() {
  const [form, setForm] = useState({ projectId: 'auro-heal-prod', region: 'us-central1', keyJson: '' });
  const [status,  setStatus]  = useState('disconnected');
  const [testing, setTesting] = useState(false);
  const [saved,   setSaved]   = useState(false);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const testConn = () => { setTesting(true); setStatus('testing'); setTimeout(() => { setTesting(false); setStatus('connected'); }, 1800); };
  const save     = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const inputCls = 'w-full bg-canvas border border-line rounded-md px-3 py-2 text-[13px] outline-none focus:border-teal-deep focus:ring-2 focus:ring-teal/20';

  return (
    <div className="bg-raised border border-line rounded-md p-5">
      <h3 className="font-bold text-[14px] mb-1">GCP service account</h3>
      <p className="text-[12px] text-ink-mute mb-5">Service account with <code className="bg-sunken px-1 rounded font-mono text-[11px]">roles/logging.viewer</code> and <code className="bg-sunken px-1 rounded font-mono text-[11px]">roles/monitoring.viewer</code>.</p>

      <FieldRow>
        <Field label="Project ID">
          <input className={inputCls} value={form.projectId} onChange={e => set('projectId')(e.target.value)} />
        </Field>
        <Field label="Default region">
          <input className={inputCls} value={form.region} onChange={e => set('region')(e.target.value)} placeholder="us-central1" />
        </Field>
      </FieldRow>

      <Field label="Service account key (JSON)" hint="Paste the contents of your downloaded .json key file. Stored encrypted at rest.">
        <textarea
          className={`${inputCls} font-mono text-[11px] resize-y`}
          rows={6}
          value={form.keyJson}
          onChange={e => set('keyJson')(e.target.value)}
          placeholder={'{\n  "type": "service_account",\n  "project_id": "auro-heal-prod",\n  ...\n}'}
        />
      </Field>

      <ActionsBar status={status} testing={testing} saved={saved} onTest={testConn} onSave={save} />
    </div>
  );
}
