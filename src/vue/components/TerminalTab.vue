<script setup lang="ts">
import { ref, computed } from 'vue'
import { Terminal, ChevronDown, ChevronRight, Package, Loader2 } from 'lucide-vue-next'
import type { TabData, TransitPackage, ParsedResult, UserRole, AdminResult } from '../../core/types'
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
  userRole: UserRole
}>()

const emit = defineEmits<{
  update: [updates: Partial<TabData>]
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const { session, processAdminCommand, getOffersForCalculation } = useSession()
const isGenerating = ref(false)

const showOutput = computed(() => props.userRole === 'super_admin')
const canManageUsers = computed(() => props.userRole === 'super_admin' || props.userRole === 'vendor')

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

function isAdminCommand(input: string): boolean {
  const first = input.trim().split(/\s+/)[0]?.toLowerCase()
  return first === 'user' || first === 'offer' || first === 'help' || first === 'loginas' || first === 'notifications'
}

function handleInputChange(newValue: string) {
  if (
    props.tab.calculationType === 'time' &&
    !isAdminCommand(props.tab.input) &&
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
      commandType: 'delivery',
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
      commandType: 'delivery',
      adminResult: undefined,
    })
    if (textareaRef.value) textareaRef.value.focus()
    return
  }

  // Check for admin command
  if (isAdminCommand(trimmedInput)) {
    const result = processAdminCommand(trimmedInput)
    if (result) {
      isGenerating.value = true
      setTimeout(() => {
        emit('update', {
          output: result.success ? result.message : `Error: ${result.message}`,
          error: result.success ? '' : result.message,
          hasExecuted: true,
          commandType: 'admin',
          adminResult: result,
        })
        isGenerating.value = false
      }, 300)
      return
    }
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
          commandType: 'delivery',
          adminResult: undefined,
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
          commandType: 'delivery',
          adminResult: undefined,
        })
      }
    } catch (err) {
      emit('update', {
        output: '',
        error: err instanceof Error ? err.message : 'Invalid input',
        hasExecuted: true,
        commandType: 'delivery',
        adminResult: undefined,
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
    commandType: 'delivery',
    adminResult: undefined,
  })
}

const parsedResults = computed(() =>
  props.tab.commandType === 'delivery'
    ? parseOutput(
        props.tab.output,
        props.tab.calculationType,
        props.tab.input,
        props.tab.executionTransitSnapshot,
      )
    : []
)

