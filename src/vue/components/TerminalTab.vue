<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { Package, Loader2 } from 'lucide-vue-next'
import type { TabData, TransitPackage, ParsedResult, HistoryEntry } from '../../core/types'
import { setOffers } from '@nurulizyansyaza/courier-service-core'
import { MOTORCYCLE_ART, COURIER_ART, FRAMEWORK_COLORS } from '../../core/constants'
import { formatOfferDist, getLastClearIndex } from '../../core/utils'
import { processCommand } from '../../core/terminalCommands'
import { runCalculation } from '../../core/calculationRunner'
import { executeFrameworkSwitch } from '../../core/frameworkSwitchOrchestrator'
import { sortDeliveryResults, getDiscountPercent, isScrolledToBottom, resizeTextarea } from '../../core/terminalHelpers'
import { getTabState, setTabState } from '../../core/tabStateManager'
import { CommandHistoryNavigator } from '../../core/commandHistory'
import { useSession } from '../sessionStore'

const props = defineProps<{ tab: TabData }>()
const emit = defineEmits<{ update: [updates: Partial<TabData>] }>()

const { session, getOffersForCalculation } = useSession()

const inputRef = ref<HTMLTextAreaElement | null>(null)
const scrollAreaRef = ref<HTMLDivElement | null>(null)
const clearMarkerRef = ref<HTMLDivElement | null>(null)
const cmdHistory = new CommandHistoryNavigator(props.tab.id)

const tabState = getTabState(props.tab.id)
const currentInput = ref(tabState.currentInput)
const history = ref<HistoryEntry[]>(tabState.history)
const framework = ref<'react' | 'vue' | 'svelte'>(tabState.framework)
const isGenerating = ref(tabState.isGenerating)
const showWelcome = ref(tabState.showWelcome)
const shouldAutoScroll = ref(tabState.shouldAutoScroll)
const isConnected = ref(tabState.isConnected)

// Sync state changes back to tab state manager
watch(
  [currentInput, history, framework, isGenerating, showWelcome, shouldAutoScroll, isConnected],
  () => {
    setTabState(props.tab.id, {
      currentInput: currentInput.value,
      history: history.value,
      framework: framework.value,
      isGenerating: isGenerating.value,
      showWelcome: showWelcome.value,
      shouldAutoScroll: shouldAutoScroll.value,
      isConnected: isConnected.value,
    })
  },
)

// Auto-scroll to bottom when history changes
watch(
  () => history.value.length,
  () => {
    if (shouldAutoScroll.value) {
      nextTick(() => {
        if (scrollAreaRef.value) {
          scrollAreaRef.value.scrollTop = scrollAreaRef.value.scrollHeight
        }
      })
    }
  },
)

function handleScroll() {
  if (scrollAreaRef.value) {
    shouldAutoScroll.value = isScrolledToBottom(scrollAreaRef.value)
  }
}

function syncOffers() {
  setOffers(getOffersForCalculation())
}

function addToHistory(entry: HistoryEntry) {
  history.value = [...history.value, { ...entry, timestamp: Date.now() }]
}

