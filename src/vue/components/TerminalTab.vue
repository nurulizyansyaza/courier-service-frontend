<script setup lang="ts">
import { ref, computed } from 'vue'
import { Terminal, ChevronDown, ChevronRight, Package, Loader2 } from 'lucide-vue-next'
import type { TabData, TransitPackage, ParsedResult } from '../../core/types'
import {
  calculateDeliveryCost,
  calculateDeliveryTimeWithTransit,
  parseOutput,
  setOffers,
} from '../../core/calculations'
import { useSession } from '../sessionStore'
import CodeSnippetPanel from './CodeSnippetPanel.vue'

const props = defineProps<{
  tab: TabData
}>()

const emit = defineEmits<{
  update: [updates: Partial<TabData>]
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const { session, getOffersForCalculation } = useSession()
const isGenerating = ref(false)

function syncOffers() {
  setOffers(getOffersForCalculation())
}

function isTimeInputComplete(inputText: string): boolean {
  const lines = inputText.trim().split('\n').map(l => l.trim()).filter(l => l)
  if (lines.length < 3) return false
  const headerParts = lines[0].split(/\s+/)
  if (headerParts.length < 2) return false
  const declaredCount = Number(headerParts[1])
  if (isNaN(declaredCount) || declaredCount < 1) return false
  const expectedLines = 1 + declaredCount + 1
  if (lines.length < expectedLines) return false
  const vehicleLineIndex = 1 + declaredCount
  if (vehicleLineIndex >= lines.length) return false
  const vehicleParts = lines[vehicleLineIndex].split(/\s+/).filter((p: string) => p.trim())
  if (vehicleParts.length !== 3) return false
  return vehicleParts.every((p: string) => !isNaN(Number(p)))
}

function handleInputChange(newValue: string) {
  if (
    props.tab.calculationType === 'time' &&
    isTimeInputComplete(props.tab.input)
  ) {
    const newLines = newValue.trim().split('\n').map(l => l.trim()).filter(l => l)
    const oldLines = props.tab.input.trim().split('\n').map(l => l.trim()).filter(l => l)

    if (newLines.length > oldLines.length) {
      const addedLine = newLines[newLines.length - 1]?.toLowerCase()
      if (addedLine && 'clear'.startsWith(addedLine)) {
        emit('update', { input: newValue })
        return
      }
      return
    }

    emit('update', { input: newValue })
    return
  }

  emit('update', { input: newValue })
}

function handleExecute() {
  if (!props.tab.input.trim()) {
    emit('update', {
      output: '',
      error: 'Error: No input provided',
      hasExecuted: true,
    })
    return
  }

  const trimmedInput = props.tab.input.trim()
  const lines = trimmedInput.split('\n').map(l => l.trim()).filter(l => l)
  const lastLine = lines[lines.length - 1]?.toLowerCase()

  if (lastLine === 'clear') {
    emit('update', {
      input: '',
      output: '',
      error: '',
      hasExecuted: false,
      executionTransitSnapshot: [],
      renamedPackages: [],
    })
    if (textareaRef.value) textareaRef.value.focus()
    return
  }

  // Delivery calculation
  isGenerating.value = true
  setTimeout(() => {
    try {
      syncOffers()
      if (props.tab.calculationType === 'cost') {
        const result = calculateDeliveryCost(props.tab.input)
        emit('update', {
          output: result,
          error: '',
          hasExecuted: true,
        })
      } else {
        const transitResult = calculateDeliveryTimeWithTransit(
          props.tab.input,
          props.tab.transitPackages,
        )
        const updatedTransit = [
          ...transitResult.stillInTransit,
          ...transitResult.newTransitPackages,
        ]
        emit('update', {
          output: transitResult.output,
          error: '',
          hasExecuted: true,
          transitPackages: updatedTransit,
          executionTransitSnapshot: [...props.tab.transitPackages],
          renamedPackages: transitResult.renamedPackages,
        })
      }
    } catch (err) {
      emit('update', {
        output: '',
        error: err instanceof Error ? err.message : 'Invalid input',
        hasExecuted: true,
      })
    }
    isGenerating.value = false
  }, 350)
}

function handleCalcTypeChange(type: 'cost' | 'time') {
  emit('update', {
    calculationType: type,
    output: '',
    error: '',
    hasExecuted: false,
  })
}

const parsedResults = computed(() =>
  parseOutput(
    props.tab.output,
    props.tab.calculationType,
    props.tab.input,
    props.tab.executionTransitSnapshot,
  )
)

const transitCount = computed(() => props.tab.transitPackages.length)
const gridCols = computed(() => 'xl:grid-cols-3')

const inputLines = computed(() =>
  props.tab.input === '' ? [''] : props.tab.input.split('\n')
)

const sortedResults = computed(() => {
  return [...parsedResults.value].sort((a, b) => {
    if (props.tab.calculationType !== 'time') return 0
    if (a.undeliverable && !b.undeliverable) return 1
    if (!a.undeliverable && b.undeliverable) return -1
    const roundA = a.deliveryRound ?? Infinity
    const roundB = b.deliveryRound ?? Infinity
    if (roundA !== roundB) return roundA - roundB
    return (b.weight ?? 0) - (a.weight ?? 0)
  })
})

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey && window.innerWidth >= 1280) {
    const lines = props.tab.input.trim().split('\n').map(l => l.trim()).filter(l => l)
    const lastLine = lines[lines.length - 1]?.toLowerCase()
    const isClear = lastLine === 'clear'

    if (
      props.tab.calculationType === 'time' &&
      !isClear &&
      !isTimeInputComplete(props.tab.input)
    ) {
      return
    }
    e.preventDefault()
    handleExecute()
  }
}