const transitCount = computed(() => props.tab.transitPackages.length)
const gridCols = computed(() => showOutput.value ? 'xl:grid-cols-3' : 'xl:grid-cols-2')

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
    const isAdmin = isAdminCommand(props.tab.input.trim())

    if (
      props.tab.calculationType === 'time' &&
      !isClear &&
      !isAdmin &&
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

// Help section parser (shared between AdminResultCard and HelpOutputText)
function parseHelpSections(text: string) {
  const sections: { title: string; lines: string[] }[] = []
  const rawLines = text.split('\n')
  let currentSection: { title: string; lines: string[] } | null = null

  for (const line of rawLines) {
    const trimmed = line.trimEnd()
    if (!trimmed) {
      if (currentSection && currentSection.lines.length > 0) {
        sections.push(currentSection)
        currentSection = null
      }
      continue
    }
    const stripped = trimmed.replace(/^\s+/, '')
    const isHeader =
      stripped === 'Available commands:' ||
      (stripped.endsWith(':') &&
        !stripped.startsWith('user ') &&
        !stripped.startsWith('offer ') &&
        !stripped.startsWith('loginas') &&
        !stripped.startsWith('notifications') &&
        !stripped.startsWith('clear'))

    if (isHeader) {
      if (currentSection && currentSection.lines.length > 0) {
        sections.push(currentSection)
      }
      if (stripped === 'Available commands:') {
        currentSection = null
        continue
      }
      currentSection = { title: stripped.replace(/:$/, ''), lines: [] }
    } else {
      if (!currentSection) {
        currentSection = { title: '', lines: [] }
      }
      currentSection.lines.push(stripped)
    }
  }
  if (currentSection && currentSection.lines.length > 0) {
    sections.push(currentSection)
  }
  return sections
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

            <!-- Admin commands hint -->
            <div v-if="canManageUsers" class="mt-1 text-zinc-700"># Type 'help' for available commands</div>

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

      <!-- Output Panel (super_admin only) -->
      <CollapsibleSection
        v-if="showOutput"
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
          <div v-else-if="tab.error && tab.commandType === 'delivery'" class="text-red-400">
            <span class="text-red-500">Error:</span> {{ tab.error }}
          </div>
          <HelpOutputText
            v-else-if="tab.commandType === 'admin' && tab.adminResult?.type === 'help'"
            :message="tab.output"
            :success="tab.adminResult.success"
          />
          <pre
            v-else-if="tab.output"
            :class="['whitespace-pre-wrap', tab.commandType === 'admin' ? (tab.adminResult?.success ? 'text-cyan-400' : 'text-red-400') : 'text-emerald-400']"
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
          <AdminResultCard v-else-if="tab.commandType === 'admin' && tab.adminResult" :result="tab.adminResult" />
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

    <!-- Code Snippet Panel (super_admin only) -->
    <CodeSnippetPanel v-if="userRole === 'super_admin'" />
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

const AdminResultCard = defineComponent({
  name: 'AdminResultCard',
  props: {
    result: { type: Object as () => AdminResult, required: true },
  },
  setup(props) {
    const isSuccess = props.result.success
    const borderColor = isSuccess ? 'border-cyan-500/30' : 'border-red-500/30'
    const bgColor = isSuccess ? 'bg-cyan-500/5' : 'bg-red-500/5'

    function parseHelpSectionsLocal(text: string) {
      const sections: { title: string; lines: string[] }[] = []
      const rawLines = text.split('\n')
      let currentSection: { title: string; lines: string[] } | null = null
      for (const line of rawLines) {
        const trimmed = line.trimEnd()
        if (!trimmed) {
          if (currentSection && currentSection.lines.length > 0) {
            sections.push(currentSection)
            currentSection = null
          }
          continue
        }
        const stripped = trimmed.replace(/^\s+/, '')
        const isHeader =
          stripped === 'Available commands:' ||
          (stripped.endsWith(':') &&
            !stripped.startsWith('user ') &&
            !stripped.startsWith('offer ') &&
            !stripped.startsWith('loginas') &&
            !stripped.startsWith('notifications') &&
            !stripped.startsWith('clear'))
        if (isHeader) {
          if (currentSection && currentSection.lines.length > 0) sections.push(currentSection)
          if (stripped === 'Available commands:') { currentSection = null; continue }
          currentSection = { title: stripped.replace(/:$/, ''), lines: [] }
        } else {
          if (!currentSection) currentSection = { title: '', lines: [] }
          currentSection.lines.push(stripped)
        }
      }
      if (currentSection && currentSection.lines.length > 0) sections.push(currentSection)
      return sections
    }

    return { isSuccess, borderColor, bgColor, parseHelpSectionsLocal }
  },
  template: `
    <!-- User list -->
    <div v-if="result.type === 'user-list' && Array.isArray(result.data)" :class="[bgColor, 'border rounded-lg p-4 space-y-3', borderColor]">
      <div class="text-xs font-mono text-cyan-400 pb-2 border-b border-[#2d1b4e]/50">Registered Vendors</div>
      <div v-if="(result.data as any[]).length === 0" class="text-xs font-mono text-zinc-500 py-2">No registered vendors.</div>
      <div v-else class="space-y-2">
        <div v-for="(u, i) in (result.data as any[])" :key="i" class="flex items-center gap-3 px-3 py-2 bg-[#1a0b2e]/40 rounded text-xs font-mono">
          <span class="text-pink-400 min-w-[80px]">{{ u.username }}</span>
          <span class="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">vendor</span>
          <span class="text-zinc-500">{{ u.email || '(no email)' }}</span>
          <span class="text-zinc-700 ml-auto">{{ u.createdAt }}</span>
        </div>
      </div>
    </div>

    <!-- Offer list -->
    <div v-else-if="result.type === 'offer-list' && Array.isArray(result.data) && result.data.length > 0 && 'code' in result.data[0]" :class="[bgColor, 'border rounded-lg p-4 space-y-3', borderColor]">
      <div class="text-xs font-mono text-cyan-400 pb-2 border-b border-[#2d1b4e]/50">Offer Codes</div>
      <div class="space-y-2">
        <div v-for="(o, i) in (result.data as any[])" :key="i" class="flex items-center gap-3 px-3 py-2 bg-[#1a0b2e]/40 rounded text-xs font-mono">
          <span class="text-emerald-400 min-w-[60px]">{{ o.code }}</span>
          <span class="text-pink-400">{{ o.discount }}%</span>
          <span class="text-zinc-500">dist: {{ o.minDistance }}-{{ o.maxDistance }}km</span>
          <span class="text-zinc-500">wt: {{ o.minWeight }}-{{ o.maxWeight }}kg</span>
        </div>
      </div>
    </div>

    <!-- Help -->
    <div v-else-if="result.type === 'help'" class="bg-[#1a0b2e]/40 border border-[#2d1b4e] rounded-lg p-4">
      <div class="text-xs font-mono text-cyan-400 pb-2 mb-3 border-b border-[#2d1b4e]/50">Command Reference</div>
      <div class="grid grid-cols-1 gap-4">
        <div v-for="(section, i) in parseHelpSectionsLocal(result.message)" :key="i" class="space-y-1.5">
          <div v-if="section.title" class="text-[11px] font-mono text-pink-400/80 pb-1 mb-1">{{ section.title }}</div>
          <template v-for="(line, j) in section.lines" :key="j">
            <div v-if="line.indexOf(' - ') > -1" class="flex flex-col 2xl:flex-row 2xl:items-baseline gap-0.5 2xl:gap-2 text-xs font-mono">
              <span class="text-zinc-300 whitespace-nowrap">{{ line.slice(0, line.indexOf(' - ')).trim() }}</span>
              <span class="text-zinc-600 hidden 2xl:inline">—</span>
              <span class="text-zinc-500 pl-2 2xl:pl-0">{{ line.slice(line.indexOf(' - ') + 3).trim() }}</span>
            </div>
            <div v-else class="text-xs font-mono text-zinc-300">{{ line }}</div>
          </template>
        </div>
      </div>
    </div>

    <!-- Notification list -->
    <div v-else-if="result.type === 'notification-list' && Array.isArray(result.data) && result.data.length > 0" :class="[bgColor, 'border rounded-lg p-4 space-y-3', borderColor]">
      <div class="text-xs font-mono text-cyan-400 pb-2 border-b border-[#2d1b4e]/50">Sent Notifications</div>
      <div class="space-y-2">
        <div v-for="(n, i) in (result.data as any[])" :key="i" class="px-3 py-2 bg-[#1a0b2e]/40 rounded text-xs font-mono space-y-1">
          <div class="flex items-center gap-2">
            <span class="text-zinc-600">{{ n.timestamp }}</span>
            <span class="text-pink-400">To: {{ n.to }}</span>
          </div>
          <div class="text-cyan-400">{{ n.subject }}</div>
          <div class="text-zinc-500 whitespace-pre-wrap">{{ n.body }}</div>
        </div>
      </div>
    </div>

    <!-- Generic success/error -->
    <div v-else :class="[bgColor, 'border rounded-lg p-4', borderColor]">
      <div :class="['text-xs font-mono pb-2 mb-2 border-b border-[#2d1b4e]/50', isSuccess ? 'text-emerald-400' : 'text-red-400']">{{ isSuccess ? 'Success' : 'Error' }}</div>
      <pre :class="['text-sm font-mono whitespace-pre-wrap', isSuccess ? 'text-zinc-300' : 'text-red-300']">{{ result.message }}</pre>
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

const HelpOutputText = defineComponent({
  name: 'HelpOutputText',
  props: {
    message: { type: String, required: true },
    success: { type: Boolean, required: true },
  },
  setup(props) {
    function parseHelpSectionsLocal(text: string) {
      const sections: { title: string; lines: string[] }[] = []
      const rawLines = text.split('\n')
      let currentSection: { title: string; lines: string[] } | null = null
      for (const line of rawLines) {
        const trimmed = line.trimEnd()
        if (!trimmed) {
          if (currentSection && currentSection.lines.length > 0) {
            sections.push(currentSection)
            currentSection = null
          }
          continue
        }
        const stripped = trimmed.replace(/^\s+/, '')
        const isHeader =
          stripped === 'Available commands:' ||
          (stripped.endsWith(':') &&
            !stripped.startsWith('user ') &&
            !stripped.startsWith('offer ') &&
            !stripped.startsWith('loginas') &&
            !stripped.startsWith('notifications') &&
            !stripped.startsWith('clear'))
        if (isHeader) {
          if (currentSection && currentSection.lines.length > 0) sections.push(currentSection)
          if (stripped === 'Available commands:') { currentSection = null; continue }
          currentSection = { title: stripped.replace(/:$/, ''), lines: [] }
        } else {
          if (!currentSection) currentSection = { title: '', lines: [] }
          currentSection.lines.push(stripped)
        }
      }
      if (currentSection && currentSection.lines.length > 0) sections.push(currentSection)
      return sections
    }
    return { parseHelpSectionsLocal }
  },
  template: `
    <div class="p-0">
      <div class="text-xs font-mono text-cyan-400 pb-2 mb-3 border-b border-[#2d1b4e]/50">Command Reference</div>
      <div class="grid grid-cols-1 gap-4">
        <div v-for="(section, i) in parseHelpSectionsLocal(message)" :key="i" class="space-y-1.5">
          <div v-if="section.title" class="text-[11px] font-mono text-cyan-400/80 pb-1 mb-1">{{ section.title }}</div>
          <template v-for="(line, j) in section.lines" :key="j">
            <div v-if="line.indexOf(' - ') > -1" class="flex flex-col 2xl:flex-row 2xl:items-baseline gap-0.5 2xl:gap-2 text-xs font-mono">
              <span class="text-cyan-300 whitespace-nowrap">{{ line.slice(0, line.indexOf(' - ')).trim() }}</span>
              <span class="text-zinc-600 hidden 2xl:inline">—</span>
              <span class="text-cyan-400/60 pl-2 2xl:pl-0">{{ line.slice(line.indexOf(' - ') + 3).trim() }}</span>
            </div>
            <div v-else class="text-xs font-mono text-cyan-300">{{ line }}</div>
          </template>
        </div>
      </div>
    </div>
  `,
})

export default {
  components: {
    CollapsibleSection,
    GeneratingOverlay,
    TransitSection,
    AdminResultCard,
    ResultCard,
    HelpOutputText,
  },
}
</script>
