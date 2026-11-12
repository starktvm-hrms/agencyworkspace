import { describe, expect, it } from 'vitest';
import { cycleTab, filterItems, matchScore, matchShortcut, type ShortcutEvent } from './tabSwitch';

const key = (code: string, mods: Partial<Omit<ShortcutEvent, 'code'>> = {}): ShortcutEvent =>
  ({ code, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, ...mods });

describe('matchShortcut', () => {
  it('opens with Ctrl+K, Cmd+K and Alt+K — even while typing', () => {
    expect(matchShortcut(key('KeyK', { ctrlKey: true }))).toEqual({ type: 'open' });
    expect(matchShortcut(key('KeyK', { metaKey: true }), true)).toEqual({ type: 'open' });
    expect(matchShortcut(key('KeyK', { altKey: true }), true)).toEqual({ type: 'open' });
  });
  it('cycles page tabs with Alt+] / Alt+[', () => {
    expect(matchShortcut(key('BracketRight', { altKey: true }))).toEqual({ type: 'next' });
    expect(matchShortcut(key('BracketLeft', { altKey: true }))).toEqual({ type: 'prev' });
  });
  it('jumps to sections with Alt+Shift+digit (top row or numpad)', () => {
    expect(matchShortcut(key('Digit1', { altKey: true, shiftKey: true }))).toEqual({ type: 'section', index: 0 });
    expect(matchShortcut(key('Numpad8', { altKey: true, shiftKey: true }))).toEqual({ type: 'section', index: 7 });
    expect(matchShortcut(key('Digit0', { altKey: true, shiftKey: true }))).toBeNull();
  });
  it('toggles fullscreen with Alt+Shift+F', () => {
    expect(matchShortcut(key('KeyF', { altKey: true, shiftKey: true }))).toEqual({ type: 'fullscreen' });
  });
  it('ignores plain keys, browser combos, and navigation keys while typing', () => {
    expect(matchShortcut(key('KeyK'))).toBeNull();
    expect(matchShortcut(key('Digit1', { ctrlKey: true }))).toBeNull();
    expect(matchShortcut(key('BracketRight', { altKey: true, ctrlKey: true }))).toBeNull();
    expect(matchShortcut(key('BracketRight', { altKey: true }), true)).toBeNull();
    expect(matchShortcut(key('KeyF', { altKey: true, shiftKey: true }), true)).toBeNull();
  });
});

describe('cycleTab', () => {
  const ids = ['a', 'b', 'c'];
  it('steps forward and back with wrap-around', () => {
    expect(cycleTab(ids, 'a', 1)).toBe('b');
    expect(cycleTab(ids, 'c', 1)).toBe('a');
    expect(cycleTab(ids, 'a', -1)).toBe('c');
  });
  it('handles an unknown current tab and an empty list', () => {
    expect(cycleTab(ids, 'zz', 1)).toBe('a');
    expect(cycleTab(ids, 'zz', -1)).toBe('c');
    expect(cycleTab([], 'a', 1)).toBeUndefined();
  });
});

describe('filtering', () => {
  const items = [
    { label: 'Dashboard', group: 'Sections' },
    { label: 'Time Tracking', group: 'Sections' },
    { label: 'Invoices', group: 'Finance tabs' },
    { label: 'Expenses', group: 'Finance tabs' },
  ];
  it('returns everything in order for an empty query', () => {
    expect(filterItems(items, '  ')).toEqual(items);
  });
  it('prefers substring and word-start matches, then subsequence matches', () => {
    expect(matchScore('Time Tracking', 'track')).toBeGreaterThan(matchScore('Time Tracking', 'ttrk'));
    expect(matchScore('Time Tracking', 'ttrk')).toBeGreaterThan(0);
    expect(matchScore('Time Tracking', 'xyz')).toBe(0);
    expect(filterItems(items, 'trk').map((i) => i.label)).toEqual(['Time Tracking']);
  });
  it('matches on the group name too', () => {
    expect(filterItems(items, 'finance').map((i) => i.label)).toEqual(['Invoices', 'Expenses']);
  });
});