// Offer table formatting
function formatOfferDist(o: { minDistance: number; maxDistance: number }) {
  return o.minDistance === 0 ? `< ${o.maxDistance}` : `${o.minDistance} - ${o.maxDistance}`
}


</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden min-h-0">
    <!-- Calculation Type Selector -->
    <div class="px-4 py-3 sm:px-6 bg-[#1a0b2e] border-b border-[#2d1b4e] flex items-center gap-3 sm:gap-4 flex-wrap">
      <span class="text-sm text-zinc-400">Mode:</span>
      <div class="flex gap-2">
        <button
          @click="handleCalcTypeChange('cost')"
          :class="[
            'px-3 py-1.5 sm:px-4 text-sm rounded transition-colors',
            tab.calculationType === 'cost'
              ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
              : 'bg-[#251440] text-zinc-400 border border-[#2d1b4e] hover:text-pink-300'
          ]"
        >
          Delivery Cost
        </button>
        <button
          @click="handleCalcTypeChange('time')"
          :class="[
            'px-3 py-1.5 sm:px-4 text-sm rounded transition-colors',
            tab.calculationType === 'time'
              ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
              : 'bg-[#251440] text-zinc-400 border border-[#2d1b4e] hover:text-pink-300'
          ]"
        >
          Delivery Time
        </button>
      </div>
    </div>

    <!-- Responsive Layout -->
    <div :class="['flex-1 flex flex-col xl:grid overflow-auto xl:overflow-hidden scrollbar-pink', gridCols]">
      <!-- Input Panel -->
      <CollapsibleSection
        title="input"
        titleColor="text-pink-400"
        :defaultOpen="true"
        borderClass="xl:border-r border-b xl:border-b-0 border-[#2d1b4e]"
      >
        <template #icon>
          <Terminal class="w-4 h-4 text-pink-400" />
        </template>
        <div class="flex-1 overflow-auto p-4 font-mono text-sm scrollbar-pink">
          <!-- CLI Header -->
          <div class="text-zinc-600 mb-4">
            <div># Courier Service App Calculator</div>
            <div># Mode: {{ tab.calculationType === 'cost' ? 'Delivery Cost' : 'Delivery Time Estimation' }}</div>
            <div class="mt-2"># Input Format:</div>
            <div># Line 1: base_delivery_cost no_of_packages</div>
            <div># Line 2: pkg_id1 weight1_in_kg distance1_in_km offer_code1</div>
            <div v-if="tab.calculationType === 'time'"># Last line: no_of_vehicles max_speed max_weight</div>

            <!-- Dynamic Offer Table -->
            <div class="text-zinc-700 mt-2">------------------------------------</div>
            <div class="text-zinc-500">Code | Distance (km) | Weight (kg)</div>
            <div class="text-zinc-700">------------------------------------</div>
            <div v-for="o in session.offers" :key="o.code" class="text-zinc-500 whitespace-pre">{{ `${o.code} | ${formatOfferDist(o).padEnd(13)} | ${o.minWeight} - ${o.maxWeight}` }}</div>
            <div class="text-zinc-700">------------------------------------</div>

            <div class="mt-2">
              <span class="hidden xl:inline"># Press Enter to execute | Shift+Enter for new line | Type 'clear' to reset</span>
              <span class="xl:hidden"># Tap Run to execute | Enter for new line | Type 'clear' to reset</span>
            </div>
            <div class="border-t border-[#2d1b4e]/50 my-3"></div>
          </div>

          <!-- Command Prompt with $ on each line -->
          <div class="relative">
            <div
              class="absolute inset-0 pointer-events-none font-mono text-sm leading-relaxed"
              style="padding-top: 2px"
            >
              <div v-for="(_, i) in inputLines" :key="i" class="flex gap-2">
                <span class="text-pink-400">$</span>
              </div>
            </div>
            <textarea
              ref="textareaRef"
              :value="tab.input"
              @input="handleInputChange(($event.target as HTMLTextAreaElement).value)"
              @keydown="handleKeyDown"
              placeholder="Type your input here..."
              class="relative bg-transparent border-none outline-none resize-none text-zinc-100 placeholder:text-zinc-600 min-h-[150px] xl:min-h-[200px] w-full font-mono text-sm leading-relaxed"
              style="padding-left: 1.5rem"
              :spellcheck="false"
            />
          </div>

          <!-- Transit Section -->
          <TransitSection
            v-if="tab.calculationType === 'time' && transitCount > 0"
            :transitPackages="tab.transitPackages"
            :renamedPackages="tab.renamedPackages"
          />

          <!-- Footer: Run button only (mobile/tablet) -->
          <div class="mt-4 pt-4 border-t border-[#2d1b4e]/50 flex items-center justify-end">
            <button
              @click="handleExecute"
              class="xl:hidden px-4 py-1.5 text-sm rounded bg-pink-500/20 text-pink-400 border border-pink-500/30 hover:bg-pink-500/30 transition-colors whitespace-nowrap"
            >
              Run
            </button>
          </div>
        </div>
      </CollapsibleSection>

      <!-- Output Panel -->
      <CollapsibleSection
        title="output"
        titleColor="text-violet-400"
        :defaultOpen="true"
        borderClass="xl:border-r border-b xl:border-b-0 border-[#2d1b4e]"
      >
        <template #icon>
          <Terminal class="w-4 h-4 text-violet-400" />
        </template>
        <div class="flex-1 overflow-auto p-4 font-mono text-sm relative scrollbar-pink">
          <GeneratingOverlay v-if="isGenerating" label="generating new output..." />
          <div v-if="!tab.hasExecuted && !isGenerating" class="text-zinc-600">~ awaiting execution...</div>
          <div v-else-if="tab.error" class="text-red-400">
            <span class="text-red-500">Error:</span> {{ tab.error }}
          </div>
          <pre
            v-else-if="tab.output"
            class="whitespace-pre-wrap text-emerald-400"
          >{{ tab.output }}</pre>
        </div>
      </CollapsibleSection>

      <!-- Result Panel -->
      <CollapsibleSection
        title="result"
        titleColor="text-cyan-400"
        :defaultOpen="true"
        borderClass=""
      >
        <template #icon>
          <Terminal class="w-4 h-4 text-cyan-400" />
        </template>
        <div class="flex-1 overflow-auto p-4 relative scrollbar-pink">
          <GeneratingOverlay v-if="isGenerating" label="generating new result..." />
          <div v-if="!tab.hasExecuted && !isGenerating" class="font-mono text-sm text-zinc-600">~ awaiting execution...</div>
          <div v-else-if="parsedResults.length > 0" class="space-y-4">
            <ResultCard
              v-for="(result, index) in sortedResults"
              :key="index"
              :result="result"
              :calculationType="tab.calculationType"
            />
          </div>
          <div v-else-if="tab.error" class="font-mono text-sm text-red-400">Failed to parse results</div>
        </div>
      </CollapsibleSection>
    </div>

    <!-- Code Snippet Panel -->
    <CodeSnippetPanel />
  </div>
