import { useState } from 'react';
import {  ActionsBar, Field, FieldRow } from './SettingsShared.jsx';

export function AwsTab() {
  const [form, setForm] = useState({
    accessKey: 'AKIAIOSFODNN7EXAMPLE',
    secretKey: '',
    region: 'us-east-1',
    extraRegions: 'us-east-1, eu-west-2',
    sessionToken: '',
  });
  const [status, setStatus] = useState('connected');
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const testConn = () => {
    setTesting(true); setStatus('testing');
    setTimeout(() => { setTesting(false); setStatus('connected'); }, 1800);
  };
  const save = () => {
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="bg-raised border border-line rounded-md p-5">
        <h3 className="font-bold text-[14px] mb-1">AWS credentials</h3>
        <p className="text-[12px] text-ink-mute mb-5">IAM user or role with CloudWatch Logs read and EC2 describe access.</p>

        <FieldRow>
          <Field label="Access Key ID">
            <input className="w-full bg-canvas border border-line rounded-md px-3 py-2.5 text-[12px] font-mono outline-none focus:border-teal-deep focus:ring-2 focus:ring-teal/20" value={form.accessKey} onChange={e => set('accessKey')(e.target.value)} placeholder="AKIAIOSFODNN7EXAMPLE" />
          </Field>
          <Field label="Default region">
            <input className="w-full bg-canvas border border-line rounded-md px-3 py-2.5 text-[12px] font-mono outline-none focus:border-teal-deep focus:ring-2 focus:ring-teal/20" value={form.region} onChange={e => set('region')(e.target.value)} placeholder="us-east-1" />
          </Field>
        </FieldRow>

        <Field label="Secret Access Key">
          <input className="w-full bg-canvas border border-line rounded-md px-3 py-2.5 text-[12px] font-mono outline-none focus:border-teal-deep focus:ring-2 focus:ring-teal/20" type="password" value={form.secretKey} onChange={e => set('secretKey')(e.target.value)} placeholder="Enter secret access key…" />
        </Field>

        <Field label="Session token" hint="Optional — for temporary STS credentials only. Leave blank for long-term keys.">
          <input className="w-full bg-canvas border border-line rounded-md px-3 py-2.5 text-[12px] font-mono outline-none focus:border-teal-deep focus:ring-2 focus:ring-teal/20" type="password" value={form.sessionToken} onChange={e => set('sessionToken')(e.target.value)} placeholder="Leave blank for long-term credentials" />
        </Field>

        <ActionsBar status={status} testing={testing} saved={saved} onTest={testConn} onSave={save} />
      </div>

      <div className="bg-raised border border-line rounded-md p-5">
        <h3 className="font-bold text-[14px] mb-1">Monitored regions</h3>
        <p className="text-[12px] text-ink-mute mb-5">Auro will scan CloudWatch logs in each region listed.</p>
        <Field label="Regions (comma-separated)" hint="Additional regions increase API call volume.">
          <input className="w-full bg-canvas border border-line rounded-md px-3 py-2.5 text-[12px] font-mono outline-none focus:border-teal-deep focus:ring-2 focus:ring-teal/20" value={form.extraRegions} onChange={e => set('extraRegions')(e.target.value)} />
        </Field>
      </div>
    </div>
  );
}
