import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveSession, loadSession, clearSession, patchTabUIState } from '../core/sessionPersistence';
import type { PersistedSession } from '../core/sessionPersistence';
import type { TabUIState } from '../core/tabStateManager';

function makeTab(id: string, title = `Tab ${id}`) {
  return {
    id, title,
    calculationType: 'cost' as const,
    input: '', output: '', error: '',
    hasExecuted: false,
    transitPackages: [],
    executionTransitSnapshot: [],
    renamedPackages: [],
    isGenerating: false,
  };
}

function makeUIState(overrides: Partial<TabUIState> = {}): TabUIState {
  return {
    currentInput: '',
    isConnected: true,
    showWelcome: false,
    framework: 'react',
    history: [],
    ...overrides,
  };
}

function makeSession(overrides: Partial<PersistedSession> = {}): PersistedSession {
  return {
    tabs: [makeTab('1')],
    activeTabId: '1',
    nextTabNumber: 2,
    tabUIStates: { '1': makeUIState() },
    ...overrides,
  };
}

describe('sessionPersistence', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe('saveSession', () => {
    it('should persist session to sessionStorage', () => {
      const session = makeSession();
      saveSession(session);

      const raw = sessionStorage.getItem('courier-cli-session');
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.tabs).toHaveLength(1);
      expect(parsed.activeTabId).toBe('1');
      expect(parsed.nextTabNumber).toBe(2);
    });

    it('should trim history to 200 entries per tab', () => {
      const longHistory = Array.from({ length: 300 }, (_, i) => ({
        type: 'output' as const,
        content: `line ${i}`,
      }));
      const session = makeSession({
        tabUIStates: { '1': makeUIState({ history: longHistory }) },
      });

      saveSession(session);

      const parsed = JSON.parse(sessionStorage.getItem('courier-cli-session')!);
      expect(parsed.tabUIStates['1'].history).toHaveLength(200);
      // Should keep the LAST 200 entries
      expect(parsed.tabUIStates['1'].history[0].content).toBe('line 100');
      expect(parsed.tabUIStates['1'].history[199].content).toBe('line 299');
    });

    it('should handle multiple tabs independently', () => {
      const session = makeSession({
        tabs: [makeTab('1'), makeTab('2')],
        tabUIStates: {
          '1': makeUIState({ currentInput: 'tab1' }),
          '2': makeUIState({ currentInput: 'tab2' }),
        },
      });

      saveSession(session);

      const parsed = JSON.parse(sessionStorage.getItem('courier-cli-session')!);
      expect(parsed.tabUIStates['1'].currentInput).toBe('tab1');
      expect(parsed.tabUIStates['2'].currentInput).toBe('tab2');
    });

    it('should recover from quota exceeded by clearing and retrying', () => {
      const originalSetItem = sessionStorage.setItem.bind(sessionStorage);
      let shouldThrow = true;

      Object.defineProperty(sessionStorage, 'setItem', {
        value: (key: string, value: string) => {
          if (shouldThrow) {
            shouldThrow = false;
            throw new DOMException('QuotaExceededError');
          }
          return originalSetItem(key, value);
        },
        writable: true,
        configurable: true,
      });

      saveSession(makeSession());

      // Retry succeeded — session should be stored
      const loaded = loadSession();
      expect(loaded).not.toBeNull();
      expect(loaded!.tabs).toHaveLength(1);

      // Restore original
      Object.defineProperty(sessionStorage, 'setItem', {
        value: originalSetItem,
        writable: true,
        configurable: true,
      });
    });

    it('should silently degrade when both attempts fail', () => {
      const originalSetItem = sessionStorage.setItem.bind(sessionStorage);
      Object.defineProperty(sessionStorage, 'setItem', {
        value: () => { throw new DOMException('QuotaExceededError'); },
        writable: true,
        configurable: true,
      });

      // Should not throw
      expect(() => saveSession(makeSession())).not.toThrow();

      Object.defineProperty(sessionStorage, 'setItem', {
        value: originalSetItem,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('loadSession', () => {
    it('should return null when no session exists', () => {
      expect(loadSession()).toBeNull();
    });

    it('should restore a valid session', () => {
      const session = makeSession();
      saveSession(session);

      const loaded = loadSession();
      expect(loaded).not.toBeNull();
      expect(loaded!.tabs).toHaveLength(1);
      expect(loaded!.activeTabId).toBe('1');
      expect(loaded!.nextTabNumber).toBe(2);
    });

    it('should return null for malformed JSON', () => {
      sessionStorage.setItem('courier-cli-session', '{invalid json}}');
      expect(loadSession()).toBeNull();
    });

    it('should return null when tabs is not an array', () => {
      sessionStorage.setItem('courier-cli-session', JSON.stringify({
        tabs: 'not-array',
        activeTabId: '1',
      }));
      expect(loadSession()).toBeNull();
    });

    it('should return null when tabs is empty', () => {
      sessionStorage.setItem('courier-cli-session', JSON.stringify({
        tabs: [],
        activeTabId: '1',
      }));
      expect(loadSession()).toBeNull();
    });

    it('should return null when activeTabId is missing', () => {
      sessionStorage.setItem('courier-cli-session', JSON.stringify({
        tabs: [makeTab('1')],
      }));
      expect(loadSession()).toBeNull();
    });

    it('should default nextTabNumber when missing', () => {
      sessionStorage.setItem('courier-cli-session', JSON.stringify({
        tabs: [makeTab('1'), makeTab('2')],
        activeTabId: '1',
        tabUIStates: {},
      }));

      const loaded = loadSession();
      expect(loaded!.nextTabNumber).toBe(3); // tabs.length + 1
    });

    it('should default tabUIStates to empty object when missing', () => {
      sessionStorage.setItem('courier-cli-session', JSON.stringify({
        tabs: [makeTab('1')],
        activeTabId: '1',
        nextTabNumber: 2,
      }));

      const loaded = loadSession();
      expect(loaded!.tabUIStates).toEqual({});
    });

    it('should default tabUIStates to empty object when not an object', () => {
      sessionStorage.setItem('courier-cli-session', JSON.stringify({
        tabs: [makeTab('1')],
        activeTabId: '1',
        nextTabNumber: 2,
        tabUIStates: 'invalid',
      }));

      const loaded = loadSession();
      expect(loaded!.tabUIStates).toEqual({});
    });
  });

  describe('clearSession', () => {
    it('should remove session from sessionStorage', () => {
      saveSession(makeSession());
      expect(sessionStorage.getItem('courier-cli-session')).not.toBeNull();

      clearSession();
      expect(sessionStorage.getItem('courier-cli-session')).toBeNull();
    });

    it('should not throw when no session exists', () => {
      expect(() => clearSession()).not.toThrow();
    });
  });

  describe('patchTabUIState', () => {
    it('should update a single tab state in existing session', () => {
      saveSession(makeSession());

      const newState = makeUIState({ framework: 'vue', currentInput: 'test' });
      patchTabUIState('1', newState);

      const loaded = loadSession();
      expect(loaded!.tabUIStates['1'].framework).toBe('vue');
      expect(loaded!.tabUIStates['1'].currentInput).toBe('test');
    });

    it('should add new tab state without affecting others', () => {
      saveSession(makeSession());

      const newState = makeUIState({ framework: 'svelte' });
      patchTabUIState('2', newState);

      const loaded = loadSession();
      expect(loaded!.tabUIStates['1'].framework).toBe('react');
      expect(loaded!.tabUIStates['2'].framework).toBe('svelte');
    });

    it('should trim history to 200 entries', () => {
      saveSession(makeSession());

      const longHistory = Array.from({ length: 250 }, (_, i) => ({
        type: 'output' as const,
        content: `line ${i}`,
      }));
      patchTabUIState('1', makeUIState({ history: longHistory }));

      const loaded = loadSession();
      expect(loaded!.tabUIStates['1'].history).toHaveLength(200);
    });

    it('should do nothing when no session exists', () => {
      const newState = makeUIState({ framework: 'vue' });
      expect(() => patchTabUIState('1', newState)).not.toThrow();
      expect(loadSession()).toBeNull();
    });

    it('should initialize tabUIStates when missing from stored data', () => {
      sessionStorage.setItem('courier-cli-session', JSON.stringify({
        tabs: [makeTab('1')],
        activeTabId: '1',
        nextTabNumber: 2,
      }));

      patchTabUIState('1', makeUIState({ framework: 'vue' }));

      const raw = JSON.parse(sessionStorage.getItem('courier-cli-session')!);
      expect(raw.tabUIStates['1'].framework).toBe('vue');
    });
  });
});
