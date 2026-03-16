import { parseUrl, buildPath, updateUrl } from '@/core/urlHelpers';

describe('urlHelpers', () => {
  describe('parseUrl', () => {
    it('parses /<framework>/<tabId> correctly', () => {
      expect(parseUrl('/react/tab-1')).toEqual({ framework: 'react', tabId: 'tab-1' });
      expect(parseUrl('/vue/123')).toEqual({ framework: 'vue', tabId: '123' });
      expect(parseUrl('/svelte/my-tab')).toEqual({ framework: 'svelte', tabId: 'my-tab' });
    });

    it('parses /<framework>/ with no tabId', () => {
      expect(parseUrl('/react/')).toEqual({ framework: 'react', tabId: null });
      expect(parseUrl('/vue/')).toEqual({ framework: 'vue', tabId: null });
    });

    it('parses /<framework> (no trailing slash)', () => {
      expect(parseUrl('/react')).toEqual({ framework: 'react', tabId: null });
    });

    it('returns nulls for unrecognised paths', () => {
      expect(parseUrl('/')).toEqual({ framework: null, tabId: null });
      expect(parseUrl('/unknown/tab-1')).toEqual({ framework: null, tabId: null });
      expect(parseUrl('')).toEqual({ framework: null, tabId: null });
    });

    it('decodes URI-encoded tabId', () => {
      expect(parseUrl('/react/tab%201')).toEqual({ framework: 'react', tabId: 'tab 1' });
    });

    it('handles trailing slash on tabId path', () => {
      expect(parseUrl('/vue/123/')).toEqual({ framework: 'vue', tabId: '123' });
    });
  });

  describe('buildPath', () => {
    it('builds path with framework only', () => {
      expect(buildPath('react')).toBe('/react/');
      expect(buildPath('vue')).toBe('/vue/');
      expect(buildPath('svelte')).toBe('/svelte/');
    });

    it('builds path with framework and tabId', () => {
      expect(buildPath('react', 'tab-1')).toBe('/react/tab-1');
      expect(buildPath('vue', '1710547200000')).toBe('/vue/1710547200000');
    });

    it('encodes special characters in tabId', () => {
      expect(buildPath('react', 'tab 1')).toBe('/react/tab%201');
    });
  });

  describe('updateUrl', () => {
    let replaceStateSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      replaceStateSpy = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
    });

    afterEach(() => {
      replaceStateSpy.mockRestore();
    });

    it('calls replaceState with correct path', () => {
      // __FRAMEWORK__ defaults to 'react' in test env
      updateUrl('tab-42');
      expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '/react/tab-42');
    });

    it('does not call replaceState when pathname already matches', () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/react/tab-42' },
        writable: true,
        configurable: true,
      });
      updateUrl('tab-42');
      expect(replaceStateSpy).not.toHaveBeenCalled();
      // Reset
      Object.defineProperty(window, 'location', {
        value: { pathname: '/' },
        writable: true,
        configurable: true,
      });
    });

    it('silently handles replaceState errors', () => {
      replaceStateSpy.mockImplementation(() => { throw new Error('blocked'); });
      expect(() => updateUrl('tab-1')).not.toThrow();
    });
  });
});
