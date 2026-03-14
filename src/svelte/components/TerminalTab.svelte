<script lang="ts">
  import type { TabData, TransitPackage, ParsedResult } from '../../core/types'
  import {
    calculateDeliveryCost,
    calculateDeliveryTimeWithTransit,
    parseOutput,
    setOffers,
  } from '../../core/calculations'
  import { useSession } from '../sessionStore.svelte'
  import { Package, Loader2 } from 'lucide-svelte'

  interface HistoryEntry {
    type: 'input' | 'output' | 'result' | 'command' | 'error' | 'info' | 'clear' | 'welcome'
    content: string
    parsedResults?: ParsedResult[]
    calculationType?: 'cost' | 'time'
    timestamp?: number
  }

  let { tab, onupdate }: { tab: TabData; onupdate: (updates: Partial<TabData>) => void } = $props()

  let inputRef: HTMLTextAreaElement | null = $state(null)
  let scrollAreaRef: HTMLDivElement | null = $state(null)
  let clearMarkerRef: HTMLDivElement | null = $state(null)
  let currentInput = $state('')
  let history: HistoryEntry[] = $state([])
  let framework: 'react' | 'vue' | 'svelte' = $state('react')
  let isGenerating = $state(false)
  let showWelcome = $state(true)
  let shouldAutoScroll = $state(true)
  let isConnected = $state(true)

  const { session, getOffersForCalculation } = useSession()

  function syncOffers() {
    setOffers(getOffersForCalculation())
  }

  const transitCount = $derived(tab.transitPackages.length)
  const frameworkColors: Record<string, string> = {
    react: 'text-cyan-400',
    vue: 'text-emerald-400',
    svelte: 'text-orange-400',
  }
  const lastClearIndex = $derived((() => { for (let i = history.length - 1; i >= 0; i--) { if (history[i].type === 'clear') return i; } return -1; })())

  $effect(() => {
    if (scrollAreaRef && shouldAutoScroll) {
      history
      scrollAreaRef.scrollTop = scrollAreaRef.scrollHeight
    }
  })

  const MOTORCYCLE_ART = `                            ___
                          /~   ~\\
                         |_      |
                         |/     __-__
                          \\   /~     ~~-_
                           ~~ -~~\\       ~\\
                            /     |        \\
               ,           /     /          \\
             //   _ _---~~~    //-_          \\
           /  (/~~ )    _____/-__  ~-_       _-\\             _________
         /  _-~\\\\0) ~~~~         ~~-_ \\__--~~   \`\\  ___---~~~        /'
        /_-~                       _-/'          )~/               /'
        (___________/           _-~/'         _-~~/             _-~
     _ ----- _~-_\\\\\\\\        _-~ /'      __--~   (_ ______---~~~--_
  _-~         ~-_~\\\\\\\\      (   (     -_~          ~-_  |          ~-_
 /~~~~\\          \\ \\~~       ~-_ ~-_    ~\\            ~~--__-----_    \\
;    / \\ ______-----\\           ~-__~-~~~~~~--_             ~~--_ \\    .
|   | \\((*)~~~~~~~~~~|      __--~~             ~-_               ) |   |
|    \\  |~|~---------)__--~~                      \\_____________/ /    ,
 \\    ~-----~    /  /~                             )  \\    ~-----~    /
  ~-_         _-~ /_______________________________/    \`-_         _-~
     ~ ----- ~                                            ~ ----- ~`

  const COURIER_ART = ` \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2557   \u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2557 
\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557
\u2588\u2588\u2551     \u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D
\u2588\u2588\u2551     \u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u255D  \u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557
\u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2551  \u2588\u2588\u2551
 \u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u255D  \u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u255D  \u255A\u2550\u255D\u255A\u2550\u255D\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D\u255A\u2550\u255D  \u255A\u2550\u255D
              CLI Version 1.0.0`

  function formatOfferDist(o: { minDistance: number; maxDistance: number }) {
    return o.minDistance === 0 ? `< ${o.maxDistance}` : `${o.minDistance} - ${o.maxDistance}`
  }

  function handleScroll() {
    if (scrollAreaRef) {
      const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
      shouldAutoScroll = isAtBottom
    }
  }

  function handleTextareaInput(e: Event) {
    const target = e.target as HTMLTextAreaElement
    currentInput = target.value
    target.style.height = 'auto'
    target.style.height = Math.min(target.scrollHeight, 160) + 'px'
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      processInput()
    }
  }

  function processInput() {
    const trimmed = currentInput.trim()
    if (!trimmed) return

    if (!isConnected) {
      if (trimmed === '/connect') {
        handleCommand(trimmed)
      } else {
        history = [
          ...history,
          { type: 'error', content: 'Not connected. Type /connect to reconnect.', timestamp: Date.now() },
        ]
      }
      currentInput = ''
      resetTextareaHeight()
      return
    }

    if (trimmed.startsWith('/') || trimmed === 'clear' || trimmed === 'exit') {
      handleCommand(trimmed)
    } else {
      executeCalculation(trimmed)
    }

    currentInput = ''
    resetTextareaHeight()
  }

  function resetTextareaHeight() {
    if (inputRef) {
      inputRef.style.height = 'auto'
    }
  }

  function handleCommand(cmd: string) {
    const lower = cmd.toLowerCase().trim()

    if (lower === '/connect') {
      if (isConnected) {
        history = [
          ...history,
          { type: 'command', content: cmd, timestamp: Date.now() },
          { type: 'info', content: 'Already connected.', timestamp: Date.now() },
        ]
      } else {
        isConnected = true
        showWelcome = true
        history = [
          ...history,
          { type: 'command', content: cmd, timestamp: Date.now() },
          { type: 'info', content: 'Reconnected to courier-service-cli.', timestamp: Date.now() },
        ]
      }
      return
    }

    if (!isConnected) {
      history = [
        ...history,
        { type: 'error', content: 'Not connected. Type /connect to reconnect.', timestamp: Date.now() },
      ]
      return
    }

    if (lower.startsWith('/change use ')) {
      const fw = lower.replace('/change use ', '').trim() as 'react' | 'vue' | 'svelte'
      if (['react', 'vue', 'svelte'].includes(fw)) {
        framework = fw
        history = [
          ...history,
          { type: 'command', content: cmd, timestamp: Date.now() },
          { type: 'info', content: `Framework switched to ${fw}.`, timestamp: Date.now() },
        ]
      } else {
        history = [
          ...history,
          { type: 'command', content: cmd, timestamp: Date.now() },
          { type: 'error', content: `Unknown framework "${fw}". Use react, vue, or svelte.`, timestamp: Date.now() },
        ]
      }
      return
    }

    if (lower.startsWith('/change mode ')) {
      const mode = lower.replace('/change mode ', '').trim() as 'cost' | 'time'
      if (['cost', 'time'].includes(mode)) {
        onupdate({
          calculationType: mode,
          output: '',
          error: '',
          hasExecuted: false,
        })
        history = [
          ...history,
          { type: 'command', content: cmd, timestamp: Date.now() },
          { type: 'info', content: `Mode switched to ${mode === 'cost' ? 'Delivery Cost' : 'Delivery Time'}.`, timestamp: Date.now() },
        ]
      } else {
        history = [
          ...history,
          { type: 'command', content: cmd, timestamp: Date.now() },
          { type: 'error', content: `Unknown mode "${mode}". Use cost or time.`, timestamp: Date.now() },
        ]
      }
      return
    }

    if (lower === 'clear') {
      history = [...history, { type: 'clear', content: '', timestamp: Date.now() }]
      showWelcome = false
      return
    }

    if (lower === '/restart') {
      history = [
        ...history,
        { type: 'command', content: cmd, timestamp: Date.now() },
        { type: 'welcome', content: '', timestamp: Date.now() },
      ]
      showWelcome = false
      return
    }

    if (lower === 'exit') {
      isConnected = false
      showWelcome = false
      history = []
      return
    }

    history = [
      ...history,
      { type: 'command', content: cmd, timestamp: Date.now() },
      { type: 'error', content: `Unknown command: ${cmd}. Type /help for available commands.`, timestamp: Date.now() },
    ]
  }

  function executeCalculation(input: string) {
    history = [
      ...history,
      { type: 'input', content: input, timestamp: Date.now() },
    ]

    isGenerating = true

    setTimeout(() => {
      try {
        syncOffers()
        if (tab.calculationType === 'cost') {
          const result = calculateDeliveryCost(input)
          const parsed = parseOutput(result, 'cost', input, [])
          onupdate({ output: result, error: '', hasExecuted: true })
          history = [
            ...history,
            { type: 'output', content: result, timestamp: Date.now() },
            { type: 'result', content: '', parsedResults: parsed, calculationType: 'cost', timestamp: Date.now() },
          ]
        } else {
          const transitResult = calculateDeliveryTimeWithTransit(input, tab.transitPackages)
          const updatedTransit = [
            ...transitResult.stillInTransit,
            ...transitResult.newTransitPackages,
          ]
          const parsed = parseOutput(transitResult.output, 'time', input, tab.transitPackages)
          onupdate({
            output: transitResult.output,
            error: '',
            hasExecuted: true,
            transitPackages: updatedTransit,
            executionTransitSnapshot: [...tab.transitPackages],
            renamedPackages: transitResult.renamedPackages,
          })
          history = [
            ...history,
            { type: 'output', content: transitResult.output, timestamp: Date.now() },
            { type: 'result', content: '', parsedResults: parsed, calculationType: 'time', timestamp: Date.now() },
          ]
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Invalid input'
        onupdate({ output: '', error: errorMsg, hasExecuted: true })
        history = [
          ...history,
          { type: 'error', content: errorMsg, timestamp: Date.now() },
        ]
      }
      isGenerating = false
    }, 350)
  }

  function getResultDiscount(result: ParsedResult): number {
    return parseFloat(result.discount) || 0
  }

  function getDiscountPercent(result: ParsedResult): string {
    const discount = getResultDiscount(result)
    if (discount <= 0) return '0'
    return ((discount / result.deliveryCost) * 100).toFixed(0)
  }
</script>

<div class="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#0d0118]">
  <!-- Main terminal area -->
  <div
    bind:this={scrollAreaRef}
    class="flex-1 overflow-y-auto scrollbar-pink p-4 sm:p-6 font-mono text-sm"
    onscroll={handleScroll}
  >
    <!-- Welcome Screen -->
    {#if showWelcome}
      <div class="mb-6 space-y-4">
        <pre class="text-pink-500/60 text-[10px] sm:text-xs leading-tight overflow-x-auto">{MOTORCYCLE_ART}</pre>
        <pre class="text-pink-400 text-[8px] sm:text-[10px] leading-tight overflow-x-auto">{COURIER_ART}</pre>

        <div class="text-zinc-500 space-y-1">
          <div class="text-pink-400">Welcome to Courier Service CLI</div>
          <div class="text-zinc-600">────────────────────────────────────────</div>
        </div>

        <!-- Offers table -->
        <div class="text-zinc-600 space-y-0.5">
          <div class="text-zinc-500 text-xs">Available Offers:</div>
          <div class="text-zinc-700">--------------------------------------------</div>
          <div class="text-zinc-500 whitespace-pre">Code    | Distance (km) | Weight (kg) | Disc%</div>
          <div class="text-zinc-700">--------------------------------------------</div>
          {#each session.offers as o (o.code)}
            <div class="text-zinc-500 whitespace-pre">{o.code}  | {formatOfferDist(o).padEnd(13)} | {`${o.minWeight} - ${o.maxWeight}`.padEnd(11)} | {o.discount}%</div>
          {/each}
          <div class="text-zinc-700">--------------------------------------------</div>
        </div>

        <!-- Input format -->
        <div class="text-zinc-600 space-y-0.5">
          <div class="text-zinc-500 text-xs">Input Format ({tab.calculationType === 'cost' ? 'Delivery Cost' : 'Delivery Time'}):</div>
          <div class="text-zinc-600">  Line 1: base_delivery_cost no_of_packages</div>
          <div class="text-zinc-600">  Line N: pkg_id weight_kg distance_km offer_code</div>
          {#if tab.calculationType === 'time'}
            <div class="text-zinc-600">  Last:   no_of_vehicles max_speed max_weight</div>
          {/if}
        </div>

        <!-- Commands -->
        <div class="text-zinc-600 space-y-0.5">
          <div class="text-zinc-500 text-xs">Commands:</div>
          <div class="text-zinc-600">  clear                    - Clear terminal</div>
          <div class="text-zinc-600">  exit                     - Disconnect</div>
          <div class="text-zinc-600">  /connect                 - Reconnect</div>
          <div class="text-zinc-600">  /restart                 - Show welcome</div>
          <div class="text-zinc-600">  /change mode cost|time   - Switch mode</div>
          <div class="text-zinc-600">  /change use react|vue|svelte - Switch framework</div>
        </div>

        <div class="text-zinc-700">────────────────────────────────────────</div>
      </div>
    {/if}

    <!-- History entries -->
    {#each history as entry, idx}
      {#if entry.type === 'clear'}
        {#if idx === lastClearIndex}
          <div bind:this={clearMarkerRef} class="border-t border-zinc-700/30 my-4">
            <div class="text-zinc-600 text-xs py-1">--- terminal cleared ---</div>
          </div>
        {/if}
      {:else if idx > lastClearIndex}
        {#if entry.type === 'input'}
          <div class="mb-3">
            <div class="flex items-start gap-2">
              <span class="text-pink-400 shrink-0">$</span>
              <pre class="text-zinc-100 whitespace-pre-wrap break-all">{entry.content}</pre>
            </div>
          </div>
        {:else if entry.type === 'command'}
          <div class="mb-2">
            <div class="flex items-start gap-2">
              <span class="text-violet-400 shrink-0">&gt;</span>
              <span class="text-violet-300">{entry.content}</span>
            </div>
          </div>
        {:else if entry.type === 'output'}
          <div class="mb-3 ml-4">
            <pre class="text-emerald-400 whitespace-pre-wrap">{entry.content}</pre>
          </div>
        {:else if entry.type === 'error'}
          <div class="mb-3 ml-4">
            <div class="text-red-400">
              <span class="text-red-500">Error:</span> {entry.content}
            </div>
          </div>
        {:else if entry.type === 'info'}
          <div class="mb-3 ml-4">
            <div class="text-cyan-400/80">{entry.content}</div>
          </div>
        {:else if entry.type === 'welcome'}
          <!-- Inline welcome screen for /restart -->
          <div class="mb-6 space-y-4">
            <pre class="text-pink-500/60 text-[10px] sm:text-xs leading-tight overflow-x-auto">{MOTORCYCLE_ART}</pre>
            <pre class="text-pink-400 text-[8px] sm:text-[10px] leading-tight overflow-x-auto">{COURIER_ART}</pre>

            <div class="text-zinc-500 space-y-1">
              <div class="text-pink-400">Welcome to Courier Service CLI</div>
              <div class="text-zinc-600">────────────────────────────────────────</div>
            </div>

            <div class="text-zinc-600 space-y-0.5">
              <div class="text-zinc-500 text-xs">Available Offers:</div>
              <div class="text-zinc-700">--------------------------------------------</div>
              <div class="text-zinc-500 whitespace-pre">Code    | Distance (km) | Weight (kg) | Disc%</div>
              <div class="text-zinc-700">--------------------------------------------</div>
              {#each session.offers as o (o.code)}
                <div class="text-zinc-500 whitespace-pre">{o.code}  | {formatOfferDist(o).padEnd(13)} | {`${o.minWeight} - ${o.maxWeight}`.padEnd(11)} | {o.discount}%</div>
              {/each}
              <div class="text-zinc-700">--------------------------------------------</div>
            </div>

            <div class="text-zinc-600 space-y-0.5">
              <div class="text-zinc-500 text-xs">Input Format ({tab.calculationType === 'cost' ? 'Delivery Cost' : 'Delivery Time'}):</div>
              <div class="text-zinc-600">  Line 1: base_delivery_cost no_of_packages</div>
              <div class="text-zinc-600">  Line N: pkg_id weight_kg distance_km offer_code</div>
              {#if tab.calculationType === 'time'}
                <div class="text-zinc-600">  Last:   no_of_vehicles max_speed max_weight</div>
              {/if}
            </div>

            <div class="text-zinc-600 space-y-0.5">
              <div class="text-zinc-500 text-xs">Commands:</div>
              <div class="text-zinc-600">  clear                    - Clear terminal</div>
              <div class="text-zinc-600">  exit                     - Disconnect</div>
              <div class="text-zinc-600">  /connect                 - Reconnect</div>
              <div class="text-zinc-600">  /restart                 - Show welcome</div>
              <div class="text-zinc-600">  /change mode cost|time   - Switch mode</div>
              <div class="text-zinc-600">  /change use react|vue|svelte - Switch framework</div>
            </div>

            <div class="text-zinc-700">────────────────────────────────────────</div>
          </div>
        {:else if entry.type === 'result' && entry.parsedResults}
          <!-- Result cards -->
          <div class="mb-4 space-y-4">
            {#each entry.parsedResults as result}
              {@const discount = getResultDiscount(result)}
              {@const discountPercent = getDiscountPercent(result)}
              <div class="bg-[#1a0b2e]/40 border rounded-lg p-4 sm:p-5 space-y-3 {result.undeliverable ? 'border-amber-500/40' : 'border-[#2d1b4e]'}">
                <!-- Undeliverable banner -->
                {#if result.undeliverable && result.undeliverableReason}
                  <div class="space-y-2">
                    <div class="flex justify-end">
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <Package class="w-3 h-3" />
                        In Transit
                      </span>
                    </div>
                    <div class="bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2 text-xs font-mono text-amber-400">
                      <span class="text-amber-500">&#x26A0;</span> {result.undeliverableReason}
                    </div>
                  </div>
                {/if}

                <!-- Delivery Round & Vehicle (time mode, deliverable only) -->
                {#if !result.undeliverable && result.deliveryRound !== undefined && result.vehicleId !== undefined}
                  <div class="space-y-1.5 pb-2 border-b border-[#2d1b4e]/50">
                    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono">
                      <span class="text-zinc-500">Packages Remaining: <span class="text-zinc-300">{result.packagesRemaining ?? 0}</span></span>
                    </div>
                    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono">
                      <span class="text-purple-400/80">Delivery Round: <span class="text-purple-300">{result.deliveryRound}</span></span>
                      <span class="text-zinc-600">|</span>
                      <span class="text-cyan-400/80">Vehicle Available: <span class="text-cyan-300">Vehicle{result.vehicleId}</span></span>
                      <span class="text-zinc-600">|</span>
                      <span class="text-zinc-500">Current Time: <span class="text-zinc-300">{(result.currentTime ?? 0).toFixed(2)} hrs</span></span>
                    </div>
                    <div class="text-xs font-mono text-amber-400/80 mt-1">
                      {#if result.currentTime !== undefined && result.currentTime > 0}
                        Vehicle{result.vehicleId} will be available after {result.currentTime.toFixed(2)} + {(result.roundTripTime ?? 0).toFixed(2)} = <span class="text-amber-300">{(result.vehicleReturnTime ?? 0).toFixed(2)} hrs</span>
                      {:else}
                        Vehicle{result.vehicleId} will be available after <span class="text-amber-300">{(result.vehicleReturnTime ?? 0).toFixed(2)} hrs</span>
                      {/if}
                    </div>
                  </div>
                {/if}

                <!-- Package ID -->
                <div class="flex items-center gap-2 pb-2 border-b border-[#2d1b4e]/50">
                  {#if result.renamedFrom}
                    <span class="text-zinc-500 font-mono line-through">{result.renamedFrom}</span>
                    <span class="text-pink-400 font-mono font-semibold">{result.id}</span>
                    <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-violet-500/20 text-violet-400 border border-violet-500/30">Notified</span>
                  {:else}
                    <span class="text-pink-400 font-mono font-semibold">{result.id}</span>
                  {/if}
                </div>

                <!-- Package details -->
                <div class="text-sm text-zinc-300 space-y-1">
                  <div><span class="text-zinc-500">Base delivery cost:</span> <span class="font-semibold">{result.baseCost}</span></div>
                  <div>
                    <span class="text-zinc-500">Weight:</span> <span class="font-semibold">{result.weight}kg</span>
                    {' | '}
                    <span class="text-zinc-500">Distance:</span> <span class="font-semibold">{result.distance}km</span>
                  </div>
                  <div>
                    <span class="text-zinc-500">Offer code:</span>
                    <span class="font-semibold {result.offerApplied ? 'text-emerald-400' : 'text-zinc-600'}">{result.offerApplied || 'N/A'}</span>
                  </div>
                </div>

                <div class="border-t border-[#2d1b4e]/50 pt-3 space-y-3">
                  <!-- Delivery Cost -->
                  <div class="flex justify-between items-start text-sm">
                    <div>
                      <div class="text-zinc-400">Delivery Cost</div>
                      <div class="text-xs text-zinc-600 font-mono mt-0.5">{result.baseCost} + ({result.weight} * 10) + ({result.distance} * 5)</div>
                    </div>
                    <div class="text-zinc-300 font-semibold font-mono">{result.deliveryCost.toFixed(2)}</div>
                  </div>

                  <div class="border-t border-[#2d1b4e]/30"></div>

                  <!-- Discount -->
                  <div class="flex justify-between items-start text-sm">
                    <div>
                      <div class="text-zinc-400">Discount</div>
                      <div class="text-xs text-zinc-600 mt-0.5">{discount > 0 ? `(${discountPercent}% of ${result.deliveryCost.toFixed(2)} i.e; Delivery Cost)` : '(Offer not applicable as criteria not met)'}</div>
                    </div>
                    <div class="font-semibold font-mono {discount > 0 ? 'text-emerald-400' : 'text-zinc-600'}">{discount > 0 ? '-' : ''}{discount.toFixed(2)}</div>
                  </div>

                  <div class="border-t border-[#2d1b4e]"></div>

                  <!-- Total Cost -->
                  <div class="flex justify-between items-center">
                    <div class="text-zinc-300 font-semibold">Total cost</div>
                    <div class="text-pink-400 font-bold text-lg font-mono">{result.totalCost}</div>
                  </div>

                  <!-- Delivery Time -->
                  {#if result.deliveryTime !== undefined}
                    <div class="border-t border-[#2d1b4e]/30"></div>
                    <div class="flex justify-between items-center text-sm">
                      <div class="text-zinc-400">Delivery Time</div>
                      <div class="font-semibold font-mono {result.undeliverable ? 'text-amber-400' : 'text-cyan-400'}">{result.undeliverable ? 'N/A' : result.deliveryTime + 'hrs'}</div>
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      {/if}
    {/each}

    <!-- Generating indicator -->
    {#if isGenerating}
      <div class="mb-3 ml-4 flex items-center gap-2">
        <Loader2 class="w-4 h-4 text-pink-400 animate-spin" />
        <span class="text-pink-400 animate-pulse text-sm">generating...</span>
      </div>
    {/if}

    <!-- Disconnected state -->
    {#if !isConnected}
      <div class="flex flex-col items-center justify-center py-12 space-y-4">
        <div class="text-zinc-600 text-lg font-mono">Disconnected</div>
        <div class="text-zinc-700 text-sm">Type <span class="text-violet-400">/connect</span> to reconnect</div>
      </div>
    {/if}

    <!-- Transit packages -->
    {#if transitCount > 0}
      <div class="mt-4 border border-amber-500/30 rounded-lg overflow-hidden bg-amber-500/5">
        <div class="px-3 py-2 flex items-center gap-2 text-xs font-mono">
          <Package class="w-3.5 h-3.5 text-amber-400" />
          <span class="text-amber-400">{'>_'} packages in transit</span>
          <span class="text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded text-[10px]">{transitCount}</span>
        </div>
        <div class="px-3 pb-2 space-y-1.5">
          {#each tab.transitPackages as tp, tpIdx (`${tp.id}-${tpIdx}`)}
            {@const renameMap = new Map(tab.renamedPackages.map(rp => [rp.newId.toLowerCase(), rp.oldId]))}
            {@const originalId = renameMap.get(tp.id.toLowerCase())}
            <div class="flex items-center gap-3 px-2 py-1.5 bg-amber-500/5 border border-amber-500/20 rounded text-xs font-mono">
              {#if originalId}
                <span class="flex items-center gap-1.5">
                  <span class="text-zinc-600 line-through">{originalId}</span>
                  <span class="text-amber-300">{tp.id}</span>
                  <span class="inline-flex items-center px-1 py-0.5 rounded text-[9px] bg-violet-500/20 text-violet-400 border border-violet-500/30">ID Notified</span>
                </span>
              {:else}
                <span class="text-amber-300">{tp.id}</span>
              {/if}
              <span class="text-zinc-500">{tp.weight}kg</span>
              <span class="text-zinc-500">{tp.distance}km</span>
              <span class="text-zinc-600">{tp.offerCode}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <!-- Input area at bottom -->
  <div class="shrink-0 border-t border-[#2d1b4e] bg-[#0d0118] p-3 sm:p-4">
    <!-- Status bar -->
    {#if isConnected}
      <div class="flex items-center gap-3 mb-2 text-xs font-mono flex-wrap">
        <span class="flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span class="text-zinc-500">Connected</span>
        </span>
        <span class="text-zinc-700">|</span>
        <span class="text-zinc-500">Mode: <span class="text-pink-400">{tab.calculationType === 'cost' ? 'Delivery Cost' : 'Delivery Time'}</span></span>
        <span class="text-zinc-700">|</span>
        <span class="text-zinc-500">Framework: <span class={frameworkColors[framework]}>{framework}</span></span>
        {#if transitCount > 0}
          <span class="text-zinc-700">|</span>
          <span class="text-amber-400">Transit: {transitCount}</span>
        {/if}
      </div>
    {:else}
      <div class="flex items-center gap-2 mb-2 text-xs font-mono">
        <span class="w-1.5 h-1.5 rounded-full bg-red-400"></span>
        <span class="text-zinc-500">Disconnected</span>
        <span class="text-zinc-600">- type /connect to reconnect</span>
      </div>
    {/if}

    <!-- Input textarea -->
    <div class="flex items-start gap-2">
      <span class="text-pink-400 font-mono text-sm pt-1.5 shrink-0">$</span>
      <textarea
        bind:this={inputRef}
        value={currentInput}
        oninput={handleTextareaInput}
        onkeydown={handleKeyDown}
        placeholder={isConnected ? 'Type calculation input or command...' : 'Type /connect to reconnect...'}
        class="flex-1 bg-transparent border-none outline-none resize-none text-zinc-100 placeholder:text-zinc-600 font-mono text-sm leading-relaxed min-h-[24px] max-h-[160px]"
        rows="1"
        spellcheck="false"
        disabled={false}
      ></textarea>
    </div>

    <!-- Hints -->
    <div class="mt-2 text-[10px] text-zinc-700 font-mono">
      Enter to send · Shift+Enter for newline · Type <span class="text-zinc-600">clear</span> to reset
    </div>
  </div>
</div>
