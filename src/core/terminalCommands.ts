import type { HistoryEntry, Framework, CalculationType, TabData } from './types';

export type CommandAction =
  | { type: 'connect'; historyEntries: HistoryEntry[]; clearHistory: boolean; showWelcome: boolean }
  | { type: 'already-connected'; historyEntries: HistoryEntry[] }
  | { type: 'not-connected'; historyEntries: HistoryEntry[] }
  | { type: 'change-framework'; framework: Framework; historyEntries: HistoryEntry[] }
  | { type: 'change-mode'; mode: CalculationType; historyEntries: HistoryEntry[] }
  | { type: 'invalid-change'; historyEntries: HistoryEntry[] }
  | { type: 'clear'; historyEntries: HistoryEntry[] }
  | { type: 'restart'; historyEntries: HistoryEntry[] }
  | { type: 'exit'; tabUpdates: Partial<TabData> }
  | { type: 'unknown-framework'; historyEntries: HistoryEntry[] }
  | { type: 'unknown-mode'; historyEntries: HistoryEntry[] }
  | null;

export function processCommand(cmd: string, isConnected: boolean): CommandAction {
  const trimmed = cmd.trim();
  const lower = trimmed.toLowerCase();

  if (lower === '/connect') {
    if (!isConnected) {
      return {
        type: 'connect',
        historyEntries: [{ type: 'info', content: 'Connected to Courier CLI' }],
        clearHistory: true,
        showWelcome: true,
      };
    } else {
      return {
        type: 'already-connected',
        historyEntries: [{ type: 'error', content: 'Already connected' }],
      };
    }
  }

  if (!isConnected) {
    return {
      type: 'not-connected',
      historyEntries: [{ type: 'error', content: '✗ CLI not connected. Type /connect to reconnect.' }],
    };
  }

  if (lower.startsWith('/change ')) {
    const parts = trimmed.substring(8).trim().split(' ');

    if (parts[0] === 'use' && parts[1]) {
      const targetFramework = parts[1].toLowerCase();
      if (targetFramework === 'react' || targetFramework === 'vue' || targetFramework === 'svelte') {
        return {
          type: 'change-framework',
          framework: targetFramework as Framework,
          historyEntries: [{
            type: 'info',
            content: `Framework switched to ${targetFramework.charAt(0).toUpperCase() + targetFramework.slice(1)}.js`,
          }],
        };
      } else {
        return {
          type: 'unknown-framework',
          historyEntries: [{
            type: 'error',
            content: `Unknown framework "${parts[1]}". Available: react, vue, svelte`,
          }],
        };
      }
    }

    if (parts[0] === 'mode' && parts[1]) {
      const targetMode = parts[1].toLowerCase();
      if (targetMode === 'cost' || targetMode === 'time') {
        return {
          type: 'change-mode',
          mode: targetMode as CalculationType,
          historyEntries: [{
            type: 'info',
            content: `Mode switched to ${targetMode === 'cost' ? 'Delivery Cost' : 'Delivery Time Estimation'}`,
          }],
        };
      } else {
        return {
          type: 'unknown-mode',
          historyEntries: [{
            type: 'error',
            content: `Unknown mode "${parts[1]}". Available: cost, time`,
          }],
        };
      }
    }

    return {
      type: 'invalid-change',
      historyEntries: [{
        type: 'error',
        content: 'Invalid /change command. Try: /change use react | /change mode cost',
      }],
    };
  }

  if (lower === 'clear') {
    return {
      type: 'clear',
      historyEntries: [{ type: 'clear', content: cmd }],
    };
  }

  if (lower === '/restart') {
    return {
      type: 'restart',
      historyEntries: [{ type: 'welcome', content: 'restart' }],
    };
  }

  if (lower === 'exit') {
    return {
      type: 'exit',
      tabUpdates: {
        input: '', output: '', error: '',
        hasExecuted: false,
        executionTransitSnapshot: [],
        renamedPackages: [],
      },
    };
  }

  return null; 
}
