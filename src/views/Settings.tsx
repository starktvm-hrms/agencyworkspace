import { useRef } from 'react';
import { useStore } from '../store';
import { DATA_VERSION } from '../seed';
import { Field, PageHead } from '../components/ui';
import type { AppData } from '../types';

const CURRENCIES = [
  { code: 'INR', locale: 'en-IN' }, { code: 'USD', locale: 'en-US' }, { code: 'EUR', locale: 'de-DE' },
  { code: 'GBP', locale: 'en-GB' }, { code: 'AED', locale: 'en-AE' }, { code: 'SGD', locale: 'en-SG' }, { code: 'AUD', locale: 'en-AU' },
];

export default function SettingsView() {
  const { data, dispatch, resetDemo, clearAll } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const s = data.settings;

  const exportJson = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = `agency-workspace-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as AppData;
      const required: (keyof AppData)[] = ['settings', 'departments', 'members', 'clients', 'projects', 'tasks', 'templates', 'workItems', 'timeEntries', 'invoices', 'expenses'];
      if (parsed.version !== DATA_VERSION || required.some((k) => !parsed[k])) throw new Error('Unrecognised backup format');
      if (window.confirm('Replace all current workspace data with this backup?')) dispatch({ type: 'replace', data: { ...parsed, activity: parsed.activity ?? [] } });
    } catch (e) {
      window.alert(`Import failed: ${(e as Error).message}`);
    }
  };

  return (
    <>
      <PageHead title="Settings" sub="Workspace preferences and data management." />
      <div className="grid-2-even">
        <div className="card card-pad stack" style={{ gap: 12 }}>
          <h2>Workspace</h2>
          <Field label="Agency name"><input value={s.agencyName} onChange={(e) => dispatch({ type: 'settings', patch: { agencyName: e.target.value } })} /></Field>
          <Field label="Currency">
            <select value={s.currency} onChange={(e) => {
              const c = CURRENCIES.find((x) => x.code === e.target.value)!;
              dispatch({ type: 'settings', patch: { currency: c.code, locale: c.locale } });
            }}>
              {CURRENCIES.map((c) => <option key={c.code}>{c.code}</option>)}
            </select>
          </Field>
          <Field label="Default tax rate (%) — e.g. GST / VAT"><input type="number" min={0} step={0.5} value={s.defaultTaxRate} onChange={(e) => dispatch({ type: 'settings', patch: { defaultTaxRate: Number(e.target.value) } })} /></Field>
          <Field label="Acting as (current user)">
            <select value={s.currentUserId} onChange={(e) => dispatch({ type: 'settings', patch: { currentUserId: e.target.value } })}>
              {data.members.map((m) => <option key={m.id} value={m.id}>{m.name} — {m.title} ({m.role})</option>)}
            </select>
          </Field>
          <p className="muted small" style={{ margin: 0 }}>Switch user to see each department's queue on the dashboard and to test role permissions (e.g. expense approval).</p>
        </div>
        <div className="card card-pad stack" style={{ gap: 12 }}>
          <h2>Data</h2>
          <p className="muted small" style={{ margin: 0 }}>All data is stored in this browser (localStorage). Export a backup to move it to another device.</p>
          <div className="row gap wrap">
            <button className="btn" onClick={exportJson}>Export backup (JSON)</button>
            <button className="btn" onClick={() => fileRef.current?.click()}>Import backup…</button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ''; }} />
          </div>
          <hr style={{ border: 0, borderTop: '1px solid var(--border)', width: '100%' }} />
          <div className="row gap wrap">
            <button className="btn" onClick={() => window.confirm('Reset to the demo dataset? Current data will be lost.') && resetDemo()}>Reset demo data</button>
            <button className="btn btn-danger" onClick={() => window.confirm('Start with an empty workspace (keeps departments and workflows)? Current data will be lost.') && clearAll()}>Start fresh</button>
          </div>
        </div>
      </div>
    </>
  );
}
