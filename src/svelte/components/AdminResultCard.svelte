<script lang="ts">
  import type { AdminResult } from '@/core/types'
  import { parseHelpSections } from '@/core/utils'

  let { result }: { result: AdminResult } = $props()

  let isSuccess = $derived(result.success)
  let borderColor = $derived(isSuccess ? 'border-cyan-500/30' : 'border-red-500/30')
  let bgColor = $derived(isSuccess ? 'bg-cyan-500/5' : 'bg-red-500/5')
</script>

{#if result.type === 'user-list' && Array.isArray(result.data)}
  <div class="{bgColor} border rounded-lg p-4 space-y-3 {borderColor}">
    <div class="text-xs font-mono text-cyan-400 pb-2 border-b border-[#2d1b4e]/50">Registered Vendors</div>
    {#if (result.data as any[]).length === 0}
      <div class="text-xs font-mono text-zinc-500 py-2">No registered vendors.</div>
    {:else}
      <div class="space-y-2">
        {#each result.data as u, i (i)}
          <div class="flex items-center gap-3 px-3 py-2 bg-[#1a0b2e]/40 rounded text-xs font-mono">
            <span class="text-pink-400 min-w-[80px]">{u.username}</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">vendor</span>
            <span class="text-zinc-500">{u.email || '(no email)'}</span>
            <span class="text-zinc-700 ml-auto">{u.createdAt}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{:else if result.type === 'offer-list' && Array.isArray(result.data) && result.data.length > 0 && 'code' in result.data[0]}
  <div class="{bgColor} border rounded-lg p-4 space-y-3 {borderColor}">
    <div class="text-xs font-mono text-cyan-400 pb-2 border-b border-[#2d1b4e]/50">Offer Codes</div>
    <div class="space-y-2">
      {#each result.data as o, i (i)}
        <div class="flex items-center gap-3 px-3 py-2 bg-[#1a0b2e]/40 rounded text-xs font-mono">
          <span class="text-emerald-400 min-w-[60px]">{o.code}</span>
          <span class="text-pink-400">{o.discount}%</span>
          <span class="text-zinc-500">dist: {o.minDistance}-{o.maxDistance}km</span>
          <span class="text-zinc-500">wt: {o.minWeight}-{o.maxWeight}kg</span>
        </div>
      {/each}
    </div>
  </div>
{:else if result.type === 'help'}
  <div class="bg-[#1a0b2e]/40 border border-[#2d1b4e] rounded-lg p-4">
    <div class="text-xs font-mono text-cyan-400 pb-2 mb-3 border-b border-[#2d1b4e]/50">Command Reference</div>
    <div class="grid grid-cols-1 gap-4">
      {#each parseHelpSections(result.message) as section, i (i)}
        <div class="space-y-1.5">
          {#if section.title}
            <div class="text-[11px] font-mono text-pink-400/80 pb-1 mb-1">{section.title}</div>
          {/if}
          {#each section.lines as line, j (j)}
            {#if line.indexOf(' - ') > -1}
              <div class="flex flex-col 2xl:flex-row 2xl:items-baseline gap-0.5 2xl:gap-2 text-xs font-mono">
                <span class="text-zinc-300 whitespace-nowrap">{line.slice(0, line.indexOf(' - ')).trim()}</span>
                <span class="text-zinc-600 hidden 2xl:inline">—</span>
                <span class="text-zinc-500 pl-2 2xl:pl-0">{line.slice(line.indexOf(' - ') + 3).trim()}</span>
              </div>
            {:else}
              <div class="text-xs font-mono text-zinc-300">{line}</div>
            {/if}
          {/each}
        </div>
      {/each}
    </div>
  </div>
{:else if result.type === 'notification-list' && Array.isArray(result.data) && result.data.length > 0}
  <div class="{bgColor} border rounded-lg p-4 space-y-3 {borderColor}">
    <div class="text-xs font-mono text-cyan-400 pb-2 border-b border-[#2d1b4e]/50">Sent Notifications</div>
    <div class="space-y-2">
      {#each result.data as n, i (i)}
        <div class="px-3 py-2 bg-[#1a0b2e]/40 rounded text-xs font-mono space-y-1">
          <div class="flex items-center gap-2">
            <span class="text-zinc-600">{n.timestamp}</span>
            <span class="text-pink-400">To: {n.to}</span>
          </div>
          <div class="text-cyan-400">{n.subject}</div>
          <div class="text-zinc-500 whitespace-pre-wrap">{n.body}</div>
        </div>
      {/each}
    </div>
  </div>
{:else}
  <div class="{bgColor} border rounded-lg p-4 {borderColor}">
    <div class="text-xs font-mono pb-2 mb-2 border-b border-[#2d1b4e]/50 {isSuccess ? 'text-emerald-400' : 'text-red-400'}">{isSuccess ? 'Success' : 'Error'}</div>
    <pre class="text-sm font-mono whitespace-pre-wrap {isSuccess ? 'text-zinc-300' : 'text-red-300'}">{result.message}</pre>
  </div>
{/if}
