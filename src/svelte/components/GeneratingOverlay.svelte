<script lang="ts">
  import { Loader2 } from 'lucide-svelte'

  let { label = 'Generating...' }: { label?: string } = $props()
</script>

<div class="absolute inset-0 bg-[#0d0118]/80 backdrop-blur-sm z-10 flex items-center justify-center">
  <div class="flex items-center gap-2 text-pink-400">
    <Loader2 class="w-4 h-4 animate-spin" />
    <span class="text-xs font-mono animate-pulse">{label}</span>
  </div>
</div>
