import { useState } from 'react';
import { useLookups, useStore } from '../store';
import { todayISO, uid, utilisation, weeklyHours } from '../logic';
import { Avatar, Badge, confirmDelete, DeptChip, Field, Modal, PageHead, Progress, useMoney } from '../components/ui';
import type { Department, Member, Role } from '../types';

const ROLES: Role[] = ['Admin', 'Manager', 'Member', 'Finance'];
const COLORS = ['#6366f1', '#0ea5e9', '#ec4899', '#f59e0b', '#10b981', '#64748b', '#ef4444', '#8b5cf6', '#14b8a6'];

function DeptForm({ initial, onClose }: { initial?: Department; onClose: () => void }) {
  const { data, upsert, remove } = useStore();
  const [d, setD] = useState<Department>(initial ?? { id: uid('dep'), name: '', color: COLORS[data.departments.length % COLORS.length] });
  const used = !!initial && (data.members.some((m) => m.departmentId === d.id) || data.templates.some((t) => t.stages.includes(d.id)) || data.tasks.some((t) => t.departmentId === d.id));
  return (
    <Modal title={initial ? 'Edit department' : 'New department'} onClose={onClose} footer={<>
      {initial && <button className="btn btn-danger" style={{ marginRight: 'auto' }} disabled={used} title={used ? 'Department has members, tasks or is used in a workflow' : ''} onClick={() => { if (confirmDelete(`department "${d.name}"`)) { remove('departments', d.id); onClose(); } }}>Delete</button>}
      <button className="btn" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" disabled={!d.name.trim()} onClick={() => { upsert('departments', { ...d, name: d.name.trim() }, initial ? undefined : `Department "${d.name.trim()}" created`); onClose(); }}>Save</button>
    </>}>
      <div className="form-grid">
        <Field label="Name" span={2}><input autoFocus value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></Field>
        <Field label="Head of department">
          <select value={d.headId ?? ''} onChange={(e) => setD({ ...d, headId: e.target.value || undefined })}>
            <option value="">— None —</option>
            {data.members.filter((m) => m.departmentId === d.id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Field>
        <Field label="Colour">
          <div className="row gap wrap">
            {COLORS.map((c) => (
              <button key={c} type="button" aria-label={`Colour ${c}`} onClick={() => setD({ ...d, color: c })}
                style={{ width: 24, height: 24, borderRadius: 6, background: c, border: d.color === c ? '2px solid var(--text)' : '2px solid transparent', cursor: 'pointer' }} />
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}

function MemberForm({ initial, onClose }: { initial?: Member; onClose: () => void }) {
  const { data, upsert, remove } = useStore();
  const [m, setM] = useState<Member>(initial ?? { id: uid('mem'), name: '', title: '', departmentId: data.departments[0]?.id ?? '', role: 'Member', costRate: 1000, billRate: 2500, capacity: 40 });
  const set = <K extends keyof Member>(k: K, v: Member[K]) => setM((x) => ({ ...x, [k]: v }));
  const isMe = m.id === data.settings.currentUserId;
  const hasTime = !!initial && data.timeEntries.some((t) => t.memberId === m.id);
  return (
    <Modal title={initial ? 'Edit team member' : 'Add team member'} onClose={onClose} footer={<>
      {initial && <button className="btn btn-danger" style={{ marginRight: 'auto' }} disabled={isMe || hasTime} title={isMe ? "You can't remove yourself" : hasTime ? 'Member has logged time' : ''} onClick={() => { if (confirmDelete(m.name)) { remove('members', m.id, `Removed ${m.name}`); onClose(); } }}>Remove</button>}
      <button className="btn" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" disabled={!m.name.trim() || !m.departmentId} onClick={() => { upsert('members', { ...m, name: m.name.trim() }, initial ? undefined : `${m.name.trim()} joined ${data.departments.find((d) => d.id === m.departmentId)?.name}`); onClose(); }}>Save</button>
    </>}>
      <div className="form-grid">
        <Field label="Full name"><input autoFocus value={m.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Job title"><input value={m.title} onChange={(e) => set('title', e.target.value)} /></Field>
        <Field label="Department"><select value={m.departmentId} onChange={(e) => set('departmentId', e.target.value)}>{data.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        <Field label="Role"><select value={m.role} onChange={(e) => set('role', e.target.value as Role)}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></Field>
        <Field label={`Cost rate / hr (${data.settings.currency})`}><input type="number" min={0} value={m.costRate} onChange={(e) => set('costRate', Number(e.target.value))} /></Field>
        <Field label={`Bill rate / hr (${data.settings.currency})`}><input type="number" min={0} value={m.billRate} onChange={(e) => set('billRate', Number(e.target.value))} /></Field>
        <Field label="Weekly capacity (hours)"><input type="number" min={0} value={m.capacity} onChange={(e) => set('capacity', Number(e.target.value))} /></Field>
      </div>
    </Modal>
  );
}

export default function Team() {
  const { data } = useStore();
  const L = useLookups();
  const money = useMoney();
  const today = todayISO();
  const [editDept, setEditDept] = useState<Department | 'new' | null>(null);
  const [editMember, setEditMember] = useState<Member | 'new' | null>(null);

  return (
    <>
      <PageHead title="Departments & Team" sub="Who works where, their capacity and how much they're carrying." actions={<>
        <button className="btn" onClick={() => setEditDept('new')}>+ Department</button>
        <button className="btn btn-primary" disabled={!data.departments.length} onClick={() => setEditMember('new')}>+ Team member</button>
      </>} />

      <div className="dept-grid">
        {data.departments.map((d) => {
          const members = data.members.filter((m) => m.departmentId === d.id);
          const cap = members.reduce((s, m) => s + m.capacity, 0);
          const hrs = members.reduce((s, m) => s + weeklyHours(data.timeEntries, m.id, today), 0);
          const queue = data.workItems.filter((w) => w.state !== 'Completed' && L.template.get(w.templateId)?.stages[w.stageIndex] === d.id).length;
          const openTasks = data.tasks.filter((t) => t.departmentId === d.id && t.status !== 'Done').length;
          const head = d.headId ? L.member.get(d.headId) : undefined;
          return (
            <div key={d.id} className="card dept-card" style={{ ['--c' as string]: d.color }}>
              <div className="row between"><h3>{d.name}</h3><button className="link-btn small" onClick={() => setEditDept(d)}>Edit</button></div>
              <div className="muted small" style={{ margin: '2px 0 10px' }}>Head: {head?.name ?? '—'}</div>
              <div className="row between small"><span>{members.length} people</span><span>{queue} handoffs · {openTasks} tasks</span></div>
              <div className="small muted" style={{ margin: '10px 0 4px' }}>Utilisation (7 days): {Math.round(utilisation(hrs, cap))}%</div>
              <Progress pct={utilisation(hrs, cap)} warnAt={90} dangerAt={105} />
              <div className="row" style={{ marginTop: 10, gap: 4 }}>{members.map((m) => <Avatar key={m.id} name={m.name} size={24} color={d.color} />)}</div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="card-head"><h2>Team</h2><span className="muted small">{data.members.length} people</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Department</th><th>Role</th><th className="num">Cost / hr</th><th className="num">Bill / hr</th><th>Hours (7d)</th><th>Open work</th></tr></thead>
            <tbody>{data.members.map((m) => {
              const d = L.dept.get(m.departmentId);
              const h = weeklyHours(data.timeEntries, m.id, today);
              const u = utilisation(h, m.capacity);
              const tasks = data.tasks.filter((t) => t.assigneeId === m.id && t.status !== 'Done').length;
              const items = data.workItems.filter((w) => w.assigneeId === m.id && w.state !== 'Completed').length;
              return (
                <tr key={m.id} className="clickable" onClick={() => setEditMember(m)}>
                  <td><div className="row gap"><Avatar name={m.name} color={d?.color} /><div><strong>{m.name}</strong>{m.id === data.settings.currentUserId && <span className="muted small"> (you)</span>}<div className="muted small">{m.title}</div></div></div></td>
                  <td><DeptChip name={d?.name} color={d?.color} /></td>
                  <td><Badge tone={m.role === 'Admin' ? 'purple' : m.role === 'Finance' ? 'green' : m.role === 'Manager' ? 'blue' : 'gray'}>{m.role}</Badge></td>
                  <td className="num">{money(m.costRate)}</td>
                  <td className="num">{money(m.billRate)}</td>
                  <td style={{ minWidth: 130 }}><div className="small muted">{h.toFixed(1)} / {m.capacity}h · {Math.round(u)}%</div><Progress pct={u} warnAt={90} dangerAt={105} /></td>
                  <td className="small">{tasks} tasks · {items} handoffs</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </div>

      {editDept && <DeptForm initial={editDept === 'new' ? undefined : editDept} onClose={() => setEditDept(null)} />}
      {editMember && <MemberForm initial={editMember === 'new' ? undefined : editMember} onClose={() => setEditMember(null)} />}
    </>
  );
}
