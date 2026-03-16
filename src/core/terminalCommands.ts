import type { HistoryEntry, Framework, CalculationType, TabData } from './types';
import {
  handleConnect,
  handleNotConnected,
  handleChangeUse,
  handleChangeMode,
  handleInvalidChange,
  handleClear,
  handleRestart,
  handleHelp,
  handleExit,
} from './commandHandlers';

export type CommandAction =
  | { type: 'connect'; historyEntries: HistoryEntry[]; clearHistory: boolean; showWelcome: boolean }
  | { type: 'already-connected'; historyEntries: HistoryEntry[] }
  | { type: 'not-connected'; historyEntries: HistoryEntry[] }
  | { type: 'switch-framework'; framework: Framework; historyEntries: HistoryEntry[] }
  | { type: 'change-mode'; mode: CalculationType; historyEntries: HistoryEntry[] }
  | { type: 'invalid-change'; historyEntries: HistoryEntry[] }
  | { type: 'clear'; historyEntries: HistoryEntry[] }
  | { type: 'restart'; historyEntries: HistoryEntry[] }
  | { type: 'help'; historyEntries: HistoryEntry[] }
  | { type: 'exit'; tabUpdates: Partial<TabData> }
  | { type: 'unknown-framework'; historyEntries: HistoryEntry[] }
  | { type: 'unknown-mode'; historyEntries: HistoryEntry[] }
  | null;

export function processCommand(cmd: string, isConnected: boolean): CommandAction {
  const trimmed = cmd.trim();
  const lower = trimmed.toLowerCase();

  if (lower === '/connect') return handleConnect(isConnected);
  if (!isConnected) return handleNotConnected();

  if (lower.startsWith('/change ')) {
    const parts = trimmed.substring(8).trim().split(' ');
    if (parts[0] === 'use' && parts[1]) return handleChangeUse(parts[1]);
    if (parts[0] === 'mode' && parts[1]) return handleChangeMode(parts[1]);
    return handleInvalidChange();
  }

  if (lower === 'clear') return handleClear(cmd);
  if (lower === '/restart') return handleRestart();
  if (lower === 'help') return handleHelp();
  if (lower === 'exit') return handleExit();

  return null;
}
