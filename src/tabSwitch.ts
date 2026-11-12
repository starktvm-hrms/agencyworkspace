/**
 * Pure helpers for the tab switcher: keyboard shortcut matching, tab cycling and
 * fuzzy filtering. Kept free of React/DOM so they can be unit tested.
 *
 * Shortcuts are matched on `KeyboardEvent.code` (physical key) rather than `key`,
 * so they work on any keyboard layout and with macOS Option, which rewrites `key`.
 * Browser-reserved combos (Ctrl+Tab, Ctrl+1…9, Ctrl+W) cannot be captured by a
 * page, so the switcher deliberately uses Alt-based combos instead.
 */

export type ShortcutEvent = Pick<KeyboardEvent, 'code' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'>;

export type SwitchAction =
  | { type: 'open' }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'section'; index: number }
  | { type: 'fullscreen' };

/** Human-readable list of shortcuts, shown in the switcher footer. */
export const SHORTCUTS: { keys: string; does: string }[] = [
  { keys: 'Ctrl/⌘ K  ·  Alt K', does: 'Open the tab switcher' },
  { keys: 'Alt ]  /  Alt [', does: 'Next / previous tab on this page' },
  { keys: 'Alt Shift 1…9', does: 'Jump to a section' },
  { keys: 'Alt Shift F', does: 'Toggle fullscreen' },
];

/** Maps a keydown to a switcher action, or null if it isn't one of ours. */
export function matchShortcut(e: ShortcutEvent, typing = false): SwitchAction | null {
  const mod = e.ctrlKey || e.metaKey;
  // Open works even while typing in a field, like most command palettes.
  if (mod && !e.altKey && !e.shiftKey && e.code === 'KeyK') return { type: 'open' };
  if (!e.altKey || mod) return null;
  if (!e.shiftKey && e.code === 'KeyK') return { type: 'open' };
  if (typing) return null;
  if (!e.shiftKey && e.code === 'BracketRight') return { type: 'next' };
  if (!e.shiftKey && e.code === 'BracketLeft') return { type: 'prev' };
  if (e.shiftKey && e.code === 'KeyF') return { type: 'fullscreen' };
  const digit = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
  if (e.shiftKey && digit) return { type: 'section', index: Number(digit[1]) - 1 };
  return null;
}

/** Id of the tab `dir` steps away from `current`, wrapping around. */
export function cycleTab<T>(ids: readonly T[], current: T, dir: 1 | -1): T | undefined {
  if (ids.length === 0) return undefined;
  const i = ids.indexOf(current);
  if (i === -1) return ids[dir === 1 ? 0 : ids.length - 1];
  return ids[(i + dir + ids.length) % ids.length];
}

/**
 * Scores `text` against `query`: 0 = no match; higher = better. Substring matches
 * beat subsequence matches ("ttrk" → "Time Tracking"), and earlier/word-start
 * matches beat later ones.
 */
export function matchScore(text: string, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  const t = text.toLowerCase();
  const at = t.indexOf(q);
  if (at !== -1) {
    const wordStart = at === 0 || /[\s\-/&·]/.test(t[at - 1]);
    return 1000 - at + (wordStart ? 500 : 0);
  }
  let ti = 0;
  let gaps = 0;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found === -1) return 0;
    gaps += found - ti;
    ti = found + 1;
  }
  return Math.max(1, 500 - gaps);
}

/** Filters and sorts items by how well `label` (and optional `group`) match the query. Stable for ties. */
export function filterItems<T extends { label: string; group?: string }>(items: readonly T[], query: string): T[] {
  return items
    .map((item, i) => ({ item, i, s: Math.max(matchScore(item.label, query), matchScore(`${item.group ?? ''} ${item.label}`, query) - 1) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.item);
}
