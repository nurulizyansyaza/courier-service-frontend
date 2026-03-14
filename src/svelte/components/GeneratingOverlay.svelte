<script lang="ts">
  import { Loader2 } from 'lucide-svelte'

  let { label = 'Generating...' }: { label?: string } = $props()
</script>

<div class="absolute inset-0 bg-[#0d0118]/80 backdrop-blur-sm flex items-center justify-center z-10">
  <div class="flex items-center gap-2 text-sm font-mono">
    <Loader2 class="w-4 h-4 text-pink-400 animate-spin" />
    <span class="text-pink-400 animate-pulse">{label}</span>
  </div>
</div>
