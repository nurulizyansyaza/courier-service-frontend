import { describe, it, expect } from 'vitest';
import {
  handleConnect,
  handleNotConnected,
  handleChangeUse,
  handleChangeMode,
  handleInvalidChange,
  handleClear,
  handleRestart,
  handleExit,
} from '../core/commandHandlers';

describe('commandHandlers', () => {
  describe('when handling /connect', () => {
    it('should return connect action when not connected', () => {
      const result = handleConnect(false);
      expect(result.type).toBe('connect');
      expect(result).toHaveProperty('clearHistory', true);
      expect(result).toHaveProperty('showWelcome', true);
    });

    it('should return already-connected when connected', () => {
      const result = handleConnect(true);
      expect(result.type).toBe('already-connected');
    });
  });

  describe('when user is not connected', () => {
    it('should return not-connected with reconnect hint', () => {
      const result = handleNotConnected();
      expect(result.type).toBe('not-connected');
      expect(result.historyEntries[0].content).toContain('/connect');
    });
  });

  describe('when changing framework', () => {
    it('should accept valid frameworks', () => {
      for (const fw of ['react', 'vue', 'svelte']) {
        const result = handleChangeUse(fw);
        expect(result.type).toBe('switch-framework');
      }
    });

    it('should be case-insensitive', () => {
      const result = handleChangeUse('React');
      expect(result.type).toBe('switch-framework');
    });

    it('should reject unknown frameworks', () => {
      const result = handleChangeUse('angular');
      expect(result.type).toBe('unknown-framework');
      expect(result.historyEntries[0].content).toContain('angular');
    });

    it('should include capitalized name in switch message', () => {
      const result = handleChangeUse('vue');
      expect(result.historyEntries[0].content).toContain('Vue.js');
    });
  });

  describe('when changing mode', () => {
    it('should accept cost mode', () => {
      const result = handleChangeMode('cost');
      expect(result.type).toBe('change-mode');
      expect(result.historyEntries[0].content).toContain('Delivery Cost');
    });

    it('should accept time mode', () => {
      const result = handleChangeMode('time');
      expect(result.type).toBe('change-mode');
      expect(result.historyEntries[0].content).toContain('Delivery Time');
    });

    it('should reject unknown modes', () => {
      const result = handleChangeMode('fast');
      expect(result.type).toBe('unknown-mode');
    });
  });

  describe('when handling invalid /change', () => {
    it('should return usage hint', () => {
      const result = handleInvalidChange();
      expect(result.type).toBe('invalid-change');
      expect(result.historyEntries[0].content).toContain('/change use');
    });
  });

  describe('when handling clear', () => {
    it('should return clear action with original command', () => {
      const result = handleClear('CLEAR');
      expect(result.type).toBe('clear');
      expect(result.historyEntries[0].content).toBe('CLEAR');
    });
  });

  describe('when handling /restart', () => {
    it('should return restart with welcome entry', () => {
      const result = handleRestart();
      expect(result.type).toBe('restart');
      expect(result.historyEntries[0].type).toBe('welcome');
    });
  });

  describe('when handling exit', () => {
    it('should return exit with reset tab updates', () => {
      const result = handleExit();
      expect(result.type).toBe('exit');
      expect(result).toHaveProperty('tabUpdates');
      const updates = (result as { tabUpdates: Record<string, unknown> }).tabUpdates;
      expect(updates.input).toBe('');
      expect(updates.output).toBe('');
      expect(updates.hasExecuted).toBe(false);
    });
  });
});
