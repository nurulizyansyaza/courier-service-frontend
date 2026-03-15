import type { Framework } from './types';

export interface SwitchResult {
  success: boolean;
  message: string;
}

/**
 * Returns the production URL path for a given framework.
 * Used for S3/CloudFront deployment where each framework is a separate build.
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
 * Production: Framework switching is an admin operation done via CLI
 *   (scripts/switch-framework.sh). The frontend cannot change the
 *   CloudFront origin path directly.
 */
export async function switchFramework(framework: Framework): Promise<SwitchResult> {
  if (!isDevMode()) {
    return {
      success: false,
      message:
        `Framework switching is only available in local dev mode. ` +
        `For deployed environments, run: ./scripts/switch-framework.sh ${framework}`,
    };
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
