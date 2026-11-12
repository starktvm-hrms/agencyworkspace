import { useEffect, type ReactNode } from 'react';
import { useStore } from '../store';
import { fmtMoney } from '../logic';
import { useRegisterTabs } from './TabSwitcher';

export function Modal({ title, onClose, children, footer, wide }: {
  title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

export function Field({ label, children, span }: { label: string; children: ReactNode; span?: 2 }) {
  return (
    <label className={`field ${span === 2 ? 'span-2' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

const TONE: Record<string, string> = {
  // generic
  Active: 'blue', Completed: 'green', Done: 'green', Paid: 'green', Approved: 'green',
  Blocked: 'red', Overdue: 'red', Urgent: 'red', Rejected: 'red', Cancelled: 'gray', Void: 'gray', Archived: 'gray',
  'On Hold': 'amber', Paused: 'amber', Pending: 'amber', Review: 'amber', High: 'amber', Sent: 'purple',
  Planning: 'purple', Lead: 'purple', 'In Progress': 'blue', 'To Do': 'gray', Draft: 'gray', Medium: 'blue', Low: 'gray',
};

export function Badge({ children, tone }: { children: ReactNode; tone?: string }) {
  const t = tone ?? (typeof children === 'string' ? TONE[children] : undefined) ?? 'gray';
  return <span className={`badge badge-${t}`}>{children}</span>;
}

export function Avatar({ name, size = 26, color }: { name?: string; size?: number; color?: string }) {
  const initials = (name ?? '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span className="avatar" title={name} style={{ width: size, height: size, fontSize: size * 0.4, background: color }}>
      {initials}
    </span>
  );
}

export function DeptChip({ name, color }: { name?: string; color?: string }) {
  return (
    <span className="dept-chip">
      <i style={{ background: color ?? '#94a3b8' }} />
      {name ?? '—'}
    </span>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'good' | 'bad' }) {
  return (
    <div className="stat card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${tone ?? ''}`}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function Progress({ pct, warnAt = 85, dangerAt = 100 }: { pct: number; warnAt?: number; dangerAt?: number }) {
  const cls = pct >= dangerAt ? 'danger' : pct >= warnAt ? 'warn' : '';
  return (
    <div className="progress" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`progress-fill ${cls}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function PageHead({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="muted">{sub}</p>}
      </div>
      {actions && <div className="row gap">{actions}</div>}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { id: T; label: string; count?: number }[] }) {
  // Makes this tab bar reachable from the tab switcher (Ctrl/⌘ K, Alt [ / ]), including in fullscreen.
  useRegisterTabs(tabs, value, onChange as (id: string) => void);
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} className={value === t.id ? 'tab active' : 'tab'} onClick={() => onChange(t.id)}>
          {t.label}
          {t.count !== undefined && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function useMoney() {
  const { data } = useStore();
  const { currency, locale } = data.settings;
  return (n: number) => fmtMoney(n, currency, locale);
}

/** Grouped bar chart for revenue vs costs, with a profit line. Pure SVG, no dependencies. */
export function PnLChart({ data, money }: { data: { label: string; revenue: number; costs: number; profit: number }[]; money: (n: number) => string }) {
  const W = 640, H = 240, P = { l: 56, r: 12, t: 16, b: 28 };
  const max = Math.max(1, ...data.flatMap((d) => [d.revenue, d.costs]));
  const min = Math.min(0, ...data.map((d) => d.profit));
  const span = max - min;
  const y = (v: number) => P.t + ((max - v) / span) * (H - P.t - P.b);
  const bw = (W - P.l - P.r) / data.length;
  const ticks = 4;
  const compact = (n: number) => money(n).replace(/\.00$/, '');
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Revenue, costs and profit by month">
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const v = min + (span * i) / ticks;
          return (
            <g key={i}>
              <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} className="grid" />
              <text x={P.l - 6} y={y(v) + 4} textAnchor="end" className="axis">{new Intl.NumberFormat('en', { notation: 'compact' }).format(v)}</text>
            </g>
          );
        })}
        <line x1={P.l} x2={W - P.r} y1={y(0)} y2={y(0)} className="zero" />
        {data.map((d, i) => {
          const x = P.l + i * bw;
          const w = Math.min(22, bw / 3);
          return (
            <g key={d.label}>
              <rect x={x + bw / 2 - w - 2} y={y(d.revenue)} width={w} height={Math.max(0, y(0) - y(d.revenue))} className="bar-rev" rx={3}>
                <title>{`${d.label} revenue: ${compact(d.revenue)}`}</title>
              </rect>
              <rect x={x + bw / 2 + 2} y={y(d.costs)} width={w} height={Math.max(0, y(0) - y(d.costs))} className="bar-cost" rx={3}>
                <title>{`${d.label} costs: ${compact(d.costs)}`}</title>
              </rect>
              <text x={x + bw / 2} y={H - 8} textAnchor="middle" className="axis">{d.label}</text>
            </g>
          );
        })}
        <polyline
          fill="none"
          className="line-profit"
          points={data.map((d, i) => `${P.l + i * bw + bw / 2},${y(d.profit)}`).join(' ')}
        />
        {data.map((d, i) => (
          <circle key={d.label} cx={P.l + i * bw + bw / 2} cy={y(d.profit)} r={3.5} className="dot-profit">
            <title>{`${d.label} profit: ${compact(d.profit)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="legend">
        <span><i className="sw rev" /> Revenue (collected)</span>
        <span><i className="sw cost" /> Costs (labour + expenses)</span>
        <span><i className="sw profit" /> Profit</span>
      </div>
    </div>
  );
}

export function HBar({ items, money }: { items: [string, number][]; money: (n: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i[1]));
  return (
    <div className="hbars">
      {items.map(([k, v]) => (
        <div key={k} className="hbar">
          <span className="hbar-label">{k}</span>
          <div className="hbar-track"><div className="hbar-fill" style={{ width: `${(v / max) * 100}%` }} /></div>
          <span className="hbar-val">{money(v)}</span>
        </div>
      ))}
    </div>
  );
}

export function confirmDelete(what: string) {
  return window.confirm(`Delete ${what}? This cannot be undone.`);
}
