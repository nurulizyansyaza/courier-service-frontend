import { getTabState, setTabState, clearTabState } from '@/core/tabStateManager';
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

    it('uses __FRAMEWORK__ global when available', () => {
      (globalThis as any).__FRAMEWORK__ = 'vue';
      clearTabState();
      const state = getTabState('tab-1');
      expect(state.framework).toBe('vue');
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
});
