import { switchFramework, getProductionUrl } from '@/core/frameworkSwitcher';
import type { Framework } from '@/core/types';

function mockResponse(body: object, ok = true) {
  return {
    ok,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(body),
  };
}

describe('frameworkSwitcher', () => {
  describe('getProductionUrl', () => {
    it('returns path for react', () => {
      expect(getProductionUrl('react')).toBe('/react/');
    });

    it('returns path for vue', () => {
      expect(getProductionUrl('vue')).toBe('/vue/');
    });

    it('returns path for svelte', () => {
      expect(getProductionUrl('svelte')).toBe('/svelte/');
    });
  });

  describe('switchFramework (dev mode)', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    it('makes POST request to /__api/switch-framework', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        mockResponse({ success: true, message: 'Switched to vue' }),
      );
      globalThis.fetch = fetchMock;

      await switchFramework('vue');

      expect(fetchMock).toHaveBeenCalledWith('/__api/switch-framework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ framework: 'vue' }),
      });
    });

    it('returns success result on 200 response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockResponse({ success: true, message: 'Switched to vue' }),
      );

      const result = await switchFramework('vue');
      expect(result.success).toBe(true);
      expect(result.message).toContain('vue');
    });

    it('returns error result on non-200 response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockResponse({ success: false, message: 'Switch failed' }, false),
      );

      const result = await switchFramework('vue');
      expect(result.success).toBe(false);
      expect(result.message).toBeTruthy();
    });

    it('returns error result on network failure', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await switchFramework('vue');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Network error');
    });

    it('returns error when server returns success: false', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockResponse({ success: false, message: 'Already using vue' }),
      );

      const result = await switchFramework('vue');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Already using vue');
    });

    it('returns error when response is HTML (non-JSON)', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'text/html' }),
        json: () => { throw new SyntaxError('Unexpected token <'); },
      });

      const result = await switchFramework('vue');
      expect(result.success).toBe(false);
      expect(result.message).toContain('not available');
    });

    it('works for all valid frameworks', async () => {
      const frameworks: Framework[] = ['react', 'vue', 'svelte'];

      for (const fw of frameworks) {
        globalThis.fetch = vi.fn().mockResolvedValue(
          mockResponse({ success: true, message: `Switched to ${fw}` }),
        );

        const result = await switchFramework(fw);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('switchFramework (production mode)', () => {
    const origDEV = import.meta.env.DEV;

    beforeEach(() => {
      import.meta.env.DEV = false;
    });

    afterEach(() => {
      import.meta.env.DEV = origDEV;
    });

    it('returns informative error instead of calling fetch', async () => {
      const fetchMock = vi.fn();
      globalThis.fetch = fetchMock;

      const result = await switchFramework('vue');

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.message).toContain('npm run use:');
    });
  });
});
