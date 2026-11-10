import { addDays, todayISO } from './logic';
import type { AppData, TimeEntry, WorkHistoryEntry } from './types';

export const DATA_VERSION = 1;

/** Demo data. Dates are relative to "today" so the workspace always looks current. */
export function createSeed(today = todayISO()): AppData {
  const d = (n: number) => addDays(today, n);
  const ts = (n: number) => new Date(d(n) + 'T10:00:00').toISOString();

  const departments = [
    { id: 'dep_acc', name: 'Account Management', color: '#6366f1', headId: 'mem_priya' },
    { id: 'dep_str', name: 'Strategy', color: '#0ea5e9', headId: 'mem_arjun' },
    { id: 'dep_cre', name: 'Creative', color: '#ec4899', headId: 'mem_meera' },
    { id: 'dep_dev', name: 'Tech & Production', color: '#f59e0b', headId: 'mem_rahul' },
    { id: 'dep_med', name: 'Media', color: '#10b981', headId: 'mem_sana' },
    { id: 'dep_fin', name: 'Finance', color: '#64748b', headId: 'mem_vikram' },
  ];

  const members = [
    { id: 'mem_priya', name: 'Priya Nair', title: 'Account Director', departmentId: 'dep_acc', role: 'Admin' as const, costRate: 900, billRate: 4500, capacity: 40 },
    { id: 'mem_kiran', name: 'Kiran Das', title: 'Account Executive', departmentId: 'dep_acc', role: 'Member' as const, costRate: 450, billRate: 2500, capacity: 40 },
    { id: 'mem_arjun', name: 'Arjun Menon', title: 'Strategy Lead', departmentId: 'dep_str', role: 'Manager' as const, costRate: 850, billRate: 4200, capacity: 40 },
    { id: 'mem_meera', name: 'Meera Pillai', title: 'Creative Director', departmentId: 'dep_cre', role: 'Manager' as const, costRate: 1000, billRate: 5000, capacity: 40 },
    { id: 'mem_ali', name: 'Ali Khan', title: 'Senior Designer', departmentId: 'dep_cre', role: 'Member' as const, costRate: 550, billRate: 3000, capacity: 40 },
    { id: 'mem_neha', name: 'Neha Iyer', title: 'Copywriter', departmentId: 'dep_cre', role: 'Member' as const, costRate: 500, billRate: 2800, capacity: 40 },
    { id: 'mem_rahul', name: 'Rahul Varma', title: 'Tech Lead', departmentId: 'dep_dev', role: 'Manager' as const, costRate: 950, billRate: 4800, capacity: 40 },
    { id: 'mem_divya', name: 'Divya Raj', title: 'Frontend Developer', departmentId: 'dep_dev', role: 'Member' as const, costRate: 600, billRate: 3200, capacity: 40 },
    { id: 'mem_sana', name: 'Sana Thomas', title: 'Media Planner', departmentId: 'dep_med', role: 'Manager' as const, costRate: 650, billRate: 3500, capacity: 40 },
    { id: 'mem_vikram', name: 'Vikram Shah', title: 'Finance Manager', departmentId: 'dep_fin', role: 'Finance' as const, costRate: 750, billRate: 0, capacity: 40 },
  ];

  const clients = [
    { id: 'cli_lumen', name: 'Lumen Beverages', contact: 'Anita Rao', email: 'anita@lumen.example', industry: 'FMCG', status: 'Active' as const },
    { id: 'cli_orbit', name: 'Orbit Fintech', contact: 'Sameer Joshi', email: 'sameer@orbit.example', industry: 'Financial Services', status: 'Active' as const },
    { id: 'cli_verde', name: 'Verde Living', contact: 'Lakshmi Bose', email: 'lakshmi@verde.example', industry: 'Real Estate', status: 'Active' as const },
    { id: 'cli_nova', name: 'Nova Health', contact: 'Dr. Farhan Ali', email: 'farhan@nova.example', industry: 'Healthcare', status: 'Lead' as const },
  ];

  const projects = [
    { id: 'prj_lumen', name: 'Summer Launch Campaign', clientId: 'cli_lumen', ownerId: 'mem_priya', status: 'Active' as const, billing: 'Fixed' as const, budget: 1600000, startDate: d(-60), dueDate: d(25), description: 'Integrated launch for the new sparkling range: TVC, social, OOH and influencer.' },
    { id: 'prj_orbit', name: 'Orbit App Website Rebuild', clientId: 'cli_orbit', ownerId: 'mem_rahul', status: 'Active' as const, billing: 'Time & Materials' as const, budget: 2600000, startDate: d(-90), dueDate: d(40), description: 'New marketing site with CMS, calculators and onboarding flows.' },
    { id: 'prj_verde', name: 'Verde Social Retainer', clientId: 'cli_verde', ownerId: 'mem_kiran', status: 'Active' as const, billing: 'Retainer' as const, budget: 900000, startDate: d(-120), dueDate: d(60), description: 'Monthly content calendar, community management and paid social.' },
    { id: 'prj_nova', name: 'Nova Brand Identity Pitch', clientId: 'cli_nova', ownerId: 'mem_meera', status: 'Planning' as const, billing: 'Fixed' as const, budget: 300000, startDate: d(-5), dueDate: d(14), description: 'Credentials and creative routes for the Nova Health pitch.' },
  ];

  const tasks = [
    { id: 'tsk_1', projectId: 'prj_lumen', title: 'Finalise TVC script', assigneeId: 'mem_neha', departmentId: 'dep_cre', status: 'Review' as const, priority: 'High' as const, dueDate: d(2), estimateHours: 12 },
    { id: 'tsk_2', projectId: 'prj_lumen', title: 'Influencer shortlist', assigneeId: 'mem_sana', departmentId: 'dep_med', status: 'In Progress' as const, priority: 'Medium' as const, dueDate: d(5), estimateHours: 8 },
    { id: 'tsk_3', projectId: 'prj_lumen', title: 'OOH key visual adaptations', assigneeId: 'mem_ali', departmentId: 'dep_cre', status: 'To Do' as const, priority: 'High' as const, dueDate: d(9), estimateHours: 20 },
    { id: 'tsk_4', projectId: 'prj_lumen', title: 'Media plan sign-off', assigneeId: 'mem_priya', departmentId: 'dep_acc', status: 'Done' as const, priority: 'Urgent' as const, dueDate: d(-4), estimateHours: 3 },
    { id: 'tsk_5', projectId: 'prj_orbit', title: 'CMS content model', assigneeId: 'mem_rahul', departmentId: 'dep_dev', status: 'Done' as const, priority: 'High' as const, dueDate: d(-10), estimateHours: 16 },
    { id: 'tsk_6', projectId: 'prj_orbit', title: 'EMI calculator component', assigneeId: 'mem_divya', departmentId: 'dep_dev', status: 'In Progress' as const, priority: 'High' as const, dueDate: d(3), estimateHours: 24 },
    { id: 'tsk_7', projectId: 'prj_orbit', title: 'Landing page designs', assigneeId: 'mem_ali', departmentId: 'dep_cre', status: 'Review' as const, priority: 'Medium' as const, dueDate: d(-1), estimateHours: 18 },
    { id: 'tsk_8', projectId: 'prj_orbit', title: 'SEO migration map', assigneeId: 'mem_arjun', departmentId: 'dep_str', status: 'To Do' as const, priority: 'Low' as const, dueDate: d(12), estimateHours: 6 },
    { id: 'tsk_9', projectId: 'prj_verde', title: 'November content calendar', assigneeId: 'mem_kiran', departmentId: 'dep_acc', status: 'In Progress' as const, priority: 'Medium' as const, dueDate: d(1), estimateHours: 6 },
    { id: 'tsk_10', projectId: 'prj_verde', title: 'Reel edits x6', assigneeId: 'mem_ali', departmentId: 'dep_cre', status: 'To Do' as const, priority: 'Medium' as const, dueDate: d(6), estimateHours: 10 },
    { id: 'tsk_11', projectId: 'prj_nova', title: 'Competitor brand audit', assigneeId: 'mem_arjun', departmentId: 'dep_str', status: 'In Progress' as const, priority: 'High' as const, dueDate: d(4), estimateHours: 10 },
    { id: 'tsk_12', projectId: 'prj_nova', title: 'Moodboards — 3 routes', assigneeId: 'mem_meera', departmentId: 'dep_cre', status: 'To Do' as const, priority: 'High' as const, dueDate: d(8), estimateHours: 14 },
  ];

  const templates = [
    { id: 'tpl_campaign', name: 'Campaign Production', stages: ['dep_acc', 'dep_str', 'dep_cre', 'dep_med', 'dep_acc'] },
    { id: 'tpl_web', name: 'Digital Build', stages: ['dep_acc', 'dep_str', 'dep_cre', 'dep_dev', 'dep_acc'] },
    { id: 'tpl_content', name: 'Content Request', stages: ['dep_acc', 'dep_cre', 'dep_acc'] },
    { id: 'tpl_billing', name: 'Billing Approval', stages: ['dep_acc', 'dep_fin'] },
  ];

  const h = (action: WorkHistoryEntry['action'], dayOffset: number, byId: string, extra: Partial<WorkHistoryEntry> = {}): WorkHistoryEntry =>
    ({ at: ts(dayOffset), action, byId, ...extra });

  const workItems = [
    { id: 'wi_1', title: 'Lumen TVC — creative brief', projectId: 'prj_lumen', templateId: 'tpl_campaign', stageIndex: 2, state: 'Active' as const, assigneeId: 'mem_neha', priority: 'High' as const, dueDate: d(3),
      history: [h('created', -12, 'mem_priya'), h('advanced', -10, 'mem_priya', { fromStage: 0, toStage: 1, note: 'Brief approved by client' }), h('advanced', -6, 'mem_arjun', { fromStage: 1, toStage: 2, note: 'Insight + proposition attached' })] },
    { id: 'wi_2', title: 'Lumen influencer activation', projectId: 'prj_lumen', templateId: 'tpl_campaign', stageIndex: 3, state: 'Active' as const, assigneeId: 'mem_sana', priority: 'Medium' as const, dueDate: d(7),
      history: [h('created', -15, 'mem_priya'), h('advanced', -13, 'mem_priya', { fromStage: 0, toStage: 1 }), h('advanced', -9, 'mem_arjun', { fromStage: 1, toStage: 2 }), h('advanced', -3, 'mem_meera', { fromStage: 2, toStage: 3, note: 'Creative guidelines for creators ready' })] },
    { id: 'wi_3', title: 'Orbit — homepage build', projectId: 'prj_orbit', templateId: 'tpl_web', stageIndex: 3, state: 'Blocked' as const, assigneeId: 'mem_divya', priority: 'Urgent' as const, dueDate: d(1),
      history: [h('created', -20, 'mem_rahul'), h('advanced', -18, 'mem_priya', { fromStage: 0, toStage: 1 }), h('advanced', -14, 'mem_arjun', { fromStage: 1, toStage: 2 }), h('advanced', -5, 'mem_meera', { fromStage: 2, toStage: 3 }), h('blocked', -1, 'mem_divya', { note: 'Waiting on API credentials from client' })] },
    { id: 'wi_4', title: 'Orbit — pricing page', projectId: 'prj_orbit', templateId: 'tpl_web', stageIndex: 2, state: 'Active' as const, priority: 'Medium' as const, dueDate: d(10),
      history: [h('created', -9, 'mem_rahul'), h('advanced', -8, 'mem_priya', { fromStage: 0, toStage: 1 }), h('advanced', -6, 'mem_arjun', { fromStage: 1, toStage: 2 }), h('advanced', -4, 'mem_meera', { fromStage: 2, toStage: 3 }), h('returned', -2, 'mem_rahul', { fromStage: 3, toStage: 2, note: 'Table layout does not work on mobile — please revise' })] },
    { id: 'wi_5', title: 'Verde — November posts', projectId: 'prj_verde', templateId: 'tpl_content', stageIndex: 1, state: 'Active' as const, assigneeId: 'mem_ali', priority: 'Medium' as const, dueDate: d(4),
      history: [h('created', -3, 'mem_kiran'), h('advanced', -2, 'mem_kiran', { fromStage: 0, toStage: 1 })] },
    { id: 'wi_6', title: 'Nova pitch — strategy deck', projectId: 'prj_nova', templateId: 'tpl_campaign', stageIndex: 1, state: 'Active' as const, assigneeId: 'mem_arjun', priority: 'High' as const, dueDate: d(6),
      history: [h('created', -4, 'mem_meera'), h('advanced', -3, 'mem_priya', { fromStage: 0, toStage: 1 })] },
    { id: 'wi_7', title: 'Orbit Q3 milestone invoice', projectId: 'prj_orbit', templateId: 'tpl_billing', stageIndex: 1, state: 'Active' as const, assigneeId: 'mem_vikram', priority: 'High' as const, dueDate: d(2),
      history: [h('created', -2, 'mem_priya'), h('advanced', -1, 'mem_priya', { fromStage: 0, toStage: 1, note: 'Milestone 2 accepted by client' })] },
    { id: 'wi_8', title: 'Lumen teaser posts', projectId: 'prj_lumen', templateId: 'tpl_content', stageIndex: 0, state: 'Active' as const, priority: 'Low' as const, dueDate: d(12),
      history: [h('created', 0, 'mem_kiran')] },
  ];

  // Time entries over the last ~5 months
  const timeEntries: TimeEntry[] = [];
  const alloc: [string, string, number][] = [
    ['mem_priya', 'prj_lumen', 2], ['mem_kiran', 'prj_verde', 3], ['mem_arjun', 'prj_orbit', 1.5], ['mem_meera', 'prj_lumen', 2.5],
    ['mem_ali', 'prj_lumen', 3], ['mem_ali', 'prj_verde', 2], ['mem_neha', 'prj_lumen', 4], ['mem_rahul', 'prj_orbit', 5],
    ['mem_divya', 'prj_orbit', 6], ['mem_sana', 'prj_lumen', 3], ['mem_sana', 'prj_verde', 2], ['mem_arjun', 'prj_nova', 2], ['mem_meera', 'prj_nova', 1],
  ];
  let n = 0;
  for (let day = -140; day <= 0; day++) {
    const date = d(day);
    const dow = new Date(date + 'T00:00:00').getDay();
    if (dow === 0 || dow === 6) continue;
    for (const [memberId, projectId, hours] of alloc) {
      const p = projects.find((x) => x.id === projectId)!;
      if (date < p.startDate) continue;
      // light deterministic variation
      const v = ((n * 7) % 5) * 0.5 - 1;
      n++;
      timeEntries.push({ id: `te_${n}`, memberId, projectId, date, hours: Math.max(0.5, hours + v), billable: projectId !== 'prj_nova', note: '' });
    }
  }

  const inv = (n: number, clientId: string, projectId: string, issue: number, terms: number, status: 'Draft' | 'Sent' | 'Paid', paidAfter: number | null, lines: [string, number][]) => ({
    id: `inv_${n}`, number: `INV-${d(issue).slice(0, 4)}-${String(n).padStart(4, '0')}`, clientId, projectId,
    issueDate: d(issue), dueDate: d(issue + terms), status, taxRate: 18,
    ...(paidAfter !== null ? { paidDate: d(issue + paidAfter) } : {}),
    lines: lines.map(([description, unitPrice]) => ({ description, quantity: 1, unitPrice })),
  });
  const invoices = [
    inv(1, 'cli_orbit', 'prj_orbit', -85, 30, 'Paid', 22, [['Discovery & UX — Milestone 1', 650000]]),
    inv(2, 'cli_verde', 'prj_verde', -118, 15, 'Paid', 12, [['Social retainer — month 1', 150000]]),
    inv(3, 'cli_verde', 'prj_verde', -88, 15, 'Paid', 14, [['Social retainer — month 2', 150000]]),
    inv(4, 'cli_lumen', 'prj_lumen', -55, 30, 'Paid', 20, [['Campaign launch — 40% advance', 640000]]),
    inv(5, 'cli_verde', 'prj_verde', -58, 15, 'Paid', 10, [['Social retainer — month 3', 150000], ['Paid social management', 35000]]),
    inv(6, 'cli_orbit', 'prj_orbit', -50, 30, 'Paid', 26, [['Design system & templates — Milestone 2', 750000]]),
    inv(7, 'cli_verde', 'prj_verde', -28, 15, 'Paid', 13, [['Social retainer — month 4', 150000], ['Paid social management', 35000]]),
    inv(8, 'cli_lumen', 'prj_lumen', -26, 30, 'Paid', 21, [['TVC production — 30% milestone', 480000], ['Production pass-through (shoot)', 210000]]),
    inv(9, 'cli_orbit', 'prj_orbit', -25, 20, 'Sent', null, [['Build sprint 1–3 — Milestone 3', 620000]]),
    inv(10, 'cli_verde', 'prj_verde', -3, 15, 'Sent', null, [['Social retainer — month 5', 150000]]),
    inv(11, 'cli_lumen', 'prj_lumen', 0, 30, 'Draft', null, [['Campaign delivery — final 30%', 480000]]),
  ];

  const expenses = [
    { id: 'exp_1', date: d(-70), description: 'Adobe Creative Cloud (team)', category: 'Software' as const, amount: 38000, departmentId: 'dep_cre', billable: false, status: 'Approved' as const },
    { id: 'exp_2', date: d(-40), description: 'Adobe Creative Cloud (team)', category: 'Software' as const, amount: 38000, departmentId: 'dep_cre', billable: false, status: 'Approved' as const },
    { id: 'exp_3', date: d(-10), description: 'Adobe Creative Cloud (team)', category: 'Software' as const, amount: 38000, departmentId: 'dep_cre', billable: false, status: 'Approved' as const },
    { id: 'exp_4', date: d(-35), description: 'TVC shoot — studio & crew', category: 'Production' as const, amount: 210000, projectId: 'prj_lumen', departmentId: 'dep_cre', billable: true, status: 'Approved' as const },
    { id: 'exp_5', date: d(-20), description: 'Meta ads — Verde', category: 'Media Spend' as const, amount: 60000, projectId: 'prj_verde', departmentId: 'dep_med', billable: true, status: 'Approved' as const },
    { id: 'exp_6', date: d(-15), description: 'Freelance illustrator', category: 'Freelancer' as const, amount: 45000, projectId: 'prj_lumen', departmentId: 'dep_cre', billable: true, status: 'Approved' as const },
    { id: 'exp_7', date: d(-8), description: 'Cloud hosting — staging', category: 'Software' as const, amount: 12000, projectId: 'prj_orbit', departmentId: 'dep_dev', billable: true, status: 'Approved' as const },
    { id: 'exp_8', date: d(-2), description: 'Client workshop travel (Mumbai)', category: 'Travel' as const, amount: 28500, projectId: 'prj_nova', departmentId: 'dep_acc', billable: false, status: 'Pending' as const },
    { id: 'exp_9', date: d(-1), description: 'Stock footage licence', category: 'Production' as const, amount: 15000, projectId: 'prj_lumen', departmentId: 'dep_cre', billable: true, status: 'Pending' as const },
    { id: 'exp_10', date: d(-95), description: 'Office rent', category: 'Office' as const, amount: 150000, departmentId: 'dep_fin', billable: false, status: 'Approved' as const },
    { id: 'exp_11', date: d(-65), description: 'Office rent', category: 'Office' as const, amount: 150000, departmentId: 'dep_fin', billable: false, status: 'Approved' as const },
    { id: 'exp_12', date: d(-35), description: 'Office rent', category: 'Office' as const, amount: 150000, departmentId: 'dep_fin', billable: false, status: 'Approved' as const },
    { id: 'exp_13', date: d(-5), description: 'Office rent', category: 'Office' as const, amount: 150000, departmentId: 'dep_fin', billable: false, status: 'Approved' as const },
  ];

  return {
    version: DATA_VERSION,
    settings: { agencyName: 'Northstar Agency', currency: 'INR', locale: 'en-IN', currentUserId: 'mem_priya', defaultTaxRate: 18 },
    departments, members, clients, projects, tasks, templates, workItems, timeEntries, invoices, expenses,
    activity: [{ id: 'act_0', at: new Date().toISOString(), text: 'Workspace created with demo data' }],
  };
}
