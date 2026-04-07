import type { Framework } from './types';

const FRAMEWORK_REGEX = /^\/(react|vue|svelte)(?:\/(.+?))?(?:\/)?$/;

/**
 * Extract the framework and terminal-tab ID from the current URL pathname.
 * Expected format: `/<framework>/<tabId>` (production) or `/<framework>/<tabId>` (dev after first mount).
 * Returns nulls when the URL doesn't match (e.g. bare `/` in dev).
 */
export function parseUrl(
  pathname: string = window.location.pathname,
): { framework: Framework | null; tabId: string | null } {
  const match = pathname.match(FRAMEWORK_REGEX);
  if (!match) return { framework: null, tabId: null };
  return {
    framework: match[1] as Framework,
    tabId: match[2] ? decodeURIComponent(match[2]) : null,
  };
}

/**
 * Build a URL path from a framework and optional tab ID.
 */
export function buildPath(framework: Framework, tabId?: string): string {
  if (tabId) return `/${framework}/${encodeURIComponent(tabId)}`;
  return `/${framework}/`;
}

/**
 * Update the browser URL via `history.replaceState` to reflect the active
 * terminal tab and its associated framework.
 *
 * Each terminal tab tracks its own framework independently. The URL always
 * shows the *active tab's* framework so that:
 * - tab1 (react) → `/react/tab1`
 * - tab2 (vue)   → `/vue/tab2`
 *
 * In production a page refresh after a tab switch will load the correct
 * framework build from the homelab Nginx server (`/<framework>/index.html`).
 */
export function updateUrl(framework: Framework, tabId: string): void {
  const path = buildPath(framework, tabId);
  try {
    if (window.location.pathname !== path) {
      window.history.replaceState(null, '', path);
    }
  } catch {
    // Silently degrade in restricted contexts (e.g. sandboxed iframes)
  }
}
