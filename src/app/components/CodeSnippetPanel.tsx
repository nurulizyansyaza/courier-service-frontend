import { useState, useRef, useEffect } from "react";
import { TerminalSquare, ChevronDown, ChevronRight, Lock, Pencil, RotateCcw } from "lucide-react";

type Framework = "react" | "vue" | "svelte";

const FRAMEWORK_CONFIG: Record<
  Framework,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  react: {
    label: "React.js",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
    borderColor: "border-cyan-500/30",
  },
  vue: {
    label: "Vue.js",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
    borderColor: "border-emerald-500/30",
  },
  svelte: {
    label: "Svelte",
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
    borderColor: "border-orange-500/30",
  },
};

const CODE_SNIPPETS: Record<Framework, string> = {
  react: `// ═══════════════════════════════════════════════════════════
// CORE LOGIC — identical across all frameworks
// Framework, UI, colors change. This never does.
// ═══════════════════════════════════════════════════════════

interface Package {
  id: string;
  weight: number;
  distance: number;
  offerCode: string;
}

interface DeliveryResult {
  id: string;
  discount: number;
  deliveryCost: number;
  totalCost: number;
}

// Pure calculation — no framework dependency
function calculateCost(baseCost: number, pkg: Package, offers: OfferMap): DeliveryResult {
  const weightCharge = pkg.weight * 10;
  const distanceCharge = pkg.distance * 5;
  const deliveryCost = baseCost + weightCharge + distanceCharge;

  const offer = offers[pkg.offerCode];
  let discount = 0;
  if (offer) {
    const distOk = pkg.distance >= offer.minDist && pkg.distance <= offer.maxDist;
    const wtOk = pkg.weight >= offer.minWeight && pkg.weight <= offer.maxWeight;
    if (distOk && wtOk) {
      discount = Math.floor((offer.discount / 100) * deliveryCost);
    }
  }

  return {
    id: pkg.id,
    discount,
    deliveryCost,
    totalCost: deliveryCost - discount,
  };
}

// Time estimation — also framework-agnostic
function estimateTime(distance: number, speed: number): number {
  return Math.floor((distance / speed) * 100) / 100;
}

// ═══════════════════════════════════════════════════════════
// UI LAYER — React.js
// Layout, colors, interactions are all React-specific.
// Swap this entire section for Vue/Svelte — logic stays.
// ═══════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';

export function DeliveryCostCalculator() {
  const [baseCost] = useState(100);
  const [packages] = useState<Package[]>([
    { id: 'PKG1', weight: 75, distance: 125, offerCode: 'OFR001' },
    { id: 'PKG2', weight: 15, distance: 100, offerCode: 'OFR003' },
  ]);
  const [expanded, setExpanded] = useState<string | null>(null);

  // React-specific: useMemo for derived state
  const results = useMemo(() =>
    packages.map(pkg => calculateCost(baseCost, pkg, OFFERS)),
    [baseCost, packages]
  );

  // React-specific: collapsible accordion pattern
  return (
    <div className="max-w-md mx-auto p-6 bg-gray-950 rounded-xl">
      <h2 className="text-pink-400 text-lg mb-4">Delivery Cost</h2>
      {results.map(r => (
        <div
          key={r.id}
          onClick={() => setExpanded(expanded === r.id ? null : r.id)}
          className="mb-2 border border-purple-800 rounded-lg cursor-pointer"
        >
          <div className="flex justify-between p-3">
            <span className="text-pink-300">{r.id}</span>
            <span className="text-emerald-400">{r.totalCost}</span>
          </div>
          {expanded === r.id && (
            <div className="px-3 pb-3 text-sm text-zinc-400 space-y-1">
              <p>Delivery Cost: {r.deliveryCost}</p>
              <p>Discount: -{r.discount}</p>
              <p>Time: ~{estimateTime(125, 70)}hrs</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}`,

  vue: `<!-- ═══════════════════════════════════════════════════════ -->
<!-- CORE LOGIC — identical across all frameworks          -->
<!-- Framework, UI, colors change. This never does.        -->
<!-- ═══════════════════════════════════════════════════════ -->

<script setup lang="ts">
import { ref, computed } from 'vue';

interface Package {
  id: string;
  weight: number;
  distance: number;
  offerCode: string;
}

interface DeliveryResult {
  id: string;
  discount: number;
  deliveryCost: number;
  totalCost: number;
}

// Pure calculation — no framework dependency
function calculateCost(baseCost: number, pkg: Package, offers: OfferMap): DeliveryResult {
  const weightCharge = pkg.weight * 10;
  const distanceCharge = pkg.distance * 5;
  const deliveryCost = baseCost + weightCharge + distanceCharge;

  const offer = offers[pkg.offerCode];
  let discount = 0;
  if (offer) {
    const distOk = pkg.distance >= offer.minDist && pkg.distance <= offer.maxDist;
    const wtOk = pkg.weight >= offer.minWeight && pkg.weight <= offer.maxWeight;
    if (distOk && wtOk) {
      discount = Math.floor((offer.discount / 100) * deliveryCost);
    }
  }

  return {
    id: pkg.id,
    discount,
    deliveryCost,
    totalCost: deliveryCost - discount,
  };
}

// Time estimation — also framework-agnostic
function estimateTime(distance: number, speed: number): number {
  return Math.floor((distance / speed) * 100) / 100;
}

// ═══════════════════════════════════════════════════════════
// UI LAYER — Vue.js (Composition API)
// Different layout, colors, interactions. Logic untouched.
// Uses card grid instead of accordion. Green/teal palette.
// ═══════════════════════════════════════════════════════════

const baseCost = ref(100);
const packages = ref<Package[]>([
  { id: 'PKG1', weight: 75, distance: 125, offerCode: 'OFR001' },
  { id: 'PKG2', weight: 15, distance: 100, offerCode: 'OFR003' },
]);

// Vue-specific: computed for derived state
const results = computed(() =>
  packages.value.map(pkg => calculateCost(baseCost.value, pkg, OFFERS))
);

// Vue-specific: modal detail view
const selectedId = ref<string | null>(null);
const selectedResult = computed(() =>
  results.value.find(r => r.id === selectedId.value)
);
</script>

<!-- Vue-specific: template with v-for, v-if, @click -->
<template>
  <div class="container">
    <h2>Delivery Cost</h2>
    <div class="grid">
      <div
        v-for="r in results"
        :key="r.id"
        class="card"
        @click="selectedId = r.id"
      >
        <span class="pkg-id">{{ r.id }}</span>
        <span class="total">{{ r.totalCost }}</span>
      </div>
    </div>

    <!-- Modal detail (Vue interaction pattern) -->
    <div v-if="selectedResult" class="modal" @click="selectedId = null">
      <div class="modal-body" @click.stop>
        <h3>{{ selectedResult.id }}</h3>
        <p>Delivery Cost: {{ selectedResult.deliveryCost }}</p>
        <p>Discount: -{{ selectedResult.discount }}</p>
        <p>Total: {{ selectedResult.totalCost }}</p>
        <p>Time: ~{{ estimateTime(125, 70) }}hrs</p>
      </div>
    </div>
  </div>
</template>

<!-- Vue-specific: scoped styles, teal/green palette -->
<style scoped>
.container { max-width: 28rem; margin: 0 auto; padding: 1.5rem; }
h2 { color: #2dd4bf; margin-bottom: 1rem; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.card {
  background: #042f2e; border: 1px solid #134e4a;
  border-radius: 0.75rem; padding: 1rem;
  cursor: pointer; transition: border-color 0.2s;
}
.card:hover { border-color: #2dd4bf; }
.pkg-id { color: #5eead4; }
.total { color: #a7f3d0; float: right; }
.modal {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center;
}
.modal-body {
  background: #042f2e; border: 1px solid #134e4a;
  border-radius: 1rem; padding: 1.5rem; min-width: 280px;
  color: #99f6e4;
}
</style>`,

  svelte: `<!-- ═══════════════════════════════════════════════════════ -->
<!-- CORE LOGIC — identical across all frameworks          -->
<!-- Framework, UI, colors change. This never does.        -->
<!-- ═══════════════════════════════════════════════════════ -->

<script lang="ts">
  interface Package {
    id: string;
    weight: number;
    distance: number;
    offerCode: string;
  }

  interface DeliveryResult {
    id: string;
    discount: number;
    deliveryCost: number;
    totalCost: number;
  }

  // Pure calculation — no framework dependency
  function calculateCost(baseCost: number, pkg: Package, offers: OfferMap): DeliveryResult {
    const weightCharge = pkg.weight * 10;
    const distanceCharge = pkg.distance * 5;
    const deliveryCost = baseCost + weightCharge + distanceCharge;

    const offer = offers[pkg.offerCode];
    let discount = 0;
    if (offer) {
      const distOk = pkg.distance >= offer.minDist && pkg.distance <= offer.maxDist;
      const wtOk = pkg.weight >= offer.minWeight && pkg.weight <= offer.maxWeight;
      if (distOk && wtOk) {
        discount = Math.floor((offer.discount / 100) * deliveryCost);
      }
    }

    return {
      id: pkg.id,
      discount,
      deliveryCost,
      totalCost: deliveryCost - discount,
    };
  }

  // Time estimation — also framework-agnostic
  function estimateTime(distance: number, speed: number): number {
    return Math.floor((distance / speed) * 100) / 100;
  }

  // ═══════════════════════════════════════════════════════
  // UI LAYER — Svelte
  // Different layout, colors, interactions. Logic untouched.
  // Uses horizontal list + slide-down detail. Orange palette.
  // ═══════════════════════════════════════════════════════

  let baseCost = 100;
  let packages: Package[] = [
    { id: 'PKG1', weight: 75, distance: 125, offerCode: 'OFR001' },
    { id: 'PKG2', weight: 15, distance: 100, offerCode: 'OFR003' },
  ];

  // Svelte-specific: reactive declarations
  $: results = packages.map(pkg => calculateCost(baseCost, pkg, OFFERS));

  // Svelte-specific: slide-down detail panel
  let activeIndex = -1;
  function toggle(i: number) {
    activeIndex = activeIndex === i ? -1 : i;
  }
</script>

<!-- Svelte-specific: {#each}, {#if}, on:click -->
<div class="container">
  <h2>Delivery Cost</h2>
  {#each results as r, i (r.id)}
    <button class="row" on:click={() => toggle(i)}>
      <span class="id">{r.id}</span>
      <span class="cost">{r.totalCost}</span>
      <span class="arrow">{activeIndex === i ? '▾' : '▸'}</span>
    </button>
    {#if activeIndex === i}
      <div class="detail" transition:slide>
        <p>Delivery Cost: {r.deliveryCost}</p>
        <p>Discount: -{r.discount}</p>
        <p>Total: {r.totalCost}</p>
        <p>Time: ~{estimateTime(125, 70)}hrs</p>
      </div>
    {/if}
  {/each}
  {#if results.length === 0}
    <p class="empty">No packages.</p>
  {/if}
</div>

<!-- Svelte-specific: global styles, orange/amber palette -->
<style>
  .container {
    max-width: 28rem; margin: 0 auto; padding: 1.5rem;
    background: #1c1917; border-radius: 0.75rem;
  }
  h2 { color: #fb923c; margin-bottom: 1rem; }
  .row {
    width: 100%; display: flex; align-items: center; gap: 1rem;
    padding: 0.75rem 1rem; margin-bottom: 0.25rem;
    background: #292524; border: 1px solid #44403c;
    border-radius: 0.5rem; cursor: pointer; color: #fde68a;
    transition: background 0.15s;
  }
  .row:hover { background: #44403c; }
  .id { color: #fdba74; flex: 1; text-align: left; }
  .cost { color: #86efac; }
  .arrow { color: #a8a29e; font-size: 0.75rem; }
  .detail {
    padding: 0.75rem 1rem; margin-bottom: 0.5rem;
    background: #1a1512; border-left: 2px solid #f97316;
    color: #d6d3d1; font-size: 0.875rem;
  }
  .detail p { margin: 0.25rem 0; }
  .empty { color: #78716c; font-style: italic; }
</style>`,
};

