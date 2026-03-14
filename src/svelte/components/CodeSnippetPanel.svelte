<script lang="ts">
  import {
    TerminalSquare,
    ChevronDown,
    ChevronRight,
    Lock,
    Pencil,
    RotateCcw,
  } from 'lucide-svelte';
  import type { Framework, CommandHistoryEntry } from '../../core/types';
  import { FRAMEWORK_CONFIG } from '../../core/constants';
  import {
    CODE_SNIPPETS,
    splitSnippet,
    ORIGINAL_EDITABLE,
    TOKEN_COLORS,
    CANVAS_LINE_HEIGHT,
    CANVAS_LINE_NUM_WIDTH,
    CANVAS_CODE_PAD,
    CANVAS_FONT,
    tokenize,
    drawLockedCode,
  } from '../../core/codeSnippets';
  import { processSnippetCommand } from '../../core/snippetCommands';

  // ── Component state ──────────────────────────────────────────────────

  let framework = $state<Framework>('react');
  let commandInput = $state('');
  let commandHistory = $state<CommandHistoryEntry[]>([]);
  let isOpen = $state(false);
  let editedUI = $state<Record<Framework, string>>({ ...ORIGINAL_EDITABLE });
  let pendingSwitch = $state<Framework | null>(null);
  let keepEdits = $state(true);

  let inputEl: HTMLInputElement | undefined = $state();
  let historyEl: HTMLDivElement | undefined = $state();
  let editableEl: HTMLTextAreaElement | undefined = $state();
  let lineNumEl: HTMLDivElement | undefined = $state();
  let lockedCanvasEl: HTMLCanvasElement | undefined = $state();

  const fc = $derived(FRAMEWORK_CONFIG[framework]);
  const locked = $derived(splitSnippet(CODE_SNIPPETS[framework]).locked);
  const lockedLines = $derived(locked.split('\n'));
  const editableText = $derived(editedUI[framework]);
  const editableLines = $derived(editableText.split('\n'));
  const lockedLineCount = $derived(lockedLines.length);
  const isModified = $derived(editableText !== ORIGINAL_EDITABLE[framework]);

  // Auto-scroll command history
  $effect(() => {
    commandHistory;
    if (historyEl) {
      // Use tick to wait for DOM update
      requestAnimationFrame(() => {
        if (historyEl) historyEl.scrollTop = historyEl.scrollHeight;
      });
    }
  });

  // Draw locked code on canvas + ResizeObserver
  $effect(() => {
    if (!isOpen) return;
    const canvas = lockedCanvasEl;
    if (!canvas) return;
    const lines = lockedLines;
    const fw = framework;

    // Draw immediately
    requestAnimationFrame(() => {
      drawLockedCode(canvas, lines, fw);
    });

    // Observe resize
    const observer = new ResizeObserver(() => {
      drawLockedCode(canvas, lines, fw);
    });
    const container = canvas.parentElement;
    if (container) observer.observe(container);

    return () => {
      observer.disconnect();
    };
  });

  function handleEditableScroll() {
    if (editableEl && lineNumEl) {
      lineNumEl.scrollTop = editableEl.scrollTop;
    }
  }

  function handleCommand(input: string) {
    const result = processSnippetCommand(input, {
      framework,
      isModified,
      editedUI,
    });
    if (!result) return null;

    switch (result.type) {
      case 'clear':
        commandHistory = [];
        return null;
      case 'reset':
        editedUI = { ...editedUI, [result.framework]: ORIGINAL_EDITABLE[result.framework] };
        return { output: result.output, isError: false };
      case 'switch':
        framework = result.framework;
        return { output: result.output, isError: false };
      case 'confirm-switch':
        pendingSwitch = result.framework;
        keepEdits = true;
        return { output: result.output, isError: false };
      case 'output':
        return { output: result.output, isError: result.isError };
    }
  }

  function handleSubmit() {
    if (!commandInput.trim()) return;
    const result = handleCommand(commandInput);
    if (result) {
      commandHistory = [
        ...commandHistory,
        { input: commandInput, output: result.output, isError: result.isError },
      ];
    }
    commandInput = '';
  }

  function confirmSwitch() {
    if (!pendingSwitch) return;
    const oldFramework = framework;
    if (!keepEdits) {
      editedUI = { ...editedUI, [oldFramework]: ORIGINAL_EDITABLE[oldFramework] };
    }
    commandHistory = [
      ...commandHistory,
      {
        input: `use ${pendingSwitch}`,
        output: `Switched to ${FRAMEWORK_CONFIG[pendingSwitch].label}${keepEdits ? ' (kept custom edits)' : ' (reset edits)'}`,
        isError: false,
      },
    ];
    framework = pendingSwitch;
    pendingSwitch = null;
    keepEdits = true;
  }

  function cancelSwitch() {
    commandHistory = [
      ...commandHistory,
      {
        input: `use ${pendingSwitch}`,
        output: 'Switch cancelled.',
        isError: false,
      },
    ];
    pendingSwitch = null;
    keepEdits = true;
  }

  function handleEditableInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    editedUI = { ...editedUI, [framework]: target.value };
  }

  function resetEditable(e: Event) {
    e.stopPropagation();
    editedUI = { ...editedUI, [framework]: ORIGINAL_EDITABLE[framework] };
  }

  function preventCopy(e: Event) {
    e.preventDefault();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }
