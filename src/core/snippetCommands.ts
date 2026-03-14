import type { Framework } from './types';
import { FRAMEWORK_CONFIG } from './constants';

// Re-export for test convenience
export { FRAMEWORK_CONFIG } from './constants';
export { ORIGINAL_EDITABLE } from './codeSnippets';

export interface SnippetCommandContext {
  framework: Framework;
  isModified: boolean;
  editedUI: Record<Framework, string>;
}

export type SnippetCommandResult =
  | { type: 'output'; output: string; isError: boolean }
  | { type: 'clear' }
  | { type: 'reset'; framework: Framework; output: string }
  | { type: 'switch'; framework: Framework; output: string }
  | { type: 'confirm-switch'; framework: Framework; output: string };

const HELP_TEXT = `Available commands:
  use react     - Switch to React.js
  use vue       - Switch to Vue.js
  use svelte    - Switch to Svelte
  current       - Show current framework
  reset         - Reset UI layer to original
  clear         - Clear command history
  help          - Show this help`;

export function processSnippetCommand(
  input: string,
  ctx: SnippetCommandContext,
): SnippetCommandResult | null {
  const trimmed = input.trim().toLowerCase();
  const parts = trimmed.split(/\s+/);

  if (trimmed === 'help') {
    return { type: 'output', output: HELP_TEXT, isError: false };
  }

  if (trimmed === 'clear') {
    return { type: 'clear' };
  }

  if (trimmed === 'current') {
    const label = FRAMEWORK_CONFIG[ctx.framework].label;
    const suffix = ctx.isModified ? ' (modified)' : '';
    return { type: 'output', output: `Current framework: ${label}${suffix}`, isError: false };
  }

  if (trimmed === 'reset') {
    const label = FRAMEWORK_CONFIG[ctx.framework].label;
    return { type: 'reset', framework: ctx.framework, output: `UI layer for ${label} reset to original` };
  }

  if (parts[0] === 'use' && parts.length === 2) {
    const target = parts[1] as Framework;
    if (target === 'react' || target === 'vue' || target === 'svelte') {
      if (target === ctx.framework) {
        return { type: 'output', output: `Already using ${FRAMEWORK_CONFIG[target].label}`, isError: false };
      }
      if (ctx.isModified) {
        return {
          type: 'confirm-switch',
          framework: target,
          output: `You have custom edits on ${FRAMEWORK_CONFIG[ctx.framework].label}. Confirm switch above.`,
        };
      }
      return { type: 'switch', framework: target, output: `Switched to ${FRAMEWORK_CONFIG[target].label}` };
    }
    return { type: 'output', output: `Unknown framework "${parts[1]}". Available: react | vue | svelte`, isError: true };
  }

  return { type: 'output', output: `Unknown command "${trimmed}". Type 'help' for available commands.`, isError: true };
}
