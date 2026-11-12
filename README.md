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
| **Present** | Line up several presentations (Google Slides, Canva, PowerPoint for the web, Pitch, Figma, YouTube/Vimeo links, or uploaded PDFs/images/videos) and present them in one fullscreen window, switching between them from an on-screen bar without leaving fullscreen |
| **Settings** | Agency name, currency, default tax rate, "acting as" user switcher, JSON backup export/import, reset demo / start fresh |

### Presenting several decks in fullscreen
Browsers always leave fullscreen when you switch to another browser tab, and a web page can't prevent that. **Present** avoids it by loading every presentation into a single fullscreen stage in one tab:

1. Open **Present**, paste share links and/or upload files. Ordinary share/edit links are converted to embed links automatically. PowerPoint/Keynote files need exporting to PDF first.
2. Click **▶ Present fullscreen** (or ▶ on a row to start from it).
3. Move the mouse to the bottom edge, or click the **▦ 2 / 4** pill in the corner, to show the switcher bar. Click a deck, or use ‹ ›. The bar hides itself after a few seconds.

Each deck stays loaded after you first open it, so switching back returns to the same slide. Keyboard and clicker input goes to the deck on screen. Videos pause when you switch away. Press **Esc** or **⤡ Exit** to leave. The list is saved in this browser, and uploaded files are kept in IndexedDB.

### Tab switcher & fullscreen
Every section and every in-page tab bar can be switched from the keyboard, and it keeps working when the workspace is fullscreen (sidebar hidden):

| Keys | Action |
| --- | --- |
| `Ctrl/⌘ K` or `Alt K` | Open the tab switcher (type to filter, ↑↓ or Tab to move, Enter to open) |
| `Alt ]` / `Alt [` | Next / previous tab on the current page |
| `Alt Shift 1…8` | Jump to a section |
| `Alt Shift F` | Toggle fullscreen (also **⤢ Fullscreen** in the sidebar) |

In fullscreen a slim section bar is shown at the top. The switcher renders inside the fullscreen element so it stays visible, and on Chromium browsers `Esc` is captured (Keyboard Lock API) so it closes the switcher instead of leaving fullscreen — hold `Esc` or click **Exit** to leave. Browser-reserved combos like `Ctrl+Tab` can't be intercepted by a web page, which is why the shortcuts are Alt-based.

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

**Live:** https://seminar.starkpeople.in, deployed from GitHub to the Hostinger VPS on every push to the default branch. Setup and secrets are in [`deploy/README.md`](deploy/README.md).

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
  present.ts       share-link → embed-link conversion, file checks (pure, tested)
  presentStore.ts  presentation list (localStorage) + uploaded files (IndexedDB)
  tabSwitch.ts     shortcut matching, tab cycling, fuzzy filter (pure, tested)
  components/ui.tsx shared UI (modal, badges, charts…)
  components/TabSwitcher.tsx tab switcher overlay, fullscreen hook, tab registry
  views/           one file per module
```
