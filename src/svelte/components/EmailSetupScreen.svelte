<script lang="ts">
  import { Terminal } from 'lucide-svelte';
  import type { HistoryLine } from '../../core/types';
  import { useSession } from '../sessionStore.svelte';

  let { oncomplete }: { oncomplete: () => void } = $props();

  const { session, updateEmail } = useSession();

  const username = session.currentUser?.username || 'user';

  let input = $state('');
  let history: HistoryLine[] = $state([
    { type: 'system', text: '# ─────────────────────────────────────' },
    { type: 'system', text: '#  Email Setup Required' },
    { type: 'system', text: '# ─────────────────────────────────────' },
    { type: 'system', text: '#' },
    { type: 'system', text: `#  Welcome, ${username}!` },
    { type: 'system', text: '#  An email address is required to' },
    { type: 'system', text: '#  access the terminal application.' },
    { type: 'system', text: '#' },
    { type: 'system', text: '#  Type your email address below:' },
    { type: 'system', text: '#    e.g. user@example.com' },
    { type: 'system', text: '#' },
    { type: 'system', text: '# ─────────────────────────────────────' },
  ]);
  let isProcessing = $state(false);
  let inputEl: HTMLInputElement | undefined = $state();
  let scrollEl: HTMLDivElement | undefined = $state();

  function scrollToBottom() {
    requestAnimationFrame(() => {
      if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
    });
  }

  function focusInput() {
    inputEl?.focus();
  }

  $effect(() => {
    focusInput();
  });

  $effect(() => {
    history;
    scrollToBottom();
  });

  function pushLines(...lines: HistoryLine[]) {
    history = [...history, ...lines];
  }

  async function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed || isProcessing) return;

    pushLines({ type: 'input', text: trimmed });
    input = '';

    // Validate email
    if (!trimmed.includes('@') || !trimmed.includes('.')) {
      pushLines(
        { type: 'error', text: 'Invalid email format. Must contain @ and .' },
        { type: 'output', text: 'Please enter a valid email address.' },
      );
      return;
    }

    // Check for obvious invalid patterns
    if (trimmed.startsWith('@') || trimmed.endsWith('@') || trimmed.endsWith('.')) {
      pushLines(
        { type: 'error', text: 'Invalid email format.' },
        { type: 'output', text: 'Please enter a valid email address.' },
      );
      return;
    }

    isProcessing = true;
    pushLines({ type: 'output', text: `Setting email to ${trimmed}...` });
    await new Promise((r) => setTimeout(r, 400));

    const result = updateEmail(trimmed);
    if (!result.success) {
      pushLines({ type: 'error', text: result.error || 'Failed to set email' });
      isProcessing = false;
      return;
    }

    pushLines({ type: 'success', text: `Email set successfully. Launching terminal...` });
    await new Promise((r) => setTimeout(r, 500));
    oncomplete();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }
</script>

<div class="min-h-screen bg-[#0d0118] flex items-center justify-center p-4">
  <!-- Background glow -->
  <div class="fixed inset-0 overflow-hidden pointer-events-none">
    <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
    <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl"></div>
  </div>

  <div class="relative w-full max-w-xl">
    <!-- Terminal Chrome -->
    <div class="bg-[#1a0b2e] border border-[#2d1b4e] rounded-t-xl px-4 py-3 flex items-center gap-3">
      <div class="flex gap-1.5">
        <div class="w-3 h-3 rounded-full bg-red-500/60"></div>
        <div class="w-3 h-3 rounded-full bg-amber-500/60"></div>
        <div class="w-3 h-3 rounded-full bg-emerald-500/60"></div>
      </div>
      <div class="flex-1 flex items-center justify-center gap-2">
        <Terminal class="w-3.5 h-3.5 text-zinc-500" />
        <span class="text-xs text-zinc-500 font-mono">Courier Service App — email setup</span>
      </div>
      <div class="w-[54px]"></div>
    </div>

    <!-- Terminal Body -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="bg-[#0d0118] border-x border-b border-[#2d1b4e] rounded-b-xl font-mono text-sm cursor-text"
      onclick={focusInput}
    >
      <div bind:this={scrollEl} class="p-4 sm:p-6 overflow-auto" style="max-height: 70vh">
        {#each history as line, i (i)}
          <div class="leading-relaxed">
            {#if line.type === 'input'}
              <span>
                <span class="text-pink-400">{'>'} </span>
                <span class="text-zinc-100">{line.text}</span>
              </span>
            {:else if line.type === 'error'}
              <span class="text-red-400">  {line.text}</span>
            {:else if line.type === 'success'}
              <span class="text-emerald-400">  {line.text}</span>
            {:else if line.type === 'output'}
              <span class="text-cyan-400/80">  {line.text}</span>
            {:else}
              <span class="text-zinc-600">{line.text}</span>
            {/if}
          </div>
        {/each}

        <!-- Active input line -->
        <div class="flex items-center gap-0 mt-1">
          <span class="text-pink-400 shrink-0">{'>'} </span>
          <input
            bind:this={inputEl}
            bind:value={input}
            type="email"
            class="ml-2 flex-1 bg-transparent border-none outline-none text-zinc-100 font-mono text-sm placeholder:text-zinc-700 disabled:opacity-50 caret-pink-400"
            placeholder={isProcessing ? '' : 'your@email.com'}
            disabled={isProcessing}
            autocomplete="email"
            spellcheck="false"
            onkeydown={handleKeyDown}
          />
          {#if isProcessing}
            <span class="text-pink-400/50 animate-pulse text-xs ml-2">saving...</span>
          {/if}
        </div>
      </div>

      <!-- Mobile submit button -->
      <div class="xl:hidden px-4 pb-4 sm:px-6 sm:pb-6 flex justify-end">
        <button
          onclick={handleSubmit}
          disabled={isProcessing || !input.trim()}
          class="px-4 py-1.5 text-sm rounded bg-pink-500/20 text-pink-400 border border-pink-500/30 hover:bg-pink-500/30 transition-colors disabled:opacity-30 font-mono"
        >
          Submit
        </button>
      </div>
    </div>
  </div>
</div>
