import type { Framework } from '../types';
import { tokenize } from './tokenizer';

export const TOKEN_COLORS: Record<string, string> = {
  '': '#d4d4d8',
  'text-zinc-600': '#52525b',
  'text-zinc-500': '#71717a',
  'text-zinc-300': '#d4d4d8',
  'text-pink-400': '#f472b6',
  'text-emerald-400': '#34d399',
  'text-amber-400': '#fbbf24',
  'text-purple-400': '#c084fc',
  'text-cyan-400': '#22d3ee',
  'text-cyan-300': '#67e8f9',
  'text-violet-400': '#a78bfa',
};

export const CANVAS_LINE_HEIGHT = 21;
export const CANVAS_LINE_NUM_WIDTH = 50;
export const CANVAS_CODE_PAD = 8;
export const CANVAS_FONT = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

export function drawLockedCode(
  canvas: HTMLCanvasElement,
  lines: string[],
  framework: Framework,
) {
  const container = canvas.parentElement;
  if (!container) return;

  const dpr = window.devicePixelRatio || 1;
  const width = container.clientWidth;
  const height = lines.length * CANVAS_LINE_HEIGHT;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.scale(dpr, dpr);
  ctx.fillStyle = '#0d0118';
  ctx.fillRect(0, 0, width, height);

  lines.forEach((line, i) => {
    const y = i * CANVAS_LINE_HEIGHT + CANVAS_LINE_HEIGHT * 0.6;

    ctx.font = `10px ${CANVAS_FONT}`;
    ctx.fillStyle = '#ef444466';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), CANVAS_LINE_NUM_WIDTH - 6, y);

    ctx.fillStyle = '#ef444433';
    ctx.fillRect(CANVAS_LINE_NUM_WIDTH, i * CANVAS_LINE_HEIGHT, 2, CANVAS_LINE_HEIGHT);

    ctx.font = `12px ${CANVAS_FONT}`;
    ctx.textAlign = 'left';
    const tks = tokenize(line, framework);
    let x = CANVAS_LINE_NUM_WIDTH + 2 + CANVAS_CODE_PAD;
    for (const tk of tks) {
      ctx.fillStyle = TOKEN_COLORS[tk.className] || '#d4d4d8';
      ctx.fillText(tk.text, x, y);
      x += ctx.measureText(tk.text).width;
    }
  });
}
