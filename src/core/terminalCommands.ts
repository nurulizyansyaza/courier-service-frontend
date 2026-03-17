import type { HistoryEntry, Framework, CalculationType, TabData } from './types';
import {
  handleConnect,
  handleNotConnected,
  handleChangeUse,
  handleChangeMode,
  handleInvalidChange,
  handleUnknownCommand,
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
  | { type: 'unknown-command'; historyEntries: HistoryEntry[] }
  | null;

const TEXT_COMMANDS = ['clear', 'help', 'exit'];
const SLASH_COMMANDS = ['/connect', '/restart', '/change'];

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[n];
}

function findSimilarCommand(input: string, commands: string[]): string | null {
  let bestMatch = '';
  let bestDistance = Infinity;
  for (const cmd of commands) {
    const dist = levenshtein(input, cmd);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestMatch = cmd;
    }
  }
  if (bestDistance > 0 && bestDistance <= 2 && input.length >= bestMatch.length / 2) {
    return bestMatch;
  }
  return null;
}

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

  if (lower.startsWith('/change')) return handleInvalidChange();

  if (lower.startsWith('/')) {
    const suggestion = findSimilarCommand(lower, SLASH_COMMANDS);
    return handleUnknownCommand(trimmed, suggestion);
  }

  const suggestion = findSimilarCommand(lower, TEXT_COMMANDS);
  if (suggestion) {
    return handleUnknownCommand(trimmed, suggestion);
  }

  return null;
}
