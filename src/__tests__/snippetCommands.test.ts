import { processSnippetCommand } from '@/core/snippetCommands';
import type { Framework } from '@/core/types';
import { FRAMEWORK_CONFIG, ORIGINAL_EDITABLE } from '@/core/snippetCommands';

describe('processSnippetCommand', () => {
  const defaultCtx = {
    framework: 'react' as Framework,
    isModified: false,
    editedUI: { react: '', vue: '', svelte: '' },
  };

  describe('help command', () => {
    it('returns help text listing all commands', () => {
      const result = processSnippetCommand('help', defaultCtx);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('output');
      if (result!.type === 'output') {
        expect(result.output).toContain('use react');
        expect(result.output).toContain('current');
        expect(result.output).toContain('reset');
        expect(result.output).toContain('clear');
        expect(result.output).toContain('help');
        expect(result.isError).toBe(false);
      }
    });
  });

  describe('clear command', () => {
    it('returns clear action', () => {
      const result = processSnippetCommand('clear', defaultCtx);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('clear');
    });
  });

  describe('current command', () => {
    it('shows current framework label', () => {
      const result = processSnippetCommand('current', defaultCtx);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('output');
      if (result!.type === 'output') {
        expect(result.output).toContain('React.js');
        expect(result.isError).toBe(false);
      }
    });

    it('shows modified status when modified', () => {
      const result = processSnippetCommand('current', { ...defaultCtx, isModified: true });
      expect(result!.type).toBe('output');
      if (result!.type === 'output') {
        expect(result.output).toContain('(modified)');
      }
    });

    it('does not show modified when not modified', () => {
      const result = processSnippetCommand('current', defaultCtx);
      if (result!.type === 'output') {
        expect(result.output).not.toContain('(modified)');
      }
    });
  });

  describe('reset command', () => {
    it('returns reset action with framework label', () => {
      const result = processSnippetCommand('reset', defaultCtx);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('reset');
      if (result!.type === 'reset') {
        expect(result.framework).toBe('react');
        expect(result.output).toContain('React.js');
        expect(result.output).toContain('reset');
      }
    });
  });

  describe('use <framework> command', () => {
    it('switches to vue', () => {
      const result = processSnippetCommand('use vue', defaultCtx);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('switch');
      if (result!.type === 'switch') {
        expect(result.framework).toBe('vue');
        expect(result.output).toContain('Vue.js');
      }
    });

    it('switches to svelte', () => {
      const result = processSnippetCommand('use svelte', defaultCtx);
      expect(result!.type).toBe('switch');
      if (result!.type === 'switch') {
        expect(result.framework).toBe('svelte');
      }
    });

    it('returns already-using when same framework', () => {
      const result = processSnippetCommand('use react', defaultCtx);
      expect(result!.type).toBe('output');
      if (result!.type === 'output') {
        expect(result.output).toContain('Already using');
        expect(result.isError).toBe(false);
      }
    });

    it('returns confirm action when edits exist', () => {
      const result = processSnippetCommand('use vue', { ...defaultCtx, isModified: true });
      expect(result!.type).toBe('confirm-switch');
      if (result!.type === 'confirm-switch') {
        expect(result.framework).toBe('vue');
        expect(result.output).toContain('custom edits');
      }
    });

    it('returns error for unknown framework', () => {
      const result = processSnippetCommand('use angular', defaultCtx);
      expect(result!.type).toBe('output');
      if (result!.type === 'output') {
        expect(result.output).toContain('Unknown framework');
        expect(result.isError).toBe(true);
      }
    });
  });

  describe('unknown command', () => {
    it('returns error for unrecognized input', () => {
      const result = processSnippetCommand('foobar', defaultCtx);
      expect(result!.type).toBe('output');
      if (result!.type === 'output') {
        expect(result.output).toContain('Unknown command');
        expect(result.isError).toBe(true);
      }
    });
  });

  describe('case insensitivity', () => {
    it('handles HELP in uppercase', () => {
      const result = processSnippetCommand('HELP', defaultCtx);
      expect(result!.type).toBe('output');
    });

    it('handles Use Vue in mixed case', () => {
      const result = processSnippetCommand('Use Vue', defaultCtx);
      expect(result!.type).toBe('switch');
    });
  });
});
