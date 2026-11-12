import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react';
import { cycleTab, filterItems, matchShortcut, SHORTCUTS } from '../tabSwitch';

/* ------------------------------------------------------------------ */
/* Registry of in-page tab bars                                        */
/* ------------------------------------------------------------------ */

export type TabDef = { id: string; label: string; count?: number };
type TabGroup = { key: number; tabs: TabDef[]; value: string; onChange: (id: string) => void };

let groups: TabGroup[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
let nextKey = 1;

/**
 * Lets the switcher see and drive a page's tab bar. Called by <Tabs>, so every
 * tab bar in the app is reachable from the switcher without extra wiring.
 */
export function useRegisterTabs(tabs: TabDef[], value: string, onChange: (id: string) => void) {
  const key = useRef(0);
  if (!key.current) key.current = nextKey++;
  const signature = JSON.stringify([value, tabs.map((t) => [t.id, t.label, t.count])]);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useLayoutEffect(() => {
    const k = key.current;
    const entry: TabGroup = { key: k, tabs, value, onChange: (id) => onChangeRef.current(id) };
    groups = [...groups.filter((g) => g.key !== k), entry];
    emit();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `signature` captures tabs+value
  }, [signature]);

  useEffect(() => () => {
    groups = groups.filter((g) => g.key !== key.current);
    emit();
  }, []);
}

/** The most recently mounted tab bar on screen (pages have at most one). */
function usePageTabs(): TabGroup | undefined {
  return useSyncExternalStore(subscribe, () => groups[groups.length - 1]);
}

/* ------------------------------------------------------------------ */
/* Fullscreen                                                          */
/* ------------------------------------------------------------------ */

type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void>; webkitFullscreenEnabled?: boolean };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
type KbNav = Navigator & { keyboard?: { lock?: (codes?: string[]) => Promise<void>; unlock?: () => void } };

const fsElement = () => document.fullscreenElement ?? (document as FsDoc).webkitFullscreenElement ?? null;

/**
 * Element fullscreen for `ref`. While fullscreen, Escape is captured with the
 * Keyboard Lock API where supported (Chromium), so Esc closes the switcher
 * instead of kicking you out; hold Esc (or use the Exit button) to leave.
 */
export function useFullscreen(ref: RefObject<HTMLElement | null>, { lockEscape = true }: { lockEscape?: boolean } = {}) {
  const [active, setActive] = useState(false);
  const supported = typeof document !== 'undefined' && !!(document.fullscreenEnabled || (document as FsDoc).webkitFullscreenEnabled);

  useEffect(() => {
    const on = () => {
      const is = !!ref.current && fsElement() === ref.current;
      setActive(is);
      const kb = (navigator as KbNav).keyboard;
      if (!lockEscape) return;
      if (is) kb?.lock?.(['Escape']).catch(() => { /* not supported / not allowed */ });
      else kb?.unlock?.();
    };
    document.addEventListener('fullscreenchange', on);
    document.addEventListener('webkitfullscreenchange', on);
    return () => {
      document.removeEventListener('fullscreenchange', on);
      document.removeEventListener('webkitfullscreenchange', on);
    };
  }, [ref, lockEscape]);

  const toggle = useCallback(async () => {
    const el = ref.current as FsEl | null;
    if (!el) return;
    try {
      if (fsElement()) {
        await (document.exitFullscreen?.() ?? (document as FsDoc).webkitExitFullscreen?.());
      } else {
        await (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.());
      }
    } catch { /* user gesture missing or blocked — ignore */ }
  }, [ref]);

  return { active, supported, toggle };
}

/* ------------------------------------------------------------------ */
/* Switcher                                                            */
/* ------------------------------------------------------------------ */

export type Section = { id: string; label: string; ico: string };
type Item = { key: string; label: string; group: string; ico: string; hint?: string; current: boolean; run: () => void };

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

/**
 * Keyboard-driven switcher for sections and in-page tabs. It must be rendered
 * *inside* the element that goes fullscreen — the browser only paints the
 * fullscreen element's subtree, so anything outside it (e.g. a portal to
 * <body>) would be invisible in fullscreen.
 */