interface CommandHistoryEntry {
  input: string;
  output: string;
  isError: boolean;
}

// ── Helper: split snippet into locked (core logic) and editable (UI layer) ──

const UI_LAYER_MARKER = /^[/\s<!\-]*[═]{3,}/; // matches ═══ separator lines in JS (//) and HTML (<!-- -->) comments

function splitSnippet(code: string): { locked: string; editable: string } {
  const lines = code.split('\n');
  // Find the SECOND occurrence of the ═══ separator block — that's the UI LAYER header
  let separatorCount = 0;
  let splitIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (UI_LAYER_MARKER.test(lines[i].trim()) && lines[i].trim().includes('═══')) {
      separatorCount++;
      // The UI LAYER separator is the second block (lines 3+4 of separators, i.e., count 3)
      // First block: lines 0-3 (CORE LOGIC header = 2 separator lines)
      // Second block: UI LAYER header = 2 separator lines, we want the first of those
      if (separatorCount === 3) {
        splitIdx = i;
        break;
      }
    }
  }

  if (splitIdx === -1) {
    // Fallback: everything is locked
    return { locked: code, editable: '' };
  }

  return {
    locked: lines.slice(0, splitIdx).join('\n'),
    editable: lines.slice(splitIdx).join('\n'),
  };
}

