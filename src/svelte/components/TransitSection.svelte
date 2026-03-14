<script lang="ts">
  import { ChevronDown, ChevronRight, Package as PackageIcon } from 'lucide-svelte'
  import type { TransitPackage } from '@/core/types'

  let {
    transitPackages,
    renamedPackages,
  }: {
    transitPackages: TransitPackage[]
    renamedPackages: Map<string, string>
  } = $props()

  let isOpen = $state(false)

  let renameNewToOld = $derived.by(() => {
    const map = new Map<string, string>()
    for (const [oldId, newId] of renamedPackages) {
      map.set(newId, oldId)
    }
    return map
  })
</script>

<div class="border border-amber-500/30 rounded-lg overflow-hidden bg-amber-500/5">
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="flex items-center gap-2 px-3 py-2 cursor-pointer"
    onclick={() => isOpen = !isOpen}
  >
    {#if isOpen}
      <ChevronDown class="w-3.5 h-3.5 text-amber-500/60" />
    {:else}
      <ChevronRight class="w-3.5 h-3.5 text-amber-500/60" />
    {/if}
    <PackageIcon class="w-3.5 h-3.5 text-amber-400" />
    <span class="text-xs font-mono text-amber-400/80">Transit Packages</span>
    <span class="text-[10px] font-mono text-amber-500/60 bg-amber-500/10 px-1.5 py-0.5 rounded">{transitPackages.length}</span>
  </div>
  {#if isOpen}
    <div class="px-3 pb-2 space-y-1">
      {#each transitPackages as pkg (pkg.id)}
        <div class="flex items-center gap-2 text-xs font-mono">
          {#if renameNewToOld.has(pkg.id)}
            <span class="text-zinc-600 line-through">{renameNewToOld.get(pkg.id)}</span>
            <span class="text-amber-300">{pkg.id}</span>
            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-violet-500/20 text-violet-400 border border-violet-500/30">ID Notified</span>
          {:else}
            <span class="text-amber-300">{pkg.id}</span>
          {/if}
          <span class="text-zinc-600">—</span>
          <span class="text-zinc-500">{pkg.weight}kg</span>
          <span class="text-zinc-600">·</span>
          <span class="text-zinc-500">{pkg.distance}km</span>
          {#if pkg.offerCode}
            <span class="text-zinc-600">·</span>
            <span class="text-emerald-400/60">{pkg.offerCode}</span>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
