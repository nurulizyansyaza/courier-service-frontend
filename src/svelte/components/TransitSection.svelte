<script lang="ts">
  import { ChevronDown, ChevronRight, Package as PackageIcon } from 'lucide-svelte'
  import type { TransitPackage } from '@/core/types'

  let {
    transitPackages,
    renamedPackages,
  }: {
    transitPackages: TransitPackage[]
    renamedPackages: { oldId: string; newId: string }[]
  } = $props()

  let isOpen = $state(false)

  let renameNewToOld = $derived.by(() => {
    return new Map(renamedPackages.map(rp => [rp.newId.toLowerCase(), rp.oldId]))
  })
</script>

<div class="mt-4 border border-amber-500/30 rounded-lg overflow-hidden bg-amber-500/5">
  <button
    onclick={() => isOpen = !isOpen}
    class="w-full px-3 py-2 flex items-center gap-2 text-xs font-mono hover:bg-amber-500/10 transition-colors"
  >
    <span class="xl:hidden text-amber-500/60">
      {#if isOpen}
        <ChevronDown class="w-3 h-3" />
      {:else}
        <ChevronRight class="w-3 h-3" />
      {/if}
    </span>
    <PackageIcon class="w-3.5 h-3.5 text-amber-400" />
    <span class="text-amber-400">{">_"} package in transit</span>
    <span class="text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded text-[10px]">{transitPackages.length}</span>
  </button>
  <div class="{isOpen ? 'block' : 'hidden'} xl:!block">
    <div class="px-3 pb-2 space-y-1.5">
      {#each transitPackages as tp, index (`${tp.id}-${index}`)}
        {@const originalId = renameNewToOld.get(tp.id.toLowerCase())}
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
</div>