</template>

<!-- ── CollapsibleSection ──────────────────────────────────────────────── -->

<script lang="ts">
import { defineComponent, ref as vueRef } from 'vue'
import { ChevronDown as CDown, ChevronRight as CRight } from 'lucide-vue-next'

const CollapsibleSection = defineComponent({
  name: 'CollapsibleSection',
  components: { CDown, CRight },
  props: {
    title: { type: String, required: true },
    titleColor: { type: String, default: '' },
    defaultOpen: { type: Boolean, default: true },
    borderClass: { type: String, default: '' },
  },
  setup(props, { slots }) {
    const isOpen = vueRef(props.defaultOpen)
    return { isOpen, slots }
  },
  template: `
    <div :class="['flex flex-col bg-[#0d0118] xl:min-h-0', borderClass]">
      <button
        @click="isOpen = !isOpen"
        class="px-4 py-2 bg-[#1a0b2e]/50 border-b border-[#2d1b4e] flex items-center gap-2 w-full xl:cursor-default"
      >
        <span class="xl:hidden text-zinc-500">
          <CDown v-if="isOpen" class="w-3.5 h-3.5" />
          <CRight v-else class="w-3.5 h-3.5" />
        </span>
        <slot name="icon" />
        <span :class="['text-sm font-mono', titleColor]">{{ title }}</span>
        <slot name="badge" />
      </button>
      <div :class="[isOpen ? 'flex-1 flex flex-col' : 'hidden', 'xl:!flex xl:flex-1 xl:flex-col overflow-hidden']">
        <slot />
      </div>
    </div>
  `,
})

