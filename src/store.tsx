import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { advanceWorkItem, returnWorkItem, toggleBlocked, uid } from './logic';
import { createSeed, DATA_VERSION } from './seed';
import type { AppData, ID } from './types';

const STORAGE_KEY = 'agency-workspace:v1';

/** Collections that hold records with an `id`, editable via the generic upsert/remove actions. */
export type Collection =
  | 'departments' | 'members' | 'clients' | 'projects' | 'tasks' | 'templates'
  | 'workItems' | 'timeEntries' | 'invoices' | 'expenses';

type Item<C extends Collection> = AppData[C][number];

export type Action =
  | { type: 'upsert'; collection: Collection; item: { id: ID } & Record<string, unknown>; log?: string }
  | { type: 'remove'; collection: Collection; id: ID; log?: string }
  | { type: 'work/advance'; id: ID; note?: string }
  | { type: 'work/return'; id: ID; note: string }
  | { type: 'work/block'; id: ID; note?: string }
  | { type: 'work/comment'; id: ID; note: string }
  | { type: 'settings'; patch: Partial<AppData['settings']> }
  | { type: 'replace'; data: AppData };

const pushActivity = (s: AppData, text?: string): AppData =>
  text ? { ...s, activity: [{ id: uid('act'), at: new Date().toISOString(), text }, ...s.activity].slice(0, 200) } : s;

function updateWork(s: AppData, id: ID, fn: (w: AppData['workItems'][number]) => AppData['workItems'][number]): AppData {
  return { ...s, workItems: s.workItems.map((w) => (w.id === id ? fn(w) : w)) };
}

export function reducer(s: AppData, a: Action): AppData {
  const me = s.settings.currentUserId;
  switch (a.type) {
    case 'upsert': {
      const list = s[a.collection] as { id: ID }[];
      const exists = list.some((x) => x.id === a.item.id);
      const next = exists ? list.map((x) => (x.id === a.item.id ? { ...x, ...a.item } : x)) : [a.item, ...list];
      return pushActivity({ ...s, [a.collection]: next }, a.log);
    }
    case 'remove': {
      const list = s[a.collection] as { id: ID }[];
      let next: AppData = { ...s, [a.collection]: list.filter((x) => x.id !== a.id) };
      // Cascade: removing a project removes its tasks, work items and time entries.
      if (a.collection === 'projects') {
        next = {
          ...next,
          tasks: next.tasks.filter((t) => t.projectId !== a.id),
          workItems: next.workItems.filter((w) => w.projectId !== a.id),
          timeEntries: next.timeEntries.filter((t) => t.projectId !== a.id),
        };
      }
      return pushActivity(next, a.log);
    }
    case 'work/advance': {
      const w = s.workItems.find((x) => x.id === a.id);
      const tpl = w && s.templates.find((t) => t.id === w.templateId);
      if (!w || !tpl) return s;
      const updated = advanceWorkItem(w, tpl, me, a.note);
      const dept = s.departments.find((d) => d.id === tpl.stages[updated.stageIndex]);
      const text = updated.state === 'Completed' ? `"${w.title}" completed` : `"${w.title}" handed off to ${dept?.name}`;
      return pushActivity(updateWork(s, a.id, () => updated), text);
    }
    case 'work/return': {
      const w = s.workItems.find((x) => x.id === a.id);
      const tpl = w && s.templates.find((t) => t.id === w.templateId);
      if (!w || !tpl) return s;
      const updated = returnWorkItem(w, me, a.note);
      const dept = s.departments.find((d) => d.id === tpl.stages[updated.stageIndex]);
      return pushActivity(updateWork(s, a.id, () => updated), `"${w.title}" returned to ${dept?.name}`);
    }
    case 'work/block': {
      const w = s.workItems.find((x) => x.id === a.id);
      if (!w) return s;
      const updated = toggleBlocked(w, me, a.note);
      return pushActivity(updateWork(s, a.id, () => updated), `"${w.title}" ${updated.state === 'Blocked' ? 'blocked' : 'unblocked'}`);
    }
    case 'work/comment':
      return updateWork(s, a.id, (w) => ({ ...w, history: [...w.history, { at: new Date().toISOString(), action: 'comment', byId: me, note: a.note }] }));
    case 'settings':
      return { ...s, settings: { ...s.settings, ...a.patch } };
    case 'replace':
      return a.data;
  }
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (parsed?.version === DATA_VERSION) return parsed;
    }
  } catch {
    /* fall through to seed */
  }
  return createSeed();
}

interface Ctx {
  data: AppData;
  dispatch: (a: Action) => void;
  upsert: <C extends Collection>(collection: C, item: Item<C>, log?: string) => void;
  remove: (collection: Collection, id: ID, log?: string) => void;
  resetDemo: () => void;
  clearAll: () => void;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* storage unavailable (private mode / quota) — keep working in memory */
    }
  }, [data]);

  const value = useMemo<Ctx>(() => ({
    data,
    dispatch,
    upsert: (collection, item, log) => dispatch({ type: 'upsert', collection, item: item as never, log }),
    remove: (collection, id, log) => dispatch({ type: 'remove', collection, id, log }),
    resetDemo: () => dispatch({ type: 'replace', data: createSeed() }),
    clearAll: () => {
      const seed = createSeed();
      const me = seed.members.find((m) => m.id === seed.settings.currentUserId)!;
      dispatch({
        type: 'replace',
        data: {
          ...seed,
          members: [me],
          clients: [], projects: [], tasks: [], workItems: [], timeEntries: [], invoices: [], expenses: [],
          activity: [{ id: uid('act'), at: new Date().toISOString(), text: 'Workspace cleared' }],
        },
      });
    },
  }), [data]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

/** Lookup helpers bound to current data. */
export function useLookups() {
  const { data } = useStore();
  return useMemo(() => {
    const by = <T extends { id: ID }>(xs: T[]) => new Map(xs.map((x) => [x.id, x]));
    return {
      dept: by(data.departments),
      member: by(data.members),
      client: by(data.clients),
      project: by(data.projects),
      template: by(data.templates),
    };
  }, [data]);
}
