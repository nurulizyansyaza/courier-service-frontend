import type { Framework } from './types';

// ── CODE_SNIPPETS ────────────────────────────────────────────────────

export const CODE_SNIPPETS: Record<Framework, string> = {
  react: `// ═══════════════════════════════════════════════════════════
// CORE LOGIC — identical across all frameworks
// Framework, UI, colors change. This never does.
// ═══════════════════════════════════════════════════════════

// Package delivery cost calculation engine
interface Package {
  id: string;
  weight: number;   // kg
  distance: number; // km
  offerCode?: string;
}

interface DeliveryResult {
  id: string;
  discount: number;
  totalCost: number;
  estimatedTime?: number;
}

const BASE_COST = 100;

function calculateCost(pkg: Package): DeliveryResult {
  const weightCost = pkg.weight * 10;
  const distanceCost = pkg.distance * 5;
  const subtotal = BASE_COST + weightCost + distanceCost;

  let discountPercent = 0;
  if (pkg.offerCode === 'OFR001' && pkg.distance < 200 && pkg.weight >= 70) {
    discountPercent = 10;
  } else if (pkg.offerCode === 'OFR002' && pkg.distance >= 100 && pkg.weight >= 100) {
    discountPercent = 7;
  } else if (pkg.offerCode === 'OFR003' && pkg.distance >= 50 && pkg.weight >= 10) {
    discountPercent = 5;
  }

  const discount = (subtotal * discountPercent) / 100;
  return {
    id: pkg.id,
    discount: Math.round(discount * 100) / 100,
    totalCost: Math.round((subtotal - discount) * 100) / 100,
  };
}

function estimateTime(distance: number, speed: number = 70): number {
  return Math.floor((distance / speed) * 100) / 100;
}

// ═══════════════════════════════════════════════════════════
// UI LAYER — React implementation
// Same data, same logic. Different style, different vibe.
// ═══════════════════════════════════════════════════════════

import React, { useState, useMemo, useCallback } from 'react';

function DeliveryCostCalculator() {
  const [packages, setPackages] = useState<Package[]>([
    { id: 'PKG1', weight: 75, distance: 100, offerCode: 'OFR001' },
    { id: 'PKG2', weight: 150, distance: 150, offerCode: 'OFR002' },
    { id: 'PKG3', weight: 15, distance: 60, offerCode: 'OFR003' },
  ]);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const results = useMemo(
    () => packages.map(pkg => ({
      ...calculateCost(pkg),
      time: estimateTime(pkg.distance),
    })),
    [packages]
  );

  const handleToggle = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  return (
    <div className="bg-gradient-to-br from-pink-950/30 to-purple-950/30 rounded-xl p-4 border border-pink-500/20">
      <h2 className="text-pink-300 text-lg font-semibold mb-3">
        📦 Delivery Cost Calculator
      </h2>
      <div className="space-y-2">
        {results.map(result => (
          <div key={result.id} className="bg-pink-900/20 rounded-lg border border-pink-500/10">
            <button
              onClick={() => handleToggle(result.id)}
              className="w-full px-3 py-2 flex justify-between items-center text-sm"
            >
              <span className="text-pink-200 font-mono">{result.id}</span>
              <span className="text-pink-400 font-bold">\${result.totalCost}</span>
            </button>
            {expandedId === result.id && (
              <div className="px-3 pb-2 text-xs text-pink-300/70 space-y-1 border-t border-pink-500/10 pt-2">
                <p>Discount: \${result.discount}</p>
                <p>Est. time: {result.time}h</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}`,

  vue: [
    '// ═══════════════════════════════════════════════════════════',
    '// CORE LOGIC — identical across all frameworks',
    '// Framework, UI, colors change. This never does.',
    '// ═══════════════════════════════════════════════════════════',
    '',
    '// Package delivery cost calculation engine',
    'interface Package {',
    '  id: string;',
    '  weight: number;   // kg',
    '  distance: number; // km',
    '  offerCode?: string;',
    '}',
    '',
    'interface DeliveryResult {',
    '  id: string;',
    '  discount: number;',
    '  totalCost: number;',
    '  estimatedTime?: number;',
    '}',
    '',
    'const BASE_COST = 100;',
    '',
    'function calculateCost(pkg: Package): DeliveryResult {',
    '  const weightCost = pkg.weight * 10;',
    '  const distanceCost = pkg.distance * 5;',
    '  const subtotal = BASE_COST + weightCost + distanceCost;',
    '',
    '  let discountPercent = 0;',
    '  if (pkg.offerCode === \'OFR001\' && pkg.distance < 200 && pkg.weight >= 70) {',
    '    discountPercent = 10;',
    '  } else if (pkg.offerCode === \'OFR002\' && pkg.distance >= 100 && pkg.weight >= 100) {',
    '    discountPercent = 7;',
    '  } else if (pkg.offerCode === \'OFR003\' && pkg.distance >= 50 && pkg.weight >= 10) {',
    '    discountPercent = 5;',
    '  }',
    '',
    '  const discount = (subtotal * discountPercent) / 100;',
    '  return {',
    '    id: pkg.id,',
    '    discount: Math.round(discount * 100) / 100,',
    '    totalCost: Math.round((subtotal - discount) * 100) / 100,',
    '  };',
    '}',
    '',
    'function estimateTime(distance: number, speed: number = 70): number {',
    '  return Math.floor((distance / speed) * 100) / 100;',
    '}',
    '',
    '// ═══════════════════════════════════════════════════════════',
    '// UI LAYER — Vue implementation',
    '// Same data, same logic. Different style, different vibe.',
    '// ═══════════════════════════════════════════════════════════',
    '',
    '\x3Cscript setup lang="ts">',
    'import { ref, computed } from \'vue\';',
    '',
    'const packages = ref<Package[]>([',
    '  { id: \'PKG1\', weight: 75, distance: 100, offerCode: \'OFR001\' },',
    '  { id: \'PKG2\', weight: 150, distance: 150, offerCode: \'OFR002\' },',
    '  { id: \'PKG3\', weight: 15, distance: 60, offerCode: \'OFR003\' },',
    ']);',
    '',
    'const selectedId = ref<string | null>(null);',
    '',
    'const results = computed(() =>',
    '  packages.value.map(pkg => ({',
    '    ...calculateCost(pkg),',
    '    time: estimateTime(pkg.distance),',
    '  }))',
    ');',
    '\x3C/script>',
    '',
    '\x3Ctemplate>',
    '  <div class="bg-gradient-to-br from-teal-950/30 to-green-950/30 rounded-xl p-4 border border-teal-500/20">',
    '    <h2 class="text-teal-300 text-lg font-semibold mb-3">',
    '      📦 Delivery Cost Calculator',
    '    </h2>',
    '    <div class="grid grid-cols-3 gap-2">',
    '      <div',
    '        v-for="result in results"',
    '        :key="result.id"',
    '        class="bg-teal-900/20 rounded-lg border border-teal-500/10 cursor-pointer p-3 text-center hover:bg-teal-900/30 transition-colors"',
    '        @click="selectedId = selectedId === result.id ? null : result.id"',
    '      >',
    '        <div class="text-teal-200 font-mono text-sm">{{ result.id }}</div>',
    '        <div class="text-teal-400 font-bold text-lg mt-1">${{ result.totalCost }}</div>',
    '      </div>',
    '    </div>',
    '    <!-- Detail modal -->',
    '    <div',
    '      v-if="selectedId"',
    '      class="mt-3 bg-teal-950/50 rounded-lg p-3 border border-teal-500/20"',
    '    >',
    '      <div class="flex justify-between items-center">',
    '        <span class="text-teal-200 font-mono">{{ selectedId }}</span>',
    '        <button',
    '          class="text-teal-500 text-xs hover:text-teal-300"',
    '          @click="selectedId = null"',
    '        >close\x3C/button>',
    '      </div>',
    '      <div class="mt-2 text-xs text-teal-300/70 space-y-1">',
    '        <p>Discount: ${{ results.find(r => r.id === selectedId)?.discount }}\x3C/p>',
    '        <p>Est. time: {{ results.find(r => r.id === selectedId)?.time }}h\x3C/p>',
    '      </div>',
    '    </div>',
    '  </div>',
    '\x3C/template>',
    '',
    '\x3Cstyle scoped>',
    '  .grid { display: grid; }',
    '  .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }',
    '  .gap-2 { gap: 0.5rem; }',
    '  .cursor-pointer { cursor: pointer; }',
    '  .transition-colors { transition: color 0.15s, background-color 0.15s; }',
    '\x3C/style>',
  ].join('\n'),

  svelte: [
    '// ═══════════════════════════════════════════════════════════',
    '// CORE LOGIC — identical across all frameworks',
    '// Framework, UI, colors change. This never does.',
    '// ═══════════════════════════════════════════════════════════',
    '',
    '// Package delivery cost calculation engine',
    'interface Package {',
    '  id: string;',
    '  weight: number;   // kg',
    '  distance: number; // km',
    '  offerCode?: string;',
    '}',
    '',
    'interface DeliveryResult {',
    '  id: string;',
    '  discount: number;',
    '  totalCost: number;',
    '  estimatedTime?: number;',
    '}',
    '',
    'const BASE_COST = 100;',
    '',
    'function calculateCost(pkg: Package): DeliveryResult {',
    '  const weightCost = pkg.weight * 10;',
    '  const distanceCost = pkg.distance * 5;',
    '  const subtotal = BASE_COST + weightCost + distanceCost;',
    '',
    '  let discountPercent = 0;',
    '  if (pkg.offerCode === \'OFR001\' && pkg.distance < 200 && pkg.weight >= 70) {',
    '    discountPercent = 10;',
    '  } else if (pkg.offerCode === \'OFR002\' && pkg.distance >= 100 && pkg.weight >= 100) {',
    '    discountPercent = 7;',
    '  } else if (pkg.offerCode === \'OFR003\' && pkg.distance >= 50 && pkg.weight >= 10) {',
    '    discountPercent = 5;',
    '  }',
    '',
    '  const discount = (subtotal * discountPercent) / 100;',
    '  return {',
    '    id: pkg.id,',
    '    discount: Math.round(discount * 100) / 100,',
    '    totalCost: Math.round((subtotal - discount) * 100) / 100,',
    '  };',
    '}',
    '',
    'function estimateTime(distance: number, speed: number = 70): number {',
    '  return Math.floor((distance / speed) * 100) / 100;',
    '}',
    '',
    '// ═══════════════════════════════════════════════════════════',
    '// UI LAYER — Svelte implementation',
    '// Same data, same logic. Different style, different vibe.',
    '// ═══════════════════════════════════════════════════════════',
    '',
    '\x3Cscript lang="ts">',
    '  const packages: Package[] = [',
    '    { id: \'PKG1\', weight: 75, distance: 100, offerCode: \'OFR001\' },',
    '    { id: \'PKG2\', weight: 150, distance: 150, offerCode: \'OFR002\' },',
    '    { id: \'PKG3\', weight: 15, distance: 60, offerCode: \'OFR003\' },',
    '  ];',
    '',
    '  let activeId: string | null = null;',
    '',
    '  $: results = packages.map(pkg => ({',
    '    ...calculateCost(pkg),',
    '    time: estimateTime(pkg.distance),',
    '  }));',
    '',
    '  $: activeResult = results.find(r => r.id === activeId) ?? null;',
    '\x3C/script>',
    '',
    '<div class="bg-gradient-to-br from-orange-950/30 to-amber-950/30 rounded-xl p-4 border border-orange-500/20">',
    '  <h2 class="text-orange-300 text-lg font-semibold mb-3">',
    '    📦 Delivery Cost Calculator',
    '  </h2>',
    '  <div class="flex gap-2 overflow-x-auto pb-1">',
    '    {#each results as result (result.id)}',
    '      <button',
    '        class="shrink-0 px-3 py-2 rounded-lg border text-sm font-mono transition-colors"',
    '        class:bg-orange-900/40={activeId === result.id}',
    '        class:border-orange-400/40={activeId === result.id}',
    '        class:bg-orange-900/10={activeId !== result.id}',
    '        class:border-orange-500/10={activeId !== result.id}',
    '        class:text-orange-200={true}',
    '        on:click={() => activeId = activeId === result.id ? null : result.id}',
    '      >',
    '        {result.id} — ${result.totalCost}',
    '      </button>',
    '    {/each}',
    '  </div>',
    '  {#if activeResult}',
    '    <div',
    '      class="mt-2 bg-orange-950/40 rounded-lg p-3 border border-orange-500/20 text-xs text-orange-300/70 space-y-1"',
    '      transition:slide={{ duration: 150 }}',
    '    >',
    '      <p><strong class="text-orange-200">{activeResult.id}</strong>\x3C/p>',
    '      <p>Discount: ${activeResult.discount}\x3C/p>',
    '      <p>Est. time: {activeResult.time}h\x3C/p>',
    '    </div>',
    '  {/if}',
    '</div>',
    '',
    '\x3Cstyle>',
    '  .flex { display: flex; }',
    '  .gap-2 { gap: 0.5rem; }',
    '  .overflow-x-auto { overflow-x: auto; }',
    '  .shrink-0 { flex-shrink: 0; }',
    '  .transition-colors { transition: color 0.15s, background-color 0.15s, border-color 0.15s; }',
    '\x3C/style>',
  ].join('\n'),
};

