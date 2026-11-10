import { useEffect, useState } from 'react';
import { navigate, useRoute } from './router';
import { useStore } from './store';
import { invoiceDisplayStatus } from './logic';
import { Avatar } from './components/ui';
import Dashboard from './views/Dashboard';
import Projects from './views/Projects';
import ProjectDetail from './views/ProjectDetail';
import Workflow from './views/Workflow';
import Clients from './views/Clients';
import Team from './views/Team';
import Finance from './views/Finance';
import TimeTracking from './views/TimeTracking';
import SettingsView from './views/Settings';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', ico: '◧' },
  { id: 'projects', label: 'Projects', ico: '▤' },
  { id: 'workflow', label: 'Workflow', ico: '⇄' },
  { id: 'time', label: 'Time Tracking', ico: '◷' },
  { id: 'clients', label: 'Clients', ico: '◎' },
  { id: 'team', label: 'Departments & Team', ico: '☷' },
  { id: 'finance', label: 'Finance', ico: '₹' },
  { id: 'settings', label: 'Settings', ico: '⚙' },
] as const;

export default function App() {
  const route = useRoute();
  const { data } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem('agency-theme') as 'light' | 'dark') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('agency-theme', theme); } catch { /* ignore */ }
  }, [theme]);

  useEffect(() => setMenuOpen(false), [route.join('/')]);

  const section = route[0] ?? 'dashboard';
  const me = data.members.find((m) => m.id === data.settings.currentUserId);
  const myDept = me?.departmentId;

  // Sidebar badges
  const counts: Record<string, number> = {
    workflow: data.workItems.filter((w) => {
      if (w.state === 'Completed') return false;
      const tpl = data.templates.find((t) => t.id === w.templateId);
      return tpl?.stages[w.stageIndex] === myDept;
    }).length,
    finance: data.invoices.filter((i) => invoiceDisplayStatus(i) === 'Overdue').length + data.expenses.filter((e) => e.status === 'Pending').length,
  };

  let view;
  switch (section) {
    case 'projects': view = route[1] ? <ProjectDetail id={route[1]} /> : <Projects />; break;
    case 'workflow': view = <Workflow />; break;
    case 'time': view = <TimeTracking />; break;
    case 'clients': view = <Clients />; break;
    case 'team': view = <Team />; break;
    case 'finance': view = <Finance />; break;
    case 'settings': view = <SettingsView />; break;
    default: view = <Dashboard />;
  }

  return (
    <div className="app">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">{data.settings.agencyName.charAt(0)}</span>
          <span>{data.settings.agencyName}</span>
        </div>
        {NAV.map((n) => (
          <button key={n.id} className={`nav-btn ${section === n.id ? 'active' : ''}`} onClick={() => navigate(n.id)}>
            <span className="nav-ico" aria-hidden>{n.ico}</span>
            {n.label}
            {counts[n.id] ? <span className="nav-count">{counts[n.id]}</span> : null}
          </button>
        ))}
        <div className="sidebar-foot">
          <button className="btn btn-sm" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀ Light mode' : '☾ Dark mode'}
          </button>
          {me && (
            <div className="row gap">
              <Avatar name={me.name} size={30} />
              <div>
                <div style={{ fontWeight: 600 }}>{me.name}</div>
                <div className="muted small">{me.title}</div>
              </div>
            </div>
          )}
        </div>
      </aside>
      {menuOpen && <div className="modal-backdrop" style={{ zIndex: 35 }} onClick={() => setMenuOpen(false)} />}
      <div style={{ minWidth: 0 }}>
        <div className="topbar">
          <button className="icon-btn" aria-label="Open menu" onClick={() => setMenuOpen(true)}>☰</button>
          <strong>{data.settings.agencyName}</strong>
        </div>
        <main className="main">{view}</main>
      </div>
    </div>
  );
}
