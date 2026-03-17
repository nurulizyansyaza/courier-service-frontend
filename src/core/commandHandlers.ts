import type { HistoryEntry, Framework, CalculationType } from './types';
import type { CommandAction } from './terminalCommands';

const VALID_FRAMEWORKS: readonly string[] = ['react', 'vue', 'svelte'];
const VALID_MODES: readonly string[] = ['cost', 'time'];

const MODE_LABELS: Record<string, string> = {
  cost: 'Delivery Cost',
  time: 'Delivery Time Estimation',
};

export function handleConnect(isConnected: boolean): CommandAction {
  if (!isConnected) {
    return {
      type: 'connect',
      historyEntries: [{ type: 'info', content: 'Connected to Courier CLI' }],
      clearHistory: true,
      showWelcome: true,
    };
  }
  return {
    type: 'already-connected',
    historyEntries: [{ type: 'error', content: 'Already connected' }],
  };
}

export function handleNotConnected(): CommandAction {
  return {
    type: 'not-connected',
    historyEntries: [{ type: 'error', content: '✗ CLI not connected. Type /connect to reconnect.' }],
  };
}

export function handleChangeUse(target: string): CommandAction {
  const fw = target.toLowerCase();
  if (VALID_FRAMEWORKS.includes(fw)) {
    return {
      type: 'switch-framework',
      framework: fw as Framework,
      historyEntries: [{
        type: 'info',
        content: `Switching to ${fw.charAt(0).toUpperCase() + fw.slice(1)}.js...`,
      }],
    };
  }
  return {
    type: 'unknown-framework',
    historyEntries: [{
      type: 'error',
      content: `Unknown framework "${target}". Available: react, vue, svelte`,
    }],
  };
}

export function handleChangeMode(target: string): CommandAction {
  const mode = target.toLowerCase();
  if (VALID_MODES.includes(mode)) {
    return {
      type: 'change-mode',
      mode: mode as CalculationType,
      historyEntries: [{
        type: 'info',
        content: `Mode switched to ${MODE_LABELS[mode]}`,
      }],
    };
  }
  return {
    type: 'unknown-mode',
    historyEntries: [{
      type: 'error',
      content: `Unknown mode "${target}". Available: cost, time`,
    }],
  };
}

export function handleInvalidChange(): CommandAction {
  return {
    type: 'invalid-change',
    historyEntries: [{
      type: 'error',
      content: 'Invalid /change command. Try: /change use react | /change mode cost',
    }],
  };
}

export function handleUnknownCommand(cmd: string, suggestion?: string | null): CommandAction {
  const hint = suggestion
    ? `Did you mean "${suggestion}"?`
    : 'Type "help" for available commands';
  return {
    type: 'unknown-command',
    historyEntries: [{
      type: 'error',
      content: `Unknown command "${cmd}". ${hint}`,
    }],
  };
}

export function handleClear(cmd: string): CommandAction {
  return { type: 'clear', historyEntries: [{ type: 'clear', content: cmd }] };
}

export function handleRestart(): CommandAction {
  return { type: 'restart', historyEntries: [{ type: 'welcome', content: 'restart' }] };
}

export function handleHelp(): CommandAction {
  return { type: 'help', historyEntries: [{ type: 'help', content: 'help' }] };
}

export function handleExit(): CommandAction {
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
