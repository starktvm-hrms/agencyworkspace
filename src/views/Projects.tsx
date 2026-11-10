import { useState } from 'react';
import { useLookups, useStore } from '../store';
import { navigate } from '../router';
import { addDays, fmtDate, projectFinancials, todayISO, uid } from '../logic';
import { Badge, Empty, Field, Modal, PageHead, Progress, useMoney } from '../components/ui';
import type { BillingType, Project, ProjectStatus } from '../types';

export const PROJECT_STATUSES: ProjectStatus[] = ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'];
const BILLING: BillingType[] = ['Fixed', 'Time & Materials', 'Retainer'];

export function ProjectForm({ initial, onClose }: { initial?: Project; onClose: () => void }) {
  const { data, upsert } = useStore();
  const [p, setP] = useState<Project>(
    initial ?? {
      id: uid('prj'), name: '', clientId: data.clients[0]?.id ?? '', ownerId: data.settings.currentUserId,
      status: 'Planning', billing: 'Fixed', budget: 0, startDate: todayISO(), dueDate: addDays(todayISO(), 30), description: '',
    },
  );
  const set = <K extends keyof Project>(k: K, v: Project[K]) => setP((x) => ({ ...x, [k]: v }));
  const valid = p.name.trim() && p.clientId && p.dueDate >= p.startDate;

  return (
    <Modal
      title={initial ? 'Edit project' : 'New project'}
      onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!valid} onClick={() => { upsert('projects', { ...p, name: p.name.trim() }, `${initial ? 'Updated' : 'Created'} project "${p.name.trim()}"`); onClose(); }}>Save</button>
      </>}
    >
      {data.clients.length === 0 && <p className="bad small">Add a client first (Clients page).</p>}
      <div className="form-grid">
        <Field label="Project name" span={2}><input autoFocus value={p.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Client">
          <select value={p.clientId} onChange={(e) => set('clientId', e.target.value)}>
            {data.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Project owner">
          <select value={p.ownerId} onChange={(e) => set('ownerId', e.target.value)}>
            {data.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select value={p.status} onChange={(e) => set('status', e.target.value as ProjectStatus)}>
            {PROJECT_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Billing">
          <select value={p.billing} onChange={(e) => set('billing', e.target.value as BillingType)}>
            {BILLING.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label={`Budget (${data.settings.currency})`}><input type="number" min={0} value={p.budget} onChange={(e) => set('budget', Number(e.target.value))} /></Field>
        <div />
        <Field label="Start date"><input type="date" value={p.startDate} onChange={(e) => set('startDate', e.target.value)} /></Field>
        <Field label="Due date"><input type="date" value={p.dueDate} onChange={(e) => set('dueDate', e.target.value)} /></Field>
        <Field label="Description" span={2}><textarea value={p.description} onChange={(e) => set('description', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

export default function Projects() {
  const { data } = useStore();
  const L = useLookups();
  const money = useMoney();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('open');
  const [client, setClient] = useState('');
  const [creating, setCreating] = useState(false);
  const today = todayISO();

  const list = data.projects.filter((p) => {
    if (status === 'open' && (p.status === 'Completed' || p.status === 'Cancelled')) return false;
    if (status !== 'open' && status !== 'all' && p.status !== status) return false;
    if (client && p.clientId !== client) return false;
    const hay = `${p.name} ${L.client.get(p.clientId)?.name ?? ''}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <>
      <PageHead title="Projects" sub="Every engagement, its budget burn and delivery progress." actions={<button className="btn btn-primary" onClick={() => setCreating(true)}>+ New project</button>} />
      <div className="card">
        <div className="card-head">
          <div className="filters">
            <input className="search" placeholder="Search projects…" value={q} onChange={(e) => setQ(e.target.value)} />
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="open">Open</option>
              <option value="all">All statuses</option>
              {PROJECT_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select value={client} onChange={(e) => setClient(e.target.value)}>
              <option value="">All clients</option>
              {data.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <span className="muted small">{list.length} projects</span>
        </div>
        {list.length === 0 ? <Empty>No projects match.</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Project</th><th>Owner</th><th>Status</th><th>Billing</th><th>Tasks</th><th>Budget burn</th><th className="num">Invoiced</th><th>Due</th></tr></thead>
              <tbody>
                {list.map((p) => {
                  const tasks = data.tasks.filter((t) => t.projectId === p.id);
                  const done = tasks.filter((t) => t.status === 'Done').length;
                  const f = projectFinancials(data, p);
                  const late = p.dueDate < today && p.status !== 'Completed' && p.status !== 'Cancelled';
                  return (
                    <tr key={p.id} className="clickable" onClick={() => navigate(`projects/${p.id}`)}>
                      <td><strong>{p.name}</strong><div className="muted small">{L.client.get(p.clientId)?.name}</div></td>
                      <td className="small">{L.member.get(p.ownerId)?.name}</td>
                      <td><Badge>{p.status}</Badge></td>
                      <td className="small">{p.billing}</td>
                      <td style={{ minWidth: 110 }}><div className="small muted">{done}/{tasks.length} done</div><Progress pct={tasks.length ? (done / tasks.length) * 100 : 0} warnAt={101} /></td>
                      <td style={{ minWidth: 140 }}><div className="small muted">{money(f.totalCost)} / {money(p.budget)}</div><Progress pct={f.budgetUsedPct} /></td>
                      <td className="num">{money(f.invoiced)}</td>
                      <td className={`small ${late ? 'bad' : ''}`}>{fmtDate(p.dueDate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {creating && <ProjectForm onClose={() => setCreating(false)} />}
    </>
  );
}
