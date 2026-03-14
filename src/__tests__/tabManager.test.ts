import { createEmptyTab, addTab, closeTab, updateTab } from '@/core/tabManager';
import type { TabData } from '@/core/types';

describe('tabManager', () => {
  describe('createEmptyTab', () => {
    it('returns proper defaults', () => {
      const tab = createEmptyTab('tab-1', 'Session 1');
      expect(tab).toEqual({
        id: 'tab-1',
        title: 'Session 1',
        calculationType: 'cost',
        input: '',
        output: '',
        error: '',
        hasExecuted: false,
        transitPackages: [],
        executionTransitSnapshot: [],
        renamedPackages: [],
        isGenerating: false,
      });
    });
  });

  describe('addTab', () => {
    it('appends new tab and returns it as active', () => {
      const existing: TabData[] = [createEmptyTab('tab-1', 'Session 1')];
      const result = addTab(existing, 'tab-2', 'Session 2');

      expect(result.tabs).toHaveLength(2);
      expect(result.tabs[1].id).toBe('tab-2');
      expect(result.tabs[1].title).toBe('Session 2');
      expect(result.activeTabId).toBe('tab-2');
    });
  });

  describe('closeTab', () => {
    it('removes tab and switches active if needed', () => {
      const tabs: TabData[] = [
        createEmptyTab('tab-1', 'Session 1'),
        createEmptyTab('tab-2', 'Session 2'),
        createEmptyTab('tab-3', 'Session 3'),
      ];

      // Close the active tab (tab-2), should switch to last remaining
      const result = closeTab(tabs, 'tab-2', 'tab-2');
      expect(result).not.toBeNull();
      expect(result!.tabs).toHaveLength(2);
      expect(result!.tabs.find(t => t.id === 'tab-2')).toBeUndefined();
      expect(result!.activeTabId).toBe('tab-3');
    });

    it('keeps active tab when closing a different tab', () => {
      const tabs: TabData[] = [
        createEmptyTab('tab-1', 'Session 1'),
        createEmptyTab('tab-2', 'Session 2'),
      ];

      const result = closeTab(tabs, 'tab-1', 'tab-2');
      expect(result).not.toBeNull();
      expect(result!.tabs).toHaveLength(1);
      expect(result!.activeTabId).toBe('tab-2');
    });

    it('returns null when only 1 tab', () => {
      const tabs: TabData[] = [createEmptyTab('tab-1', 'Session 1')];
      const result = closeTab(tabs, 'tab-1', 'tab-1');
      expect(result).toBeNull();
    });
  });

  describe('updateTab', () => {
    it('updates the correct tab', () => {
      const tabs: TabData[] = [
        createEmptyTab('tab-1', 'Session 1'),
        createEmptyTab('tab-2', 'Session 2'),
      ];

      const updated = updateTab(tabs, 'tab-1', { input: 'new input', hasExecuted: true });
      expect(updated[0].input).toBe('new input');
      expect(updated[0].hasExecuted).toBe(true);
      // Other tab unchanged
      expect(updated[1].input).toBe('');
      expect(updated[1].hasExecuted).toBe(false);
    });
  });
});