// ── Snippet parsing ──────────────────────────────────────────────────

const UI_LAYER_MARKER = /^[/\s<!\-]*[═]{3,}/;

export function splitSnippet(code: string): { locked: string; editable: string } {
  const lines = code.split('\n');
  let separatorCount = 0;
  let splitIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (UI_LAYER_MARKER.test(lines[i].trim()) && lines[i].trim().includes('═══')) {
      separatorCount++;
      if (separatorCount === 3) {
        splitIdx = i;
        break;
      }
    }
  }

  if (splitIdx === -1) {
    return { locked: code, editable: '' };
  }

  return {
    locked: lines.slice(0, splitIdx).join('\n'),
    editable: lines.slice(splitIdx).join('\n'),
  };
}

export const ORIGINAL_EDITABLE: Record<Framework, string> = {
  react: splitSnippet(CODE_SNIPPETS.react).editable,
  vue: splitSnippet(CODE_SNIPPETS.vue).editable,
  svelte: splitSnippet(CODE_SNIPPETS.svelte).editable,
};

// ── Canvas rendering for locked code ─────────────────────────────────

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

// ── Syntax highlighting ──────────────────────────────────────────────

export interface Token {
  text: string;
  className: string;
}

export function tokenize(line: string, framework: Framework): Token[] {
  const tokens: Token[] = [];
  let remaining = line;

  const jsKeywords = /^(import|export|from|const|let|var|function|return|if|else|for|of|in|new|interface|type|class|extends|implements|async|await|default|void)\b/;
  const jsFlowKeywords = /^(map|filter|reduce|forEach|push|splice|find|findIndex|some|every)\b/;
  const reactKeywords = /^(useState|useMemo|useEffect|useCallback|useRef)\b/;
  const vueKeywords = /^(ref|computed|watch|watchEffect|onMounted|defineProps|defineEmits)\b/;
  const svelteKeywords = /^(\$:)/;
  const typeKeywords = /^(string|number|boolean|Record|Array|Promise|any)\b/;
  const controlKeywords = /^(script|template|style|div|span|h2|h3|p)\b/;
  const jsLiterals = /^(true|false|null|undefined|Math)\b/;

  while (remaining.length > 0) {
    const wsMatch = remaining.match(/^(\s+)/);
    if (wsMatch) {
      tokens.push({ text: wsMatch[1], className: '' });
      remaining = remaining.slice(wsMatch[1].length);
      continue;
    }

    if (remaining.startsWith('//')) {
      tokens.push({ text: remaining, className: 'text-zinc-600' });
      break;
    }

    if (remaining.startsWith('<!--') || remaining.startsWith('{#') || remaining.startsWith('{/') || remaining.startsWith('{:')) {
      tokens.push({ text: remaining, className: 'text-zinc-600' });
      break;
    }

    const svelteMatch = remaining.match(svelteKeywords);
    if (svelteMatch) {
      tokens.push({ text: svelteMatch[0], className: 'text-purple-400' });
      remaining = remaining.slice(svelteMatch[0].length);
      continue;
    }

    if (remaining.startsWith('<') && (framework === 'vue' || framework === 'svelte')) {
      const tagMatch = remaining.match(/^(<\/?[\w-]+)/);
      if (tagMatch) {
        tokens.push({ text: tagMatch[0], className: 'text-pink-400' });
        remaining = remaining.slice(tagMatch[0].length);
        continue;
      }
    }

    if (remaining.startsWith('>') || remaining.startsWith('/>')) {
      const close = remaining.startsWith('/>') ? '/>' : '>';
      tokens.push({ text: close, className: 'text-pink-400' });
      remaining = remaining.slice(close.length);
      continue;
    }

    const strMatch = remaining.match(/^('[^']*'|"[^"]*"|`[^`]*`)/);
    if (strMatch) {
      tokens.push({ text: strMatch[0], className: 'text-emerald-400' });
      remaining = remaining.slice(strMatch[0].length);
      continue;
    }

    const numMatch = remaining.match(/^(\d+\.?\d*)/);
    if (numMatch) {
      tokens.push({ text: numMatch[0], className: 'text-amber-400' });
      remaining = remaining.slice(numMatch[0].length);
      continue;
    }

    const reactMatch = remaining.match(reactKeywords);
    if (reactMatch) {
      tokens.push({ text: reactMatch[0], className: 'text-purple-400' });
      remaining = remaining.slice(reactMatch[0].length);
      continue;
    }

    const vueMatch = remaining.match(vueKeywords);
    if (vueMatch) {
      tokens.push({ text: vueMatch[0], className: 'text-purple-400' });
      remaining = remaining.slice(vueMatch[0].length);
      continue;
    }

    const typeMatch = remaining.match(typeKeywords);
    if (typeMatch) {
      tokens.push({ text: typeMatch[0], className: 'text-cyan-400' });
      remaining = remaining.slice(typeMatch[0].length);
      continue;
    }

    const kwMatch = remaining.match(jsKeywords);
    if (kwMatch) {
      tokens.push({ text: kwMatch[0], className: 'text-pink-400' });
      remaining = remaining.slice(kwMatch[0].length);
      continue;
    }

    const litMatch = remaining.match(jsLiterals);
    if (litMatch) {
      tokens.push({ text: litMatch[0], className: 'text-amber-400' });
      remaining = remaining.slice(litMatch[0].length);
      continue;
    }

    const methodMatch = remaining.match(jsFlowKeywords);
    if (methodMatch) {
      tokens.push({ text: methodMatch[0], className: 'text-violet-400' });
      remaining = remaining.slice(methodMatch[0].length);
      continue;
    }

    const ctrlMatch = remaining.match(controlKeywords);
    if (ctrlMatch && (framework === 'vue' || framework === 'svelte')) {
      tokens.push({ text: ctrlMatch[0], className: 'text-pink-400' });
      remaining = remaining.slice(ctrlMatch[0].length);
      continue;
    }

    if (remaining.match(/^[\w-]+(?=\s*:)/) && (framework === 'vue' || framework === 'svelte')) {
      const cssMatch = remaining.match(/^[\w-]+/);
      if (cssMatch) {
        tokens.push({ text: cssMatch[0], className: 'text-cyan-300' });
        remaining = remaining.slice(cssMatch[0].length);
        continue;
      }
    }

    const opMatch = remaining.match(/^(=>|===|!==|&&|\|\||[=+\-*/<>!?:;,.|&{}()\[\]])/);
    if (opMatch) {
      tokens.push({ text: opMatch[0], className: 'text-zinc-500' });
      remaining = remaining.slice(opMatch[0].length);
      continue;
    }

    const idMatch = remaining.match(/^[\w$]+/);
    if (idMatch) {
      tokens.push({ text: idMatch[0], className: 'text-zinc-300' });
      remaining = remaining.slice(idMatch[0].length);
      continue;
    }

    tokens.push({ text: remaining[0], className: 'text-zinc-300' });
    remaining = remaining.slice(1);
  }

  return tokens;
}

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
