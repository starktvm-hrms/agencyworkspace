import { useState } from 'react';
import { useLookups, useStore } from '../store';
import { addDays, daysInStage, fmtDate, todayISO, uid } from '../logic';
import { Avatar, Badge, confirmDelete, DeptChip, Empty, Field, Modal, PageHead, Tabs } from '../components/ui';
import { PRIORITIES } from './ProjectDetail';
import type { Priority, WorkflowTemplate, WorkHistoryEntry, WorkItem } from '../types';

export function PipelineSteps({ item, tpl }: { item: WorkItem; tpl: WorkflowTemplate }) {
  const L = useLookups();
  return (
    <div className="pipeline">
      {tpl.stages.map((depId, i) => {
        const done = item.state === 'Completed' || i < item.stageIndex;
        const current = item.state !== 'Completed' && i === item.stageIndex;
        return (
          <span key={i} className="row" style={{ gap: 4 }}>
            {i > 0 && <span className="pipe-arrow">›</span>}
            <span className={`pipe-step ${done ? 'done' : ''} ${current ? 'current' : ''} ${current && item.state === 'Blocked' ? 'blocked' : ''}`}>
              {done && '✓ '}{L.dept.get(depId)?.name ?? '?'}
            </span>
          </span>
        );
      })}
    </div>
  );
}

