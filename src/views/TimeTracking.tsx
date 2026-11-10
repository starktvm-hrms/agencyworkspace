import { useState } from 'react';
import { useLookups, useStore } from '../store';
import { addDays, fmtDate, todayISO, uid } from '../logic';
import { Empty, Field, PageHead, Stat, useMoney } from '../components/ui';
import type { TimeEntry } from '../types';

/** Monday of the week containing `iso`. */
const weekStart = (iso: string) => {
  const d = new Date(iso + 'T00:00:00');
  const dow = (d.getDay() + 6) % 7;
  return addDays(iso, -dow);
};

export default function TimeTracking() {
  const { data, upsert, remove } = useStore();
  const L = useLookups();
  const money = useMoney();
  const [memberId, setMemberId] = useState(data.settings.currentUserId);
  const [week, setWeek] = useState(weekStart(todayISO()));
  const openProjects = data.projects.filter((p) => p.status === 'Active' || p.status === 'Planning');
  const [form, setForm] = useState({ projectId: openProjects[0]?.id ?? '', date: todayISO(), hours: 1, billable: true, note: '' });

  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const entries = data.timeEntries.filter((t) => t.memberId === memberId && t.date >= days[0] && t.date <= days[6]);
  const member = L.member.get(memberId);
  const projectIds = [...new Set(entries.map((e) => e.projectId))];
  const total = entries.reduce((s, e) => s + e.hours, 0);
  const billable = entries.filter((e) => e.billable).reduce((s, e) => s + e.hours, 0);

  const add = () => {
    if (!form.projectId || form.hours <= 0) return;
    const entry: TimeEntry = { id: uid('te'), memberId, ...form };
    upsert('timeEntries', entry);
    setForm((f) => ({ ...f, note: '' }));
  };

  return (
    <>
      <PageHead title="Time Tracking" sub="Log hours against projects. Time drives project cost, budget burn and invoices." />
      <div className="grid-stats">
        <Stat label="This week" value={`${total.toFixed(1)}h`} sub={member ? `of ${member.capacity}h capacity` : undefined} />
        <Stat label="Billable" value={`${billable.toFixed(1)}h`} sub={total ? `${Math.round((billable / total) * 100)}% billable` : '—'} />
        <Stat label="Billable value" value={money(billable * (member?.billRate ?? 0))} />
        <Stat label="Cost" value={money(total * (member?.costRate ?? 0))} />
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 12 }}>Log time</h2>
        <div className="row gap wrap" style={{ alignItems: 'flex-end' }}>
          <Field label="Team member">
            <select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              {data.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="Project">
            <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
              {openProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Date"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Hours"><input type="number" min={0.25} step={0.25} style={{ width: 90 }} value={form.hours} onChange={(e) => setForm({ ...form, hours: Number(e.target.value) })} /></Field>
          <Field label="Note"><input value={form.note} placeholder="What did you work on?" onChange={(e) => setForm({ ...form, note: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && add()} /></Field>
          <label className="check" style={{ paddingBottom: 8 }}><input type="checkbox" checked={form.billable} onChange={(e) => setForm({ ...form, billable: e.target.checked })} /> Billable</label>
          <button className="btn btn-primary" disabled={!form.projectId || form.hours <= 0} onClick={add}>Add entry</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <h2>Timesheet — {member?.name}</h2>
          <div className="row gap">
            <button className="btn btn-sm" onClick={() => setWeek(addDays(week, -7))}>← Prev</button>
            <span className="small">{fmtDate(days[0])} – {fmtDate(days[6])}</span>
            <button className="btn btn-sm" onClick={() => setWeek(addDays(week, 7))}>Next →</button>
            <button className="btn btn-sm" onClick={() => setWeek(weekStart(todayISO()))}>Today</button>
          </div>
        </div>
        {projectIds.length === 0 ? <Empty>No time logged this week.</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Project</th>{days.map((d) => <th key={d} className="num">{new Date(d + 'T00:00:00').toLocaleDateString('en', { weekday: 'short', day: 'numeric' })}</th>)}<th className="num">Total</th></tr></thead>
              <tbody>{projectIds.map((pid) => {
                const pe = entries.filter((e) => e.projectId === pid);
                return (
                  <tr key={pid}>
                    <td>{L.project.get(pid)?.name}</td>
                    {days.map((d) => { const h = pe.filter((e) => e.date === d).reduce((s, e) => s + e.hours, 0); return <td key={d} className="num">{h ? h.toFixed(1) : <span className="muted">·</span>}</td>; })}
                    <td className="num"><strong>{pe.reduce((s, e) => s + e.hours, 0).toFixed(1)}</strong></td>
                  </tr>
                );
              })}</tbody>
              <tfoot><tr><td>Total</td>{days.map((d) => <td key={d} className="num">{entries.filter((e) => e.date === d).reduce((s, e) => s + e.hours, 0).toFixed(1)}</td>)}<td className="num">{total.toFixed(1)}</td></tr></tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-head"><h2>Entries this week</h2></div>
        {entries.length === 0 ? <Empty>Nothing yet.</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Project</th><th>Note</th><th className="num">Hours</th><th>Billable</th><th /></tr></thead>
              <tbody>{[...entries].sort((a, b) => b.date.localeCompare(a.date)).map((e) => (
                <tr key={e.id}>
                  <td className="small">{fmtDate(e.date)}</td>
                  <td>{L.project.get(e.projectId)?.name}</td>
                  <td className="small muted">{e.note || '—'}</td>
                  <td className="num">{e.hours}</td>
                  <td><input type="checkbox" aria-label="Billable" checked={e.billable} onChange={(ev) => upsert('timeEntries', { ...e, billable: ev.target.checked })} /></td>
                  <td><button className="icon-btn" aria-label="Delete entry" onClick={() => remove('timeEntries', e.id)}>×</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
