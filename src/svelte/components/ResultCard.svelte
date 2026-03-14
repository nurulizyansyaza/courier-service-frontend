<script lang="ts">
  import type { ParsedResult } from '@/core/types'
  import { PackageIcon } from 'lucide-svelte'

  let { result, calculationType }: { result: ParsedResult; calculationType: 'cost' | 'time' } = $props()

  let discount = $derived(parseFloat(result.discount) || 0)
  let deliveryCost = $derived(result.baseCost + result.weight * 10 + result.distance * 5)
  let discountPercent = $derived(discount > 0 ? ((discount / deliveryCost) * 100).toFixed(0) : 0)
</script>

<div class="bg-[#1a0b2e]/40 border rounded-lg p-4 sm:p-5 space-y-3 {result.undeliverable ? 'border-amber-500/40' : 'border-[#2d1b4e]'}">
  <!-- In Transit badge + Undeliverable banner -->
  {#if result.undeliverable && result.undeliverableReason}
    <div class="space-y-2">
      <div class="flex justify-end">
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30">
          <PackageIcon class="w-3 h-3" />
          In Transit
        </span>
      </div>
      <div class="bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2 text-xs font-mono text-amber-400">
        <span class="text-amber-500">&#x26A0;</span> {result.undeliverableReason}
      </div>
    </div>
  {/if}

  <!-- Delivery Round & Vehicle (time mode only, deliverable packages) -->
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

  <!-- Title — package ID -->
  <div class="flex items-center gap-2 pb-2 border-b border-[#2d1b4e]/50">
    {#if result.renamedFrom}
      <span class="text-zinc-500 font-mono line-through">{result.renamedFrom}</span>
      <span class="text-pink-400 font-mono font-semibold">{result.id}</span>
      <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-violet-500/20 text-violet-400 border border-violet-500/30">Notified</span>
    {:else}
      <span class="text-pink-400 font-mono font-semibold">{result.id}</span>
    {/if}
  </div>

  <!-- Header -->
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
      <div class="text-zinc-300 font-semibold font-mono">{deliveryCost.toFixed(2)}</div>
    </div>

    <div class="border-t border-[#2d1b4e]/30"></div>

    <!-- Discount -->
    <div class="flex justify-between items-start text-sm">
      <div>
        <div class="text-zinc-400">Discount</div>
        <div class="text-xs text-zinc-600 mt-0.5">{discount > 0 ? `(${discountPercent}% of ${deliveryCost.toFixed(2)} i.e; Delivery Cost)` : '(Offer not applicable as criteria not met)'}</div>
      </div>
      <div class="font-semibold font-mono {discount > 0 ? 'text-emerald-400' : 'text-zinc-600'}">{discount > 0 ? '-' : ''}{discount.toFixed(2)}</div>
    </div>

    <div class="border-t border-[#2d1b4e]"></div>

    <!-- Total Cost -->
    <div class="flex justify-between items-center">
      <div class="text-zinc-300 font-semibold">Total cost</div>
      <div class="text-pink-400 font-bold text-lg font-mono">{result.totalCost}</div>
    </div>

    <!-- Delivery Time (if available) -->
    {#if result.deliveryTime !== undefined}
      <div class="border-t border-[#2d1b4e]/30"></div>
      <div class="flex justify-between items-center text-sm">
        <div class="text-zinc-400">Delivery Time</div>
        <div class="font-semibold font-mono {result.undeliverable ? 'text-amber-400' : 'text-cyan-400'}">{result.undeliverable ? 'N/A' : result.deliveryTime + 'hrs'}</div>
      </div>
    {/if}
  </div>
</div>
