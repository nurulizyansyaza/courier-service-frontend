<script lang="ts">
  import { Terminal } from 'lucide-svelte'
  import type { TabData, UserRole } from '../../core/types'
  import {
    calculateDeliveryCost,
    calculateDeliveryTimeWithTransit,
    parseOutput,
    setOffers,
  } from '../../core/calculations'
  import { useSession } from '../sessionStore.svelte'
  import CollapsibleSection from './CollapsibleSection.svelte'
  import GeneratingOverlay from './GeneratingOverlay.svelte'
  import TransitSection from './TransitSection.svelte'
  import AdminResultCard from './AdminResultCard.svelte'
  import ResultCard from './ResultCard.svelte'
  import HelpOutputText from './HelpOutputText.svelte'
  import CodeSnippetPanel from './CodeSnippetPanel.svelte'

  let { tab, userRole, onupdate }: { tab: TabData; userRole: UserRole; onupdate: (updates: Partial<TabData>) => void } = $props()

  let textareaRef: HTMLTextAreaElement | null = $state(null)
  let isGenerating = $state(false)

  const { session, processAdminCommand, getOffersForCalculation } = useSession()

  const showOutput = $derived(userRole === 'super_admin')
  const canManageUsers = $derived(userRole === 'super_admin' || userRole === 'vendor')

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
      tab.calculationType === 'time' &&
      !isAdminCommand(tab.input) &&
      isTimeInputComplete(tab.input)
    ) {
      const newLines = newValue.trim().split('\n').map(l => l.trim()).filter(l => l)
      const oldLines = tab.input.trim().split('\n').map(l => l.trim()).filter(l => l)

      if (newLines.length > oldLines.length) {
        const addedLine = newLines[newLines.length - 1]?.toLowerCase()
        if (addedLine && 'clear'.startsWith(addedLine)) {
          onupdate({ input: newValue })
          return
        }
        return
      }

      onupdate({ input: newValue })
      return
    }

    onupdate({ input: newValue })
  }

  function handleExecute() {
    if (!tab.input.trim()) {
      onupdate({
        output: '',
        error: 'Error: No input provided',
        hasExecuted: true,
        commandType: 'delivery',
      })
      return
    }

    const trimmedInput = tab.input.trim()
    const lines = trimmedInput.split('\n').map(l => l.trim()).filter(l => l)
    const lastLine = lines[lines.length - 1]?.toLowerCase()

    if (lastLine === 'clear') {
      onupdate({
        input: '',
        output: '',
        error: '',
        hasExecuted: false,
        executionTransitSnapshot: [],
        renamedPackages: [],
        commandType: 'delivery',
        adminResult: undefined,
      })
      if (textareaRef) textareaRef.focus()
      return
    }

    if (isAdminCommand(trimmedInput)) {
      const result = processAdminCommand(trimmedInput)
      if (result) {
        isGenerating = true
        setTimeout(() => {
          onupdate({
            output: result.success ? result.message : `Error: ${result.message}`,
            error: result.success ? '' : result.message,
            hasExecuted: true,
            commandType: 'admin',
            adminResult: result,
          })
          isGenerating = false
        }, 300)
        return
      }
    }

    isGenerating = true
    setTimeout(() => {
      try {
        syncOffers()
        if (tab.calculationType === 'cost') {
          const result = calculateDeliveryCost(tab.input)
          onupdate({
            output: result,
            error: '',
            hasExecuted: true,
            commandType: 'delivery',
            adminResult: undefined,
          })
        } else {
          const transitResult = calculateDeliveryTimeWithTransit(
            tab.input,
            tab.transitPackages,
          )
          const updatedTransit = [
            ...transitResult.stillInTransit,
            ...transitResult.newTransitPackages,
          ]
          onupdate({
            output: transitResult.output,
            error: '',
            hasExecuted: true,
            transitPackages: updatedTransit,
            executionTransitSnapshot: [...tab.transitPackages],
            renamedPackages: transitResult.renamedPackages,
            commandType: 'delivery',
            adminResult: undefined,
          })
        }
      } catch (err) {
        onupdate({
          output: '',
          error: err instanceof Error ? err.message : 'Invalid input',
          hasExecuted: true,
          commandType: 'delivery',
          adminResult: undefined,
        })
      }
      isGenerating = false
    }, 350)
  }

  function handleCalcTypeChange(type: 'cost' | 'time') {
    onupdate({
      calculationType: type,
      output: '',
      error: '',
      hasExecuted: false,
      commandType: 'delivery',
      adminResult: undefined,
    })
  }

  const parsedResults = $derived(
    tab.commandType === 'delivery'
      ? parseOutput(tab.output, tab.calculationType, tab.input, tab.executionTransitSnapshot)
      : []
  )

  const transitCount = $derived(tab.transitPackages.length)
  const gridCols = $derived(showOutput ? 'xl:grid-cols-3' : 'xl:grid-cols-2')

  const inputLines = $derived(
    tab.input === '' ? [''] : tab.input.split('\n')
  )

  const sortedResults = $derived.by(() => {
    return [...parsedResults].sort((a, b) => {
      if (tab.calculationType !== 'time') return 0
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
      const lines = tab.input.trim().split('\n').map(l => l.trim()).filter(l => l)
      const lastLine = lines[lines.length - 1]?.toLowerCase()
      const isClear = lastLine === 'clear'
      const isAdmin = isAdminCommand(tab.input.trim())

      if (
        tab.calculationType === 'time' &&
        !isClear &&
        !isAdmin &&
        !isTimeInputComplete(tab.input)
      ) {
        return
      }
      e.preventDefault()
      handleExecute()
    }
  }

  function formatOfferDist(o: { minDistance: number; maxDistance: number }) {
    return o.minDistance === 0 ? `< ${o.maxDistance}` : `${o.minDistance} - ${o.maxDistance}`
  }
</script>

<div class="flex-1 flex flex-col overflow-hidden min-h-0">
  <!-- Calculation Type Selector -->
  <div class="px-4 py-3 sm:px-6 bg-[#1a0b2e] border-b border-[#2d1b4e] flex items-center gap-3 sm:gap-4 flex-wrap">
    <span class="text-sm text-zinc-400">Mode:</span>
    <div class="flex gap-2">
      <button
        onclick={() => handleCalcTypeChange('cost')}
        class="px-3 py-1.5 sm:px-4 text-sm rounded transition-colors {tab.calculationType === 'cost'
          ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
          : 'bg-[#251440] text-zinc-400 border border-[#2d1b4e] hover:text-pink-300'}"
      >
        Delivery Cost
      </button>
      <button
        onclick={() => handleCalcTypeChange('time')}
        class="px-3 py-1.5 sm:px-4 text-sm rounded transition-colors {tab.calculationType === 'time'
          ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
          : 'bg-[#251440] text-zinc-400 border border-[#2d1b4e] hover:text-pink-300'}"
      >
        Delivery Time
      </button>
    </div>
  </div>

  <!-- Responsive Layout -->
  <div class="flex-1 flex flex-col xl:grid overflow-auto xl:overflow-hidden scrollbar-pink {gridCols}">
    <!-- Input Panel -->
    <CollapsibleSection
      title="input"
      titleColor="text-pink-400"
      defaultOpen={true}
      borderClass="xl:border-r border-b xl:border-b-0 border-[#2d1b4e]"
    >
      {#snippet icon()}
        <Terminal class="w-4 h-4 text-pink-400" />
      {/snippet}
      {#snippet children()}
        <div class="flex-1 overflow-auto p-4 font-mono text-sm scrollbar-pink">
          <!-- CLI Header -->
          <div class="text-zinc-600 mb-4">
            <div># Courier Service App Calculator</div>
            <div># Mode: {tab.calculationType === 'cost' ? 'Delivery Cost' : 'Delivery Time Estimation'}</div>
            <div class="mt-2"># Input Format:</div>
            <div># Line 1: base_delivery_cost no_of_packages</div>
            <div># Line 2: pkg_id1 weight1_in_kg distance1_in_km offer_code1</div>
            {#if tab.calculationType === 'time'}
              <div># Last line: no_of_vehicles max_speed max_weight</div>
            {/if}

            <!-- Dynamic Offer Table -->
            <div class="text-zinc-700 mt-2">------------------------------------</div>
            <div class="text-zinc-500">Code | Distance (km) | Weight (kg)</div>
            <div class="text-zinc-700">------------------------------------</div>
            {#each session.offers as o (o.code)}
              <div class="text-zinc-500 whitespace-pre">{`${o.code} | ${formatOfferDist(o).padEnd(13)} | ${o.minWeight} - ${o.maxWeight}`}</div>
            {/each}
            <div class="text-zinc-700">------------------------------------</div>

            <!-- Admin commands hint -->
            {#if canManageUsers}
              <div class="mt-1 text-zinc-700"># Type 'help' for available commands</div>
            {/if}

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
              {#each inputLines as _, i}
                <div class="flex gap-2">
                  <span class="text-pink-400">$</span>
                </div>
              {/each}
            </div>
            <textarea
              bind:this={textareaRef}
              value={tab.input}
              oninput={(e) => handleInputChange((e.target as HTMLTextAreaElement).value)}
              onkeydown={handleKeyDown}
              placeholder="Type your input here..."
              class="relative bg-transparent border-none outline-none resize-none text-zinc-100 placeholder:text-zinc-600 min-h-[150px] xl:min-h-[200px] w-full font-mono text-sm leading-relaxed"
              style="padding-left: 1.5rem"
              spellcheck="false"
            ></textarea>
          </div>

          <!-- Transit Section -->
          {#if tab.calculationType === 'time' && transitCount > 0}
            <TransitSection
              transitPackages={tab.transitPackages}
              renamedPackages={tab.renamedPackages}
            />
          {/if}

          <!-- Footer: Run button only (mobile/tablet) -->
          <div class="mt-4 pt-4 border-t border-[#2d1b4e]/50 flex items-center justify-end">
            <button
              onclick={handleExecute}
              class="xl:hidden px-4 py-1.5 text-sm rounded bg-pink-500/20 text-pink-400 border border-pink-500/30 hover:bg-pink-500/30 transition-colors whitespace-nowrap"
            >
              Run
            </button>
          </div>
        </div>
      {/snippet}
    </CollapsibleSection>

    <!-- Output Panel (super_admin only) -->
    {#if showOutput}
      <CollapsibleSection
        title="output"
        titleColor="text-violet-400"
        defaultOpen={true}
        borderClass="xl:border-r border-b xl:border-b-0 border-[#2d1b4e]"
      >
        {#snippet icon()}
          <Terminal class="w-4 h-4 text-violet-400" />
        {/snippet}
        {#snippet children()}
          <div class="flex-1 overflow-auto p-4 font-mono text-sm relative scrollbar-pink">
            {#if isGenerating}
              <GeneratingOverlay label="generating new output..." />
            {/if}
            {#if !tab.hasExecuted && !isGenerating}
              <div class="text-zinc-600">~ awaiting execution...</div>
            {:else if tab.error && tab.commandType === 'delivery'}
              <div class="text-red-400">
                <span class="text-red-500">Error:</span> {tab.error}
              </div>
            {:else if tab.commandType === 'admin' && tab.adminResult?.type === 'help'}
              <HelpOutputText
                message={tab.output}
                success={tab.adminResult.success}
              />
            {:else if tab.output}
              <pre
                class="whitespace-pre-wrap {tab.commandType === 'admin' ? (tab.adminResult?.success ? 'text-cyan-400' : 'text-red-400') : 'text-emerald-400'}"
              >{tab.output}</pre>
            {/if}
          </div>
        {/snippet}
      </CollapsibleSection>
    {/if}

    <!-- Result Panel -->
    <CollapsibleSection
      title="result"
      titleColor="text-cyan-400"
      defaultOpen={true}
      borderClass=""
    >
      {#snippet icon()}
        <Terminal class="w-4 h-4 text-cyan-400" />
      {/snippet}
      {#snippet children()}
        <div class="flex-1 overflow-auto p-4 relative scrollbar-pink">
          {#if isGenerating}
            <GeneratingOverlay label="generating new result..." />
          {/if}
          {#if !tab.hasExecuted && !isGenerating}
            <div class="font-mono text-sm text-zinc-600">~ awaiting execution...</div>
          {:else if tab.commandType === 'admin' && tab.adminResult}
            <AdminResultCard result={tab.adminResult} />
          {:else if parsedResults.length > 0}
            <div class="space-y-4">
              {#each sortedResults as result, index (index)}
                <ResultCard {result} calculationType={tab.calculationType} />
              {/each}
            </div>
          {:else if tab.error}
            <div class="font-mono text-sm text-red-400">Failed to parse results</div>
          {/if}
        </div>
      {/snippet}
    </CollapsibleSection>
  </div>

  <!-- Code Snippet Panel (super_admin only) -->
  {#if userRole === 'super_admin'}
    <CodeSnippetPanel />
  {/if}
</div>
