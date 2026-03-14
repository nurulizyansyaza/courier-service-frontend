import { useState, useRef, useEffect } from "react";
import { TerminalSquare, ChevronDown, ChevronRight, Lock, Pencil, RotateCcw } from "lucide-react";
import type { Framework, CommandHistoryEntry } from "../../core/types";
import { FRAMEWORK_CONFIG } from "../../core/constants";

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

import { useState, useMemo, useCallback } from 'react';

type SortKey = 'id' | 'totalCost' | 'discount';

export function DeliveryCostCalculator() {
  const [baseCost, setBaseCost] = useState(100);
  const [packages, setPackages] = useState<Package[]>([
    { id: 'PKG1', weight: 75, distance: 125, offerCode: 'OFR001' },
    { id: 'PKG2', weight: 15, distance: 100, offerCode: 'OFR003' },
    { id: 'PKG3', weight: 50, distance: 200, offerCode: '' },
  ]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('id');
  const [filterText, setFilterText] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newPkg, setNewPkg] = useState({
    id: '', weight: 0, distance: 0, offerCode: ''
  });

  // React-specific: useMemo for derived state
  const results = useMemo(() =>
    packages.map(pkg => calculateCost(baseCost, pkg, OFFERS)),
    [baseCost, packages]
  );

  // React-specific: sort + filter with useMemo
  const filtered = useMemo(() => {
    let list = [...results];
    if (filterText) {
      list = list.filter(r =>
        r.id.toLowerCase().includes(filterText.toLowerCase())
      );
    }
    list.sort((a, b) => {
      if (sortBy === 'id') return a.id.localeCompare(b.id);
      return a[sortBy] - b[sortBy];
    });
    return list;
  }, [results, filterText, sortBy]);

  // React-specific: useCallback for event handlers
  const handleAddPackage = useCallback(() => {
    if (!newPkg.id.trim()) return;
    setPackages(prev => [...prev, { ...newPkg }]);
    setNewPkg({ id: '', weight: 0, distance: 0, offerCode: '' });
    setShowForm(false);
  }, [newPkg]);

  const handleRemovePackage = useCallback((id: string) => {
    setPackages(prev => prev.filter(p => p.id !== id));
    if (expanded === id) setExpanded(null);
  }, [expanded]);

  // Summary statistics
  const summary = useMemo(() => ({
    totalPackages: results.length,
    totalCost: results.reduce((sum, r) => sum + r.totalCost, 0),
    totalDiscount: results.reduce((sum, r) => sum + r.discount, 0),
    avgCost: results.length
      ? Math.round(results.reduce((s, r) => s + r.totalCost, 0) / results.length)
      : 0,
  }), [results]);

  // React-specific: collapsible accordion + controls
  return (
    <div className="max-w-md mx-auto p-6 bg-gray-950 rounded-xl">
      <h2 className="text-pink-400 text-lg mb-4 font-semibold">
        Delivery Cost Calculator
      </h2>

      {/* Summary Stats Bar */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-purple-900/30 rounded-lg p-2 text-center">
          <p className="text-[10px] text-zinc-500">Packages</p>
          <p className="text-pink-300 font-mono">{summary.totalPackages}</p>
        </div>
        <div className="bg-purple-900/30 rounded-lg p-2 text-center">
          <p className="text-[10px] text-zinc-500">Total Cost</p>
          <p className="text-emerald-400 font-mono">{summary.totalCost}</p>
        </div>
        <div className="bg-purple-900/30 rounded-lg p-2 text-center">
          <p className="text-[10px] text-zinc-500">Saved</p>
          <p className="text-amber-400 font-mono">-{summary.totalDiscount}</p>
        </div>
      </div>

      {/* Filter + Sort Controls */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="Filter by ID..."
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
          className="flex-1 bg-gray-900 border border-purple-800 rounded
                     px-2 py-1 text-sm text-zinc-300 placeholder:text-zinc-600"
        />
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortKey)}
          className="bg-gray-900 border border-purple-800 rounded
                     px-2 py-1 text-sm text-zinc-300"
        >
          <option value="id">Sort: ID</option>
          <option value="totalCost">Sort: Cost</option>
          <option value="discount">Sort: Discount</option>
        </select>
      </div>

      {/* Base Cost Slider */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-zinc-500">Base Cost:</span>
        <input
          type="range" min={50} max={200} value={baseCost}
          onChange={e => setBaseCost(Number(e.target.value))}
          className="flex-1 accent-pink-500"
        />
        <span className="text-xs text-pink-300 font-mono w-8">{baseCost}</span>
      </div>

      {/* Package List */}
      {filtered.map(r => (
        <div
          key={r.id}
          className="mb-2 border border-purple-800 rounded-lg overflow-hidden
                     transition-all duration-200 hover:border-pink-500/50"
        >
          <div
            onClick={() => setExpanded(expanded === r.id ? null : r.id)}
            className="flex justify-between items-center p-3 cursor-pointer"
          >
            <span className="text-pink-300 font-medium">{r.id}</span>
            <div className="flex items-center gap-2">
              {r.discount > 0 && (
                <span className="text-[10px] bg-emerald-500/20
                                 text-emerald-400 px-1.5 rounded">
                  -{r.discount}
                </span>
              )}
              <span className="text-emerald-400 font-mono">{r.totalCost}</span>
              <span className="text-zinc-600 text-xs">
                {expanded === r.id ? '\u25be' : '\u25b8'}
              </span>
            </div>
          </div>
          {expanded === r.id && (
            <div className="px-3 pb-3 text-sm text-zinc-400 space-y-1
                            border-t border-purple-800/50 pt-2">
              <p>Delivery Cost: <span className="text-zinc-300">{r.deliveryCost}</span></p>
              <p>Discount: <span className="text-emerald-400">-{r.discount}</span></p>
              <p>Est. Time: <span className="text-cyan-400">
                ~{estimateTime(125, 70)}hrs
              </span></p>
              <button
                onClick={e => { e.stopPropagation(); handleRemovePackage(r.id); }}
                className="mt-2 text-xs text-red-400/70 hover:text-red-400
                           transition-colors"
              >
                Remove package
              </button>
            </div>
          )}
        </div>
      ))}

      {filtered.length === 0 && (
        <p className="text-zinc-600 text-sm italic text-center py-4">
          No matching packages.
        </p>
      )}

      {/* Add Package Form */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="w-full mt-3 py-2 border border-dashed border-purple-800
                   text-zinc-500 text-sm rounded-lg hover:border-pink-500/50
                   hover:text-pink-400 transition-all"
      >
        {showForm ? '\u2715 Cancel' : '+ Add Package'}
      </button>

      {showForm && (
        <div className="mt-2 p-3 bg-gray-900 rounded-lg border
                        border-purple-800 space-y-2">
          <input
            placeholder="Package ID"
            value={newPkg.id}
            onChange={e => setNewPkg(p => ({ ...p, id: e.target.value }))}
            className="w-full bg-gray-950 border border-purple-800/50
                       rounded px-2 py-1 text-sm text-zinc-300"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number" placeholder="Weight (kg)"
              value={newPkg.weight || ''}
              onChange={e => setNewPkg(p => ({ ...p, weight: +e.target.value }))}
              className="bg-gray-950 border border-purple-800/50
                         rounded px-2 py-1 text-sm text-zinc-300"
            />
            <input
              type="number" placeholder="Distance (km)"
              value={newPkg.distance || ''}
              onChange={e => setNewPkg(p => ({ ...p, distance: +e.target.value }))}
              className="bg-gray-950 border border-purple-800/50
                         rounded px-2 py-1 text-sm text-zinc-300"
            />
          </div>
          <input
            placeholder="Offer Code (optional)"
            value={newPkg.offerCode}
            onChange={e => setNewPkg(p => ({ ...p, offerCode: e.target.value }))}
            className="w-full bg-gray-950 border border-purple-800/50
                       rounded px-2 py-1 text-sm text-zinc-300"
          />
          <button
            onClick={handleAddPackage}
            className="w-full py-1.5 bg-pink-500/20 text-pink-400 rounded
                       text-sm hover:bg-pink-500/30 transition-colors font-medium"
          >
            Add Package
          </button>
        </div>
      )}
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
  { id: 'PKG3', weight: 50, distance: 200, offerCode: '' },
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

// Vue-specific: search filter with computed
const searchQuery = ref('');
const sortField = ref<'id' | 'totalCost'>('id');
const filteredResults = computed(() => {
  let list = [...results.value];
  if (searchQuery.value) {
    list = list.filter(r =>
      r.id.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  }
  list.sort((a, b) =>
    sortField.value === 'id'
      ? a.id.localeCompare(b.id)
      : a.totalCost - b.totalCost
  );
  return list;
});

// Vue-specific: add/remove packages
const showAddForm = ref(false);
const newPkg = ref({ id: '', weight: 0, distance: 0, offerCode: '' });

function addPackage() {
  if (!newPkg.value.id.trim()) return;
  packages.value.push({ ...newPkg.value });
  newPkg.value = { id: '', weight: 0, distance: 0, offerCode: '' };
  showAddForm.value = false;
}

function removePackage(id: string) {
  packages.value = packages.value.filter(p => p.id !== id);
  if (selectedId.value === id) selectedId.value = null;
}

// Summary stats
const summary = computed(() => ({
  total: results.value.reduce((s, r) => s + r.totalCost, 0),
  saved: results.value.reduce((s, r) => s + r.discount, 0),
  count: results.value.length,
}));
</script>

<!-- Vue-specific: template with v-for, v-if, @click, v-model -->
<template>
  <div class="container">
    <h2>Delivery Cost Calculator</h2>

    <!-- Summary Row -->
    <div class="summary-bar">
      <div class="stat">
        <span class="stat-label">Packages</span>
        <span class="stat-value">{{ summary.count }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Total</span>
        <span class="stat-value teal">{{ summary.total }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Saved</span>
        <span class="stat-value green">-{{ summary.saved }}</span>
      </div>
    </div>

    <!-- Controls: Search + Sort -->
    <div class="controls">
      <input
        v-model="searchQuery"
        placeholder="Search packages..."
        class="search-input"
      />
      <select v-model="sortField" class="sort-select">
        <option value="id">Sort: ID</option>
        <option value="totalCost">Sort: Cost</option>
      </select>
    </div>

    <!-- Base Cost Slider -->
    <div class="slider-row">
      <label>Base Cost:</label>
      <input type="range" v-model.number="baseCost" min="50" max="200" />
      <span class="slider-value">{{ baseCost }}</span>
    </div>

    <!-- Card Grid -->
    <div class="grid">
      <div
        v-for="r in filteredResults"
        :key="r.id"
        class="card"
        @click="selectedId = r.id"
      >
        <div class="card-header">
          <span class="pkg-id">{{ r.id }}</span>
          <button class="remove-btn" @click.stop="removePackage(r.id)">
            \u2715
          </button>
        </div>
        <span class="total">{{ r.totalCost }}</span>
        <span v-if="r.discount > 0" class="discount-badge">
          -{{ r.discount }}
        </span>
      </div>
    </div>

    <p v-if="filteredResults.length === 0" class="empty">
      No matching packages found.
    </p>

    <!-- Add Package Button + Form -->
    <button class="add-btn" @click="showAddForm = !showAddForm">
      {{ showAddForm ? '\u2715 Cancel' : '+ Add Package' }}
    </button>

    <div v-if="showAddForm" class="add-form">
      <input v-model="newPkg.id" placeholder="Package ID" class="form-input" />
      <div class="form-row">
        <input v-model.number="newPkg.weight" type="number"
               placeholder="Weight" class="form-input" />
        <input v-model.number="newPkg.distance" type="number"
               placeholder="Distance" class="form-input" />
      </div>
      <input v-model="newPkg.offerCode" placeholder="Offer Code"
             class="form-input" />
      <button class="submit-btn" @click="addPackage">Add Package</button>
    </div>

    <!-- Modal detail (Vue interaction pattern) -->
    <div v-if="selectedResult" class="modal" @click="selectedId = null">
      <div class="modal-body" @click.stop>
        <h3>{{ selectedResult.id }}</h3>
        <div class="detail-grid">
          <p>Delivery Cost:
            <strong>{{ selectedResult.deliveryCost }}</strong>
          </p>
          <p>Discount:
            <strong class="green">-{{ selectedResult.discount }}</strong>
          </p>
          <p>Total:
            <strong class="teal">{{ selectedResult.totalCost }}</strong>
          </p>
          <p>Est. Time:
            <strong>~{{ estimateTime(125, 70) }}hrs</strong>
          </p>
        </div>
        <button class="close-btn" @click="selectedId = null">Close</button>
      </div>
    </div>
  </div>
</template>

<!-- Vue-specific: scoped styles, teal/green palette -->
<style scoped>
.container { max-width: 28rem; margin: 0 auto; padding: 1.5rem; }
h2 { color: #2dd4bf; margin-bottom: 1rem; font-weight: 600; }
.summary-bar { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
.stat {
  flex: 1; text-align: center; padding: 0.5rem;
  background: #042f2e; border-radius: 0.5rem;
}
.stat-label { display: block; font-size: 0.625rem; color: #5eead4; }
.stat-value { font-family: monospace; color: #ccfbf1; }
.stat-value.teal { color: #2dd4bf; }
.stat-value.green { color: #4ade80; }
.controls { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
.search-input, .sort-select {
  background: #042f2e; border: 1px solid #134e4a;
  border-radius: 0.375rem; padding: 0.375rem 0.5rem;
  color: #99f6e4; font-size: 0.875rem;
}
.search-input { flex: 1; }
.search-input::placeholder { color: #115e59; }
.slider-row {
  display: flex; align-items: center; gap: 0.5rem;
  margin-bottom: 1rem; font-size: 0.75rem; color: #5eead4;
}
.slider-row input[type="range"] { flex: 1; accent-color: #2dd4bf; }
.slider-value { font-family: monospace; width: 2rem; color: #ccfbf1; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.card {
  background: #042f2e; border: 1px solid #134e4a;
  border-radius: 0.75rem; padding: 1rem;
  cursor: pointer; transition: border-color 0.2s; position: relative;
}
.card:hover { border-color: #2dd4bf; }
.card-header { display: flex; justify-content: space-between; }
.pkg-id { color: #5eead4; }
.remove-btn {
  background: none; border: none; color: #f87171;
  cursor: pointer; font-size: 0.75rem; opacity: 0.5;
}
.remove-btn:hover { opacity: 1; }
.total { color: #a7f3d0; display: block; margin-top: 0.5rem;
         font-family: monospace; }
.discount-badge {
  position: absolute; top: 0.5rem; right: 0.5rem;
  background: #065f4620; color: #4ade80;
  padding: 0.125rem 0.375rem; border-radius: 0.25rem;
  font-size: 0.625rem;
}
.empty { color: #5eead4; font-style: italic; text-align: center;
         margin-top: 1rem; }
.add-btn {
  width: 100%; margin-top: 0.75rem; padding: 0.5rem;
  background: none; border: 1px dashed #134e4a;
  color: #5eead4; border-radius: 0.5rem;
  cursor: pointer; font-size: 0.875rem;
}
.add-btn:hover { border-color: #2dd4bf; color: #2dd4bf; }
.add-form {
  margin-top: 0.5rem; padding: 0.75rem;
  background: #042f2e; border-radius: 0.5rem;
  border: 1px solid #134e4a;
}
.form-input {
  width: 100%; background: #0a3d3c; border: 1px solid #134e4a;
  border-radius: 0.25rem; padding: 0.375rem 0.5rem;
  color: #99f6e4; font-size: 0.875rem; margin-bottom: 0.5rem;
}
.form-row { display: flex; gap: 0.5rem; }
.form-row .form-input { width: auto; flex: 1; }
.submit-btn {
  width: 100%; padding: 0.375rem;
  background: #0d9488; color: #f0fdfa; border: none;
  border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem;
}
.submit-btn:hover { background: #14b8a6; }
.modal {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center;
}
.modal-body {
  background: #042f2e; border: 1px solid #134e4a;
  border-radius: 1rem; padding: 1.5rem; min-width: 280px;
  color: #99f6e4;
}
.detail-grid { margin: 0.75rem 0; }
.detail-grid p { margin: 0.375rem 0; }
.green { color: #4ade80; }
.teal { color: #2dd4bf; }
.close-btn {
  margin-top: 0.75rem; width: 100%; padding: 0.375rem;
  background: #134e4a; color: #99f6e4; border: none;
  border-radius: 0.375rem; cursor: pointer;
}
.close-btn:hover { background: #115e59; }
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
    { id: 'PKG3', weight: 50, distance: 200, offerCode: '' },
  ];

  // Svelte-specific: reactive declarations
  $: results = packages.map(pkg => calculateCost(baseCost, pkg, OFFERS));

  // Svelte-specific: slide-down detail panel
  let activeIndex = -1;
  function toggle(i: number) {
    activeIndex = activeIndex === i ? -1 : i;
  }

  // Svelte-specific: reactive filter & sort
  let searchText = '';
  let sortKey: 'id' | 'totalCost' = 'id';
  $: filtered = (() => {
    let list = [...results];
    if (searchText) {
      list = list.filter(r =>
        r.id.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    list.sort((a, b) =>
      sortKey === 'id' ? a.id.localeCompare(b.id) : a.totalCost - b.totalCost
    );
    return list;
  })();

  // Svelte-specific: reactive summary
  $: totalCost = results.reduce((s, r) => s + r.totalCost, 0);
  $: totalSaved = results.reduce((s, r) => s + r.discount, 0);

  // Add/remove packages
  let showForm = false;
  let newId = '';
  let newWeight = 0;
  let newDistance = 0;
  let newOffer = '';

  function addPackage() {
    if (!newId.trim()) return;
    packages = [...packages, {
      id: newId, weight: newWeight,
      distance: newDistance, offerCode: newOffer
    }];
    newId = ''; newWeight = 0; newDistance = 0; newOffer = '';
    showForm = false;
  }

  function removePackage(id: string) {
    packages = packages.filter(p => p.id !== id);
  }
</script>

<!-- Svelte-specific: {#each}, {#if}, on:click, transition:slide -->
<div class="container">
  <h2>Delivery Cost Calculator</h2>

  <!-- Summary Stats -->
  <div class="stats">
    <div class="stat-box">
      <span class="stat-label">Packages</span>
      <span class="stat-num">{results.length}</span>
    </div>
    <div class="stat-box">
      <span class="stat-label">Total</span>
      <span class="stat-num orange">{totalCost}</span>
    </div>
    <div class="stat-box">
      <span class="stat-label">Saved</span>
      <span class="stat-num green">-{totalSaved}</span>
    </div>
  </div>

  <!-- Controls -->
  <div class="controls">
    <input
      bind:value={searchText}
      placeholder="Filter packages..."
      class="search"
    />
    <select bind:value={sortKey} class="sort">
      <option value="id">Sort: ID</option>
      <option value="totalCost">Sort: Cost</option>
    </select>
  </div>

  <!-- Base Cost Slider -->
  <div class="slider-row">
    <label>Base Cost:</label>
    <input type="range" bind:value={baseCost} min={50} max={200} />
    <span class="slider-val">{baseCost}</span>
  </div>

  <!-- Package List -->
  {#each filtered as r, i (r.id)}
    <button class="row" on:click={() => toggle(i)}>
      <span class="id">{r.id}</span>
      <span class="cost">{r.totalCost}</span>
      {#if r.discount > 0}
        <span class="badge">-{r.discount}</span>
      {/if}
      <span class="arrow">{activeIndex === i ? '\u25be' : '\u25b8'}</span>
    </button>
    {#if activeIndex === i}
      <div class="detail" transition:slide>
        <p>Delivery Cost: <strong>{r.deliveryCost}</strong></p>
        <p>Discount: <strong class="green">-{r.discount}</strong></p>
        <p>Total: <strong class="orange">{r.totalCost}</strong></p>
        <p>Est. Time: <strong>~{estimateTime(125, 70)}hrs</strong></p>
        <button class="remove" on:click|stopPropagation={() =>
          removePackage(r.id)}>
          Remove package
        </button>
      </div>
    {/if}
  {/each}

  {#if filtered.length === 0}
    <p class="empty">No matching packages.</p>
  {/if}

  <!-- Add Package -->
  <button class="add-btn" on:click={() => showForm = !showForm}>
    {showForm ? '\u2715 Cancel' : '+ Add Package'}
  </button>

  {#if showForm}
    <div class="add-form" transition:slide>
      <input bind:value={newId} placeholder="Package ID"
             class="form-input" />
      <div class="form-row">
        <input bind:value={newWeight} type="number"
               placeholder="Weight" class="form-input" />
        <input bind:value={newDistance} type="number"
               placeholder="Distance" class="form-input" />
      </div>
      <input bind:value={newOffer} placeholder="Offer Code"
             class="form-input" />
      <button class="submit" on:click={addPackage}>Add Package</button>
    </div>
  {/if}
</div>

<!-- Svelte-specific: global styles, orange/amber palette -->
<style>
  .container {
    max-width: 28rem; margin: 0 auto; padding: 1.5rem;
    background: #1c1917; border-radius: 0.75rem;
  }
  h2 { color: #fb923c; margin-bottom: 1rem; font-weight: 600; }
  .stats { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
  .stat-box {
    flex: 1; text-align: center; padding: 0.5rem;
    background: #292524; border-radius: 0.5rem;
  }
  .stat-label { display: block; font-size: 0.625rem; color: #a8a29e; }
  .stat-num { font-family: monospace; color: #fde68a; }
  .stat-num.orange { color: #fb923c; }
  .stat-num.green { color: #86efac; }
  .controls { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
  .search, .sort {
    background: #292524; border: 1px solid #44403c;
    border-radius: 0.375rem; padding: 0.375rem 0.5rem;
    color: #fde68a; font-size: 0.875rem;
  }
  .search { flex: 1; }
  .search::placeholder { color: #57534e; }
  .slider-row {
    display: flex; align-items: center; gap: 0.5rem;
    margin-bottom: 1rem; font-size: 0.75rem; color: #a8a29e;
  }
  .slider-row input[type="range"] { flex: 1; accent-color: #fb923c; }
  .slider-val { font-family: monospace; width: 2rem; color: #fdba74; }
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
  .badge {
    font-size: 0.625rem; background: #365314; color: #86efac;
    padding: 0.125rem 0.375rem; border-radius: 0.25rem;
  }
  .arrow { color: #a8a29e; font-size: 0.75rem; }
  .detail {
    padding: 0.75rem 1rem; margin-bottom: 0.5rem;
    background: #1a1512; border-left: 2px solid #f97316;
    color: #d6d3d1; font-size: 0.875rem;
  }
  .detail p { margin: 0.25rem 0; }
  .detail strong { color: #fde68a; }
  .detail .green { color: #86efac; }
  .detail .orange { color: #fb923c; }
  .remove {
    margin-top: 0.5rem; background: none; border: none;
    color: #f87171; opacity: 0.7; cursor: pointer; font-size: 0.75rem;
  }
  .remove:hover { opacity: 1; }
  .empty { color: #78716c; font-style: italic; text-align: center; }
  .add-btn {
    width: 100%; margin-top: 0.5rem; padding: 0.5rem;
    background: none; border: 1px dashed #44403c; color: #a8a29e;
    border-radius: 0.5rem; cursor: pointer; font-size: 0.875rem;
  }
  .add-btn:hover { border-color: #fb923c; color: #fb923c; }
  .add-form {
    margin-top: 0.5rem; padding: 0.75rem;
    background: #292524; border-radius: 0.5rem;
    border: 1px solid #44403c;
  }
  .form-input {
    width: 100%; background: #1c1917; border: 1px solid #44403c;
    border-radius: 0.25rem; padding: 0.375rem 0.5rem;
    color: #fde68a; font-size: 0.875rem; margin-bottom: 0.5rem;
  }
  .form-row { display: flex; gap: 0.5rem; }
  .form-row .form-input { width: auto; flex: 1; }
  .submit {
    width: 100%; padding: 0.375rem;
    background: #c2410c; color: #fff7ed; border: none;
    border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem;
  }
  .submit:hover { background: #ea580c; }
</style>`,
};

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

// ── Canvas rendering for locked code (hidden from browser inspect element) ──

const TOKEN_COLORS: Record<string, string> = {
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

const CANVAS_LINE_HEIGHT = 21;
const CANVAS_LINE_NUM_WIDTH = 50;
const CANVAS_CODE_PAD = 8;
const CANVAS_FONT = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

function drawLockedCode(
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

    // Line number (red tint)
    ctx.font = `10px ${CANVAS_FONT}`;
    ctx.fillStyle = '#ef444466';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), CANVAS_LINE_NUM_WIDTH - 6, y);

    // Red left border
    ctx.fillStyle = '#ef444433';
    ctx.fillRect(CANVAS_LINE_NUM_WIDTH, i * CANVAS_LINE_HEIGHT, 2, CANVAS_LINE_HEIGHT);

    // Code tokens (syntax highlighted)
    ctx.font = `12px ${CANVAS_FONT}`;
    ctx.textAlign = 'left';
    const tokens = tokenize(line, framework);
    let x = CANVAS_LINE_NUM_WIDTH + 2 + CANVAS_CODE_PAD;
    for (const token of tokens) {
      ctx.fillStyle = TOKEN_COLORS[token.className] || '#d4d4d8';
      ctx.fillText(token.text, x, y);
      x += ctx.measureText(token.text).width;
    }
  });
}

export function CodeSnippetPanel() {
  const [framework, setFramework] = useState<Framework>("react");
  const [commandInput, setCommandInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<CommandHistoryEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editedUI, setEditedUI] = useState<Record<Framework, string>>({ ...ORIGINAL_EDITABLE });
  const [pendingSwitch, setPendingSwitch] = useState<Framework | null>(null);
  const [keepEdits, setKeepEdits] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const editableRef = useRef<HTMLTextAreaElement>(null);
  const lineNumRef = useRef<HTMLDivElement>(null);
  const lockedCanvasRef = useRef<HTMLCanvasElement>(null);

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

  // Draw locked code on canvas (hidden from browser inspect element)
  useEffect(() => {
    if (!isOpen) return;
    const canvas = lockedCanvasRef.current;
    if (!canvas) return;
    const { locked: lockedCode } = splitSnippet(CODE_SNIPPETS[framework]);
    const lines = lockedCode.split('\n');
    drawLockedCode(canvas, lines, framework);

    const observer = new ResizeObserver(() => {
      drawLockedCode(canvas, lines, framework);
    });
    const container = canvas.parentElement;
    if (container) observer.observe(container);

    return () => observer.disconnect();
  }, [framework, isOpen]);

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
        if (isModified) {
          setPendingSwitch(target);
          setKeepEdits(true);
          return {
            output: `You have custom edits on ${FRAMEWORK_CONFIG[framework].label}. Confirm switch above.`,
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

  const confirmSwitch = () => {
    if (!pendingSwitch) return;
    const oldFramework = framework;
    if (!keepEdits) {
      setEditedUI((prev) => ({
        ...prev,
        [oldFramework]: ORIGINAL_EDITABLE[oldFramework],
      }));
    }
    setCommandHistory((prev) => [
      ...prev,
      {
        input: `use ${pendingSwitch}`,
        output: `Switched to ${FRAMEWORK_CONFIG[pendingSwitch].label}${keepEdits ? " (kept custom edits)" : " (reset edits)"}`,
        isError: false,
      },
    ]);
    setFramework(pendingSwitch);
    setPendingSwitch(null);
    setKeepEdits(true);
  };

  const cancelSwitch = () => {
    setCommandHistory((prev) => [
      ...prev,
      {
        input: `use ${pendingSwitch}`,
        output: "Switch cancelled.",
        isError: false,
      },
    ]);
    setPendingSwitch(null);
    setKeepEdits(true);
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

            {/* ── Locked Section: Core Logic (canvas-rendered, hidden from inspect) ── */}
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
              <canvas
                ref={lockedCanvasRef}
                className="w-full block"
                style={{ height: `${lockedLines.length * CANVAS_LINE_HEIGHT}px` }}
              />
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

            {/* Pending Switch Confirmation */}
            {pendingSwitch && (
              <div className="px-3 sm:px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 flex flex-wrap items-center gap-2 text-[10px] sm:text-xs font-mono">
                <span className="text-amber-400">
                  Switch to {FRAMEWORK_CONFIG[pendingSwitch].label}?
                </span>
                <label className="flex items-center gap-1 text-zinc-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={keepEdits}
                    onChange={(e) => setKeepEdits(e.target.checked)}
                    className="accent-pink-500 w-3 h-3"
                  />
                  keep custom edits
                </label>
                <button
                  onClick={confirmSwitch}
                  className="px-2 py-0.5 rounded bg-emerald-600/80 text-emerald-100 hover:bg-emerald-600 transition-colors"
                >
                  confirm
                </button>
                <button
                  onClick={cancelSwitch}
                  className="px-2 py-0.5 rounded bg-zinc-700/80 text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  cancel
                </button>
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
