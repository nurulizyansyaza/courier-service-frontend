import { processCommand } from '@/core/terminalCommands';

describe('processCommand', () => {
  describe('/connect', () => {
    it('returns connect action when disconnected', () => {
      const result = processCommand('/connect', false);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('connect');
      if (result!.type === 'connect') {
        expect(result.clearHistory).toBe(true);
        expect(result.showWelcome).toBe(true);
        expect(result.historyEntries[0].content).toContain('Connected');
      }
    });

    it('returns already-connected when already connected', () => {
      const result = processCommand('/connect', true);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('already-connected');
      if (result!.type === 'already-connected') {
        expect(result.historyEntries[0].type).toBe('error');
        expect(result.historyEntries[0].content).toContain('Already connected');
      }
    });
  });

  describe('when disconnected', () => {
    it('returns not-connected for any command other than /connect', () => {
      const result = processCommand('clear', false);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('not-connected');
      if (result!.type === 'not-connected') {
        expect(result.historyEntries[0].type).toBe('error');
        expect(result.historyEntries[0].content).toContain('not connected');
      }
    });
  });

  describe('/change use <framework>', () => {
    it('returns switch-framework with react', () => {
      const result = processCommand('/change use react', true);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('switch-framework');
      if (result!.type === 'switch-framework') {
        expect(result.framework).toBe('react');
        expect(result.historyEntries[0].content).toContain('React');
        expect(result.historyEntries[0].content).toContain('Switching');
      }
    });

    it('returns switch-framework with vue', () => {
      const result = processCommand('/change use vue', true);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('switch-framework');
      if (result!.type === 'switch-framework') {
        expect(result.framework).toBe('vue');
      }
    });

    it('returns switch-framework with svelte', () => {
      const result = processCommand('/change use svelte', true);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('switch-framework');
      if (result!.type === 'switch-framework') {
        expect(result.framework).toBe('svelte');
      }
    });

    it('returns unknown-framework for angular', () => {
      const result = processCommand('/change use angular', true);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('unknown-framework');
      if (result!.type === 'unknown-framework') {
        expect(result.historyEntries[0].content).toContain('angular');
        expect(result.historyEntries[0].type).toBe('error');
      }
    });
  });

  describe('/change mode <mode>', () => {
    it('returns change-mode with cost', () => {
      const result = processCommand('/change mode cost', true);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('change-mode');
      if (result!.type === 'change-mode') {
        expect(result.mode).toBe('cost');
        expect(result.historyEntries[0].content).toContain('Delivery Cost');
      }
    });

    it('returns change-mode with time', () => {
      const result = processCommand('/change mode time', true);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('change-mode');
      if (result!.type === 'change-mode') {
        expect(result.mode).toBe('time');
        expect(result.historyEntries[0].content).toContain('Delivery Time');
      }
    });

    it('returns unknown-mode for invalid mode', () => {
      const result = processCommand('/change mode fast', true);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('unknown-mode');
      if (result!.type === 'unknown-mode') {
        expect(result.historyEntries[0].content).toContain('fast');
        expect(result.historyEntries[0].type).toBe('error');
      }
    });
  });

  describe('/change invalid', () => {
    it('returns invalid-change for unrecognized /change subcommand', () => {
      const result = processCommand('/change invalid', true);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('invalid-change');
      if (result!.type === 'invalid-change') {
        expect(result.historyEntries[0].type).toBe('error');
        expect(result.historyEntries[0].content).toContain('Invalid /change');
      }
    });

    it('returns invalid-change for /change without subcommand', () => {
      const result = processCommand('/change', true);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('invalid-change');
    });

    it('returns invalid-change for partial /change mode', () => {
      const result = processCommand('/change mod', true);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('invalid-change');
    });
  });

  describe('unknown slash commands', () => {
    it('returns unknown-command for unknown / commands', () => {
      const result = processCommand('/blah', true);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('unknown-command');
      if (result!.type === 'unknown-command') {
        expect(result.historyEntries[0].type).toBe('error');
        expect(result.historyEntries[0].content).toContain('/blah');
      }
    });

    it('suggests similar slash command for typos', () => {
      const result = processCommand('/connec', true);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('unknown-command');
      if (result!.type === 'unknown-command') {
        expect(result.historyEntries[0].content).toContain('Did you mean "/connect"');
      }
    });

    it('suggests /restart for /restar', () => {
      const result = processCommand('/restar', true);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('unknown-command');
      if (result!.type === 'unknown-command') {
        expect(result.historyEntries[0].content).toContain('Did you mean "/restart"');
      }
    });
  });

  describe('typo suggestions for text commands', () => {
    it('suggests "help" for "hlp"', () => {
      const result = processCommand('hlp', true);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('unknown-command');
      if (result!.type === 'unknown-command') {
        expect(result.historyEntries[0].content).toContain('Did you mean "help"');
      }
    });

    it('suggests "clear" for "clera"', () => {
      const result = processCommand('clera', true);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('unknown-command');
      if (result!.type === 'unknown-command') {
        expect(result.historyEntries[0].content).toContain('Did you mean "clear"');
      }
    });

    it('suggests "exit" for "exti"', () => {
      const result = processCommand('exti', true);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('unknown-command');
      if (result!.type === 'unknown-command') {
        expect(result.historyEntries[0].content).toContain('Did you mean "exit"');
      }
    });

    it('returns null for unrelated input', () => {
      expect(processCommand('100 3\nPKG1 5 5 OFR001', true)).toBeNull();
    });
  });

  describe('clear', () => {
    it('returns clear action', () => {
      const result = processCommand('clear', true);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('clear');
      if (result!.type === 'clear') {
        expect(result.historyEntries[0].type).toBe('clear');
      }
    });
  });

  describe('/restart', () => {
    it('returns restart action', () => {
      const result = processCommand('/restart', true);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('restart');
      if (result!.type === 'restart') {
        expect(result.historyEntries[0].type).toBe('welcome');
      }
    });
  });

  describe('help', () => {
    it('returns help action with help history entry', () => {
      const result = processCommand('help', true);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('help');
      if (result!.type === 'help') {
        expect(result.historyEntries[0].type).toBe('help');
      }
    });
  });

  describe('exit', () => {
    it('returns exit action with tab reset', () => {
      const result = processCommand('exit', true);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('exit');
      if (result!.type === 'exit') {
        expect(result.tabUpdates).toEqual({
          input: '', output: '', error: '',
          hasExecuted: false,
          executionTransitSnapshot: [],
          renamedPackages: [],
        });
      }
    });
  });

  describe('regular input (not a command)', () => {
    it('returns null for calculation input', () => {
      const result = processCommand('100 3\nPKG1 5 5 OFR001', true);
      expect(result).toBeNull();
    });
  });

  describe('case insensitivity', () => {
    it('handles CLEAR in uppercase', () => {
      const result = processCommand('CLEAR', true);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('clear');
    });

    it('handles Clear in mixed case', () => {
      const result = processCommand('Clear', true);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('clear');
    });

    it('handles /CONNECT in uppercase', () => {
      const result = processCommand('/CONNECT', false);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('connect');
    });
  });
});
