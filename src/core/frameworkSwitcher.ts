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

/**
 * Requests a real framework switch via the Vite dev server plugin.
 * In dev mode: POST to /__api/switch-framework → runs switch-framework.js
 * The server sends an HMR full-reload after success, so the page reloads automatically.
 */
export async function switchFramework(framework: Framework): Promise<SwitchResult> {
  try {
    const response = await fetch('/__api/switch-framework', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ framework }),
    });

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
