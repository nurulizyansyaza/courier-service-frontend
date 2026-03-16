const STORAGE_PREFIX = 'courier-cli-cmd-history-';
const MAX_COMMANDS = 50;

function getStorageKey(tabId: string): string {
  return `${STORAGE_PREFIX}${tabId}`;
}

export function loadCommandHistory(tabId: string): string[] {
  try {
    const raw = localStorage.getItem(getStorageKey(tabId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistHistory(tabId: string, commands: string[]): void {
  try {
    localStorage.setItem(getStorageKey(tabId), JSON.stringify(commands.slice(-MAX_COMMANDS)));
  } catch {
    // silently degrade
  }
}

export function saveCommand(tabId: string, command: string): string[] {
  const trimmed = command.trim();
  if (!trimmed) return loadCommandHistory(tabId);
  const history = loadCommandHistory(tabId);
  // Skip duplicate consecutive
  if (history.length > 0 && history[history.length - 1] === trimmed) return history;
  history.push(trimmed);
  const capped = history.slice(-MAX_COMMANDS);
  persistHistory(tabId, capped);
  return capped;
}

export function clearCommandHistory(tabId: string): void {
  try {
    localStorage.removeItem(getStorageKey(tabId));
  } catch {
    // ignore
  }
}

/**
 * Manages up/down arrow navigation through command history for a single terminal tab.
 * Each tab gets its own instance. The cursor starts past the end of history (current input).
 * ArrowUp moves backward, ArrowDown moves forward. The current draft is preserved.
 */
export class CommandHistoryNavigator {
  private commands: string[] = [];
  private cursor: number = 0;
  private draft: string = '';
  private tabId: string;

  constructor(tabId: string) {
    this.tabId = tabId;
    this.reload();
  }

  reload(): void {
    this.commands = loadCommandHistory(this.tabId);
    this.cursor = this.commands.length;
    this.draft = '';
  }

  /** Call when a command is executed to save and reset cursor */
  onExecute(command: string): void {
    this.commands = saveCommand(this.tabId, command);
    this.cursor = this.commands.length;
    this.draft = '';
  }

  /** Navigate up (older). Returns the text to display, or null if at the top. */
  navigateUp(currentInput: string): string | null {
    if (this.commands.length === 0) return null;
    // Save draft when first pressing up from the bottom
    if (this.cursor === this.commands.length) {
      this.draft = currentInput;
    }
    if (this.cursor <= 0) return null;
    this.cursor--;
    return this.commands[this.cursor];
  }

  /** Navigate down (newer). Returns the text to display, or null if at the bottom. */
  navigateDown(): string | null {
    if (this.cursor >= this.commands.length) return null;
    this.cursor++;
    if (this.cursor === this.commands.length) {
      return this.draft;
    }
    return this.commands[this.cursor];
  }

  /** Reset cursor position (e.g., on manual input change) */
  resetCursor(): void {
    this.cursor = this.commands.length;
    this.draft = '';
  }

  getCursor(): number { return this.cursor; }
  getHistoryLength(): number { return this.commands.length; }
}