const GeneratingOverlay = defineComponent({
  name: 'GeneratingOverlay',
  props: {
    label: { type: String, required: true },
  },
  components: { Loader2: () => import('lucide-vue-next').then(m => m.Loader2) },
  template: `
    <div class="absolute inset-0 bg-[#0d0118]/80 backdrop-blur-sm flex items-center justify-center z-10">
      <div class="flex items-center gap-2 text-sm font-mono">
        <Loader2 class="w-4 h-4 text-pink-400 animate-spin" />
        <span class="text-pink-400 animate-pulse">{{ label }}</span>
      </div>
    </div>
  `,
})

const TransitSection = defineComponent({
  name: 'TransitSection',
  props: {
    transitPackages: { type: Array as () => TransitPackage[], required: true },
    renamedPackages: { type: Array as () => { oldId: string; newId: string }[], required: true },
  },
  components: {
    CDown, CRight,
    PackageIcon: () => import('lucide-vue-next').then(m => m.Package),
  },
  setup(props) {
    const isOpen = vueRef(false)
    const renameNewToOld = new Map(
      props.renamedPackages.map(rp => [rp.newId.toLowerCase(), rp.oldId])
    )
    return { isOpen, renameNewToOld }
  },
  template: `
    <div class="mt-4 border border-amber-500/30 rounded-lg overflow-hidden bg-amber-500/5">
      <button
        @click="isOpen = !isOpen"
        class="w-full px-3 py-2 flex items-center gap-2 text-xs font-mono hover:bg-amber-500/10 transition-colors"
      >
        <span class="xl:hidden text-amber-500/60">
          <CDown v-if="isOpen" class="w-3 h-3" />
          <CRight v-else class="w-3 h-3" />
        </span>
        <PackageIcon class="w-3.5 h-3.5 text-amber-400" />
        <span class="text-amber-400">&gt;_ package in transit</span>
        <span class="text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded text-[10px]">{{ transitPackages.length }}</span>
      </button>
      <div :class="[isOpen ? 'block' : 'hidden', 'xl:!block']">
        <div class="px-3 pb-2 space-y-1.5">
          <div
            v-for="(tp, index) in transitPackages"
            :key="tp.id + '-' + index"
            class="flex items-center gap-3 px-2 py-1.5 bg-amber-500/5 border border-amber-500/20 rounded text-xs font-mono"
          >
            <span v-if="renameNewToOld.get(tp.id.toLowerCase())" class="flex items-center gap-1.5">
              <span class="text-zinc-600 line-through">{{ renameNewToOld.get(tp.id.toLowerCase()) }}</span>
              <span class="text-amber-300">{{ tp.id }}</span>
              <span class="inline-flex items-center px-1 py-0.5 rounded text-[9px] bg-violet-500/20 text-violet-400 border border-violet-500/30">ID Notified</span>
            </span>
            <span v-else class="text-amber-300">{{ tp.id }}</span>
            <span class="text-zinc-500">{{ tp.weight }}kg</span>
            <span class="text-zinc-500">{{ tp.distance }}km</span>
            <span class="text-zinc-600">{{ tp.offerCode }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
})



const ResultCard = defineComponent({
  name: 'ResultCard',
  props: {
    result: { type: Object as () => ParsedResult, required: true },
    calculationType: { type: String as () => 'cost' | 'time', required: true },
  },
  components: {
    PackageIcon: () => import('lucide-vue-next').then(m => m.Package),
  },
  setup(props) {
    const discount = parseFloat(props.result.discount)
    const deliveryCost = props.result.deliveryCost
    const discountPercent = discount > 0 ? ((discount / deliveryCost) * 100).toFixed(0) : 0
    return { discount, deliveryCost, discountPercent }
  },
  template: `
    <div :class="['bg-[#1a0b2e]/40 border rounded-lg p-4 sm:p-5 space-y-3', result.undeliverable ? 'border-amber-500/40' : 'border-[#2d1b4e]']">
      <!-- In Transit badge + Undeliverable banner -->
      <div v-if="result.undeliverable && result.undeliverableReason" class="space-y-2">
        <div class="flex justify-end">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <PackageIcon class="w-3 h-3" />
            In Transit
          </span>
        </div>
        <div class="bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2 text-xs font-mono text-amber-400">
          <span class="text-amber-500">&#x26A0;</span> {{ result.undeliverableReason }}
        </div>
      </div>

      <!-- Delivery Round & Vehicle (time mode only, deliverable packages) -->
      <div v-if="!result.undeliverable && result.deliveryRound !== undefined && result.vehicleId !== undefined" class="space-y-1.5 pb-2 border-b border-[#2d1b4e]/50">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono">
          <span class="text-zinc-500">Packages Remaining: <span class="text-zinc-300">{{ result.packagesRemaining ?? 0 }}</span></span>
        </div>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono">
          <span class="text-purple-400/80">Delivery Round: <span class="text-purple-300">{{ result.deliveryRound }}</span></span>
          <span class="text-zinc-600">|</span>
          <span class="text-cyan-400/80">Vehicle Available: <span class="text-cyan-300">Vehicle{{ result.vehicleId }}</span></span>
          <span class="text-zinc-600">|</span>
          <span class="text-zinc-500">Current Time: <span class="text-zinc-300">{{ (result.currentTime ?? 0).toFixed(2) }} hrs</span></span>
        </div>
        <div class="text-xs font-mono text-amber-400/80 mt-1">
          <template v-if="result.currentTime !== undefined && result.currentTime > 0">
            Vehicle{{ result.vehicleId }} will be available after {{ result.currentTime.toFixed(2) }} + {{ (result.roundTripTime ?? 0).toFixed(2) }} = <span class="text-amber-300">{{ (result.vehicleReturnTime ?? 0).toFixed(2) }} hrs</span>
          </template>
          <template v-else>
            Vehicle{{ result.vehicleId }} will be available after <span class="text-amber-300">{{ (result.vehicleReturnTime ?? 0).toFixed(2) }} hrs</span>
          </template>
        </div>
      </div>

      <!-- Title — package ID -->
      <div class="flex items-center gap-2 pb-2 border-b border-[#2d1b4e]/50">
        <template v-if="result.renamedFrom">
          <span class="text-zinc-500 font-mono line-through">{{ result.renamedFrom }}</span>
          <span class="text-pink-400 font-mono font-semibold">{{ result.id }}</span>
          <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-violet-500/20 text-violet-400 border border-violet-500/30">Notified</span>
        </template>
        <span v-else class="text-pink-400 font-mono font-semibold">{{ result.id }}</span>
      </div>

      <!-- Header -->
      <div class="text-sm text-zinc-300 space-y-1">
        <div><span class="text-zinc-500">Base delivery cost:</span> <span class="font-semibold">{{ result.baseCost }}</span></div>
        <div>
          <span class="text-zinc-500">Weight:</span> <span class="font-semibold">{{ result.weight }}kg</span>
          {{ ' | ' }}
          <span class="text-zinc-500">Distance:</span> <span class="font-semibold">{{ result.distance }}km</span>
        </div>
        <div>
          <span class="text-zinc-500">Offer code:</span>
          <span :class="['font-semibold', result.offerApplied ? 'text-emerald-400' : 'text-zinc-600']">{{ result.offerApplied || 'N/A' }}</span>
        </div>
      </div>

      <div class="border-t border-[#2d1b4e]/50 pt-3 space-y-3">
        <!-- Delivery Cost -->
        <div class="flex justify-between items-start text-sm">
          <div>
            <div class="text-zinc-400">Delivery Cost</div>
            <div class="text-xs text-zinc-600 font-mono mt-0.5">{{ result.baseCost }} + ({{ result.weight }} * 10) + ({{ result.distance }} * 5)</div>
          </div>
          <div class="text-zinc-300 font-semibold font-mono">{{ deliveryCost.toFixed(2) }}</div>
        </div>

        <div class="border-t border-[#2d1b4e]/30"></div>

        <!-- Discount -->
        <div class="flex justify-between items-start text-sm">
          <div>
            <div class="text-zinc-400">Discount</div>
            <div class="text-xs text-zinc-600 mt-0.5">{{ discount > 0 ? '(' + discountPercent + '% of ' + deliveryCost.toFixed(2) + ' i.e; Delivery Cost)' : '(Offer not applicable as criteria not met)' }}</div>
          </div>
          <div :class="['font-semibold font-mono', discount > 0 ? 'text-emerald-400' : 'text-zinc-600']">{{ discount > 0 ? '-' : '' }}{{ discount.toFixed(2) }}</div>
        </div>

        <div class="border-t border-[#2d1b4e]"></div>

        <!-- Total Cost -->
        <div class="flex justify-between items-center">
          <div class="text-zinc-300 font-semibold">Total cost</div>
          <div class="text-pink-400 font-bold text-lg font-mono">{{ result.totalCost }}</div>
        </div>

        <!-- Delivery Time (if available) -->
        <template v-if="result.deliveryTime !== undefined">
          <div class="border-t border-[#2d1b4e]/30"></div>
          <div class="flex justify-between items-center text-sm">
            <div class="text-zinc-400">Delivery Time</div>
            <div :class="['font-semibold font-mono', result.undeliverable ? 'text-amber-400' : 'text-cyan-400']">{{ result.undeliverable ? 'N/A' : result.deliveryTime + 'hrs' }}</div>
          </div>
        </template>
      </div>
    </div>
  `,
})

export default {
  components: {
    CollapsibleSection,
    GeneratingOverlay,
    TransitSection,
    ResultCard,
  },
}
</script>
