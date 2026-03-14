<script lang="ts">
  import { TerminalSquare } from 'lucide-svelte';
  import type { HistoryLine } from '../../core/types';
  import { useSession } from '../sessionStore';
  import { tick } from 'svelte';

  let { oncomplete }: { oncomplete: () => void } = $props();

  const { session, updateEmail } = useSession();

  let input = $state('');
  let history: HistoryLine[] = $state([
    { type: 'system', text: '╔══════════════════════════════════════════╗' },
    { type: 'system', text: '║         📧 Email Setup Required          ║' },
    { type: 'system', text: '╚══════════════════════════════════════════╝' },
    { type: 'system', text: '' },
    { type: 'output', text: `Welcome, ${session.currentUser?.username || 'user'}!` },
    { type: 'output', text: 'Please set your email address to continue.' },
    { type: 'system', text: '' },
    { type: 'output', text: 'Type your email address and press Enter:' },
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

  function pushLines(...lines: HistoryLine[]) {
    history = [...history, ...lines];
    scrollToBottom();
  }

  function validateEmail(email: string): string | null {
    if (!email.includes('@') || !email.includes('.')) return 'Email must contain @ and .';
    if (email.startsWith('@') || email.endsWith('@')) return 'Email cannot start or end with @';
    if (email.endsWith('.')) return 'Email cannot end with .';
    return null;
  }

  async function handleSubmit() {
    const raw = input.trim();
    input = '';
    if (!raw) return;

    pushLines({ type: 'input', text: `> ${raw}` });
    isProcessing = true;

    const error = validateEmail(raw);
    if (error) {
      pushLines(
        { type: 'error', text: error },
        { type: 'output', text: 'Please try again:' }
      );
      isProcessing = false;
      return;
    }

    await new Promise((r) => setTimeout(r, 400));
    updateEmail(raw);

    pushLines(
      { type: 'success', text: `Email set to: ${raw}` },
      { type: 'success', text: 'Setup complete! Launching terminal...' }
    );

    await new Promise((r) => setTimeout(r, 500));
    isProcessing = false;
    oncomplete();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }

  function lineClass(type: string): string {
    switch (type) {
      case 'input': return 'text-purple-400';
      case 'error': return 'text-red-400';
      case 'success': return 'text-emerald-400';
      case 'output': return 'text-cyan-400/80';
      case 'system': return 'text-zinc-600';
      default: return '';
    }
  }
</script>

<div class="min-h-screen bg-[#0d0118] flex items-center justify-center p-4 relative overflow-hidden">
  <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
  <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl"></div>

  <div class="w-full max-w-xl relative z-10">
    <!-- Terminal Chrome -->
    <div class="bg-[#1a0b2e] rounded-t-lg border border-b-0 border-[#2d1b4e] px-4 py-3 flex items-center gap-3">
      <div class="flex gap-1.5">
        <div class="w-3 h-3 rounded-full bg-red-500/80"></div>
        <div class="w-3 h-3 rounded-full bg-yellow-500/80"></div>
        <div class="w-3 h-3 rounded-full bg-green-500/80"></div>
      </div>
      <div class="flex items-center gap-2 text-zinc-400 text-sm">
        <TerminalSquare size={14} />
        <span>Email Setup</span>
      </div>
    </div>

    <!-- Terminal Body -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="bg-[#0d0118] border border-[#2d1b4e] rounded-b-lg p-4 cursor-text"
      onclick={focusInput}
    >
      <div bind:this={scrollEl} class="overflow-y-auto space-y-1 font-mono text-sm" style="max-height: 70vh">
        {#each history as line, i (i)}
          <div class={lineClass(line.type)}>{line.text}</div>
        {/each}

        <div class="flex items-center gap-2">
          <span class="text-purple-400 font-bold">&gt;</span>
          <input
            bind:this={inputEl}
            bind:value={input}
            type="email"
            class="flex-1 bg-transparent outline-none text-purple-100 caret-purple-400 font-mono text-sm {isProcessing ? 'animate-pulse opacity-50' : ''}"
            disabled={isProcessing}
            autocomplete="off"
            spellcheck="false"
            onkeydown={handleKeyDown}
          />
        </div>
      </div>

      <div class="mt-3 flex justify-end xl:hidden">
        <button
          class="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded text-xs font-mono hover:bg-purple-500/30 transition-colors"
          disabled={isProcessing}
          onclick={handleSubmit}
        >
          Submit ⏎
        </button>
      </div>
    </div>
  </div>
</div>
