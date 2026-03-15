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
 * Save session state to localStorage.
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // quota exceeded — clear and retry once
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // still failing — silently degrade
    }
  }
}

export function loadSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistedSession;
    // Basic validation
    if (!Array.isArray(data.tabs) || !data.activeTabId || data.tabs.length === 0) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
