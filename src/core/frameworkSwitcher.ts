import type { Framework } from './types';

export interface SwitchResult {
  success: boolean;
  message: string;
}

/**
 * Returns the production URL path for a given framework.
 * Each framework build is hosted at /<framework>/ on CloudFront.
 */
export function getProductionUrl(framework: Framework): string {
  return `/${framework}/`;
}

function isDevMode(): boolean {
  return import.meta.env?.DEV === true;
}

/**
 * Switches the active frontend framework.
 *
 * Dev mode:  POST to /__api/switch-framework (Vite dev server plugin).
 * Production: Navigates to /<framework>/ — all three frameworks are
 *   served simultaneously from S3 via CloudFront.
 */
export async function switchFramework(framework: Framework): Promise<SwitchResult> {
  if (!isDevMode()) {
    const targetUrl = getProductionUrl(framework);
    window.location.href = targetUrl;
    return { success: true, message: `Switching to ${framework}...` };
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
