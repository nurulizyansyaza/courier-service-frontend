<script lang="ts">
  import { TerminalSquare } from 'lucide-svelte';
  import type { HistoryLine } from '../../core/types';
  import { WELCOME_LINES } from '../../core/constants';
  import { useSession } from '../sessionStore';

  const { login, register, loginAsGuest } = useSession();

  let input = $state('');
  let history: HistoryLine[] = $state([...WELCOME_LINES]);
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

  async function handleSubmit() {
    const raw = input.trim();
    input = '';
    if (!raw) return;

    pushLines({ type: 'input', text: `$ ${raw}` });
    isProcessing = true;

    const parts = raw.split(/\s+/);
    const cmd = parts[0].toLowerCase();

    if (cmd === 'clear') {
      history = [
        { type: 'system', text: '─── Terminal Cleared ───' },
        { type: 'system', text: '' },
      ];
      isProcessing = false;
      scrollToBottom();
      return;
    }

    if (cmd === 'guest') {
      await new Promise((r) => setTimeout(r, 400));
      loginAsGuest();
      isProcessing = false;
      return;
    }

    if (cmd === 'login') {
      if (parts.length < 3) {
        pushLines({ type: 'error', text: 'Usage: login <username> <password>' });
        isProcessing = false;
        return;
      }
      await new Promise((r) => setTimeout(r, 500));
      const result = login(parts[1], parts[2]);
      if (!result.success) {
        pushLines({ type: 'error', text: result.error || 'Login failed' });
      }
      isProcessing = false;
      return;
    }

    if (cmd === 'register') {
      if (parts.length < 3 || parts.length > 3) {
        pushLines({ type: 'error', text: 'Usage: register <username> <password>' });
        isProcessing = false;
        return;
      }
      await new Promise((r) => setTimeout(r, 400));
      const result = register(parts[1], parts[2]);
      if (result.success) {
        pushLines({ type: 'success', text: `Vendor "${parts[1]}" registered & logged in.` });
      } else {
        pushLines({ type: 'error', text: result.error || 'Registration failed' });
      }
      isProcessing = false;
      return;
    }

    pushLines(
      { type: 'error', text: `Unknown command: ${cmd}` },
      { type: 'output', text: 'Available: login <user> <pass> | register <user> <pass> | guest | clear' }
    );
    isProcessing = false;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }

  function lineClass(type: string): string {
    switch (type) {
      case 'input': return 'text-pink-400';
      case 'error': return 'text-red-400';
      case 'success': return 'text-emerald-400';
      case 'output': return 'text-cyan-400/80';
      case 'system': return 'text-zinc-600';
      default: return '';
    }
  }
</script>

<div class="min-h-screen bg-[#0d0118] flex items-center justify-center p-4 relative overflow-hidden">
  <!-- Background glow -->
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
        <span>Courier Service App</span>
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
        <!-- History lines -->
        {#each history as line, i (i)}
          <div class={lineClass(line.type)}>{line.text}</div>
        {/each}

        <!-- Active input -->
        <div class="flex items-center gap-2">
          <span class="text-pink-400 font-bold">$</span>
          <input
            bind:this={inputEl}
            bind:value={input}
            type="text"
            class="flex-1 bg-transparent outline-none text-pink-100 caret-pink-400 font-mono text-sm {isProcessing ? 'animate-pulse opacity-50' : ''}"
            disabled={isProcessing}
            autocomplete="off"
            spellcheck="false"
            onkeydown={handleKeyDown}
          />
        </div>
      </div>

      <!-- Mobile Run button -->
      <div class="mt-3 flex justify-end xl:hidden">
        <button
          class="px-3 py-1.5 bg-pink-500/20 text-pink-400 rounded text-xs font-mono hover:bg-pink-500/30 transition-colors"
          disabled={isProcessing}
          onclick={handleSubmit}
        >
          Run ⏎
        </button>
      </div>
    </div>
  </div>
</div>
