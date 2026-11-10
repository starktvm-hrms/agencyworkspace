# Agency Workspace

An interactive workspace for running a creative/digital agency: projects, the flow of work between departments, time tracking, and finance in one place.

![stack](https://img.shields.io/badge/React-19-blue) ![ts](https://img.shields.io/badge/TypeScript-5-blue) ![vite](https://img.shields.io/badge/Vite-6-purple)

## Modules

| Module | What it does |
| --- | --- |
| **Dashboard** | KPIs, 6‑month P&L chart, department workload, your department's queue, your tasks, project health, overdue invoices, activity feed |
| **Projects** | Project list with budget burn and progress; project detail with a drag‑and‑drop task board, department handoffs, time and finance tabs |
| **Workflow** | Department board where work items move along a route (e.g. Account Mgmt → Strategy → Creative → Media → Account Mgmt). Hand off, return with a note, block/unblock, assign, comment, full history. Editable workflow templates |
| **Time Tracking** | Log hours per member/project, weekly timesheet grid, billable vs non‑billable |
| **Clients** | Accounts, contacts, linked projects, lifetime billed and outstanding |
| **Departments & Team** | Departments with heads and colours, members with roles, cost/bill rates, capacity and 7‑day utilisation |
| **Finance** | Monthly P&L, spend by category, invoices (line items, tax/GST, draft → sent → paid/void, overdue detection, fill from billable time, CSV export), expense submission & approval (role‑gated), project profitability |
| **Settings** | Agency name, currency, default tax rate, "acting as" user switcher, JSON backup export/import, reset demo / start fresh |

### How the numbers work
- **Labour cost** = hours logged × member's internal cost rate.
- **Project cost** = labour + non‑rejected expenses; **budget burn** = cost ÷ budget.
- **Invoiced** counts Sent + Paid invoices (excl. tax); **margin** = invoiced − cost.
- **Monthly revenue** = Paid invoices by paid date; **monthly costs** = labour + approved expenses.
- A **Sent** invoice past its due date shows as **Overdue**.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests for finance + workflow logic
npm run build      # type-check + production build to dist/
```

The app ships with realistic demo data (dates are relative to today). Data is persisted in the browser's `localStorage`; use **Settings → Export backup** to move it between machines.

## Project structure

```
src/
  types.ts         data model
  logic.ts         pure business logic (finance, workflow transitions, utilisation)
  logic.test.ts    unit tests
  seed.ts          demo data
  store.tsx        React context + reducer, localStorage persistence
  router.ts        tiny hash router
  components/ui.tsx shared UI (modal, badges, charts…)
  views/           one file per module
```
