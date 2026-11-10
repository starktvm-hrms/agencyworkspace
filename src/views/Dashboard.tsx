import { useMemo } from 'react';
import { useLookups, useStore } from '../store';
import { navigate } from '../router';
import {
  daysInStage, fmtDate, invoiceDisplayStatus, invoiceTotal, monthlyPnL, projectFinancials, receivables, todayISO,
} from '../logic';
import { Avatar, Badge, DeptChip, Empty, PageHead, PnLChart, Progress, Stat, useMoney } from '../components/ui';

export default function Dashboard() {
  const { data } = useStore();
  const L = useLookups();
  const money = useMoney();
  const today = todayISO();
  const me = L.member.get(data.settings.currentUserId);

  const stats = useMemo(() => {
    const active = data.projects.filter((p) => p.status === 'Active');
    const openTasks = data.tasks.filter((t) => t.status !== 'Done');
    const overdueTasks = openTasks.filter((t) => t.dueDate < today);
    const blocked = data.workItems.filter((w) => w.state === 'Blocked');
    const pnl = monthlyPnL(data, 6, today);
    const thisMonth = pnl[pnl.length - 1];
    const ytdRev = pnl.reduce((s, b) => s + b.revenue, 0);
    const ytdProfit = pnl.reduce((s, b) => s + b.profit, 0);
    return { active, openTasks, overdueTasks, blocked, pnl, thisMonth, ytdRev, ytdProfit, ar: receivables(data, today) };
  }, [data, today]);

  const myQueue = data.workItems.filter((w) => {
    if (w.state === 'Completed') return false;
    const tpl = L.template.get(w.templateId);
    return tpl?.stages[w.stageIndex] === me?.departmentId;
  });

  const myTasks = data.tasks.filter((t) => t.assigneeId === me?.id && t.status !== 'Done').sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // department load: open work items currently sitting in each department
  const deptLoad = data.departments.map((d) => {
    const items = data.workItems.filter((w) => w.state !== 'Completed' && L.template.get(w.templateId)?.stages[w.stageIndex] === d.id);
    return { d, count: items.length, blocked: items.filter((w) => w.state === 'Blocked').length };
  });
  const maxLoad = Math.max(1, ...deptLoad.map((x) => x.count));

  const overdueInvoices = data.invoices.filter((i) => invoiceDisplayStatus(i, today) === 'Overdue');

  return (
    <>
      <PageHead
        title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}${me ? ', ' + me.name.split(' ')[0] : ''}`}
        sub={`Here's what's happening at ${data.settings.agencyName} today, ${fmtDate(today)}.`}
      />

      <div className="grid-stats">
        <Stat label="Active projects" value={stats.active.length} sub={`${data.projects.length} total`} />
        <Stat label="Open tasks" value={stats.openTasks.length} sub={<span className={stats.overdueTasks.length ? 'bad' : ''}>{stats.overdueTasks.length} overdue</span>} />
        <Stat label="Blocked handoffs" value={stats.blocked.length} tone={stats.blocked.length ? 'bad' : undefined} sub="across departments" />
        <Stat label="Revenue (6 mo)" value={money(stats.ytdRev)} sub={<>Profit <span className={stats.ytdProfit >= 0 ? 'good' : 'bad'}>{money(stats.ytdProfit)}</span></>} />
        <Stat label="Receivables" value={money(stats.ar.outstanding)} sub={<span className={stats.ar.overdue ? 'bad' : ''}>{money(stats.ar.overdue)} overdue</span>} />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head"><h2>Profit & loss — last 6 months</h2><button className="link-btn" onClick={() => navigate('finance')}>Finance →</button></div>
          <div className="card-pad"><PnLChart data={stats.pnl} money={money} /></div>
        </div>
        <div className="card">
          <div className="card-head"><h2>Department workload</h2><button className="link-btn" onClick={() => navigate('workflow')}>Workflow →</button></div>
          <div className="card-pad stack" style={{ gap: 12 }}>
            {deptLoad.map(({ d, count, blocked }) => (
              <div key={d.id}>
                <div className="row between small" style={{ marginBottom: 4 }}>
                  <DeptChip name={d.name} color={d.color} />
                  <span className="muted">{count} in queue{blocked ? <span className="bad"> · {blocked} blocked</span> : null}</span>
                </div>
                <Progress pct={(count / maxLoad) * 100} warnAt={101} dangerAt={101} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2-even">
        <div className="card">
          <div className="card-head">
            <h2>Your department's queue</h2>
            {me && <DeptChip name={L.dept.get(me.departmentId)?.name} color={L.dept.get(me.departmentId)?.color} />}
          </div>
          {myQueue.length === 0 ? <Empty>Nothing waiting on your department. 🎉</Empty> : myQueue.map((w) => (
            <div key={w.id} className="list-row">
              <div className="grow">
                <button className="link-btn" onClick={() => navigate('workflow')}>{w.title}</button>
                <div className="muted small">{L.project.get(w.projectId)?.name} · {daysInStage(w)}d in stage · due {fmtDate(w.dueDate)}</div>
              </div>
              {w.state === 'Blocked' ? <Badge>Blocked</Badge> : <Badge>{w.priority}</Badge>}
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-head"><h2>Your tasks</h2></div>
          {myTasks.length === 0 ? <Empty>No open tasks assigned to you.</Empty> : myTasks.map((t) => (
            <div key={t.id} className="list-row">
              <div className="grow">
                <button className="link-btn" onClick={() => navigate(`projects/${t.projectId}`)}>{t.title}</button>
                <div className="muted small">{L.project.get(t.projectId)?.name}</div>
              </div>
              <span className={`small ${t.dueDate < today ? 'bad' : 'muted'}`}>{fmtDate(t.dueDate)}</span>
              <Badge>{t.status}</Badge>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head"><h2>Project health</h2><button className="link-btn" onClick={() => navigate('projects')}>All projects →</button></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Project</th><th>Status</th><th>Budget used</th><th className="num">Margin</th><th>Due</th></tr></thead>
              <tbody>
                {data.projects.filter((p) => p.status === 'Active' || p.status === 'Planning').map((p) => {
                  const f = projectFinancials(data, p);
                  return (
                    <tr key={p.id} className="clickable" onClick={() => navigate(`projects/${p.id}`)}>
                      <td><strong>{p.name}</strong><div className="muted small">{L.client.get(p.clientId)?.name}</div></td>
                      <td><Badge>{p.status}</Badge></td>
                      <td style={{ minWidth: 140 }}><div className="small muted" style={{ marginBottom: 3 }}>{Math.round(f.budgetUsedPct)}% of {money(p.budget)}</div><Progress pct={f.budgetUsedPct} /></td>
                      <td className={`num ${f.margin >= 0 ? 'good' : 'bad'}`}>{f.invoiced ? `${Math.round(f.marginPct)}%` : '—'}</td>
                      <td className="small">{fmtDate(p.dueDate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="stack">
          {overdueInvoices.length > 0 && (
            <div className="card">
              <div className="card-head"><h2 className="bad">Overdue invoices</h2></div>
              {overdueInvoices.map((i) => (
                <div key={i.id} className="list-row">
                  <div className="grow"><strong>{i.number}</strong><div className="muted small">{L.client.get(i.clientId)?.name} · due {fmtDate(i.dueDate)}</div></div>
                  <span className="num">{money(invoiceTotal(i))}</span>
                </div>
              ))}
            </div>
          )}
          <div className="card">
            <div className="card-head"><h2>Recent activity</h2></div>
            <ul className="activity">
              {data.activity.slice(0, 8).map((a) => (
                <li key={a.id}><span>{a.text}</span><span className="muted small" style={{ whiteSpace: 'nowrap' }}>{fmtDate(a.at)}</span></li>
              ))}
            </ul>
          </div>
          <div className="card card-pad row gap">
            {data.departments.map((d) => {
              const head = d.headId ? L.member.get(d.headId) : undefined;
              return head ? <Avatar key={d.id} name={`${head.name} — ${d.name}`} color={d.color} /> : null;
            })}
            <span className="muted small">Department heads</span>
          </div>
        </div>
      </div>
    </>
  );
}
