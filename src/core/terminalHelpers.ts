import type { ParsedResult } from './types';

/** Sort delivery results for display — undeliverable last, then by round/weight */
export function sortDeliveryResults(
  results: ParsedResult[],
  calculationType?: 'cost' | 'time',
): ParsedResult[] {
  return [...results].sort((a, b) => {
    if (calculationType !== 'time') return 0;
    if (a.undeliverable && !b.undeliverable) return 1;
    if (!a.undeliverable && b.undeliverable) return -1;
    const roundA = a.deliveryRound ?? Infinity;
    const roundB = b.deliveryRound ?? Infinity;
    if (roundA !== roundB) return roundA - roundB;
    return (b.weight ?? 0) - (a.weight ?? 0);
  });
}

/** Get discount percentage string for a parsed result */
export function getDiscountPercent(result: ParsedResult): string {
  const discount = parseFloat(result.discount);
  if (!Number.isFinite(discount) || discount <= 0 || result.deliveryCost <= 0) return '0';
  return ((discount / result.deliveryCost) * 100).toFixed(0);
}

/** Check if a scroll container is near the bottom (within threshold) */
export function isScrolledToBottom(el: HTMLElement, threshold = 50): boolean {
  const { scrollTop, scrollHeight, clientHeight } = el;
  return scrollHeight - scrollTop - clientHeight < threshold;
}

/** Auto-resize a textarea to fit content, capped at maxHeight */
export function resizeTextarea(textarea: HTMLTextAreaElement, maxHeight = 160): void {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
}

/**
 * Check whether a multi-line input still needs more lines before it can be executed.
 * Parses the header line to determine expected package count, then compares
 * against actual non-empty lines. Returns true if Enter should add a newline
 * instead of executing.
 */
export function inputNeedsMoreLines(input: string, calculationType: 'cost' | 'time'): boolean {
  const lines = input.split('\n').filter(l => l.trim());
  if (lines.length < 1) return false;
  const headerParts = lines[0].trim().split(/\s+/);
  if (headerParts.length < 2) return false;
  const pkgCount = parseInt(headerParts[1], 10);
  if (isNaN(pkgCount) || pkgCount < 1) return false;
  const expected = pkgCount + 1 + (calculationType === 'time' ? 1 : 0);
  return lines.length < expected;
}

/** True when the textarea cursor sits on the very first line */
export function isCursorOnFirstLine(textarea: HTMLTextAreaElement): boolean {
  return textarea.value.lastIndexOf('\n', textarea.selectionStart - 1) === -1;
}

/** True when the textarea cursor sits on the very last line */
export function isCursorOnLastLine(textarea: HTMLTextAreaElement): boolean {
  return textarea.value.indexOf('\n', textarea.selectionStart) === -1;
}

/**
 * Move a prompt element (❯) to the same line as the textarea cursor.
 * Uses transform so the prompt visually tracks the active line.
 */
export function updatePromptPosition(
  textarea: HTMLTextAreaElement | null,
  prompt: HTMLElement | null,
): void {
  if (!textarea || !prompt) return;
  const before = textarea.value.substring(0, textarea.selectionStart);
  const line = (before.match(/\n/g) || []).length;
  const lh = parseFloat(getComputedStyle(textarea).lineHeight) || 17.5;
  prompt.style.transform = `translateY(${line * lh}px)`;
}
