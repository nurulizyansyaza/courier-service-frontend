import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCommandHistory, saveCommand, clearCommandHistory, CommandHistoryNavigator } from '@/core/commandHistory';

// Mock localStorage
const store: Record<string, string> = {};
beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k]);
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
  });
});

describe('loadCommandHistory', () => {
  it('returns empty array when no history exists', () => {
    expect(loadCommandHistory('tab1')).toEqual([]);
  });

  it('returns stored commands', () => {
    store['courier-cli-cmd-history-tab1'] = JSON.stringify(['cmd1', 'cmd2']);
    expect(loadCommandHistory('tab1')).toEqual(['cmd1', 'cmd2']);
  });

  it('returns empty array for corrupted data', () => {
    store['courier-cli-cmd-history-tab1'] = 'not json';
    expect(loadCommandHistory('tab1')).toEqual([]);
  });
});

describe('saveCommand', () => {
  it('saves a command to history', () => {
    saveCommand('tab1', 'hello');
    expect(loadCommandHistory('tab1')).toEqual(['hello']);
  });

  it('appends commands in order', () => {
    saveCommand('tab1', 'first');
    saveCommand('tab1', 'second');
    expect(loadCommandHistory('tab1')).toEqual(['first', 'second']);
  });

  it('skips duplicate consecutive commands', () => {
    saveCommand('tab1', 'same');
    saveCommand('tab1', 'same');
    expect(loadCommandHistory('tab1')).toEqual(['same']);
  });

  it('allows duplicate non-consecutive commands', () => {
    saveCommand('tab1', 'a');
    saveCommand('tab1', 'b');
    saveCommand('tab1', 'a');
    expect(loadCommandHistory('tab1')).toEqual(['a', 'b', 'a']);
  });

  it('skips empty/whitespace-only commands', () => {
    const result = saveCommand('tab1', '   ');
    expect(result).toEqual([]);
  });

  it('trims commands before saving', () => {
    saveCommand('tab1', '  hello  ');
    expect(loadCommandHistory('tab1')).toEqual(['hello']);
  });

  it('caps at 50 commands', () => {
    for (let i = 0; i < 60; i++) {
      saveCommand('tab1', `cmd${i}`);
    }
    const history = loadCommandHistory('tab1');
    expect(history.length).toBe(50);
    expect(history[0]).toBe('cmd10');
    expect(history[49]).toBe('cmd59');
  });
});

describe('clearCommandHistory', () => {
  it('removes history for a tab', () => {
    saveCommand('tab1', 'hello');
    clearCommandHistory('tab1');
    expect(loadCommandHistory('tab1')).toEqual([]);
  });

  it('does not affect other tabs', () => {
    saveCommand('tab1', 'a');
    saveCommand('tab2', 'b');
    clearCommandHistory('tab1');
    expect(loadCommandHistory('tab2')).toEqual(['b']);
  });
});

describe('CommandHistoryNavigator', () => {
  let nav: CommandHistoryNavigator;

  beforeEach(() => {
    nav = new CommandHistoryNavigator('tab1');
  });

  it('starts with empty history', () => {
    expect(nav.getHistoryLength()).toBe(0);
    expect(nav.getCursor()).toBe(0);
  });

  it('navigateUp returns null when history is empty', () => {
    expect(nav.navigateUp('')).toBeNull();
  });

  it('navigateDown returns null when at bottom', () => {
    expect(nav.navigateDown()).toBeNull();
  });

  it('navigates up through history', () => {
    nav.onExecute('first');
    nav.onExecute('second');
    nav.onExecute('third');

    expect(nav.navigateUp('')).toBe('third');
    expect(nav.navigateUp('')).toBe('second');
    expect(nav.navigateUp('')).toBe('first');
    expect(nav.navigateUp('')).toBeNull(); // at top
  });

  it('navigates down back to draft', () => {
    nav.onExecute('cmd1');
    nav.onExecute('cmd2');

    nav.navigateUp('my draft');
    nav.navigateUp('my draft');
    expect(nav.navigateDown()).toBe('cmd2');
    expect(nav.navigateDown()).toBe('my draft');
    expect(nav.navigateDown()).toBeNull(); // at bottom
  });

  it('preserves draft when navigating up then back down', () => {
    nav.onExecute('old');
    const draft = 'typing something...';
    nav.navigateUp(draft);
    const restored = nav.navigateDown();
    expect(restored).toBe(draft);
  });

  it('resets cursor after onExecute', () => {
    nav.onExecute('a');
    nav.onExecute('b');
    nav.navigateUp('');
    nav.onExecute('c');
    // After execute, cursor should be at end
    expect(nav.getCursor()).toBe(3);
    expect(nav.navigateUp('')).toBe('c');
  });

  it('persists across instances (same tab)', () => {
    nav.onExecute('persistent');
    const nav2 = new CommandHistoryNavigator('tab1');
    expect(nav2.getHistoryLength()).toBe(1);
    expect(nav2.navigateUp('')).toBe('persistent');
  });

  it('is independent per tab', () => {
    nav.onExecute('tab1-cmd');
    const nav2 = new CommandHistoryNavigator('tab2');
    nav2.onExecute('tab2-cmd');
    expect(nav.navigateUp('')).toBe('tab1-cmd');
    expect(nav2.navigateUp('')).toBe('tab2-cmd');
  });

  it('resetCursor returns cursor to end', () => {
    nav.onExecute('a');
    nav.onExecute('b');
    nav.navigateUp('');
    nav.navigateUp('');
    nav.resetCursor();
    expect(nav.getCursor()).toBe(2);
  });
});
