import { useMemo, useState } from 'react';
import { useLookups, useStore } from '../store';
import { navigate } from '../router';
import {
  addDays, expensesByCategory, fmtDate, invoiceDisplayStatus, invoiceSubtotal, invoiceTax, invoiceTotal,
  linesFromTime, monthlyPnL, nextInvoiceNumber, projectFinancials, receivables, todayISO, uid,
} from '../logic';
import { Badge, confirmDelete, Empty, Field, HBar, Modal, PageHead, PnLChart, Progress, Stat, Tabs, useMoney } from '../components/ui';
import type { Expense, ExpenseCategory, Invoice, InvoiceLine } from '../types';

const CATEGORIES: ExpenseCategory[] = ['Software', 'Media Spend', 'Freelancer', 'Travel', 'Production', 'Office', 'Other'];

export function InvoiceForm({ initial, projectId, onClose }: { initial?: Invoice; projectId?: string; onClose: () => void }) {
  const { data, upsert, remove } = useStore();
  const money = useMoney();
  const project = data.projects.find((p) => p.id === (initial?.projectId ?? projectId));
  const [inv, setInv] = useState<Invoice>(initial ?? {
    id: uid('inv'), number: nextInvoiceNumber(data.invoices), clientId: project?.clientId ?? data.clients[0]?.id ?? '',
    projectId: project?.id, issueDate: todayISO(), dueDate: addDays(todayISO(), 30), status: 'Draft',
    taxRate: data.settings.defaultTaxRate, lines: [{ description: '', quantity: 1, unitPrice: 0 }],
  });
  const locked = !!initial && initial.status !== 'Draft';
  const set = <K extends keyof Invoice>(k: K, v: Invoice[K]) => setInv((x) => ({ ...x, [k]: v }));
  const setLine = (i: number, patch: Partial<InvoiceLine>) => setInv((x) => ({ ...x, lines: x.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));
  const clientProjects = data.projects.filter((p) => p.clientId === inv.clientId);
  const valid = inv.clientId && inv.lines.length > 0 && inv.lines.every((l) => l.description.trim()) && invoiceSubtotal(inv) > 0;

  const save = (status?: Invoice['status']) => {
    const next = { ...inv, status: status ?? inv.status };
    upsert('invoices', next, initial ? `Invoice ${next.number} updated` : `Invoice ${next.number} created (${money(invoiceTotal(next))})`);
    onClose();
  };

  return (
    <Modal wide title={initial ? `Invoice ${inv.number}` : 'New invoice'} onClose={onClose} footer={locked ? <button className="btn" onClick={onClose}>Close</button> : <>
      {initial && <button className="btn btn-danger" style={{ marginRight: 'auto' }} onClick={() => { if (confirmDelete(`draft ${inv.number}`)) { remove('invoices', inv.id, `Deleted draft ${inv.number}`); onClose(); } }}>Delete draft</button>}
      <button className="btn" onClick={onClose}>Cancel</button>
      <button className="btn" disabled={!valid} onClick={() => save('Draft')}>Save draft</button>
      <button className="btn btn-primary" disabled={!valid} onClick={() => save('Sent')}>Save & mark sent</button>
    </>}>
      {locked && <p className="small muted" style={{ marginTop: 0 }}>This invoice has been {initial!.status.toLowerCase()} and can no longer be edited.</p>}
      <fieldset disabled={locked} style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="form-grid">
          <Field label="Invoice number"><input value={inv.number} onChange={(e) => set('number', e.target.value)} /></Field>
          <Field label="Client">
            <select value={inv.clientId} onChange={(e) => setInv((x) => ({ ...x, clientId: e.target.value, projectId: undefined }))}>
              {data.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Project">
            <select value={inv.projectId ?? ''} onChange={(e) => set('projectId', e.target.value || undefined)}>
              <option value="">— None —</option>
              {clientProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Tax rate (%)"><input type="number" min={0} step={0.5} value={inv.taxRate} onChange={(e) => set('taxRate', Number(e.target.value))} /></Field>
          <Field label="Issue date"><input type="date" value={inv.issueDate} onChange={(e) => set('issueDate', e.target.value)} /></Field>
          <Field label="Due date"><input type="date" value={inv.dueDate} onChange={(e) => set('dueDate', e.target.value)} /></Field>
        </div>

        <div className="row between" style={{ margin: '16px 0 6px' }}>
          <h3>Line items</h3>
          {inv.projectId && !locked && (
            <button className="btn btn-sm" onClick={() => {
              // Only bill time logged after the project's last issued invoice, to avoid double-billing.
              const lastBilled = data.invoices
                .filter((i) => i.projectId === inv.projectId && i.id !== inv.id && (i.status === 'Sent' || i.status === 'Paid'))
                .reduce((m, i) => (i.issueDate > m ? i.issueDate : m), '');
              const lines = linesFromTime(data, inv.projectId!, data.timeEntries.filter((t) => t.date > lastBilled));
              if (lines.length) setInv((x) => ({ ...x, lines }));
              else window.alert(lastBilled ? `No billable time logged since the last invoice (${lastBilled}).` : 'No billable time logged on this project.');
            }}>Fill from billable time</button>
          )}
        </div>
        <div className="table-wrap">
          <table className="invoice-lines">
            <thead><tr><th style={{ width: '55%' }}>Description</th><th>Qty</th><th>Unit price</th><th className="num">Amount</th><th /></tr></thead>
            <tbody>
              {inv.lines.map((l, i) => (
                <tr key={i}>
                  <td><input value={l.description} placeholder="Service description" onChange={(e) => setLine(i, { description: e.target.value })} /></td>
                  <td><input type="number" min={0} step={0.5} value={l.quantity} onChange={(e) => setLine(i, { quantity: Number(e.target.value) })} /></td>
                  <td><input type="number" min={0} value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: Number(e.target.value) })} /></td>
                  <td className="num">{money(l.quantity * l.unitPrice)}</td>
                  <td>{!locked && <button className="icon-btn" aria-label="Remove line" disabled={inv.lines.length <= 1} onClick={() => setInv((x) => ({ ...x, lines: x.lines.filter((_, j) => j !== i) }))}>×</button>}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={3} className="right muted">Subtotal</td><td className="num">{money(invoiceSubtotal(inv))}</td><td /></tr>
              <tr><td colSpan={3} className="right muted">Tax ({inv.taxRate}%)</td><td className="num">{money(invoiceTax(inv))}</td><td /></tr>
              <tr><td colSpan={3} className="right">Total</td><td className="num">{money(invoiceTotal(inv))}</td><td /></tr>
            </tfoot>
          </table>
        </div>
        {!locked && <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => setInv((x) => ({ ...x, lines: [...x.lines, { description: '', quantity: 1, unitPrice: 0 }] }))}>+ Add line</button>}
      </fieldset>
    </Modal>
  );
}

function ExpenseForm({ initial, onClose }: { initial?: Expense; onClose: () => void }) {
  const { data, upsert, remove } = useStore();
  const me = data.members.find((m) => m.id === data.settings.currentUserId);
  const [e, setE] = useState<Expense>(initial ?? {
    id: uid('exp'), date: todayISO(), description: '', category: 'Other', amount: 0, departmentId: me?.departmentId, billable: false, status: 'Pending',
  });
  const set = <K extends keyof Expense>(k: K, v: Expense[K]) => setE((x) => ({ ...x, [k]: v }));
  return (
    <Modal title={initial ? 'Edit expense' : 'New expense'} onClose={onClose} footer={<>
      {initial && <button className="btn btn-danger" style={{ marginRight: 'auto' }} onClick={() => { if (confirmDelete('this expense')) { remove('expenses', e.id, `Deleted expense "${e.description}"`); onClose(); } }}>Delete</button>}
      <button className="btn" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" disabled={!e.description.trim() || e.amount <= 0} onClick={() => { upsert('expenses', { ...e, description: e.description.trim() }, initial ? undefined : `Expense "${e.description.trim()}" submitted`); onClose(); }}>Save</button>
    </>}>
      <div className="form-grid">
        <Field label="Description" span={2}><input autoFocus value={e.description} onChange={(ev) => set('description', ev.target.value)} /></Field>
        <Field label={`Amount (${data.settings.currency})`}><input type="number" min={0} value={e.amount} onChange={(ev) => set('amount', Number(ev.target.value))} /></Field>
        <Field label="Date"><input type="date" value={e.date} onChange={(ev) => set('date', ev.target.value)} /></Field>
        <Field label="Category"><select value={e.category} onChange={(ev) => set('category', ev.target.value as ExpenseCategory)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Department">
          <select value={e.departmentId ?? ''} onChange={(ev) => set('departmentId', ev.target.value || undefined)}>
            <option value="">— None —</option>
            {data.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Project">
          <select value={e.projectId ?? ''} onChange={(ev) => set('projectId', ev.target.value || undefined)}>
            <option value="">— Overhead (no project) —</option>
            {data.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <label className="check" style={{ alignSelf: 'end' }}><input type="checkbox" checked={e.billable} onChange={(ev) => set('billable', ev.target.checked)} /> Billable to client</label>
      </div>
    </Modal>
  );
}

export default function Finance() {
  const { data, upsert } = useStore();
  const L = useLookups();
  const money = useMoney();
  const today = todayISO();
  const [tab, setTab] = useState<'overview' | 'invoices' | 'expenses' | 'profitability'>('overview');
  const [invFilter, setInvFilter] = useState<string>('');
  const [expFilter, setExpFilter] = useState<string>('');
  const [editInv, setEditInv] = useState<Invoice | 'new' | null>(null);
  const [editExp, setEditExp] = useState<Expense | 'new' | null>(null);

  const pnl = useMemo(() => monthlyPnL(data, 6, today), [data, today]);
  const ar = receivables(data, today);
  const totals = pnl.reduce((s, b) => ({ revenue: s.revenue + b.revenue, costs: s.costs + b.costs }), { revenue: 0, costs: 0 });
  const pending = data.expenses.filter((e) => e.status === 'Pending');
  const canApprove = ['Admin', 'Finance', 'Manager'].includes(L.member.get(data.settings.currentUserId)?.role ?? '');

  const invoices = data.invoices
    .filter((i) => !invFilter || invoiceDisplayStatus(i, today) === invFilter)
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  const expenses = data.expenses.filter((e) => !expFilter || e.status === expFilter).sort((a, b) => b.date.localeCompare(a.date));

  const setInvoiceStatus = (i: Invoice, status: Invoice['status']) =>
    upsert('invoices', { ...i, status, paidDate: status === 'Paid' ? todayISO() : i.paidDate }, `Invoice ${i.number} marked ${status.toLowerCase()}`);

  const setExpenseStatus = (e: Expense, status: Expense['status']) =>
    upsert('expenses', { ...e, status }, `Expense "${e.description}" ${status.toLowerCase()}`);

  const exportCsv = () => {
    const rows = [['Number', 'Client', 'Project', 'Issued', 'Due', 'Status', 'Subtotal', 'Tax', 'Total']];
    for (const i of data.invoices) rows.push([i.number, L.client.get(i.clientId)?.name ?? '', L.project.get(i.projectId ?? '')?.name ?? '', i.issueDate, i.dueDate, invoiceDisplayStatus(i, today), String(invoiceSubtotal(i)), String(invoiceTax(i)), String(invoiceTotal(i))]);
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `invoices-${today}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <PageHead title="Finance" sub="Revenue, receivables, costs and profitability across the agency." actions={<>
        <button className="btn" onClick={() => setEditExp('new')}>+ Expense</button>
        <button className="btn btn-primary" disabled={!data.clients.length} onClick={() => setEditInv('new')}>+ Invoice</button>
      </>} />

      <div className="grid-stats">
        <Stat label="Revenue (6 mo)" value={money(totals.revenue)} sub="Collected, excl. tax" />
        <Stat label="Costs (6 mo)" value={money(totals.costs)} sub="Labour + approved expenses" />
        <Stat label="Net profit" value={money(totals.revenue - totals.costs)} tone={totals.revenue - totals.costs >= 0 ? 'good' : 'bad'} sub={totals.revenue ? `${Math.round(((totals.revenue - totals.costs) / totals.revenue) * 100)}% margin` : undefined} />
        <Stat label="Outstanding" value={money(ar.outstanding)} sub={<span className={ar.overdue ? 'bad' : ''}>{money(ar.overdue)} overdue</span>} />
        <Stat label="Expenses to approve" value={pending.length} sub={money(pending.reduce((s, e) => s + e.amount, 0))} />
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'invoices', label: 'Invoices', count: data.invoices.length },
        { id: 'expenses', label: 'Expenses', count: data.expenses.length },
        { id: 'profitability', label: 'Project profitability' },
      ]} />

      {tab === 'overview' && (
        <>
          <div className="grid-2">
            <div className="card"><div className="card-head"><h2>Monthly P&L</h2></div><div className="card-pad"><PnLChart data={pnl} money={money} /></div></div>
            <div className="card"><div className="card-head"><h2>Spend by category</h2></div><div className="card-pad">
              {expensesByCategory(data.expenses).length ? <HBar items={expensesByCategory(data.expenses)} money={money} /> : <Empty>No expenses yet.</Empty>}
            </div></div>
          </div>
          <div className="card">
            <div className="card-head"><h2>Month by month</h2></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Month</th><th className="num">Revenue</th><th className="num">Costs</th><th className="num">Profit</th><th className="num">Margin</th></tr></thead>
                <tbody>{pnl.map((b) => (
                  <tr key={b.key}><td>{b.label} {b.key.slice(0, 4)}</td><td className="num">{money(b.revenue)}</td><td className="num">{money(b.costs)}</td>
                    <td className={`num ${b.profit >= 0 ? 'good' : 'bad'}`}>{money(b.profit)}</td><td className="num">{b.revenue ? `${Math.round((b.profit / b.revenue) * 100)}%` : '—'}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'invoices' && (
        <div className="card">
          <div className="card-head">
            <div className="filters">
              <select value={invFilter} onChange={(e) => setInvFilter(e.target.value)}>
                <option value="">All statuses</option>
                {['Draft', 'Sent', 'Overdue', 'Paid', 'Void'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <button className="btn btn-sm" onClick={exportCsv}>Export CSV</button>
          </div>
          {invoices.length === 0 ? <Empty>No invoices.</Empty> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Number</th><th>Client / project</th><th>Issued</th><th>Due</th><th>Status</th><th className="num">Total</th><th>Actions</th></tr></thead>
                <tbody>{invoices.map((i) => {
                  const st = invoiceDisplayStatus(i, today);
                  return (
                    <tr key={i.id}>
                      <td><button className="link-btn" onClick={() => setEditInv(i)}>{i.number}</button></td>
                      <td>{L.client.get(i.clientId)?.name}<div className="muted small">{i.projectId ? L.project.get(i.projectId)?.name : '—'}</div></td>
                      <td className="small">{fmtDate(i.issueDate)}</td>
                      <td className={`small ${st === 'Overdue' ? 'bad' : ''}`}>{fmtDate(i.dueDate)}</td>
                      <td><Badge>{st}</Badge>{i.paidDate && i.status === 'Paid' && <div className="muted small">{fmtDate(i.paidDate)}</div>}</td>
                      <td className="num">{money(invoiceTotal(i))}</td>
                      <td>
                        <div className="row gap">
                          {i.status === 'Draft' && <button className="btn btn-sm" onClick={() => setInvoiceStatus(i, 'Sent')}>Send</button>}
                          {i.status === 'Sent' && <button className="btn btn-sm btn-primary" onClick={() => setInvoiceStatus(i, 'Paid')}>Mark paid</button>}
                          {(i.status === 'Sent' || i.status === 'Draft') && <button className="btn btn-sm btn-danger" onClick={() => window.confirm(`Void ${i.number}?`) && setInvoiceStatus(i, 'Void')}>Void</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'expenses' && (
        <div className="card">
          <div className="card-head">
            <div className="filters">
              <select value={expFilter} onChange={(e) => setExpFilter(e.target.value)}>
                <option value="">All statuses</option>
                {['Pending', 'Approved', 'Rejected'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            {!canApprove && <span className="muted small">Only Admin, Manager or Finance roles can approve.</span>}
          </div>
          {expenses.length === 0 ? <Empty>No expenses.</Empty> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Charged to</th><th>Status</th><th className="num">Amount</th><th>Actions</th></tr></thead>
                <tbody>{expenses.map((e) => (
                  <tr key={e.id}>
                    <td className="small">{fmtDate(e.date)}</td>
                    <td><button className="link-btn" onClick={() => setEditExp(e)}>{e.description}</button>{e.billable && <div className="muted small">Billable</div>}</td>
                    <td className="small">{e.category}</td>
                    <td className="small">{e.projectId ? L.project.get(e.projectId)?.name : 'Overhead'}<div className="muted">{L.dept.get(e.departmentId ?? '')?.name}</div></td>
                    <td><Badge>{e.status}</Badge></td>
                    <td className="num">{money(e.amount)}</td>
                    <td>{e.status === 'Pending' && canApprove && (
                      <div className="row gap">
                        <button className="btn btn-sm btn-primary" onClick={() => setExpenseStatus(e, 'Approved')}>Approve</button>
                        <button className="btn btn-sm btn-danger" onClick={() => setExpenseStatus(e, 'Rejected')}>Reject</button>
                      </div>
                    )}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'profitability' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Project</th><th>Billing</th><th className="num">Budget</th><th>Burn</th><th className="num">Labour</th><th className="num">Expenses</th><th className="num">Invoiced</th><th className="num">Collected</th><th className="num">Margin</th></tr></thead>
              <tbody>{data.projects.map((p) => {
                const f = projectFinancials(data, p);
                return (
                  <tr key={p.id} className="clickable" onClick={() => navigate(`projects/${p.id}`)}>
                    <td><strong>{p.name}</strong><div className="muted small">{L.client.get(p.clientId)?.name}</div></td>
                    <td className="small">{p.billing}</td>
                    <td className="num">{money(p.budget)}</td>
                    <td style={{ minWidth: 110 }}><div className="small muted">{Math.round(f.budgetUsedPct)}%</div><Progress pct={f.budgetUsedPct} /></td>
                    <td className="num">{money(f.laborCost)}</td>
                    <td className="num">{money(f.expenses)}</td>
                    <td className="num">{money(f.invoiced)}</td>
                    <td className="num">{money(f.collected)}</td>
                    <td className={`num ${f.margin >= 0 ? 'good' : 'bad'}`}>{money(f.margin)}<div className="small">{f.invoiced ? `${Math.round(f.marginPct)}%` : ''}</div></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
          <p className="muted small card-pad" style={{ margin: 0 }}>Margin = invoiced (excl. tax, sent or paid) − labour cost (hours × internal cost rate) − non-rejected expenses.</p>
        </div>
      )}

      {editInv && <InvoiceForm initial={editInv === 'new' ? undefined : editInv} onClose={() => setEditInv(null)} />}
      {editExp && <ExpenseForm initial={editExp === 'new' ? undefined : editExp} onClose={() => setEditExp(null)} />}
    </>
  );
}