export function WorkItemForm({ projectId, onClose }: { projectId?: string; onClose: () => void }) {
  const { data, upsert } = useStore();
  const [w, setW] = useState<WorkItem>({
    id: uid('wi'), title: '', projectId: projectId ?? data.projects[0]?.id ?? '', templateId: data.templates[0]?.id ?? '',
    stageIndex: 0, state: 'Active', priority: 'Medium', dueDate: addDays(todayISO(), 7),
    history: [],
  });
  const set = <K extends keyof WorkItem>(k: K, v: WorkItem[K]) => setW((x) => ({ ...x, [k]: v }));
  const tpl = data.templates.find((t) => t.id === w.templateId);
  const firstDept = tpl ? data.departments.find((d) => d.id === tpl.stages[0]) : undefined;
  const assignable = data.members.filter((m) => m.departmentId === firstDept?.id);
  const valid = w.title.trim() && w.projectId && tpl && tpl.stages.length > 0;

  const save = () => {
    upsert('workItems', {
      ...w, title: w.title.trim(),
      history: [{ at: new Date().toISOString(), action: 'created', byId: data.settings.currentUserId }],
    }, `New work item "${w.title.trim()}" sent to ${firstDept?.name}`);
    onClose();
  };

  return (
    <Modal title="New work item" onClose={onClose} footer={<>
      <button className="btn" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" disabled={!valid} onClick={save}>Create & send to {firstDept?.name ?? '…'}</button>
    </>}>
      <div className="form-grid">
        <Field label="Title" span={2}><input autoFocus placeholder="e.g. Diwali social campaign — brief" value={w.title} onChange={(e) => set('title', e.target.value)} /></Field>
        <Field label="Project">
          <select value={w.projectId} onChange={(e) => set('projectId', e.target.value)}>
            {data.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Workflow">
          <select value={w.templateId} onChange={(e) => setW((x) => ({ ...x, templateId: e.target.value, assigneeId: undefined }))}>
            {data.templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="Priority"><select value={w.priority} onChange={(e) => set('priority', e.target.value as Priority)}>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select></Field>
        <Field label="Due date"><input type="date" value={w.dueDate} onChange={(e) => set('dueDate', e.target.value)} /></Field>
        <Field label={`Assign in ${firstDept?.name ?? 'first stage'}`} span={2}>
          <select value={w.assigneeId ?? ''} onChange={(e) => set('assigneeId', e.target.value || undefined)}>
            <option value="">Unassigned (department queue)</option>
            {assignable.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Field>
        {tpl && <div className="span-2"><div className="muted small" style={{ marginBottom: 6 }}>Route</div><PipelineSteps item={w} tpl={tpl} /></div>}
      </div>
    </Modal>
  );
}

const ACTION_LABEL: Record<WorkHistoryEntry['action'], string> = {
  created: 'Created', advanced: 'Handed off', returned: 'Returned', blocked: 'Blocked', unblocked: 'Unblocked',
  completed: 'Completed', assigned: 'Assigned', comment: 'Comment',
};

function WorkItemDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, dispatch, upsert, remove } = useStore();
  const L = useLookups();
  const [note, setNote] = useState('');
  const w = data.workItems.find((x) => x.id === id);
  if (!w) return null;
  const tpl = L.template.get(w.templateId)!;
  const deptId = tpl.stages[w.stageIndex];
  const dept = L.dept.get(deptId);
  const nextDept = L.dept.get(tpl.stages[w.stageIndex + 1]);
  const prevDept = L.dept.get(tpl.stages[w.stageIndex - 1]);
  const isLast = w.stageIndex >= tpl.stages.length - 1;
  const done = w.state === 'Completed';
  const deptMembers = data.members.filter((m) => m.departmentId === deptId);
  const stageName = (i?: number) => (i === undefined ? '' : L.dept.get(tpl.stages[i])?.name ?? '');

  const act = (fn: () => void) => { fn(); setNote(''); };

  return (
    <Modal wide title={w.title} onClose={onClose} footer={<>
      <button className="btn btn-danger" style={{ marginRight: 'auto' }} onClick={() => { if (confirmDelete('this work item')) { remove('workItems', w.id, `Deleted work item "${w.title}"`); onClose(); } }}>Delete</button>
      <button className="btn" onClick={onClose}>Close</button>
    </>}>
      <div className="stack">
        <div className="row wrap gap between">
          <PipelineSteps item={w} tpl={tpl} />
          <div className="row gap"><Badge>{w.state}</Badge><Badge>{w.priority}</Badge></div>
        </div>
        <dl className="kv">
          <dt>Project</dt><dd>{L.project.get(w.projectId)?.name}</dd>
          <dt>Workflow</dt><dd>{tpl.name}</dd>
          <dt>Current department</dt><dd>{done ? '—' : <DeptChip name={dept?.name} color={dept?.color} />}</dd>
          <dt>Due</dt><dd className={w.dueDate < todayISO() && !done ? 'bad' : ''}>{fmtDate(w.dueDate)}</dd>
          {!done && <><dt>Time in stage</dt><dd>{daysInStage(w)} day(s)</dd></>}
        </dl>

        {!done && (
          <div className="card card-pad stack" style={{ gap: 10, background: 'var(--panel-2)' }}>
            <div className="row gap wrap">
              <Field label={`Assignee (${dept?.name})`}>
                <select value={w.assigneeId ?? ''} onChange={(e) => {
                  const m = L.member.get(e.target.value);
                  upsert('workItems', { ...w, assigneeId: e.target.value || undefined, history: [...w.history, { at: new Date().toISOString(), action: 'assigned', byId: data.settings.currentUserId, note: m ? `Assigned to ${m.name}` : 'Unassigned' }] });
                }}>
                  <option value="">Unassigned</option>
                  {deptMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </Field>
              <Field label="Due date"><input type="date" value={w.dueDate} onChange={(e) => upsert('workItems', { ...w, dueDate: e.target.value })} /></Field>
            </div>
            <Field label="Handoff note / comment">
              <textarea placeholder="What does the next team need to know? Required when returning work." value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <div className="row gap wrap">
              <button className="btn btn-primary" disabled={w.state === 'Blocked'} onClick={() => act(() => dispatch({ type: 'work/advance', id: w.id, note: note.trim() || undefined }))}>
                {isLast ? '✓ Mark complete' : `Hand off to ${nextDept?.name} →`}
              </button>
              <button className="btn" disabled={w.stageIndex === 0 || !note.trim()} title={!note.trim() ? 'Add a note explaining what needs to change' : ''} onClick={() => act(() => dispatch({ type: 'work/return', id: w.id, note: note.trim() }))}>
                ← Return to {prevDept?.name ?? '—'}
              </button>
              <button className={`btn ${w.state === 'Blocked' ? '' : 'btn-danger'}`} onClick={() => act(() => dispatch({ type: 'work/block', id: w.id, note: note.trim() || undefined }))}>
                {w.state === 'Blocked' ? 'Unblock' : 'Mark blocked'}
              </button>
              <button className="btn" disabled={!note.trim()} onClick={() => act(() => dispatch({ type: 'work/comment', id: w.id, note: note.trim() }))}>Comment</button>
            </div>
          </div>
        )}

        <div>
          <h3 style={{ marginBottom: 6 }}>History</h3>
          <ul className="timeline">
            {[...w.history].reverse().map((h, i) => (
              <li key={i}>
                <span className={`tl-dot ${h.action}`} />
                <div className="grow">
                  <div>
                    <strong>{ACTION_LABEL[h.action]}</strong>
                    {h.action === 'advanced' || h.action === 'returned' ? <span className="muted"> · {stageName(h.fromStage)} → {stageName(h.toStage)}</span> : null}
                    {h.byId && <span className="muted"> by {L.member.get(h.byId)?.name}</span>}
                  </div>
                  {h.note && <div className="small">{h.note}</div>}
                </div>
                <span className="muted small" style={{ whiteSpace: 'nowrap' }}>{new Date(h.at).toLocaleString(data.settings.locale, { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  );
}

function TemplateEditor({ initial, onClose }: { initial?: WorkflowTemplate; onClose: () => void }) {
  const { data, upsert, remove } = useStore();
  const [t, setT] = useState<WorkflowTemplate>(initial ?? { id: uid('tpl'), name: '', stages: [data.departments[0]?.id ?? ''] });
  const inUse = data.workItems.some((w) => w.templateId === t.id && w.state !== 'Completed');
  const setStage = (i: number, v: string) => setT((x) => ({ ...x, stages: x.stages.map((s, j) => (j === i ? v : s)) }));
  const moveStage = (i: number, dir: -1 | 1) => setT((x) => {
    const s = [...x.stages]; const j = i + dir;
    if (j < 0 || j >= s.length) return x;
    [s[i], s[j]] = [s[j], s[i]];
    return { ...x, stages: s };
  });
  return (
    <Modal title={initial ? 'Edit workflow' : 'New workflow'} onClose={onClose} footer={<>
      {initial && <button className="btn btn-danger" style={{ marginRight: 'auto' }} disabled={inUse} title={inUse ? 'Workflow has active items' : ''} onClick={() => { if (confirmDelete(`workflow "${t.name}"`)) { remove('templates', t.id); onClose(); } }}>Delete</button>}
      <button className="btn" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" disabled={!t.name.trim() || t.stages.length === 0} onClick={() => {
        upsert('templates', { ...t, name: t.name.trim() }, `Workflow "${t.name.trim()}" saved`);
        // Keep in-flight items on a valid stage if stages were removed.
        for (const w of data.workItems) {
          if (w.templateId === t.id && w.stageIndex > t.stages.length - 1) upsert('workItems', { ...w, stageIndex: t.stages.length - 1 });
        }
        onClose();
      }}>Save</button>
    </>}>
      <div className="stack" style={{ gap: 12 }}>
        <Field label="Workflow name"><input autoFocus value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} placeholder="e.g. Video Production" /></Field>
        {inUse && <p className="small muted" style={{ margin: 0 }}>This workflow has active items — changing stages affects where those items sit.</p>}
        <div className="field"><span>Stages (in order)</span>
          {t.stages.map((s, i) => (
            <div key={i} className="row gap" style={{ marginBottom: 6 }}>
              <span className="muted small" style={{ width: 18 }}>{i + 1}.</span>
              <select value={s} onChange={(e) => setStage(i, e.target.value)}>
                {data.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <button className="btn btn-sm" onClick={() => moveStage(i, -1)} aria-label="Move up">↑</button>
              <button className="btn btn-sm" onClick={() => moveStage(i, 1)} aria-label="Move down">↓</button>
              <button className="btn btn-sm btn-danger" disabled={t.stages.length <= 1} onClick={() => setT({ ...t, stages: t.stages.filter((_, j) => j !== i) })} aria-label="Remove stage">×</button>
            </div>
          ))}
          <button className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setT({ ...t, stages: [...t.stages, data.departments[0]?.id ?? ''] })}>+ Add stage</button>
        </div>
      </div>
    </Modal>
  );
}

export default function Workflow() {
  const { data, dispatch } = useStore();
  const L = useLookups();
  const [tab, setTab] = useState<'board' | 'list' | 'templates'>('board');
  const [tplFilter, setTplFilter] = useState('');
  const [projFilter, setProjFilter] = useState('');
  const [showDone, setShowDone] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingTpl, setEditingTpl] = useState<WorkflowTemplate | 'new' | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const today = todayISO();

  const items = data.workItems.filter((w) =>
    (!tplFilter || w.templateId === tplFilter) && (!projFilter || w.projectId === projFilter) && (showDone || w.state !== 'Completed'));
  const active = items.filter((w) => w.state !== 'Completed');
  const deptOf = (w: WorkItem) => L.template.get(w.templateId)?.stages[w.stageIndex];

  /** Dropping a card on the next department in its route hands it off; on the previous one asks for a return note. */
  const onDrop = (deptId: string) => {
    const w = data.workItems.find((x) => x.id === dragId);
    setDragId(null);
    if (!w) return;
    const tpl = L.template.get(w.templateId)!;
    if (tpl.stages[w.stageIndex + 1] === deptId && w.state !== 'Blocked') {
      dispatch({ type: 'work/advance', id: w.id });
    } else if (tpl.stages[w.stageIndex - 1] === deptId) {
      const note = window.prompt(`Why is "${w.title}" being returned to ${L.dept.get(deptId)?.name}?`);
      if (note?.trim()) dispatch({ type: 'work/return', id: w.id, note: note.trim() });
    } else if (deptOf(w) !== deptId) {
      window.alert(w.state === 'Blocked' ? 'Unblock this item before handing it off.' : `"${w.title}" can only move to the next or previous department in its route (${tpl.name}).`);
    }
  };

  const stats = {
    active: active.length,
    blocked: active.filter((w) => w.state === 'Blocked').length,
    overdue: active.filter((w) => w.dueDate < today).length,
    returned: active.filter((w) => w.history[w.history.length - 1]?.action === 'returned').length,
  };

  return (
    <>
      <PageHead
        title="Workflow"
        sub="Work moves between departments along a route. Hand off when your stage is done; return with a note when changes are needed."
        actions={<>
          <button className="btn" onClick={() => setEditingTpl('new')}>+ Workflow</button>
          <button className="btn btn-primary" disabled={!data.projects.length || !data.templates.length} onClick={() => setCreating(true)}>+ Work item</button>
        </>}
      />
      <div className="grid-stats">
        <div className="stat card"><div className="stat-label">In flight</div><div className="stat-value">{stats.active}</div></div>
        <div className="stat card"><div className="stat-label">Blocked</div><div className={`stat-value ${stats.blocked ? 'bad' : ''}`}>{stats.blocked}</div></div>
        <div className="stat card"><div className="stat-label">Overdue</div><div className={`stat-value ${stats.overdue ? 'bad' : ''}`}>{stats.overdue}</div></div>
        <div className="stat card"><div className="stat-label">Sent back for changes</div><div className="stat-value">{stats.returned}</div></div>
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'board', label: 'Department board' },
        { id: 'list', label: 'All items', count: items.length },
        { id: 'templates', label: 'Workflows', count: data.templates.length },
      ]} />

      {tab !== 'templates' && (
        <div className="filters" style={{ marginBottom: 12 }}>
          <select value={tplFilter} onChange={(e) => setTplFilter(e.target.value)}>
            <option value="">All workflows</option>
            {data.templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={projFilter} onChange={(e) => setProjFilter(e.target.value)}>
            <option value="">All projects</option>
            {data.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {tab === 'list' && <label className="check small"><input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> Show completed</label>}
        </div>
      )}

      {tab === 'board' && (
        <>
          <p className="muted small" style={{ marginTop: 0 }}>Drag a card onto the next department in its route to hand it off, or onto the previous one to return it.</p>
          <div className="board">
            {data.departments.map((d) => {
              const col = active.filter((w) => deptOf(w) === d.id);
              const dragging = dragId ? data.workItems.find((x) => x.id === dragId) : undefined;
              const tpl = dragging ? L.template.get(dragging.templateId) : undefined;
              const isTarget = !!(dragging && tpl && (tpl.stages[dragging.stageIndex + 1] === d.id || tpl.stages[dragging.stageIndex - 1] === d.id));
              return (
                <div key={d.id} className={`column ${isTarget ? 'drop' : ''}`} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(d.id)}>
                  <div className="column-head"><DeptChip name={d.name} color={d.color} /><span className="count">{col.length}</span></div>
                  {col.length === 0 && <div className="muted small" style={{ padding: 8 }}>Queue empty</div>}
                  {col.map((w) => {
                    const t = L.template.get(w.templateId)!;
                    const a = w.assigneeId ? L.member.get(w.assigneeId) : undefined;
                    const last = w.history[w.history.length - 1];
                    return (
                      <div key={w.id} className={`kcard ${w.state === 'Blocked' ? 'blocked' : ''} ${dragId === w.id ? 'dragging' : ''}`}
                        draggable onDragStart={() => setDragId(w.id)} onDragEnd={() => setDragId(null)} onClick={() => setOpen(w.id)}>
                        <div className="kcard-title">{w.title}</div>
                        <div className="muted small" style={{ marginBottom: 6 }}>{L.project.get(w.projectId)?.name}</div>
                        <div className="kcard-meta">
                          {w.state === 'Blocked' ? <Badge>Blocked</Badge> : <Badge>{w.priority}</Badge>}
                          {last?.action === 'returned' && <Badge tone="amber">Returned</Badge>}
                          <span className={w.dueDate < today ? 'bad' : ''}>{fmtDate(w.dueDate)}</span>
                          <span>· step {w.stageIndex + 1}/{t.stages.length}</span>
                          <span className="grow" />
                          {a ? <Avatar name={a.name} size={22} color={d.color} /> : <span title="Unassigned">◌</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'list' && (
        <div className="card">
          {items.length === 0 ? <Empty>No work items.</Empty> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Item</th><th>Route</th><th>Assignee</th><th>Status</th><th>In stage</th><th>Due</th></tr></thead>
                <tbody>
                  {items.map((w) => {
                    const t = L.template.get(w.templateId)!;
                    return (
                      <tr key={w.id} className="clickable" onClick={() => setOpen(w.id)}>
                        <td><strong>{w.title}</strong><div className="muted small">{L.project.get(w.projectId)?.name} · {t.name}</div></td>
                        <td><PipelineSteps item={w} tpl={t} /></td>
                        <td className="small">{w.assigneeId ? L.member.get(w.assigneeId)?.name : <span className="muted">Unassigned</span>}</td>
                        <td><Badge>{w.state}</Badge></td>
                        <td className="small">{w.state === 'Completed' ? '—' : `${daysInStage(w)}d`}</td>
                        <td className={`small ${w.dueDate < today && w.state !== 'Completed' ? 'bad' : ''}`}>{fmtDate(w.dueDate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'templates' && (
        <div className="stack">
          {data.templates.length === 0 && <Empty>No workflows yet.</Empty>}
          {data.templates.map((t) => (
            <div key={t.id} className="card card-pad row between wrap gap">
              <div>
                <h3>{t.name}</h3>
                <div className="muted small" style={{ margin: '4px 0 8px' }}>{data.workItems.filter((w) => w.templateId === t.id && w.state !== 'Completed').length} active items</div>
                <div className="pipeline">
                  {t.stages.map((s, i) => (
                    <span key={i} className="row" style={{ gap: 4 }}>
                      {i > 0 && <span className="pipe-arrow">›</span>}
                      <span className="pipe-step"><DeptChip name={L.dept.get(s)?.name} color={L.dept.get(s)?.color} /></span>
                    </span>
                  ))}
                </div>
              </div>
              <button className="btn" onClick={() => setEditingTpl(t)}>Edit</button>
            </div>
          ))}
        </div>
      )}

      {open && <WorkItemDetail id={open} onClose={() => setOpen(null)} />}
      {creating && <WorkItemForm onClose={() => setCreating(false)} />}
      {editingTpl && <TemplateEditor initial={editingTpl === 'new' ? undefined : editingTpl} onClose={() => setEditingTpl(null)} />}
    </>
  );
}
