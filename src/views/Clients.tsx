import { useState } from 'react';
import { useStore } from '../store';
import { navigate } from '../router';
import { invoiceDisplayStatus, invoiceSubtotal, invoiceTotal, todayISO, uid } from '../logic';
import { Badge, confirmDelete, Empty, Field, Modal, PageHead, useMoney } from '../components/ui';
import type { Client } from '../types';

const STATUSES: Client['status'][] = ['Lead', 'Active', 'Paused', 'Archived'];

function ClientForm({ initial, onClose }: { initial?: Client; onClose: () => void }) {
  const { data, upsert, remove } = useStore();
  const [c, setC] = useState<Client>(initial ?? { id: uid('cli'), name: '', contact: '', email: '', industry: '', status: 'Lead' });
  const set = <K extends keyof Client>(k: K, v: Client[K]) => setC((x) => ({ ...x, [k]: v }));
  const hasRecords = !!initial && (data.projects.some((p) => p.clientId === c.id) || data.invoices.some((i) => i.clientId === c.id));
  return (
    <Modal title={initial ? 'Edit client' : 'New client'} onClose={onClose} footer={<>
      {initial && <button className="btn btn-danger" style={{ marginRight: 'auto' }} disabled={hasRecords} title={hasRecords ? 'Client has projects or invoices — archive instead' : ''} onClick={() => { if (confirmDelete(`client "${c.name}"`)) { remove('clients', c.id, `Deleted client "${c.name}"`); onClose(); } }}>Delete</button>}
      <button className="btn" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" disabled={!c.name.trim()} onClick={() => { upsert('clients', { ...c, name: c.name.trim() }, initial ? undefined : `New client "${c.name.trim()}"`); onClose(); }}>Save</button>
    </>}>
      <div className="form-grid">
        <Field label="Company name" span={2}><input autoFocus value={c.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Primary contact"><input value={c.contact} onChange={(e) => set('contact', e.target.value)} /></Field>
        <Field label="Email"><input type="email" value={c.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="Industry"><input value={c.industry} onChange={(e) => set('industry', e.target.value)} /></Field>
        <Field label="Status"><select value={c.status} onChange={(e) => set('status', e.target.value as Client['status'])}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
      </div>
    </Modal>
  );
}

export default function Clients() {
  const { data } = useStore();
  const money = useMoney();
  const [editing, setEditing] = useState<Client | 'new' | null>(null);
  const [q, setQ] = useState('');
  const today = todayISO();
  const list = data.clients.filter((c) => `${c.name} ${c.contact} ${c.industry}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHead title="Clients" sub="Accounts, their projects and billing history." actions={<button className="btn btn-primary" onClick={() => setEditing('new')}>+ New client</button>} />
      <div className="card">
        <div className="card-head"><input className="search" placeholder="Search clients…" value={q} onChange={(e) => setQ(e.target.value)} /><span className="muted small">{list.length} clients</span></div>
        {list.length === 0 ? <Empty>No clients yet.</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Client</th><th>Contact</th><th>Status</th><th>Projects</th><th className="num">Lifetime billed</th><th className="num">Outstanding</th></tr></thead>
              <tbody>{list.map((c) => {
                const projects = data.projects.filter((p) => p.clientId === c.id);
                const invs = data.invoices.filter((i) => i.clientId === c.id && (i.status === 'Sent' || i.status === 'Paid'));
                const billed = invs.reduce((s, i) => s + invoiceSubtotal(i), 0);
                const outstanding = invs.filter((i) => i.status === 'Sent').reduce((s, i) => s + invoiceTotal(i), 0);
                const overdue = invs.some((i) => invoiceDisplayStatus(i, today) === 'Overdue');
                return (
                  <tr key={c.id} className="clickable" onClick={() => setEditing(c)}>
                    <td><strong>{c.name}</strong><div className="muted small">{c.industry}</div></td>
                    <td>{c.contact}<div className="muted small">{c.email}</div></td>
                    <td><Badge>{c.status}</Badge></td>
                    <td>
                      {projects.length === 0 ? <span className="muted small">—</span> : projects.map((p) => (
                        <div key={p.id}><button className="link-btn small" onClick={(e) => { e.stopPropagation(); navigate(`projects/${p.id}`); }}>{p.name}</button></div>
                      ))}
                    </td>
                    <td className="num">{money(billed)}</td>
                    <td className={`num ${overdue ? 'bad' : ''}`}>{money(outstanding)}{overdue && <div className="small">overdue</div>}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )}
      </div>
      {editing && <ClientForm initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </>
  );
}
