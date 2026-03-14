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

<div class="border border-[#2d1b4e]/50 rounded-lg overflow-hidden flex flex-col {borderClass}" class:xl:!flex={true}>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="flex items-center gap-2 px-3 py-2 bg-[#1a0b2e]/60 xl:cursor-default"
    onclick={() => isOpen = !isOpen}
  >
    <span class="xl:hidden">
      {#if isOpen}
        <ChevronDown class="w-4 h-4 text-zinc-500" />
      {:else}
        <ChevronRight class="w-4 h-4 text-zinc-500" />
      {/if}
    </span>
    {#if icon}
      {@render icon()}
    {/if}
    <span class="text-xs font-mono {titleColor}">{title}</span>
    {#if badge}
      {@render badge()}
    {/if}
  </div>
  {#if isOpen}
    <div class="flex-1 flex flex-col min-h-0">
      {#if children}
        {@render children()}
      {/if}
    </div>
  {/if}
</div>
