import type { TabData } from './types';
import type { TabUIState } from './tabStateManager';

const STORAGE_KEY = 'courier-cli-session';
const MAX_HISTORY_PER_TAB = 200;

export interface PersistedSession {
  tabs: TabData[];
  activeTabId: string;
  nextTabNumber: number;
  tabUIStates: Record<string, TabUIState>;
}

/**
 * Save session state to sessionStorage.
 * Uses sessionStorage so data persists across same-tab navigations (framework
 * switches) but clears when the browser or tab is closed.
 * Caps history entries per tab to prevent exceeding the ~5 MB quota.
 */
export function saveSession(session: PersistedSession): void {
  try {
    const trimmed: PersistedSession = {
      ...session,
      tabUIStates: Object.fromEntries(
        Object.entries(session.tabUIStates).map(([id, state]) => [
          id,
          { ...state, history: state.history.slice(-MAX_HISTORY_PER_TAB) },
        ]),
      ),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // quota exceeded — clear and retry with trimmed payload
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...session,
        tabUIStates: Object.fromEntries(
          Object.entries(session.tabUIStates).map(([id, state]) => [
            id,
            { ...state, history: state.history.slice(-MAX_HISTORY_PER_TAB) },
          ]),
        ),
      }));
    } catch {
      // still failing — silently degrade
    }
  }
}

export function loadSession(): PersistedSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistedSession;
    if (!Array.isArray(data.tabs) || !data.activeTabId || data.tabs.length === 0) {
      return null;
    }
    return {
      tabs: data.tabs,
      activeTabId: data.activeTabId,
      nextTabNumber: typeof data.nextTabNumber === 'number' ? data.nextTabNumber : data.tabs.length + 1,
      tabUIStates: data.tabUIStates && typeof data.tabUIStates === 'object' ? data.tabUIStates : {},
    };
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Patch a single tab's UI state inside the existing sessionStorage entry.
 * This is called synchronously *before* page navigation (framework switch)
 * so that the framework label is persisted immediately — without relying
 * on the `beforeunload` event which may race against a Vite server restart.
 */
export function patchTabUIState(tabId: string, state: TabUIState): void {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as PersistedSession;
    if (!data.tabUIStates) data.tabUIStates = {};
    data.tabUIStates[tabId] = {
      ...state,
      history: state.history.slice(-MAX_HISTORY_PER_TAB),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // silently degrade
  }
}
