import type { HistoryEntry, Framework } from './types';

export interface TabUIState {
  currentInput: string;
  history: HistoryEntry[];
  framework: Framework;
  isGenerating: boolean;
  showWelcome: boolean;
  shouldAutoScroll: boolean;
  isConnected: boolean;
}

const tabStates = new Map<string, TabUIState>();

function getDefaultFramework(): Framework {
  if (typeof __FRAMEWORK__ !== 'undefined') return __FRAMEWORK__;
  return 'react';
}

function createDefaultState(): TabUIState {
  return {
    currentInput: '',
    history: [
      { type: 'welcome', content: 'initial', timestamp: Date.now() },
    ],
    framework: getDefaultFramework(),
    isGenerating: false,
    showWelcome: true,
    shouldAutoScroll: true,
    isConnected: true,
  };
}

export function getTabState(tabId: string): TabUIState {
  if (!tabStates.has(tabId)) {
    tabStates.set(tabId, createDefaultState());
  }
  return { ...tabStates.get(tabId)! };
}

export function setTabState(tabId: string, updates: Partial<TabUIState>): void {
  const current = tabStates.get(tabId) || createDefaultState();
  tabStates.set(tabId, { ...current, ...updates });
}

export function clearTabState(): void {
  tabStates.clear();
}

/** Load all tab UI states from a persisted record (used on app init). */
export function loadTabStates(states: Record<string, TabUIState> | undefined | null): void {
  tabStates.clear();
  if (!states || typeof states !== 'object') return;
  for (const [id, state] of Object.entries(states)) {
    tabStates.set(id, {
      ...createDefaultState(),
      ...state,
      isGenerating: false,
    });
  }
}

/** Export all tab UI states as a plain record (used for persistence). */
export function exportTabStates(): Record<string, TabUIState> {
  const result: Record<string, TabUIState> = {};
  for (const [id, state] of tabStates.entries()) {
    result[id] = { ...state };
  }
  return result;
}

/** Remove states for tabs that no longer exist. */
export function pruneTabStates(activeTabIds: string[]): void {
  const idSet = new Set(activeTabIds);
  for (const id of tabStates.keys()) {
    if (!idSet.has(id)) tabStates.delete(id);
  }
}
