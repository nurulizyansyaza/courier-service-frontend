import type { TabData } from './types';

export function createEmptyTab(id: string, title: string): TabData {
  return {
    id,
    title,
    calculationType: 'cost',
    input: '',
    output: '',
    error: '',
    hasExecuted: false,
    transitPackages: [],
    executionTransitSnapshot: [],
    renamedPackages: [],
    isGenerating: false,
  };
}

export function addTab(tabs: TabData[], newId: string, title: string): { tabs: TabData[]; activeTabId: string } {
  const newTab = createEmptyTab(newId, title);
  return {
    tabs: [...tabs, newTab],
    activeTabId: newId,
  };
}

export function closeTab(
  tabs: TabData[],
  idToClose: string,
  currentActiveId: string
): { tabs: TabData[]; activeTabId: string } | null {
  if (tabs.length <= 1) return null;
  const newTabs = tabs.filter(tab => tab.id !== idToClose);
  const activeTabId = currentActiveId === idToClose
    ? newTabs[newTabs.length - 1].id
    : currentActiveId;
  return { tabs: newTabs, activeTabId };
}

export function updateTab(tabs: TabData[], id: string, updates: Partial<TabData>): TabData[] {
  return tabs.map(tab =>
    tab.id === id ? { ...tab, ...updates } : tab
  );
}