export function TabSwitcher({ sections, current, onSection, fullscreen }: {
  sections: readonly Section[];
  current: string;
  onSection: (id: string) => void;
  fullscreen: ReturnType<typeof useFullscreen>;
}) {
  const page = usePageTabs();
  const toggleFs = fullscreen.toggle;
  const fullscreenActive = fullscreen.active;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const flashTimer = useRef<number | undefined>(undefined);

  const announce = useCallback((label: string) => {
    setFlash(label);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 1100);
  }, []);
  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const items = useMemo<Item[]>(() => {
    const sectionLabel = sections.find((s) => s.id === current)?.label ?? '';
    const pageItems: Item[] = (page?.tabs ?? []).map((t) => ({
      key: `tab:${t.id}`, label: t.label, group: `${sectionLabel} tabs`, ico: '▭',
      hint: t.count !== undefined ? String(t.count) : undefined,
      current: page?.value === t.id,
      run: () => page?.onChange(t.id),
    }));
    const sectionItems: Item[] = sections.map((s, i) => ({
      key: `sec:${s.id}`, label: s.label, group: 'Sections', ico: s.ico,
      hint: i < 9 ? `Alt⇧${i + 1}` : undefined,
      current: s.id === current,
      run: () => onSection(s.id),
    }));
    return [...pageItems, ...sectionItems];
  }, [page, sections, current, onSection]);

  const shown = useMemo(() => filterItems(items, query), [items, query]);

  const show = useCallback(() => {
    setQuery('');
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);

  // With no query, preselect the page tab after the current one, so a quick
  // open + Enter behaves like "next tab". With a query, select the best match.
  useEffect(() => {
    if (!open) return;
    const tabCount = page?.tabs.length ?? 0;
    const cur = items.findIndex((i) => i.current && i.key.startsWith('tab:'));
    setSel(!query && tabCount > 1 && cur !== -1 ? (cur + 1) % tabCount : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on open / query change
  }, [open, query]);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [sel, open]);

  // Global shortcuts — capture phase so they win over page handlers.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const action = matchShortcut(e, isTyping(e.target));
      if (!action) return;
      // Something else (e.g. the presentation player) is fullscreen: our UI isn't visible there.
      if (fsElement() && !fullscreenActive) return;
      e.preventDefault();
      e.stopPropagation();
      switch (action.type) {
        case 'open': if (open) close(); else show(); break;
        case 'fullscreen': toggleFs(); break;
        case 'section': {
          const s = sections[action.index];
          if (s) { onSection(s.id); announce(s.label); }
          break;
        }
        case 'next':
        case 'prev': {
          if (!page) { announce('No tabs on this page'); break; }
          const id = cycleTab(page.tabs.map((t) => t.id), page.value, action.type === 'next' ? 1 : -1);
          if (id !== undefined) {
            page.onChange(id);
            announce(page.tabs.find((t) => t.id === id)?.label ?? id);
          }
          break;
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, page, sections, onSection, toggleFs, fullscreenActive, show, close, announce]);

  const pick = (item: Item | undefined) => {
    if (!item) return;
    item.run();
    close();
    announce(item.label);
  };

  const onListKey = (e: ReactKeyboardEvent) => {
    const n = shown.length;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (!n) return;
    const down = e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey);
    const up = e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey);
    if (down) { e.preventDefault(); setSel((s) => (s + 1) % n); }
    else if (up) { e.preventDefault(); setSel((s) => (s - 1 + n) % n); }
    else if (e.key === 'Home') { e.preventDefault(); setSel(0); }
    else if (e.key === 'End') { e.preventDefault(); setSel(n - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(shown[sel]); }
  };

  return (
    <>
      {fullscreen.active && (
        <nav className="fs-bar" aria-label="Fullscreen navigation">
          <div className="fs-sections">
            {sections.map((s) => (
              <button key={s.id} className={`fs-tab ${s.id === current ? 'active' : ''}`} onClick={() => onSection(s.id)} title={s.label}>
                <span aria-hidden>{s.ico}</span><span className="fs-tab-label">{s.label}</span>
              </button>
            ))}
          </div>
          <button className="btn btn-sm" onClick={show} title="Tab switcher (Ctrl/⌘ K)">⌕ Switch <kbd>{IS_MAC ? '⌘K' : 'Ctrl K'}</kbd></button>
          <button className="btn btn-sm" onClick={fullscreen.toggle} title="Exit fullscreen (Alt Shift F)">⤡ Exit</button>
        </nav>
      )}

      {flash && !open && <div className="switch-flash" role="status">{flash}</div>}

      {open && (
        <div className="modal-backdrop switch-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <div className="switcher" role="dialog" aria-modal="true" aria-label="Switch tab" onKeyDown={onListKey}>
            <input
              ref={inputRef}
              className="switcher-input"
              placeholder="Switch to a tab or section…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              role="combobox"
              aria-expanded="true"
              aria-controls="switcher-list"
              aria-activedescendant={shown[sel] ? `sw-${shown[sel].key}` : undefined}
            />
            <div className="switcher-list" id="switcher-list" role="listbox" ref={listRef}>
              {shown.length === 0 && <div className="empty">Nothing matches “{query}”.</div>}
              {shown.map((item, i) => (
                <div key={item.key}>
                  {(i === 0 || shown[i - 1].group !== item.group) && <div className="switcher-group">{item.group}</div>}
                  <div
                    id={`sw-${item.key}`}
                    data-idx={i}
                    role="option"
                    aria-selected={i === sel}
                    className={`switcher-item ${i === sel ? 'sel' : ''}`}
                    onMouseMove={() => setSel(i)}
                    onClick={() => pick(item)}
                  >
                    <span className="switcher-ico" aria-hidden>{item.ico}</span>
                    <span className="grow">{item.label}</span>
                    {item.current && <span className="badge badge-blue">current</span>}
                    {item.hint && <span className="switcher-hint">{item.hint}</span>}
                  </div>
                </div>
              ))}
            </div>
            <div className="switcher-foot">
              <span>↑↓ / Tab to move · Enter to open · Esc to close</span>
              <details>
                <summary>Shortcuts</summary>
                <ul>{SHORTCUTS.map((s) => <li key={s.keys}><kbd>{s.keys}</kbd> {s.does}</li>)}</ul>
              </details>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
