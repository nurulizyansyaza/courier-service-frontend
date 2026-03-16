import type { HistoryEntry } from './types';

/** Find the index of the last 'clear' entry in history, or -1 if none */
export function getLastClearIndex(history: HistoryEntry[]): number {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].type === 'clear') return i;
  }
  return -1;
}
