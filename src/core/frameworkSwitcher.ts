import type { Framework } from './types';
import { buildPath } from './urlHelpers';

export interface SwitchResult {
  success: boolean;
  message: string;
}

/**
 * Returns the production URL path for a given framework and optional tab ID.
 * Format: `/<framework>/<tabId>` — each framework build is hosted at
 * `/<framework>/` on CloudFront.
 */
export function getProductionUrl(framework: Framework, tabId?: string): string {
  return buildPath(framework, tabId);
}

function isDevMode(): boolean {
  return import.meta.env?.DEV === true;
}

/**
 * Switches the active frontend framework.
 *
 * Dev mode:  Updates URL via replaceState, then POST to
 *            `/__api/switch-framework` (Vite dev server plugin).
 * Production: Navigates to `/<framework>/<tabId>` — all three frameworks
 *             are served simultaneously from S3 via CloudFront.
 *
 * @param tabId  The active terminal tab ID, embedded in the URL so the
 *               correct tab is restored after the page reloads.
 */
export async function switchFramework(framework: Framework, tabId?: string): Promise<SwitchResult> {
  if (!isDevMode()) {
    const targetUrl = getProductionUrl(framework, tabId);
    window.location.href = targetUrl;
    return { success: true, message: `Switching to ${framework}...` };
  }

  // Dev: set URL before the server restart so the reload lands on the
  // correct /<framework>/<tabId> path.
  try {
    const path = buildPath(framework, tabId);
    window.history.replaceState(null, '', path);
  } catch {
    // best-effort
  }

  try {
    const response = await fetch('/__api/switch-framework', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ framework }),
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { success: false, message: 'Dev server not available for framework switching' };
    }

    const data = await response.json();

    if (!response.ok || !data.success) {
      return { success: false, message: data.message || 'Framework switch failed' };
    }

    return { success: true, message: data.message };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, message: msg };
  }
}
