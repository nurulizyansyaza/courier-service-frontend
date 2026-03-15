import type { Framework } from '../types';

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
    "  if (pkg.offerCode === 'OFR001' && pkg.distance < 200 && pkg.weight >= 70) {",
    '    discountPercent = 10;',
    "  } else if (pkg.offerCode === 'OFR002' && pkg.distance >= 100 && pkg.weight >= 100) {",
    '    discountPercent = 7;',
    "  } else if (pkg.offerCode === 'OFR003' && pkg.distance >= 50 && pkg.weight >= 10) {",
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
    "import { ref, computed } from 'vue';",
    '',
    'const packages = ref<Package[]>([',
    "  { id: 'PKG1', weight: 75, distance: 100, offerCode: 'OFR001' },",
    "  { id: 'PKG2', weight: 150, distance: 150, offerCode: 'OFR002' },",
    "  { id: 'PKG3', weight: 15, distance: 60, offerCode: 'OFR003' },",
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
    "        <p>Discount: ${{ results.find(r => r.id === selectedId)?.discount }}\\x3C/p>",
    "        <p>Est. time: {{ results.find(r => r.id === selectedId)?.time }}h\\x3C/p>",
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
    "  if (pkg.offerCode === 'OFR001' && pkg.distance < 200 && pkg.weight >= 70) {",
    '    discountPercent = 10;',
    "  } else if (pkg.offerCode === 'OFR002' && pkg.distance >= 100 && pkg.weight >= 100) {",
    '    discountPercent = 7;',
    "  } else if (pkg.offerCode === 'OFR003' && pkg.distance >= 50 && pkg.weight >= 10) {",
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
    "    { id: 'PKG1', weight: 75, distance: 100, offerCode: 'OFR001' },",
    "    { id: 'PKG2', weight: 150, distance: 150, offerCode: 'OFR002' },",
    "    { id: 'PKG3', weight: 15, distance: 60, offerCode: 'OFR003' },",
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
    "      <p><strong class=\"text-orange-200\">{activeResult.id}</strong>\\x3C/p>",
    "      <p>Discount: ${activeResult.discount}\\x3C/p>",
    "      <p>Est. time: {activeResult.time}h\\x3C/p>",
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
