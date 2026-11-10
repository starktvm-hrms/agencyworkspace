import { describe, expect, it } from 'vitest';
import {
  advanceWorkItem, invoiceDisplayStatus, invoiceTotal, monthlyPnL, nextInvoiceNumber, projectFinancials,
  receivables, returnWorkItem, toggleBlocked, weeklyHours, linesFromTime,
} from './logic';
import { reducer } from './store';
import { createSeed } from './seed';
import type { Invoice, WorkItem, WorkflowTemplate } from './types';

const TODAY = '2026-11-10';
const tpl: WorkflowTemplate = { id: 't', name: 'T', stages: ['a', 'b', 'c'] };
const item: WorkItem = { id: 'w', title: 'W', projectId: 'p', templateId: 't', stageIndex: 0, state: 'Active', priority: 'Medium', dueDate: TODAY, history: [] };

describe('workflow transitions', () => {
  it('advances through stages and completes at the end', () => {
    let w = advanceWorkItem(item, tpl, 'u');
    expect(w.stageIndex).toBe(1);
    w = advanceWorkItem(w, tpl, 'u');
    expect(w.stageIndex).toBe(2);
    w = advanceWorkItem(w, tpl, 'u', 'done');
    expect(w.state).toBe('Completed');
    expect(w.history.map((h) => h.action)).toEqual(['advanced', 'advanced', 'completed']);
    expect(advanceWorkItem(w, tpl)).toBe(w); // no-op once completed
  });

  it('returns to previous stage with a note and clears assignee', () => {
    const w = returnWorkItem({ ...item, stageIndex: 2, assigneeId: 'x' }, 'u', 'fix it');
    expect(w.stageIndex).toBe(1);
    expect(w.assigneeId).toBeUndefined();
    expect(w.history.at(-1)).toMatchObject({ action: 'returned', fromStage: 2, toStage: 1, note: 'fix it' });
    expect(returnWorkItem(item, 'u', 'x')).toBe(item); // cannot return from first stage
  });

  it('toggles blocked state', () => {
    const b = toggleBlocked(item);
    expect(b.state).toBe('Blocked');
    expect(toggleBlocked(b).state).toBe('Active');
  });
});

describe('invoices', () => {
  const inv: Invoice = { id: 'i', number: 'INV-2026-0003', clientId: 'c', issueDate: '2026-10-01', dueDate: '2026-10-31', status: 'Sent', taxRate: 18,
    lines: [{ description: 'a', quantity: 2, unitPrice: 1000 }, { description: 'b', quantity: 1, unitPrice: 500 }] };

  it('computes totals with tax', () => {
    expect(invoiceTotal(inv)).toBeCloseTo(2950);
  });

  it('flags sent invoices past due as overdue', () => {
    expect(invoiceDisplayStatus(inv, TODAY)).toBe('Overdue');
    expect(invoiceDisplayStatus({ ...inv, status: 'Paid' }, TODAY)).toBe('Paid');
    expect(invoiceDisplayStatus({ ...inv, dueDate: '2026-12-01' }, TODAY)).toBe('Sent');
  });

  it('generates sequential numbers per year', () => {
    expect(nextInvoiceNumber([inv], 2026)).toBe('INV-2026-0004');
    expect(nextInvoiceNumber([inv], 2027)).toBe('INV-2027-0001');
  });
});

describe('seeded finance', () => {
  const data = createSeed(TODAY);

  it('project financials add up', () => {
    const p = data.projects.find((x) => x.id === 'prj_lumen')!;
    const f = projectFinancials(data, p);
    expect(f.hours).toBeGreaterThan(0);
    expect(f.totalCost).toBeCloseTo(f.laborCost + f.expenses);
    expect(f.invoiced).toBe(640000 + 690000); // draft excluded
    expect(f.collected).toBe(640000 + 690000);
    expect(f.margin).toBeCloseTo(f.invoiced - f.totalCost);
  });

  it('monthly P&L covers requested months and matches paid revenue', () => {
    const pnl = monthlyPnL(data, 6, TODAY);
    expect(pnl).toHaveLength(6);
    expect(pnl.at(-1)!.key).toBe('2026-11');
    const paid = data.invoices.filter((i) => i.status === 'Paid').reduce((s, i) => s + i.lines.reduce((a, l) => a + l.quantity * l.unitPrice, 0), 0);
    expect(pnl.reduce((s, b) => s + b.revenue, 0)).toBe(paid);
  });

  it('receivables include only sent invoices', () => {
    const ar = receivables(data, TODAY);
    expect(ar.outstanding).toBeCloseTo((620000 + 150000) * 1.18);
    expect(ar.overdue).toBeCloseTo(620000 * 1.18);
  });

  it('weekly hours and invoice lines from time', () => {
    expect(weeklyHours(data.timeEntries, 'mem_divya', TODAY)).toBeGreaterThan(0);
    const lines = linesFromTime(data, 'prj_orbit');
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((l) => l.unitPrice > 0 && l.quantity > 0)).toBe(true);
  });
});

describe('store reducer', () => {
  it('hands off a work item and logs activity', () => {
    const s = createSeed(TODAY);
    const next = reducer(s, { type: 'work/advance', id: 'wi_8' });
    expect(next.workItems.find((w) => w.id === 'wi_8')!.stageIndex).toBe(1);
    expect(next.activity[0].text).toContain('handed off to Creative');
  });

  it('deleting a project cascades to its tasks, work items and time', () => {
    const s = reducer(createSeed(TODAY), { type: 'remove', collection: 'projects', id: 'prj_orbit' });
    expect(s.tasks.some((t) => t.projectId === 'prj_orbit')).toBe(false);
    expect(s.workItems.some((t) => t.projectId === 'prj_orbit')).toBe(false);
    expect(s.timeEntries.some((t) => t.projectId === 'prj_orbit')).toBe(false);
  });
});
