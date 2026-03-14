<script lang="ts">
  import { ChevronDown, ChevronRight } from 'lucide-svelte'
  import type { Snippet } from 'svelte'

  let {
    title,
    titleColor = 'text-zinc-400',
    defaultOpen = true,
    borderClass = '',
    icon,
    badge,
    children,
  }: {
    title: string
    titleColor?: string
    defaultOpen?: boolean
    borderClass?: string
    icon?: Snippet
    badge?: Snippet
    children?: Snippet
  } = $props()

  let isOpen = $state(defaultOpen)
</script>

<div class="flex flex-col {borderClass} bg-[#0d0118] xl:min-h-0">
  <button
    onclick={() => isOpen = !isOpen}
    class="px-4 py-2 bg-[#1a0b2e]/50 border-b border-[#2d1b4e] flex items-center gap-2 w-full xl:cursor-default"
  >
    <span class="xl:hidden text-zinc-500">
      {#if isOpen}
        <ChevronDown class="w-3.5 h-3.5" />
      {:else}
        <ChevronRight class="w-3.5 h-3.5" />
      {/if}
    </span>
    {#if icon}
      {@render icon()}
    {/if}
    <span class="text-sm {titleColor} font-mono">{title}</span>
    {#if badge}
      {@render badge()}
    {/if}
  </button>
  <div class="{isOpen ? 'flex-1 flex flex-col' : 'hidden'} xl:!flex xl:flex-1 xl:flex-col overflow-hidden">
    {#if children}
      {@render children()}
    {/if}
  </div>
</div>
