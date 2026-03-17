import { getTabState, setTabState, clearTabState, loadTabStates, exportTabStates, pruneTabStates } from '@/core/tabStateManager';
import type { HistoryEntry } from '@/core/types';

describe('tabStateManager', () => {
  beforeEach(() => {
    clearTabState();
  });

  describe('getTabState', () => {
    it('returns default state for a new tab', () => {
      const state = getTabState('tab-1');
      expect(state.currentInput).toBe('');
      expect(state.history).toEqual([
        expect.objectContaining({ type: 'welcome', content: 'initial' }),
      ]);
      expect(state.framework).toBe('react');
      expect(state.isGenerating).toBe(false);
      expect(state.showWelcome).toBe(true);
      expect(state.shouldAutoScroll).toBe(true);
      expect(state.isConnected).toBe(true);
    });

    it('returns same state on repeated calls for same tab', () => {
      const state1 = getTabState('tab-1');
      const state2 = getTabState('tab-1');
      expect(state1).toEqual(state2);
    });

    it('returns different state for different tabs', () => {
      const state1 = getTabState('tab-1');
      setTabState('tab-1', { currentInput: 'hello' });
      const state2 = getTabState('tab-2');
      expect(state2.currentInput).toBe('');
      expect(getTabState('tab-1').currentInput).toBe('hello');
    });

    it('always defaults to react regardless of __FRAMEWORK__ global', () => {
      (globalThis as any).__FRAMEWORK__ = 'vue';
      clearTabState();
      const state = getTabState('tab-1');
      expect(state.framework).toBe('react');
      delete (globalThis as any).__FRAMEWORK__;
    });
  });

  describe('setTabState', () => {
    it('partially updates tab state', () => {
      setTabState('tab-1', { currentInput: 'test input' });
      const state = getTabState('tab-1');
      expect(state.currentInput).toBe('test input');
      expect(state.isConnected).toBe(true);
    });

    it('updates history', () => {
      const entry: HistoryEntry = { type: 'info', content: 'hello', timestamp: 123 };
      setTabState('tab-1', { history: [entry] });
      const state = getTabState('tab-1');
      expect(state.history).toHaveLength(1);
      expect(state.history[0].content).toBe('hello');
    });

    it('preserves other fields when updating one', () => {
      setTabState('tab-1', { isConnected: false });
      setTabState('tab-1', { currentInput: 'new' });
      const state = getTabState('tab-1');
      expect(state.isConnected).toBe(false);
      expect(state.currentInput).toBe('new');
    });

    it('updates framework', () => {
      setTabState('tab-1', { framework: 'svelte' });
      expect(getTabState('tab-1').framework).toBe('svelte');
    });
  });

  describe('clearTabState', () => {
    it('removes all stored tab states', () => {
      setTabState('tab-1', { currentInput: 'saved' });
      setTabState('tab-2', { currentInput: 'also saved' });
      clearTabState();
      expect(getTabState('tab-1').currentInput).toBe('');
      expect(getTabState('tab-2').currentInput).toBe('');
    });
  });

  describe('isolation between tabs', () => {
    it('maintains independent state per tab', () => {
      setTabState('tab-1', { isConnected: false, currentInput: 'tab1' });
      setTabState('tab-2', { isConnected: true, currentInput: 'tab2' });

      expect(getTabState('tab-1').isConnected).toBe(false);
      expect(getTabState('tab-1').currentInput).toBe('tab1');
      expect(getTabState('tab-2').isConnected).toBe(true);
      expect(getTabState('tab-2').currentInput).toBe('tab2');
    });
  });

  describe('loadTabStates / exportTabStates', () => {
    it('round-trips state through export and load', () => {
      setTabState('tab-1', { currentInput: 'hello', isConnected: false });
      setTabState('tab-2', { currentInput: 'world', framework: 'vue' });

      const exported = exportTabStates();
      clearTabState();

      loadTabStates(exported);

      expect(getTabState('tab-1').currentInput).toBe('hello');
      expect(getTabState('tab-1').isConnected).toBe(false);
      expect(getTabState('tab-2').currentInput).toBe('world');
      expect(getTabState('tab-2').framework).toBe('vue');
    });

    it('resets isGenerating to false on load', () => {
      setTabState('tab-1', { isGenerating: true });
      const exported = exportTabStates();
      clearTabState();

      loadTabStates(exported);

      expect(getTabState('tab-1').isGenerating).toBe(false);
    });

    it('handles null/undefined states gracefully', () => {
      loadTabStates(null);
      expect(exportTabStates()).toEqual({});

      loadTabStates(undefined);
      expect(exportTabStates()).toEqual({});
    });

    it('fills missing fields with defaults', () => {
      const partial = { 'tab-1': { currentInput: 'test' } } as any;
      loadTabStates(partial);

      const state = getTabState('tab-1');
      expect(state.currentInput).toBe('test');
      expect(state.showWelcome).toBe(true);
      expect(state.shouldAutoScroll).toBe(true);
    });
  });

  describe('pruneTabStates', () => {
    it('removes states for closed tabs', () => {
      setTabState('tab-1', { currentInput: 'keep' });
      setTabState('tab-2', { currentInput: 'remove' });
      setTabState('tab-3', { currentInput: 'keep too' });

      pruneTabStates(['tab-1', 'tab-3']);

      const exported = exportTabStates();
      expect(Object.keys(exported)).toEqual(['tab-1', 'tab-3']);
      expect(exported['tab-2']).toBeUndefined();
    });

    it('keeps all states when all tabs are active', () => {
      setTabState('tab-1', { currentInput: 'a' });
      setTabState('tab-2', { currentInput: 'b' });

      pruneTabStates(['tab-1', 'tab-2']);

      expect(Object.keys(exportTabStates())).toHaveLength(2);
    });

    it('handles empty active tabs list', () => {
      setTabState('tab-1', { currentInput: 'a' });
      pruneTabStates([]);
      expect(Object.keys(exportTabStates())).toHaveLength(0);
    });
  });
});
