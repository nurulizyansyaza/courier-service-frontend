import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeFrameworkSwitch } from '../core/frameworkSwitchOrchestrator';

// Mock dependencies
vi.mock('../core/frameworkSwitcher', () => ({
  switchFramework: vi.fn(),
}));
vi.mock('../core/tabStateManager', () => ({
  setTabState: vi.fn(),
  getTabState: vi.fn(() => ({ framework: 'react', currentInput: '', isConnected: true, showWelcome: false, history: [] })),
}));
vi.mock('../core/sessionPersistence', () => ({
  patchTabUIState: vi.fn(),
}));

import { switchFramework } from '../core/frameworkSwitcher';
import { setTabState, getTabState } from '../core/tabStateManager';
import { patchTabUIState } from '../core/sessionPersistence';

describe('frameworkSwitchOrchestrator', () => {
  let callbacks: { setFramework: ReturnType<typeof vi.fn>; addToHistory: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    callbacks = {
      setFramework: vi.fn(),
      addToHistory: vi.fn(),
    };
  });

  describe('when switch succeeds', () => {
    it('should set framework and persist state', async () => {
      vi.mocked(switchFramework).mockResolvedValue({ success: true, message: '' });

      await executeFrameworkSwitch('tab-1', 'vue', 'react', callbacks);

      expect(callbacks.setFramework).toHaveBeenCalledWith('vue');
      expect(setTabState).toHaveBeenCalledWith('tab-1', { framework: 'vue' });
      expect(patchTabUIState).toHaveBeenCalledWith('tab-1', expect.any(Object));
      expect(switchFramework).toHaveBeenCalledWith('vue', 'tab-1');
    });

    it('should not rollback on success', async () => {
      vi.mocked(switchFramework).mockResolvedValue({ success: true, message: '' });

      await executeFrameworkSwitch('tab-1', 'vue', 'react', callbacks);

      // setFramework called once (no rollback)
      expect(callbacks.setFramework).toHaveBeenCalledTimes(1);
      expect(callbacks.addToHistory).not.toHaveBeenCalled();
    });
  });

  describe('when switch fails', () => {
    it('should rollback to previous framework', async () => {
      vi.mocked(switchFramework).mockResolvedValue({ success: false, message: 'Server error' });

      await executeFrameworkSwitch('tab-1', 'vue', 'react', callbacks);

      // First call: set to target; second call: rollback
      expect(callbacks.setFramework).toHaveBeenCalledTimes(2);
      expect(callbacks.setFramework).toHaveBeenLastCalledWith('react');
    });

    it('should persist rollback state', async () => {
      vi.mocked(switchFramework).mockResolvedValue({ success: false, message: 'Error' });

      await executeFrameworkSwitch('tab-1', 'svelte', 'react', callbacks);

      // Last calls should be the rollback
      expect(setTabState).toHaveBeenLastCalledWith('tab-1', { framework: 'react' });
      expect(patchTabUIState).toHaveBeenCalledTimes(2);
    });

    it('should add error to history', async () => {
      vi.mocked(switchFramework).mockResolvedValue({ success: false, message: 'Network down' });

      await executeFrameworkSwitch('tab-1', 'vue', 'react', callbacks);

      expect(callbacks.addToHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          content: expect.stringContaining('Network down'),
        }),
      );
    });
  });
});
