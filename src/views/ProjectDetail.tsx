import { useState } from 'react';
import { useLookups, useStore } from '../store';
import { navigate } from '../router';
import { addDays, fmtDate, invoiceDisplayStatus, invoiceTotal, projectFinancials, todayISO, uid } from '../logic';
import { Avatar, Badge, confirmDelete, DeptChip, Empty, Field, Modal, PageHead, Progress, Stat, Tabs, useMoney } from '../components/ui';
import { ProjectForm } from './Projects';
import { WorkItemForm, PipelineSteps } from './Workflow';
import { InvoiceForm } from './Finance';
import type { Priority, Task, TaskStatus } from '../types';

export const TASK_STATUSES: TaskStatus[] = ['To Do', 'In Progress', 'Review', 'Done'];
export const PRIORITIES: Priority[] = ['Low', 'Medium', 'High', 'Urgent'];

export function TaskForm({ initial, projectId, onClose }: { initial?: Task; projectId: string; onClose: () => void }) {
  const { data, upsert, remove } = useStore();
  const [t, setT] = useState<Task>(initial ?? {
    id: uid('tsk'), projectId, title: '', departmentId: data.departments[0]?.id ?? '', status: 'To Do',
    priority: 'Medium', dueDate: addDays(todayISO(), 7), estimateHours: 4,
  });
  const set = <K extends keyof Task>(k: K, v: Task[K]) => setT((x) => ({ ...x, [k]: v }));
  const deptMembers = data.members.filter((m) => m.departmentId === t.departmentId);
  return (
    <Modal title={initial ? 'Edit task' : 'New task'} onClose={onClose} footer={<>
      {initial && <button className="btn btn-danger" style={{ marginRight: 'auto' }} onClick={() => { if (confirmDelete('this task')) { remove('tasks', t.id, `Deleted task "${t.title}"`); onClose(); } }}>Delete</button>}
      <button className="btn" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" disabled={!t.title.trim()} onClick={() => { upsert('tasks', { ...t, title: t.title.trim() }, initial ? undefined : `Task "${t.title.trim()}" added`); onClose(); }}>Save</button>
    </>}>
      <div className="form-grid">
        <Field label="Title" span={2}><input autoFocus value={t.title} onChange={(e) => set('title', e.target.value)} /></Field>
        <Field label="Department">
          <select value={t.departmentId} onChange={(e) => setT((x) => ({ ...x, departmentId: e.target.value, assigneeId: undefined }))}>
            {data.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Assignee">
          <select value={t.assigneeId ?? ''} onChange={(e) => set('assigneeId', e.target.value || undefined)}>
            <option value="">Unassigned</option>
            {deptMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Field>
        <Field label="Status"><select value={t.status} onChange={(e) => set('status', e.target.value as TaskStatus)}>{TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Priority"><select value={t.priority} onChange={(e) => set('priority', e.target.value as Priority)}>{PRIORITIES.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Due date"><input type="date" value={t.dueDate} onChange={(e) => set('dueDate', e.target.value)} /></Field>
        <Field label="Estimate (hours)"><input type="number" min={0} step={0.5} value={t.estimateHours} onChange={(e) => set('estimateHours', Number(e.target.value))} /></Field>
      </div>
    </Modal>
  );
}

function TaskBoard({ projectId }: { projectId: string }) {
  const { data, upsert } = useStore();
  const L = useLookups();
  const [editing, setEditing] = useState<Task | 'new' | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);
  const today = todayISO();
  const tasks = data.tasks.filter((t) => t.projectId === projectId);

  const move = (id: string, status: TaskStatus) => {
    const t = tasks.find((x) => x.id === id);
    if (t && t.status !== status) upsert('tasks', { ...t, status }, status === 'Done' ? `Task "${t.title}" completed` : undefined);
  };

  return (
    <>
      <div className="row between" style={{ marginBottom: 10 }}>
        <span className="muted small">Drag cards between columns to update status.</span>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>+ Task</button>
      </div>
      <div className="board">
        {TASK_STATUSES.map((s) => {
          const col = tasks.filter((t) => t.status === s);
          return (
            <div
              key={s}
              className={`column ${over === s ? 'drop' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setOver(s); }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => { e.preventDefault(); if (dragId) move(dragId, s); setDragId(null); setOver(null); }}
            >
              <div className="column-head"><span>{s}</span><span className="count">{col.length}</span></div>
              {col.map((t) => {
                const a = t.assigneeId ? L.member.get(t.assigneeId) : undefined;
                const d = L.dept.get(t.departmentId);
                return (
                  <div
                    key={t.id}
                    className={`kcard ${dragId === t.id ? 'dragging' : ''}`}
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => { setDragId(null); setOver(null); }}
                    onClick={() => setEditing(t)}
                  >
                    <div className="kcard-title">{t.title}</div>
                    <div className="kcard-meta">
                      <DeptChip name={d?.name} color={d?.color} />
                      <Badge>{t.priority}</Badge>
                      <span className={t.dueDate < today && t.status !== 'Done' ? 'bad' : ''}>{fmtDate(t.dueDate)}</span>
                      <span>{t.estimateHours}h</span>
                      <span className="grow" />
                      {a && <Avatar name={a.name} size={22} color={d?.color} />}
                    </div>
                    <select
                      aria-label="Move task"
                      className="small"
                      style={{ marginTop: 8, padding: '3px 6px' }}
                      value={t.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => move(t.id, e.target.value as TaskStatus)}
                    >
                      {TASK_STATUSES.map((x) => <option key={x}>{x}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      {editing && <TaskForm projectId={projectId} initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

export default function ProjectDetail({ id }: { id: string }) {
  const { data, remove } = useStore();
  const L = useLookups();
  const money = useMoney();
  const [tab, setTab] = useState<'tasks' | 'workflow' | 'time' | 'finance'>('tasks');
  const [editing, setEditing] = useState(false);
  const [newWork, setNewWork] = useState(false);
  const [newInvoice, setNewInvoice] = useState(false);
  const p = data.projects.find((x) => x.id === id);

  if (!p) return <Empty>Project not found. <button className="link-btn" onClick={() => navigate('projects')}>Back to projects</button></Empty>;

  const f = projectFinancials(data, p);
  const tasks = data.tasks.filter((t) => t.projectId === p.id);
  const work = data.workItems.filter((w) => w.projectId === p.id);
  const time = data.timeEntries.filter((t) => t.projectId === p.id).sort((a, b) => b.date.localeCompare(a.date));
  const invoices = data.invoices.filter((i) => i.projectId === p.id);
  const expenses = data.expenses.filter((e) => e.projectId === p.id);
  const owner = L.member.get(p.ownerId);

  // hours by member
  const byMember = new Map<string, number>();
  time.forEach((t) => byMember.set(t.memberId, (byMember.get(t.memberId) ?? 0) + t.hours));

  return (
    <>
      <button className="link-btn small" onClick={() => navigate('projects')}>← Projects</button>
      <PageHead
        title={p.name}
        sub={`${L.client.get(p.clientId)?.name} · ${p.billing} · ${fmtDate(p.startDate)} → ${fmtDate(p.dueDate)}`}
        actions={<>
          <Badge>{p.status}</Badge>
          <button className="btn" onClick={() => setEditing(true)}>Edit</button>
          <button className="btn btn-danger" onClick={() => { if (confirmDelete(`project "${p.name}" and all its tasks, handoffs and time entries`)) { remove('projects', p.id, `Deleted project "${p.name}"`); navigate('projects'); } }}>Delete</button>
        </>}
      />
      {p.description && <p className="muted" style={{ marginTop: -8, marginBottom: 16, maxWidth: 760 }}>{p.description}</p>}

      <div className="grid-stats">
        <Stat label="Budget" value={money(p.budget)} sub={<><Progress pct={f.budgetUsedPct} /><span>{Math.round(f.budgetUsedPct)}% used ({money(f.totalCost)})</span></>} />
        <Stat label="Hours logged" value={f.hours.toFixed(1)} sub={`${f.billableHours.toFixed(1)} billable · ${money(f.billableValue)} value`} />
        <Stat label="Invoiced" value={money(f.invoiced)} sub={`${money(f.collected)} collected`} />
        <Stat label="Margin" value={f.invoiced ? `${Math.round(f.marginPct)}%` : '—'} tone={f.margin >= 0 ? 'good' : 'bad'} sub={money(f.margin)} />
        <Stat label="Owner" value={<span className="row gap" style={{ fontSize: 15 }}>{owner && <Avatar name={owner.name} />}{owner?.name}</span>} sub={`${tasks.filter((t) => t.status === 'Done').length}/${tasks.length} tasks done`} />
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'tasks', label: 'Tasks', count: tasks.length },
        { id: 'workflow', label: 'Department handoffs', count: work.length },
        { id: 'time', label: 'Time', count: time.length },
        { id: 'finance', label: 'Invoices & expenses', count: invoices.length + expenses.length },
      ]} />

      {tab === 'tasks' && <TaskBoard projectId={p.id} />}

      {tab === 'workflow' && (
        <div className="card">
          <div className="card-head"><h2>Work moving between departments</h2><button className="btn btn-primary btn-sm" onClick={() => setNewWork(true)}>+ Work item</button></div>
          {work.length === 0 ? <Empty>No handoffs yet.</Empty> : work.map((w) => {
            const tpl = L.template.get(w.templateId);
            return (
              <div key={w.id} className="list-row wrap">
                <div className="grow" style={{ minWidth: 220 }}>
                  <strong>{w.title}</strong>
                  <div className="muted small">{tpl?.name} · due {fmtDate(w.dueDate)}</div>
                </div>
                {tpl && <PipelineSteps item={w} tpl={tpl} />}
              </div>
            );
          })}
          <div className="card-pad"><button className="link-btn small" onClick={() => navigate('workflow')}>Open the workflow board →</button></div>
        </div>
      )}

      {tab === 'time' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-head"><h2>Time entries</h2><button className="link-btn" onClick={() => navigate('time')}>Log time →</button></div>
            {time.length === 0 ? <Empty>No time logged.</Empty> : (
              <div className="table-wrap" style={{ maxHeight: 420, overflowY: 'auto' }}>
                <table>
                  <thead><tr><th>Date</th><th>Member</th><th className="num">Hours</th><th>Billable</th></tr></thead>
                  <tbody>{time.slice(0, 100).map((t) => (
                    <tr key={t.id}><td className="small">{fmtDate(t.date)}</td><td>{L.member.get(t.memberId)?.name}</td><td className="num">{t.hours}</td><td>{t.billable ? '✓' : '—'}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
          <div className="card">
            <div className="card-head"><h2>Hours by person</h2></div>
            {[...byMember.entries()].sort((a, b) => b[1] - a[1]).map(([mid, h]) => {
              const m = L.member.get(mid);
              return (
                <div key={mid} className="list-row">
                  <Avatar name={m?.name} color={L.dept.get(m?.departmentId ?? '')?.color} />
                  <div className="grow">{m?.name}<div className="muted small">{m?.title}</div></div>
                  <span className="num">{h.toFixed(1)}h</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'finance' && (
        <div className="grid-2-even">
          <div className="card">
            <div className="card-head"><h2>Invoices</h2><button className="btn btn-primary btn-sm" onClick={() => setNewInvoice(true)}>+ Invoice</button></div>
            {invoices.length === 0 ? <Empty>No invoices.</Empty> : invoices.map((i) => (
              <div key={i.id} className="list-row">
                <div className="grow"><strong>{i.number}</strong><div className="muted small">Issued {fmtDate(i.issueDate)} · due {fmtDate(i.dueDate)}</div></div>
                <Badge>{invoiceDisplayStatus(i)}</Badge>
                <span className="num">{money(invoiceTotal(i))}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-head"><h2>Expenses</h2><button className="link-btn" onClick={() => navigate('finance')}>Manage →</button></div>
            {expenses.length === 0 ? <Empty>No expenses.</Empty> : expenses.map((e) => (
              <div key={e.id} className="list-row">
                <div className="grow">{e.description}<div className="muted small">{e.category} · {fmtDate(e.date)}</div></div>
                <Badge>{e.status}</Badge>
                <span className="num">{money(e.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {editing && <ProjectForm initial={p} onClose={() => setEditing(false)} />}
      {newWork && <WorkItemForm projectId={p.id} onClose={() => setNewWork(false)} />}
      {newInvoice && <InvoiceForm projectId={p.id} onClose={() => setNewInvoice(false)} />}
    </>
  );
}