function handleCommand(cmd: string): boolean {
  const action = processCommand(cmd, isConnected.value)
  if (!action) return false

  switch (action.type) {
    case 'connect':
      isConnected.value = true
      history.value = [{ type: 'welcome', content: 'reconnect', timestamp: Date.now() }]
      showWelcome.value = true
      action.historyEntries.forEach(e => addToHistory(e))
      break
    case 'already-connected':
    case 'not-connected':
    case 'unknown-framework':
    case 'unknown-mode':
    case 'invalid-change':
      action.historyEntries.forEach(e => addToHistory(e))
      break
    case 'switch-framework': {
      const previousFramework = framework.value
      action.historyEntries.forEach(e => addToHistory(e))
      executeFrameworkSwitch(props.tab.id, action.framework, previousFramework, {
        setFramework: (fw) => { framework.value = fw },
        addToHistory,
      })
      break
    }
    case 'change-mode':
      emit('update', { calculationType: action.mode })
      action.historyEntries.forEach(e => addToHistory(e))
      break
    case 'clear':
      addToHistory(action.historyEntries[0])
      setTimeout(() => {
        if (scrollAreaRef.value && clearMarkerRef.value) {
          clearMarkerRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 50)
      break
    case 'restart':
      addToHistory(action.historyEntries[0])
      break
    case 'help':
      addToHistory(action.historyEntries[0])
      break
    case 'exit':
      isConnected.value = false
      history.value = []
      showWelcome.value = false
      emit('update', action.tabUpdates)
      break
  }
  return true
}

function handleExecute() {
  if (!currentInput.value.trim()) return
  const input = currentInput.value.trim()
  cmdHistory.onExecute(input)

  if (handleCommand(input)) {
    currentInput.value = ''
    setTimeout(() => { if (inputRef.value) resizeTextarea(inputRef.value) }, 0)
    return
  }

  addToHistory({ type: 'input', content: input })
  isGenerating.value = true
  showWelcome.value = false

  setTimeout(async () => {
    syncOffers()
    const result = await runCalculation(input, props.tab.calculationType, props.tab.transitPackages)
    result.historyEntries.forEach(e => addToHistory(e))
    emit('update', result.tabUpdates)
    isGenerating.value = false
    currentInput.value = ''
    setTimeout(() => { if (inputRef.value) resizeTextarea(inputRef.value) }, 0)
  }, 350)
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleExecute()
  } else if (e.key === 'c' && e.ctrlKey && !e.metaKey) {
    e.preventDefault()
    currentInput.value = ''
    cmdHistory.resetCursor()
    setTimeout(() => { if (inputRef.value) resizeTextarea(inputRef.value) }, 0)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    const prev = cmdHistory.navigateUp(currentInput.value)
    if (prev !== null) {
      currentInput.value = prev
      setTimeout(() => { if (inputRef.value) resizeTextarea(inputRef.value) }, 0)
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    const next = cmdHistory.navigateDown()
    currentInput.value = next
    setTimeout(() => { if (inputRef.value) resizeTextarea(inputRef.value) }, 0)
  }
}
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#0d0118]">
    <!-- Main terminal area with scrollable history -->
    <div
      ref="scrollAreaRef"
      class="flex-1 overflow-y-auto scrollbar-pink p-4 sm:p-6 font-mono text-sm"
      @scroll="handleScroll"
    >
      <!-- History entries -->
      <div v-for="(entry, idx) in history" :key="idx" class="mb-3">
        <!-- Input -->
        <template v-if="entry.type === 'input'">
          <div class="flex gap-2">
            <span class="text-pink-400 select-none">❯</span>
            <div class="text-zinc-300 whitespace-pre-wrap break-all">{{ entry.content }}</div>
          </div>
        </template>

        <!-- Output -->
        <template v-if="entry.type === 'output'">
          <div class="ml-4 text-emerald-400 whitespace-pre-wrap text-xs">{{ entry.content }}</div>
        </template>

        <!-- Result -->
        <template v-if="entry.type === 'result' && entry.parsedResults">
          <div class="ml-4 space-y-3 mt-2">
            <div
              v-for="(result, i) in sortDeliveryResults(entry.parsedResults, entry.calculationType)"
              :key="i"
              :class="[
                'bg-[#1a0b2e]/40 border rounded-lg p-4 sm:p-5 space-y-3',
                result.undeliverable ? 'border-amber-500/40' : 'border-[#2d1b4e]',
              ]"
            >
              <!-- Undeliverable banner -->
              <div v-if="result.undeliverable && result.undeliverableReason" class="space-y-2">
                <div class="flex justify-end">
                  <span
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  >
                    <Package class="w-3 h-3" />
                    In Transit
                  </span>
                </div>
                <div
                  class="bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2 text-xs font-mono text-amber-400"
                >
                  <span class="text-amber-500">&#x26A0;</span>
                  {{ result.undeliverableReason }}
                </div>
              </div>

              <!-- Delivery Round & Vehicle (time mode, deliverable) -->
              <div
                v-if="
                  !result.undeliverable &&
                  result.deliveryRound !== undefined &&
                  result.vehicleId !== undefined
                "
                class="space-y-1.5 pb-2 border-b border-[#2d1b4e]/50"
              >
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono">
                  <span class="text-zinc-500"
                    >Packages Remaining:
                    <span class="text-zinc-300">{{ result.packagesRemaining ?? 0 }}</span></span
                  >
                </div>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono">
                  <span class="text-purple-400/80"
                    >Delivery Round:
                    <span class="text-purple-300">{{ result.deliveryRound }}</span></span
                  >
                  <span class="text-zinc-600">|</span>
                  <span class="text-cyan-400/80"
                    >Vehicle Available:
                    <span class="text-cyan-300">Vehicle{{ result.vehicleId }}</span></span
                  >
                  <span class="text-zinc-600">|</span>
                  <span class="text-zinc-500"
                    >Current Time:
                    <span class="text-zinc-300"
                      >{{ (result.currentTime ?? 0).toFixed(2) }} hrs</span
                    ></span
                  >
                </div>
                <div class="text-xs font-mono text-amber-400/80 mt-1">
                  <template v-if="result.currentTime !== undefined && result.currentTime > 0">
                    Vehicle{{ result.vehicleId }} will be available after
                    {{ result.currentTime.toFixed(2) }} +
                    {{ (result.roundTripTime ?? 0).toFixed(2) }} =
                    <span class="text-amber-300"
                      >{{ (result.vehicleReturnTime ?? 0).toFixed(2) }} hrs</span
                    >
                  </template>
                  <template v-else>
                    Vehicle{{ result.vehicleId }} will be available after
                    <span class="text-amber-300"
                      >{{ (result.vehicleReturnTime ?? 0).toFixed(2) }} hrs</span
                    >
                  </template>
                </div>
              </div>

              <!-- Title — package ID -->
              <div class="flex items-center gap-2 pb-2 border-b border-[#2d1b4e]/50">
                <template v-if="result.renamedFrom">
                  <span class="text-zinc-500 font-mono line-through">{{
                    result.renamedFrom
                  }}</span>
                  <span class="text-pink-400 font-mono font-semibold">{{ result.id }}</span>
                  <span
                    class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-violet-500/20 text-violet-400 border border-violet-500/30"
                    >Notified</span
                  >
                </template>
                <template v-else>
                  <span class="text-pink-400 font-mono font-semibold">{{ result.id }}</span>
                </template>
              </div>

              <!-- Header -->
              <div class="text-sm text-zinc-300 space-y-1">
                <div>
                  <span class="text-zinc-500">Base delivery cost:</span>
                  <span class="font-semibold"> {{ result.baseCost }}</span>
                </div>
                <div>
                  <span class="text-zinc-500">Weight:</span>
                  <span class="font-semibold"> {{ result.weight }}kg</span> |
                  <span class="text-zinc-500">Distance:</span>
                  <span class="font-semibold"> {{ result.distance }}km</span>
                </div>
                <div>
                  <span class="text-zinc-500">Offer code:</span>
                  <span
                    :class="[
                      'font-semibold',
                      result.offerApplied ? 'text-emerald-400' : 'text-zinc-600',
                    ]"
                  >
                    {{ result.offerApplied || 'N/A' }}
                  </span>
                </div>
              </div>

              <div class="border-t border-[#2d1b4e]/50 pt-3 space-y-3">
                <!-- Delivery Cost -->
                <div class="flex justify-between items-start text-sm">
                  <div>
                    <div class="text-zinc-400">Delivery Cost</div>
                    <div class="text-xs text-zinc-600 font-mono mt-0.5">
                      {{ result.baseCost }} + ({{ result.weight }} * 10) + ({{ result.distance }} *
                      5)
                    </div>
                  </div>
                  <div class="text-zinc-300 font-semibold font-mono">
                    {{ result.deliveryCost.toFixed(2) }}
                  </div>
                </div>

                <div class="border-t border-[#2d1b4e]/30"></div>

                <!-- Discount -->
                <div class="flex justify-between items-start text-sm">
                  <div>
                    <div class="text-zinc-400">Discount</div>
                    <div class="text-xs text-zinc-600 mt-0.5">
                      <template v-if="parseFloat(result.discount) > 0">
                        ({{ getDiscountPercent(result) }}% of
                        {{ result.deliveryCost.toFixed(2) }} i.e; Delivery Cost)
                      </template>
                      <template v-else>
                        (Offer not applicable as criteria not met)
                      </template>
                    </div>
                  </div>
                  <div
                    :class="[
                      'font-semibold font-mono',
                      parseFloat(result.discount) > 0 ? 'text-emerald-400' : 'text-zinc-600',
                    ]"
                  >
                    {{ parseFloat(result.discount) > 0 ? '-' : ''
                    }}{{ parseFloat(result.discount).toFixed(2) }}
                  </div>
                </div>

                <div class="border-t border-[#2d1b4e]"></div>

                <!-- Total Cost -->
                <div class="flex justify-between items-center">
                  <div class="text-zinc-300 font-semibold">Total cost</div>
                  <div class="text-pink-400 font-bold text-lg font-mono">
                    {{ result.totalCost }}
                  </div>
                </div>

                <!-- Delivery Time -->
                <template v-if="result.deliveryTime !== undefined">
                  <div class="border-t border-[#2d1b4e]/30"></div>
                  <div class="flex justify-between items-center text-sm">
                    <div class="text-zinc-400">Delivery Time</div>
                    <div
                      :class="[
                        'font-semibold font-mono',
                        result.undeliverable ? 'text-amber-400' : 'text-cyan-400',
                      ]"
                    >
                      {{ result.undeliverable ? 'N/A' : `${result.deliveryTime}hrs` }}
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </template>

        <!-- Command -->
        <template v-if="entry.type === 'command'">
          <div class="text-cyan-400 text-xs">{{ entry.content }}</div>
        </template>

        <!-- Error -->
        <template v-if="entry.type === 'error'">
          <div class="ml-4 text-red-400 text-xs">{{ entry.content }}</div>
        </template>

        <!-- Info -->
        <template v-if="entry.type === 'info'">
          <div class="ml-4 text-cyan-400 text-xs">{{ entry.content }}</div>
        </template>

        <!-- Clear -->
        <template v-if="entry.type === 'clear'">
          <div :ref="idx === getLastClearIndex(history) ? (el) => (clearMarkerRef = el as HTMLDivElement) : undefined">
            <div class="flex gap-2">
              <span class="text-pink-400 select-none">❯</span>
              <div class="text-zinc-300 whitespace-pre-wrap break-all">{{ entry.content }}</div>
            </div>
            <div
              v-if="idx === getLastClearIndex(history) && idx >= history.length - 1"
              :style="{ height: tab.transitPackages.length > 0 ? 'calc(100vh - 262px)' : 'calc(100vh - 210px)' }"
            ></div>
          </div>
        </template>

        <!-- Welcome (from /restart) -->
        <template v-if="entry.type === 'welcome'">
          <div class="mb-4 sm:mb-6">
            <div class="text-xs sm:text-sm text-zinc-400 space-y-1 mb-3 sm:mb-4">
              <div class="text-pink-400 font-semibold text-sm sm:text-base md:text-lg">
                Welcome to Courier CLI!
              </div>
              <div class="text-zinc-500 text-xs sm:text-sm">
                Calculate delivery costs and optimize delivery times with real time package tracking
              </div>
            </div>

            <div class="mb-3 sm:mb-4">
              <div class="flex flex-col">
                <pre
                  class="text-pink-300/80 text-[6px] sm:text-xs md:text-sm select-none leading-tight overflow-x-auto"
                  v-text="MOTORCYCLE_ART"
                ></pre>
                <pre
                  class="text-pink-300/80 text-[8px] sm:text-[10px] md:text-lg xl:text-xl select-none leading-tight overflow-x-auto"
                  v-text="COURIER_ART"
                ></pre>
              </div>
            </div>

            <div class="flex gap-1 text-zinc-600 text-[9px] sm:text-[10px] mb-3 sm:mb-4">
              <span class="text-emerald-400">●</span>
              <span>Connected to Courier Service</span>
            </div>

            <div class="text-zinc-600 text-xs mb-3 sm:mb-4">
              <div class="text-cyan-400/80 mb-1.5 sm:mb-2 text-xs sm:text-sm">
                Available Offer Codes:
              </div>
              <div class="text-zinc-700 text-[9px] sm:text-[10px]">
                ─────────────────────────────────────────
              </div>
              <div class="text-zinc-500 font-mono text-[9px] sm:text-[10px] md:text-xs">
                Code | Distance (km) | Weight (kg)
              </div>
              <div class="text-zinc-700 text-[9px] sm:text-[10px]">
                ─────────────────────────────────────────
              </div>
              <div
                v-for="o in session.offers"
                :key="o.code"
                class="text-zinc-500 font-mono text-[9px] sm:text-[10px] md:text-xs"
              >
                {{ `${o.code.padEnd(8)}| ${formatOfferDist(o).padEnd(13)} | ${o.minWeight} - ${o.maxWeight}` }}
              </div>
              <div class="text-zinc-700 text-[9px] sm:text-[10px]">
                ─────────────────────────────────────────
              </div>
            </div>

            <div class="border-t border-[#2d1b4e]/30 my-3 sm:my-4"></div>

            <div class="text-zinc-600 text-xs mb-3 sm:mb-4">
              <div class="text-pink-400/70 mb-1 text-xs sm:text-sm">Input Format:</div>
              <div
                class="font-mono text-[9px] sm:text-[10px] md:text-xs pl-1.5 sm:pl-2 space-y-0.5"
              >
                <div>
                  Line 1:
                  <span class="text-zinc-500">base_delivery_cost no_of_packages</span>
                </div>
                <div>
                  Line 2+:
                  <span class="text-zinc-500">pkg_id weight_kg distance_km offer_code</span>
                </div>
                <div v-if="tab.calculationType === 'time'">
                  Last line:
                  <span class="text-zinc-500">no_of_vehicles max_speed max_weight</span>
                </div>
              </div>
              <div class="mt-2">
                <div class="text-amber-400/70 mb-1 text-xs sm:text-sm">
                  {{ tab.calculationType === 'time' ? 'Example (Time):' : 'Example (Cost):' }}
                </div>
                <div
                  class="font-mono text-[9px] sm:text-[10px] md:text-xs pl-1.5 sm:pl-2 space-y-0.5"
                >
                  <div>Line 1: <span class="text-zinc-500">100 3</span></div>
                  <div>Line 2: <span class="text-zinc-500">pkg1 50 70 ofr001</span></div>
                  <div>Line 3: <span class="text-zinc-500">pkg2 75 70 ofr003</span></div>
                  <div>Line 4: <span class="text-zinc-500">pkg3 100 200 ofr002</span></div>
                  <div v-if="tab.calculationType === 'time'">
                    Line 5: <span class="text-zinc-500">2 70 250</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="border-t border-[#2d1b4e]/30 my-3 sm:my-4"></div>

            <div class="text-zinc-600 text-xs mb-3 sm:mb-4">
              <div class="text-cyan-400/70 mb-1 text-xs sm:text-sm">Available Commands:</div>
              <div
                class="font-mono text-[9px] sm:text-[10px] md:text-xs pl-1.5 sm:pl-2 space-y-0.5"
              >
                <div>
                  <span class="text-emerald-400">/change use</span>
                  <span class="text-zinc-500"> react | vue | svelte</span> - Switch framework
                </div>
                <div>
                  <span class="text-emerald-400">/change mode</span>
                  <span class="text-zinc-500"> cost | time</span> - Switch calculation mode
                </div>
                <div>
                  <span class="text-amber-400">clear</span> - Clear screen (scroll up to see
                  history)
                </div>
                <div>
                  <span class="text-cyan-400">/restart</span> - Show welcome screen again
                </div>
                <div>
                  <span class="text-cyan-400">help</span> - Show available commands
                </div>
                <div><span class="text-red-400">exit</span> - Exit and reset terminal</div>
                <div>
                  <span class="text-emerald-400">/connect</span> - Reconnect after exit
                </div>
                <div><span class="text-zinc-500">↑ / ↓</span> - Navigate command history</div>
                <div><span class="text-zinc-500">Ctrl+C</span> - Clear current input</div>
              </div>
            </div>

            <div class="border-t border-[#2d1b4e]/30 my-3 sm:my-4"></div>
          </div>
        </template>

        <template v-if="entry.type === 'help'">
          <div class="mb-4 sm:mb-6">
            <div class="border-t border-[#2d1b4e]/30 my-3 sm:my-4"></div>
            <div class="text-zinc-600 text-xs mb-3 sm:mb-4">
              <div class="text-cyan-400/70 mb-1 text-xs sm:text-sm">Available Commands:</div>
              <div
                class="font-mono text-[9px] sm:text-[10px] md:text-xs pl-1.5 sm:pl-2 space-y-0.5"
              >
                <div>
                  <span class="text-emerald-400">/change use</span>
                  <span class="text-zinc-500"> react | vue | svelte</span> - Switch framework
                </div>
                <div>
                  <span class="text-emerald-400">/change mode</span>
                  <span class="text-zinc-500"> cost | time</span> - Switch calculation mode
                </div>
                <div>
                  <span class="text-amber-400">clear</span> - Clear screen (scroll up to see
                  history)
                </div>
                <div>
                  <span class="text-cyan-400">/restart</span> - Show welcome screen again
                </div>
                <div>
                  <span class="text-cyan-400">help</span> - Show available commands
                </div>
                <div><span class="text-red-400">exit</span> - Exit and reset terminal</div>
                <div>
                  <span class="text-emerald-400">/connect</span> - Reconnect after exit
                </div>
                <div><span class="text-zinc-500">↑ / ↓</span> - Navigate command history</div>
                <div><span class="text-zinc-500">Ctrl+C</span> - Clear current input</div>
              </div>
            </div>
            <div class="border-t border-[#2d1b4e]/30 my-3 sm:my-4"></div>
          </div>
        </template>
      </div>

      <!-- Generating indicator -->
      <div v-if="isGenerating" class="flex items-center gap-2 text-pink-400 text-xs">
        <Loader2 class="w-3 h-3 animate-spin" />
        <span class="animate-pulse">Calculating...</span>
      </div>

      <!-- Disconnected state -->
      <div v-if="!isConnected">
        <div class="mb-3 sm:mb-4">
          <div class="flex flex-col justify-center">
            <pre
              class="text-pink-300/80 text-[6px] sm:text-xs md:text-sm select-none leading-tight overflow-x-auto"
              v-text="MOTORCYCLE_ART"
            ></pre>
            <pre
              class="text-pink-300/80 text-[8px] sm:text-[10px] md:text-lg xl:text-xl select-none leading-tight overflow-x-auto"
              v-text="COURIER_ART"
            ></pre>
          </div>
        </div>

        <div
          class="flex gap-1 items-center text-zinc-600 text-[9px] sm:text-[10px] mb-3 sm:mb-4"
        >
          <span class="text-red-400">●</span>
          <span>Disconnected from Courier Service</span>
        </div>

        <div class="text-zinc-400 text-sm mb-2 mt-8">Terminal Disconnected</div>
        <div class="text-zinc-600 text-xs mb-4">The CLI connection has been closed</div>
        <div class="text-pink-400/70 text-xs font-mono">
          Type <span class="text-cyan-400">/connect</span> to reconnect
        </div>
      </div>

      <!-- Transit packages indicator -->
      <div v-if="tab.transitPackages.length > 0" class="mt-4 mb-2">
        <div class="flex items-center gap-2 text-amber-400 text-xs mb-2">
          <Package class="w-3.5 h-3.5" />
          <span>Packages in transit: {{ tab.transitPackages.length }}</span>
        </div>
        <div class="ml-6 space-y-1">
          <div
            v-for="(tp, index) in tab.transitPackages"
            :key="`${tp.id}-${index}`"
            class="text-xs text-zinc-500 font-mono"
          >
            {{ tp.id }} - {{ tp.weight }}kg, {{ tp.distance }}km, {{ tp.offerCode }}
          </div>
        </div>
      </div>
    </div>

    <!-- Input area - fixed at bottom -->
    <div class="shrink-0 border-t border-[#2d1b4e] bg-[#0d0118] p-3 sm:p-4">
      <!-- Status bar (connected) -->
      <div
        v-if="isConnected"
        class="flex items-center gap-4 text-[10px] text-zinc-600 mb-2 flex-wrap"
      >
        <span
          >Mode:
          <span class="text-pink-400">{{
            tab.calculationType === 'cost' ? 'Cost' : 'Time'
          }}</span></span
        >
        <span
          >Framework:
          <span :class="FRAMEWORK_COLORS[framework]">{{ framework }}</span></span
        >
        <span v-if="tab.transitPackages.length > 0"
          >Transit:
          <span class="text-amber-400">{{ tab.transitPackages.length }}</span></span
        >
      </div>

      <!-- Disconnected status bar -->
      <div
        v-if="!isConnected"
        class="flex items-center gap-2 text-[10px] text-zinc-600 mb-2"
      >
        <span class="text-red-400">●</span>
        <span class="text-zinc-500">CLI not connected</span>
      </div>

      <!-- Input line -->
      <div class="flex gap-2">
        <span class="text-pink-400 select-none">❯</span>
        <textarea
          ref="inputRef"
          v-model="currentInput"
          @keydown="handleKeyDown"
          @input="(e: Event) => { resizeTextarea(e.target as HTMLTextAreaElement); cmdHistory.resetCursor() }"
          :placeholder="
            isConnected ? 'Enter input or type a command...' : 'Type /connect to reconnect...'
          "
          class="flex-1 bg-transparent border-none outline-none text-zinc-100 placeholder:text-zinc-700 font-mono text-sm resize-none max-h-40 overflow-y-auto scrollbar-hide leading-tight pt-1"
          spellcheck="false"
          autofocus
          rows="1"
          :style="{ height: 'auto', minHeight: '1.5rem' }"
        />
      </div>

      <!-- Hints -->
      <div class="mt-2 text-[10px] text-zinc-700">
        {{
          isConnected
            ? 'Press Enter to execute • Shift+Enter for new line • ↑/↓ history • Ctrl+C clear'
            : 'Type /connect and press Enter to reconnect'
        }}
      </div>
    </div>
  </div>
</template>