// ── Pre-compute the original editable sections per framework ──

const ORIGINAL_EDITABLE: Record<Framework, string> = {
  react: splitSnippet(CODE_SNIPPETS.react).editable,
  vue: splitSnippet(CODE_SNIPPETS.vue).editable,
  svelte: splitSnippet(CODE_SNIPPETS.svelte).editable,
};

export function CodeSnippetPanel() {
  const [framework, setFramework] = useState<Framework>("react");
  const [commandInput, setCommandInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<CommandHistoryEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editedUI, setEditedUI] = useState<Record<Framework, string>>({ ...ORIGINAL_EDITABLE });
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const editableRef = useRef<HTMLTextAreaElement>(null);
  const lineNumRef = useRef<HTMLDivElement>(null);

  const fc = FRAMEWORK_CONFIG[framework];

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [commandHistory]);

  // Sync editable textarea scroll with line numbers
  const handleEditableScroll = () => {
    if (editableRef.current && lineNumRef.current) {
      lineNumRef.current.scrollTop = editableRef.current.scrollTop;
    }
  };

  const { locked } = splitSnippet(CODE_SNIPPETS[framework]);
  const lockedLines = locked.split('\n');
  const editableText = editedUI[framework];
  const editableLines = editableText.split('\n');
  const lockedLineCount = lockedLines.length;
  const isModified = editableText !== ORIGINAL_EDITABLE[framework];

  const processCommand = (input: string) => {
    const trimmed = input.trim().toLowerCase();
    const parts = trimmed.split(/\s+/);

    if (trimmed === "help") {
      return {
        output:
          "Available commands:\n  use react     - Switch to React.js\n  use vue       - Switch to Vue.js\n  use svelte    - Switch to Svelte\n  current       - Show current framework\n  reset         - Reset UI layer to original\n  clear         - Clear command history\n  help          - Show this help",
        isError: false,
      };
    }

    if (trimmed === "clear") {
      setCommandHistory([]);
      return null;
    }

    if (trimmed === "current") {
      return {
        output: `Current framework: ${FRAMEWORK_CONFIG[framework].label}${isModified ? ' (modified)' : ''}`,
        isError: false,
      };
    }

    if (trimmed === "reset") {
      setEditedUI(prev => ({ ...prev, [framework]: ORIGINAL_EDITABLE[framework] }));
      return {
        output: `UI layer for ${FRAMEWORK_CONFIG[framework].label} reset to original`,
        isError: false,
      };
    }

    if (parts[0] === "use" && parts.length === 2) {
      const target = parts[1] as Framework;
      if (target === "react" || target === "vue" || target === "svelte") {
        if (target === framework) {
          return {
            output: `Already using ${FRAMEWORK_CONFIG[target].label}`,
            isError: false,
          };
        }
        setFramework(target);
        return {
          output: `Switched to ${FRAMEWORK_CONFIG[target].label}`,
          isError: false,
        };
      }
      return {
        output: `Unknown framework "${parts[1]}". Available: react | vue | svelte`,
        isError: true,
      };
    }

    return {
      output: `Unknown command "${trimmed}". Type 'help' for available commands.`,
      isError: true,
    };
  };

  const handleSubmit = () => {
    if (!commandInput.trim()) return;

    const result = processCommand(commandInput);
    if (result) {
      setCommandHistory((prev) => [
        ...prev,
        { input: commandInput, output: result.output, isError: result.isError },
      ]);
    }
    setCommandInput("");
  };

  return (
    <div className="flex flex-col bg-[#0d0118] border-t border-[#2d1b4e] max-h-[45vh]">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 sm:px-4 py-2 bg-[#1a0b2e] border-b border-[#2d1b4e] flex items-center gap-1.5 sm:gap-2 w-full shrink-0 flex-wrap"
      >
        <span className="text-zinc-500">
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </span>
        <TerminalSquare className="w-4 h-4 text-pink-400" />
        <span className="text-xs sm:text-sm text-pink-400 font-mono">
          {">_"} code snippet
        </span>
        <span
          className={`text-[9px] sm:text-[10px] font-mono ${fc.color} ${fc.bgColor} px-1 sm:px-1.5 py-0.5 rounded border ${fc.borderColor}`}
        >
          {fc.label}
        </span>
        {isModified && (
          <span className="text-[9px] sm:text-[10px] font-mono text-amber-400 bg-amber-500/15 px-1 sm:px-1.5 py-0.5 rounded border border-amber-500/30">
            modified
          </span>
        )}
      </button>

      {/* Content */}
      {isOpen && (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Single scrollable area for both locked + editable */}
          <div className="flex-1 overflow-auto font-mono text-xs sm:text-sm scrollbar-pink">

            {/* ── Locked Section: Core Logic ── */}
            <div
              onCopy={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                userSelect: "none",
                WebkitUserSelect: "none",
                MozUserSelect: "none" as any,
                msUserSelect: "none" as any,
              }}
            >
              <table className="w-full border-collapse">
                <tbody>
                  {lockedLines.map((line, i) => (
                    <tr key={`locked-${i}`} className="hover:bg-[#1a0b2e]/20 bg-[#0d0118]">
                      <td className="text-right pr-1.5 sm:pr-2 pl-1.5 sm:pl-2 select-none w-[1%] whitespace-nowrap align-top">
                        <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                          <Lock className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-red-500/40 hidden sm:block" />
                          <span className="text-red-500/40 text-[10px] sm:text-xs">{i + 1}</span>
                        </div>
                      </td>
                      <td className="pr-3 sm:pr-4 text-zinc-300 whitespace-pre border-l-2 border-red-500/20 pl-1.5 sm:pl-2">
                        <CodeLine line={line} framework={framework} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Section Divider ── */}
            <div className="sticky left-0 flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 bg-[#1a0b2e]/60 border-y border-[#2d1b4e]">
              <div className="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] font-mono shrink-0">
                <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-400/60" />
                <span className="text-red-400/60">core logic — locked</span>
              </div>
              <div className="hidden sm:block flex-1 border-t border-[#2d1b4e]/60" />
              <div className="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] font-mono shrink-0">
                <Pencil className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400/60" />
                <span className="text-emerald-400/60">ui layer — editable</span>
              </div>
              {isModified && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditedUI(prev => ({ ...prev, [framework]: ORIGINAL_EDITABLE[framework] }));
                  }}
                  className="flex items-center gap-1 text-[9px] sm:text-[10px] font-mono text-amber-400/70 hover:text-amber-400 transition-colors sm:ml-1 shrink-0"
                  title="Reset to original"
                >
                  <RotateCcw className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span>reset</span>
                </button>
              )}
            </div>

            {/* ── Editable Section: UI Layer ── */}
            <div className="relative flex">
              {/* Line numbers column */}
              <div
                ref={lineNumRef}
                className="shrink-0 select-none pointer-events-none"
              >
                {editableLines.map((_, i) => (
                  <div
                    key={`ln-${i}`}
                    className="flex items-center justify-end gap-0.5 sm:gap-1 pr-1.5 sm:pr-2 pl-1.5 sm:pl-2 leading-[1.35rem]"
                  >
                    <Pencil className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-emerald-500/30 hidden sm:block" />
                    <span className="text-emerald-500/40 text-[10px] sm:text-xs font-mono">{lockedLineCount + i + 1}</span>
                  </div>
                ))}
              </div>

              {/* Editable textarea — no scroll, grows to content, parent scrolls */}
              <textarea
                ref={editableRef}
                value={editableText}
                onChange={(e) =>
                  setEditedUI(prev => ({ ...prev, [framework]: e.target.value }))
                }
                className="flex-1 bg-transparent text-zinc-300 font-mono text-xs sm:text-sm resize-none outline-none border-l-2 border-emerald-500/20 pl-1.5 sm:pl-2 pr-3 sm:pr-4 py-0 leading-[1.35rem] overflow-hidden"
                spellCheck={false}
                autoComplete="off"
                style={{
                  height: `${editableLines.length * 1.35}rem`,
                  tabSize: 2,
                }}
              />
            </div>
          </div>

          {/* Command Line */}
          <div className="border-t border-[#2d1b4e] bg-[#0d0118] shrink-0">
            {/* Command History */}
            {commandHistory.length > 0 && (
              <div
                ref={historyRef}
                className="max-h-[80px] overflow-auto px-3 sm:px-4 py-2 space-y-1 border-b border-[#2d1b4e]/50 scrollbar-pink"
              >
                {commandHistory.map((entry, i) => (
                  <div key={i} className="font-mono text-[10px] sm:text-xs">
                    <div className="text-zinc-500">
                      <span className="text-emerald-500">$</span> {entry.input}
                    </div>
                    <pre
                      className={`whitespace-pre-wrap pl-3 ${
                        entry.isError ? "text-red-400" : "text-cyan-400"
                      }`}
                    >
                      {entry.output}
                    </pre>
                  </div>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2">
              <span className="text-emerald-500 font-mono text-xs sm:text-sm">$</span>
              <input
                ref={inputRef}
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="use react | use vue | use svelte | reset | help"
                className="flex-1 bg-transparent border-none outline-none text-zinc-100 placeholder:text-zinc-700 font-mono text-xs sm:text-sm"
                spellCheck={false}
                autoComplete="off"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Syntax highlighting (lightweight) ────────────────────────────────

function CodeLine({ line, framework }: { line: string; framework: Framework }) {
  // Simple token-based highlighting
  const tokens = tokenize(line, framework);
  return (
    <>
      {tokens.map((token, i) => (
        <span key={i} className={token.className}>
          {token.text}
        </span>
      ))}
    </>
  );
}

interface Token {
  text: string;
  className: string;
}

function tokenize(line: string, framework: Framework): Token[] {
  const tokens: Token[] = [];
  let remaining = line;

  // Common keywords across frameworks
  const jsKeywords = /^(import|export|from|const|let|var|function|return|if|else|for|of|in|new|interface|type|class|extends|implements|async|await|default|void)\b/;
  const jsFlowKeywords = /^(map|filter|reduce|forEach|push|splice|find|findIndex|some|every)\b/;
  const reactKeywords = /^(useState|useMemo|useEffect|useCallback|useRef)\b/;
  const vueKeywords = /^(ref|computed|watch|watchEffect|onMounted|defineProps|defineEmits)\b/;
  const svelteKeywords = /^(\$:)/;
  const typeKeywords = /^(string|number|boolean|Record|Array|Promise|any)\b/;
  const controlKeywords = /^(script|template|style|div|span|h2|h3|p)\b/;
  const jsLiterals = /^(true|false|null|undefined|Math)\b/;

  while (remaining.length > 0) {
    // Leading whitespace
    const wsMatch = remaining.match(/^(\s+)/);
    if (wsMatch) {
      tokens.push({ text: wsMatch[1], className: "" });
      remaining = remaining.slice(wsMatch[1].length);
      continue;
    }

    // Single-line comment
    if (remaining.startsWith("//")) {
      tokens.push({ text: remaining, className: "text-zinc-600" });
      break;
    }

    // HTML/template comments and tags
    if (remaining.startsWith("<!--") || remaining.startsWith("{#") || remaining.startsWith("{/") || remaining.startsWith("{:")) {
      tokens.push({ text: remaining, className: "text-zinc-600" });
      break;
    }

    // Svelte reactive
    const svelteMatch = remaining.match(svelteKeywords);
    if (svelteMatch) {
      tokens.push({ text: svelteMatch[0], className: "text-purple-400" });
      remaining = remaining.slice(svelteMatch[0].length);
      continue;
    }

    // Template tags (Vue/Svelte)
    if (remaining.startsWith("<") && (framework === "vue" || framework === "svelte")) {
      const tagMatch = remaining.match(/^(<\/?[\w-]+)/);
      if (tagMatch) {
        tokens.push({ text: tagMatch[0], className: "text-pink-400" });
        remaining = remaining.slice(tagMatch[0].length);
        continue;
      }
    }

    // Closing >
    if (remaining.startsWith(">") || remaining.startsWith("/>")) {
      const close = remaining.startsWith("/>") ? "/>" : ">";
      tokens.push({ text: close, className: "text-pink-400" });
      remaining = remaining.slice(close.length);
      continue;
    }

    // Strings
    const strMatch = remaining.match(/^('[^']*'|"[^"]*"|`[^`]*`)/);
    if (strMatch) {
      tokens.push({ text: strMatch[0], className: "text-emerald-400" });
      remaining = remaining.slice(strMatch[0].length);
      continue;
    }

    // Numbers
    const numMatch = remaining.match(/^(\d+\.?\d*)/);
    if (numMatch) {
      tokens.push({ text: numMatch[0], className: "text-amber-400" });
      remaining = remaining.slice(numMatch[0].length);
      continue;
    }

    // React hooks
    const reactMatch = remaining.match(reactKeywords);
    if (reactMatch) {
      tokens.push({ text: reactMatch[0], className: "text-purple-400" });
      remaining = remaining.slice(reactMatch[0].length);
      continue;
    }

    // Vue composition API
    const vueMatch = remaining.match(vueKeywords);
    if (vueMatch) {
      tokens.push({ text: vueMatch[0], className: "text-purple-400" });
      remaining = remaining.slice(vueMatch[0].length);
      continue;
    }

    // Type keywords
    const typeMatch = remaining.match(typeKeywords);
    if (typeMatch) {
      tokens.push({ text: typeMatch[0], className: "text-cyan-400" });
      remaining = remaining.slice(typeMatch[0].length);
      continue;
    }

    // JS keywords
    const kwMatch = remaining.match(jsKeywords);
    if (kwMatch) {
      tokens.push({ text: kwMatch[0], className: "text-pink-400" });
      remaining = remaining.slice(kwMatch[0].length);
      continue;
    }

    // Literals
    const litMatch = remaining.match(jsLiterals);
    if (litMatch) {
      tokens.push({ text: litMatch[0], className: "text-amber-400" });
      remaining = remaining.slice(litMatch[0].length);
      continue;
    }

    // Built-in methods
    const methodMatch = remaining.match(jsFlowKeywords);
    if (methodMatch) {
      tokens.push({ text: methodMatch[0], className: "text-violet-400" });
      remaining = remaining.slice(methodMatch[0].length);
      continue;
    }

    // HTML element keywords in Vue/Svelte templates
    const ctrlMatch = remaining.match(controlKeywords);
    if (ctrlMatch && (framework === "vue" || framework === "svelte")) {
      tokens.push({ text: ctrlMatch[0], className: "text-pink-400" });
      remaining = remaining.slice(ctrlMatch[0].length);
      continue;
    }

    // CSS properties
    if (remaining.match(/^[\w-]+(?=\s*:)/) && (framework === "vue" || framework === "svelte")) {
      const cssMatch = remaining.match(/^[\w-]+/);
      if (cssMatch) {
        tokens.push({ text: cssMatch[0], className: "text-cyan-300" });
        remaining = remaining.slice(cssMatch[0].length);
        continue;
      }
    }

    // Operators and punctuation
    const opMatch = remaining.match(/^(=>|===|!==|&&|\|\||[=+\-*/<>!?:;,.|&{}()\[\]])/);
    if (opMatch) {
      tokens.push({ text: opMatch[0], className: "text-zinc-500" });
      remaining = remaining.slice(opMatch[0].length);
      continue;
    }

    // Identifiers (anything else)
    const idMatch = remaining.match(/^[\w$]+/);
    if (idMatch) {
      tokens.push({ text: idMatch[0], className: "text-zinc-300" });
      remaining = remaining.slice(idMatch[0].length);
      continue;
    }

    // Fallback: single character
    tokens.push({ text: remaining[0], className: "text-zinc-300" });
    remaining = remaining.slice(1);
  }

  return tokens;
}
