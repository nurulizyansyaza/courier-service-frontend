<script lang="ts">
  import { Terminal } from 'lucide-svelte';
  import type { HistoryLine } from '../../core/types';
  import { WELCOME_LINES } from '../../core/constants';
  import { useSession } from '../sessionStore.svelte';

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

    // Echo user input
    pushLines({ type: 'input', text: trimmed });
    input = '';

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();

    // ── clear ──
    if (cmd === 'clear') {
      history = [
        { type: 'system', text: '# Terminal cleared.' },
        { type: 'system', text: '# Commands: login <user> <pass> | guest | register <user> <pass> | clear' },
      ];
      return;
    }

    // ── guest ──
    if (cmd === 'guest') {
      isProcessing = true;
      pushLines({ type: 'output', text: 'Authenticating as guest...' });
      await new Promise((r) => setTimeout(r, 400));
      pushLines({ type: 'success', text: 'Access granted. Redirecting...' });
      await new Promise((r) => setTimeout(r, 350));
      loginAsGuest();
      return;
    }

    // ── login ──
    if (cmd === 'login') {
      const [, username, password] = parts;
      if (!username || !password) {
        pushLines({ type: 'error', text: 'Usage: login <username> <password>' });
        return;
      }
      isProcessing = true;
      pushLines({ type: 'output', text: `Authenticating ${username}...` });
      await new Promise((r) => setTimeout(r, 500));
      const result = login(username, password);
      if (!result.success) {
        pushLines({ type: 'error', text: result.error || 'Login failed' });
        isProcessing = false;
      } else {
        pushLines({ type: 'success', text: `Access granted. Welcome, ${username}.` });
        // Session state change will unmount this component
      }
      return;
    }

    // ── register (vendor only) ──
    if (cmd === 'register') {
      const [, username, password] = parts;
      if (!username || !password) {
        pushLines(
          { type: 'error', text: 'Usage: register <username> <password>' },
          { type: 'output', text: 'Creates a vendor account.' },
        );
        return;
      }
      // Reject if they try to pass a role
      if (parts.length > 3) {
        pushLines(
          { type: 'error', text: 'Register only creates vendor accounts. No role parameter needed.' },
          { type: 'output', text: 'Usage: register <username> <password>' },
        );
        return;
      }
      isProcessing = true;
      pushLines({ type: 'output', text: `Creating vendor account "${username}"...` });
      await new Promise((r) => setTimeout(r, 400));

      const regResult = register(username, password);
      if (!regResult.success) {
        pushLines({ type: 'error', text: regResult.error || 'Registration failed' });
        isProcessing = false;
        return;
      }

      pushLines({ type: 'success', text: `Vendor account created. Welcome, ${username}.` });
      // register auto-logs in via setSession, component will unmount
      return;
    }

    // ── unknown ──
    pushLines(
      { type: 'error', text: `Unknown command: "${cmd}"` },
      { type: 'output', text: 'Commands: login <user> <pass> | guest | register <user> <pass> | clear' },
    );
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
        <span class="text-xs text-zinc-500 font-mono">Courier Service App</span>
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
      <!-- Scrollable history -->
      <div bind:this={scrollEl} class="p-4 sm:p-6 overflow-auto" style="max-height: 70vh">
        <!-- History lines -->
        {#each history as line, i (i)}
          <div class="leading-relaxed">
            {#if line.type === 'input'}
              <span>
                <span class="text-pink-400">$ </span>
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
          <span class="text-pink-400 shrink-0">$ </span>
          <input
            bind:this={inputEl}
            bind:value={input}
            type="text"
            class="ml-2 flex-1 bg-transparent border-none outline-none text-zinc-100 font-mono text-sm placeholder:text-zinc-700 disabled:opacity-50 caret-pink-400"
            placeholder={isProcessing ? '' : 'type a command...'}
            disabled={isProcessing}
            autocomplete="off"
            spellcheck="false"
            onkeydown={handleKeyDown}
          />
          {#if isProcessing}
            <span class="text-pink-400/50 animate-pulse text-xs ml-2">processing...</span>
          {/if}
        </div>
      </div>

      <!-- Mobile Run button -->
      <div class="xl:hidden px-4 pb-4 sm:px-6 sm:pb-6 flex justify-end">
        <button
          onclick={handleSubmit}
          disabled={isProcessing || !input.trim()}
          class="px-4 py-1.5 text-sm rounded bg-pink-500/20 text-pink-400 border border-pink-500/30 hover:bg-pink-500/30 transition-colors disabled:opacity-30 font-mono"
        >
          Run
        </button>
      </div>
    </div>
  </div>
</div>
