<script lang="ts">
  import { createSession } from './sessionStore.svelte';
  import TerminalApp from './components/TerminalApp.svelte';

  createSession();
</script>

<div class="min-h-screen bg-[#0d0118]">
  <TerminalApp />
</div>
