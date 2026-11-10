import type {
  AppData, Expense, ID, Invoice, Project, TimeEntry, WorkHistoryEntry, WorkItem, WorkflowTemplate,
} from './types';

export const uid = (prefix = 'id') =>
  `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;

export const todayISO = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};

export const addDays = (iso: string, days: number) => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return todayISO(d);
};

export const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);

export const fmtMoney = (n: number, currency = 'INR', locale = 'en-IN') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n || 0);

export const fmtDate = (iso?: string, locale = 'en-IN') =>
  iso ? new Date(iso.length === 10 ? iso + 'T00:00:00' : iso).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/* ----------------------------- Finance ----------------------------- */

export const invoiceSubtotal = (inv: Pick<Invoice, 'lines'>) =>
  inv.lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);

export const invoiceTax = (inv: Pick<Invoice, 'lines' | 'taxRate'>) =>
  (invoiceSubtotal(inv) * (Number(inv.taxRate) || 0)) / 100;

export const invoiceTotal = (inv: Pick<Invoice, 'lines' | 'taxRate'>) => invoiceSubtotal(inv) + invoiceTax(inv);

export type InvoiceDisplayStatus = Invoice['status'] | 'Overdue';

/** "Sent" invoices past their due date are shown as Overdue. */
export const invoiceDisplayStatus = (inv: Invoice, today = todayISO()): InvoiceDisplayStatus =>
  inv.status === 'Sent' && inv.dueDate < today ? 'Overdue' : inv.status;

export const nextInvoiceNumber = (invoices: Invoice[], year = new Date().getFullYear()) => {
  const prefix = `INV-${year}-`;
  const max = invoices
    .filter((i) => i.number.startsWith(prefix))
    .reduce((m, i) => Math.max(m, parseInt(i.number.slice(prefix.length), 10) || 0), 0);
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
};

export interface ProjectFinancials {
  hours: number;
  billableHours: number;
  laborCost: number;
  billableValue: number;
  expenses: number;
  totalCost: number;
  invoiced: number;
  collected: number;
  budget: number;
  budgetUsedPct: number;
  /** Revenue basis: invoiced amount (excl. tax) */
  margin: number;
  marginPct: number;
}

export function projectFinancials(data: AppData, project: Project): ProjectFinancials {
  const rates = new Map(data.members.map((m) => [m.id, m]));
  const entries = data.timeEntries.filter((t) => t.projectId === project.id);
  let hours = 0, billableHours = 0, laborCost = 0, billableValue = 0;
  for (const t of entries) {
    const m = rates.get(t.memberId);
    hours += t.hours;
    laborCost += t.hours * (m?.costRate ?? 0);
    if (t.billable) {
      billableHours += t.hours;
      billableValue += t.hours * (m?.billRate ?? 0);
    }
  }
  const expenses = data.expenses
    .filter((e) => e.projectId === project.id && e.status !== 'Rejected')
    .reduce((s, e) => s + e.amount, 0);
  const projInvoices = data.invoices.filter((i) => i.projectId === project.id && i.status !== 'Void' && i.status !== 'Draft');
  const invoiced = projInvoices.reduce((s, i) => s + invoiceSubtotal(i), 0);
  const collected = projInvoices.filter((i) => i.status === 'Paid').reduce((s, i) => s + invoiceSubtotal(i), 0);
  const totalCost = laborCost + expenses;
  const margin = invoiced - totalCost;
  return {
    hours, billableHours, laborCost, billableValue, expenses, totalCost, invoiced, collected,
    budget: project.budget,
    budgetUsedPct: project.budget > 0 ? (totalCost / project.budget) * 100 : 0,
    margin,
    marginPct: invoiced > 0 ? (margin / invoiced) * 100 : 0,
  };
}

export interface MonthBucket { key: string; label: string; revenue: number; costs: number; profit: number }

/** Monthly P&L: revenue = paid invoices (by paid date, excl. tax); costs = labour + approved expenses. */
export function monthlyPnL(data: AppData, months = 6, today = todayISO()): MonthBucket[] {
  const end = new Date(today + 'T00:00:00');
  const buckets: MonthBucket[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.push({ key, label: d.toLocaleDateString('en', { month: 'short' }), revenue: 0, costs: 0, profit: 0 });
  }
  const idx = new Map(buckets.map((b, i) => [b.key, i]));
  const bucketOf = (iso?: string) => (iso ? idx.get(iso.slice(0, 7)) : undefined);
  const costRate = new Map(data.members.map((m) => [m.id, m.costRate]));

  for (const inv of data.invoices) {
    if (inv.status !== 'Paid') continue;
    const b = bucketOf(inv.paidDate ?? inv.issueDate);
    if (b !== undefined) buckets[b].revenue += invoiceSubtotal(inv);
  }
  for (const t of data.timeEntries) {
    const b = bucketOf(t.date);
    if (b !== undefined) buckets[b].costs += t.hours * (costRate.get(t.memberId) ?? 0);
  }
  for (const e of data.expenses) {
    if (e.status !== 'Approved') continue;
    const b = bucketOf(e.date);
    if (b !== undefined) buckets[b].costs += e.amount;
  }
  buckets.forEach((b) => (b.profit = b.revenue - b.costs));
  return buckets;
}

export function receivables(data: AppData, today = todayISO()) {
  let outstanding = 0, overdue = 0;
  for (const inv of data.invoices) {
    if (inv.status !== 'Sent') continue;
    const t = invoiceTotal(inv);
    outstanding += t;
    if (inv.dueDate < today) overdue += t;
  }
  return { outstanding, overdue };
}

export const expensesByCategory = (expenses: Expense[]) => {
  const m = new Map<string, number>();
  for (const e of expenses) if (e.status !== 'Rejected') m.set(e.category, (m.get(e.category) ?? 0) + e.amount);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

/** Build invoice lines from unbilled-ish billable time on a project, grouped by member. */
export function linesFromTime(data: AppData, projectId: ID, entries: TimeEntry[] = data.timeEntries) {
  const byMember = new Map<ID, number>();
  for (const t of entries) if (t.projectId === projectId && t.billable) byMember.set(t.memberId, (byMember.get(t.memberId) ?? 0) + t.hours);
  return [...byMember.entries()].map(([mid, hrs]) => {
    const m = data.members.find((x) => x.id === mid);
    return { description: `${m?.title ?? 'Services'} — ${m?.name ?? ''}`.trim(), quantity: hrs, unitPrice: m?.billRate ?? 0 };
  });
}

/* ----------------------------- Workflow ----------------------------- */

export const currentStageDept = (item: WorkItem, tpl?: WorkflowTemplate) => tpl?.stages[item.stageIndex];

const log = (item: WorkItem, entry: Omit<WorkHistoryEntry, 'at'>, at = new Date().toISOString()): WorkItem => ({
  ...item,
  history: [...item.history, { at, ...entry }],
});

/** Hand off to the next department. Completes the item when leaving the final stage. */
export function advanceWorkItem(item: WorkItem, tpl: WorkflowTemplate, byId?: ID, note?: string): WorkItem {
  if (item.state === 'Completed') return item;
  if (item.stageIndex >= tpl.stages.length - 1) {
    return log({ ...item, state: 'Completed', assigneeId: undefined }, { action: 'completed', byId, fromStage: item.stageIndex, note });
  }
  const to = item.stageIndex + 1;
  return log({ ...item, stageIndex: to, state: 'Active', assigneeId: undefined }, { action: 'advanced', byId, fromStage: item.stageIndex, toStage: to, note });
}

/** Send back to the previous department (e.g. revisions needed). Requires a note. */
export function returnWorkItem(item: WorkItem, byId: ID | undefined, note: string): WorkItem {
  if (item.state === 'Completed' || item.stageIndex === 0) return item;
  const to = item.stageIndex - 1;
  return log({ ...item, stageIndex: to, state: 'Active', assigneeId: undefined }, { action: 'returned', byId, fromStage: item.stageIndex, toStage: to, note });
}

export function toggleBlocked(item: WorkItem, byId?: ID, note?: string): WorkItem {
  if (item.state === 'Completed') return item;
  const blocked = item.state !== 'Blocked';
  return log({ ...item, state: blocked ? 'Blocked' : 'Active' }, { action: blocked ? 'blocked' : 'unblocked', byId, note });
}

/** Days the item has been sitting in its current stage. */
export function daysInStage(item: WorkItem, now = new Date()): number {
  const last = [...item.history].reverse().find((h) => h.action === 'created' || h.action === 'advanced' || h.action === 'returned');
  const since = last ? new Date(last.at) : now;
  return Math.max(0, Math.floor((now.getTime() - since.getTime()) / 86400000));
}

/* ----------------------------- Team ----------------------------- */

/** Hours logged by a member in the 7 days ending today. */
export function weeklyHours(entries: TimeEntry[], memberId: ID, today = todayISO()) {
  const from = addDays(today, -6);
  return entries.filter((t) => t.memberId === memberId && t.date >= from && t.date <= today).reduce((s, t) => s + t.hours, 0);
}

export const utilisation = (hours: number, capacity: number) => (capacity > 0 ? (hours / capacity) * 100 : 0);