</script>

<div class="flex flex-col bg-[#0d0118] border-t border-[#2d1b4e] max-h-[45vh]">
  <!-- Header -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <button
    class="px-3 sm:px-4 py-2 bg-[#1a0b2e] border-b border-[#2d1b4e] flex items-center gap-1.5 sm:gap-2 w-full shrink-0 flex-wrap"
    onclick={() => isOpen = !isOpen}
  >
    <span class="text-zinc-500">
      {#if isOpen}
        <ChevronDown class="w-3.5 h-3.5" />
      {:else}
        <ChevronRight class="w-3.5 h-3.5" />
      {/if}
    </span>
    <TerminalSquare class="w-4 h-4 text-pink-400" />
    <span class="text-xs sm:text-sm text-pink-400 font-mono">
      &gt;_ code snippet
    </span>
    <span
      class="text-[9px] sm:text-[10px] font-mono px-1 sm:px-1.5 py-0.5 rounded border {fc.color} {fc.bgColor} {fc.borderColor}"
    >
      {fc.label}
    </span>
    {#if isModified}
      <span
        class="text-[9px] sm:text-[10px] font-mono text-amber-400 bg-amber-500/15 px-1 sm:px-1.5 py-0.5 rounded border border-amber-500/30"
      >
        modified
      </span>
    {/if}
  </button>

  <!-- Content -->
  {#if isOpen}
    <div class="flex-1 flex flex-col overflow-hidden min-h-0">
      <!-- Single scrollable area for both locked + editable -->
      <div class="flex-1 overflow-auto font-mono text-xs sm:text-sm scrollbar-pink">
        <!-- Locked Section: Core Logic (canvas-rendered, hidden from inspect) -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          style="user-select: none; -webkit-user-select: none"
          oncopy={preventCopy}
          oncut={preventCopy}
          oncontextmenu={preventCopy}
        >
          <canvas
            bind:this={lockedCanvasEl}
            class="w-full block"
            style="height: {lockedLines.length * CANVAS_LINE_HEIGHT}px"
          ></canvas>
        </div>

        <!-- Section Divider -->
        <div
          class="sticky left-0 flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 bg-[#1a0b2e]/60 border-y border-[#2d1b4e]"
        >
          <div
            class="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] font-mono shrink-0"
          >
            <Lock class="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-400/60" />
            <span class="text-red-400/60">core logic — locked</span>
          </div>
          <div class="hidden sm:block flex-1 border-t border-[#2d1b4e]/60"></div>
          <div
            class="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] font-mono shrink-0"
          >
            <Pencil class="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400/60" />
            <span class="text-emerald-400/60">ui layer — editable</span>
          </div>
          {#if isModified}
            <button
              class="flex items-center gap-1 text-[9px] sm:text-[10px] font-mono text-amber-400/70 hover:text-amber-400 transition-colors sm:ml-1 shrink-0"
              title="Reset to original"
              onclick={resetEditable}
            >
              <RotateCcw class="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span>reset</span>
            </button>
          {/if}
        </div>

        <!-- Editable Section: UI Layer -->
        <div class="relative flex">
          <!-- Line numbers column -->
          <div bind:this={lineNumEl} class="shrink-0 select-none pointer-events-none">
            {#each editableLines as _, i}
              <div
                class="flex items-center justify-end gap-0.5 sm:gap-1 pr-1.5 sm:pr-2 pl-1.5 sm:pl-2 leading-[1.35rem]"
              >
                <Pencil
                  class="w-2 h-2 sm:w-2.5 sm:h-2.5 text-emerald-500/30 hidden sm:block"
                />
                <span
                  class="text-emerald-500/40 text-[10px] sm:text-xs font-mono"
                >{lockedLineCount + i + 1}</span>
              </div>
            {/each}
          </div>

          <!-- Editable textarea -->
          <textarea
            bind:this={editableEl}
            value={editableText}
            class="flex-1 bg-transparent text-zinc-300 font-mono text-xs sm:text-sm resize-none outline-none border-l-2 border-emerald-500/20 pl-1.5 sm:pl-2 pr-3 sm:pr-4 py-0 leading-[1.35rem] overflow-hidden"
            spellcheck="false"
            autocomplete="off"
            style="height: {editableLines.length * 1.35}rem; tab-size: 2"
            oninput={handleEditableInput}
            onscroll={handleEditableScroll}
          ></textarea>
        </div>
      </div>

      <!-- Command Line -->
      <div class="border-t border-[#2d1b4e] bg-[#0d0118] shrink-0">
        <!-- Command History -->
        {#if commandHistory.length > 0}
          <div
            bind:this={historyEl}
            class="max-h-[80px] overflow-auto px-3 sm:px-4 py-2 space-y-1 border-b border-[#2d1b4e]/50 scrollbar-pink"
          >
            {#each commandHistory as entry, i}
              <div class="font-mono text-[10px] sm:text-xs">
                <div class="text-zinc-500">
                  <span class="text-emerald-500">$</span> {entry.input}
                </div>
                <pre
                  class="whitespace-pre-wrap pl-3 {entry.isError ? 'text-red-400' : 'text-cyan-400'}"
                >{entry.output}</pre>
              </div>
            {/each}
          </div>
        {/if}

        <!-- Pending Switch Confirmation -->
        {#if pendingSwitch}
          <div class="px-3 sm:px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 flex flex-wrap items-center gap-2 text-[10px] sm:text-xs font-mono">
            <span class="text-amber-400">
              Switch to {FRAMEWORK_CONFIG[pendingSwitch].label}?
            </span>
            <label class="flex items-center gap-1 text-zinc-400 cursor-pointer select-none">
              <input
                type="checkbox"
                bind:checked={keepEdits}
                class="accent-pink-500 w-3 h-3"
              />
              keep custom edits
            </label>
            <button
              class="px-2 py-0.5 rounded bg-emerald-600/80 text-emerald-100 hover:bg-emerald-600 transition-colors"
              onclick={confirmSwitch}
            >
              confirm
            </button>
            <button
              class="px-2 py-0.5 rounded bg-zinc-700/80 text-zinc-300 hover:bg-zinc-700 transition-colors"
              onclick={cancelSwitch}
            >
              cancel
            </button>
          </div>
        {/if}

        <!-- Input -->
        <div class="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2">
          <span class="text-emerald-500 font-mono text-xs sm:text-sm">$</span>
          <input
            bind:this={inputEl}
            bind:value={commandInput}
            placeholder="use react | use vue | use svelte | reset | help"
            class="flex-1 bg-transparent border-none outline-none text-zinc-100 placeholder:text-zinc-700 font-mono text-xs sm:text-sm"
            spellcheck="false"
            autocomplete="off"
            onkeydown={handleKeyDown}
          />
        </div>
      </div>
    </div>
  {/if}
</div>
