<script lang="ts">
  import { parseHelpSections } from '@/core/utils'

  let { message, success }: { message: string; success: boolean } = $props()

  let sections = $derived(parseHelpSections(message))
</script>

<div class="p-0">
  <div class="text-xs font-mono text-cyan-400 pb-2 mb-3 border-b border-[#2d1b4e]/50">Command Reference</div>
  <div class="grid grid-cols-1 gap-4">
    {#each sections as section, i (i)}
      <div class="space-y-1.5">
        {#if section.title}
          <div class="text-[11px] font-mono text-cyan-400/80 pb-1 mb-1">{section.title}</div>
        {/if}
        {#each section.lines as line, j (j)}
          {#if line.indexOf(' - ') > -1}
            <div class="flex flex-col 2xl:flex-row 2xl:items-baseline gap-0.5 2xl:gap-2 text-xs font-mono">
              <span class="text-cyan-300 whitespace-nowrap">{line.slice(0, line.indexOf(' - ')).trim()}</span>
              <span class="text-zinc-600 hidden 2xl:inline">—</span>
              <span class="text-cyan-400/60 pl-2 2xl:pl-0">{line.slice(line.indexOf(' - ') + 3).trim()}</span>
            </div>
          {:else}
            <div class="text-xs font-mono text-cyan-300">{line}</div>
          {/if}
        {/each}
      </div>
    {/each}
  </div>
</div>
