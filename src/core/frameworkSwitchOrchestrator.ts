import type { Framework, HistoryEntry } from './types';
import { setTabState, getTabState } from './tabStateManager';
import { patchTabUIState } from './sessionPersistence';
import { switchFramework } from './frameworkSwitcher';

export interface FrameworkSwitchCallbacks {
  setFramework: (fw: Framework) => void;
  addToHistory: (entry: HistoryEntry) => void;
}

/**
 * Orchestrate a framework switch: persist state, navigate, rollback on failure.
 * Shared across React, Vue, and Svelte TerminalTab components.
 */
export async function executeFrameworkSwitch(
  tabId: string,
  targetFramework: Framework,
  previousFramework: Framework,
  callbacks: FrameworkSwitchCallbacks,
): Promise<void> {
  callbacks.setFramework(targetFramework);
  setTabState(tabId, { framework: targetFramework });
  patchTabUIState(tabId, getTabState(tabId));

  const result = await switchFramework(targetFramework, tabId);
  if (!result.success) {
    callbacks.setFramework(previousFramework);
    setTabState(tabId, { framework: previousFramework });
    patchTabUIState(tabId, getTabState(tabId));
    callbacks.addToHistory({ type: 'error', content: `✗ Switch failed: ${result.message}` });
  }
}
