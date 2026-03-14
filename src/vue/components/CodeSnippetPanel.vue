<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import {
  TerminalSquare,
  ChevronDown,
  ChevronRight,
  Lock,
  Pencil,
  RotateCcw,
} from 'lucide-vue-next';
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

// ── Component state ──────────────────────────────────────────────────

const framework = ref<Framework>('react');
const commandInput = ref('');
const commandHistory = ref<CommandHistoryEntry[]>([]);
const isOpen = ref(false);
const editedUI = ref<Record<Framework, string>>({ ...ORIGINAL_EDITABLE });
const pendingSwitch = ref<Framework | null>(null);
const keepEdits = ref(true);

const inputRef = ref<HTMLInputElement | null>(null);
const historyRef = ref<HTMLDivElement | null>(null);
const editableRef = ref<HTMLTextAreaElement | null>(null);
const lineNumRef = ref<HTMLDivElement | null>(null);
const lockedCanvasRef = ref<HTMLCanvasElement | null>(null);

const fc = computed(() => FRAMEWORK_CONFIG[framework.value]);

const locked = computed(() => splitSnippet(CODE_SNIPPETS[framework.value]).locked);
const lockedLines = computed(() => locked.value.split('\n'));
const editableText = computed(() => editedUI.value[framework.value]);
const editableLines = computed(() => editableText.value.split('\n'));
const lockedLineCount = computed(() => lockedLines.value.length);
const isModified = computed(() => editableText.value !== ORIGINAL_EDITABLE[framework.value]);

// Auto-scroll command history
watch(commandHistory, () => {
  nextTick(() => {
    if (historyRef.value) {
      historyRef.value.scrollTop = historyRef.value.scrollHeight;
    }
  });
}, { deep: true });

// Draw locked code on canvas
let resizeObserver: ResizeObserver | null = null;

watch([framework, isOpen], () => {
  nextTick(() => {
    if (!isOpen.value) return;
    const canvas = lockedCanvasRef.value;
    if (!canvas) return;
    const lines = lockedLines.value;
    drawLockedCode(canvas, lines, framework.value);

    resizeObserver?.disconnect();
    resizeObserver = new ResizeObserver(() => {
      drawLockedCode(canvas, lines, framework.value);
    });
    const container = canvas.parentElement;
    if (container) resizeObserver.observe(container);
  });
}, { immediate: true });

onUnmounted(() => {
  resizeObserver?.disconnect();
});

function handleEditableScroll() {
  if (editableRef.value && lineNumRef.value) {
    lineNumRef.value.scrollTop = editableRef.value.scrollTop;
  }
}

function processCommand(input: string) {
  const trimmed = input.trim().toLowerCase();
  const parts = trimmed.split(/\s+/);

  if (trimmed === 'help') {
    return {
      output:
        "Available commands:\n  use react     - Switch to React.js\n  use vue       - Switch to Vue.js\n  use svelte    - Switch to Svelte\n  current       - Show current framework\n  reset         - Reset UI layer to original\n  clear         - Clear command history\n  help          - Show this help",
      isError: false,
    };
  }

  if (trimmed === 'clear') {
    commandHistory.value = [];
    return null;
  }

  if (trimmed === 'current') {
    return {
      output: `Current framework: ${FRAMEWORK_CONFIG[framework.value].label}${isModified.value ? ' (modified)' : ''}`,
      isError: false,
    };
  }

  if (trimmed === 'reset') {
    editedUI.value = { ...editedUI.value, [framework.value]: ORIGINAL_EDITABLE[framework.value] };
    return {
      output: `UI layer for ${FRAMEWORK_CONFIG[framework.value].label} reset to original`,
      isError: false,
    };
  }

  if (parts[0] === 'use' && parts.length === 2) {
    const target = parts[1] as Framework;
    if (target === 'react' || target === 'vue' || target === 'svelte') {
      if (target === framework.value) {
        return {
          output: `Already using ${FRAMEWORK_CONFIG[target].label}`,
          isError: false,
        };
      }
      if (isModified.value) {
        pendingSwitch.value = target;
        keepEdits.value = true;
        return {
          output: `You have custom edits on ${FRAMEWORK_CONFIG[framework.value].label}. Confirm switch above.`,
          isError: false,
        };
      }
      framework.value = target;
      return {
        output: `Switched to ${FRAMEWORK_CONFIG[target].label}`,
        isError: false,
      };
    }
    return {
      output: `Unknown framework "${parts[1]}". Available: react | vue | svelte`,
      isError: true,
    };
  }

  return {
    output: `Unknown command "${trimmed}". Type 'help' for available commands.`,
    isError: true,
  };
}

function handleSubmit() {
  if (!commandInput.value.trim()) return;
  const result = processCommand(commandInput.value);
  if (result) {
    commandHistory.value = [
      ...commandHistory.value,
      { input: commandInput.value, output: result.output, isError: result.isError },
    ];
  }
  commandInput.value = '';
}

function confirmSwitch() {
  if (!pendingSwitch.value) return;
  const oldFramework = framework.value;
  if (!keepEdits.value) {
    editedUI.value = { ...editedUI.value, [oldFramework]: ORIGINAL_EDITABLE[oldFramework] };
  }
  commandHistory.value = [
    ...commandHistory.value,
    {
      input: `use ${pendingSwitch.value}`,
      output: `Switched to ${FRAMEWORK_CONFIG[pendingSwitch.value].label}${keepEdits.value ? ' (kept custom edits)' : ' (reset edits)'}`,
      isError: false,
    },
  ];
  framework.value = pendingSwitch.value;
  pendingSwitch.value = null;
  keepEdits.value = true;
}

function cancelSwitch() {
  commandHistory.value = [
    ...commandHistory.value,
    {
      input: `use ${pendingSwitch.value}`,
      output: 'Switch cancelled.',
      isError: false,
    },
  ];
  pendingSwitch.value = null;
  keepEdits.value = true;
}

function handleEditableInput(e: Event) {
  const target = e.target as HTMLTextAreaElement;
  editedUI.value = { ...editedUI.value, [framework.value]: target.value };
}

function resetEditable(e: Event) {
  e.stopPropagation();
  editedUI.value = { ...editedUI.value, [framework.value]: ORIGINAL_EDITABLE[framework.value] };
}

function preventCopy(e: Event) {
  e.preventDefault();
}
</script>

<template>
  <div class="flex flex-col bg-[#0d0118] border-t border-[#2d1b4e] max-h-[45vh]">
    <!-- Header -->
    <button
      class="px-3 sm:px-4 py-2 bg-[#1a0b2e] border-b border-[#2d1b4e] flex items-center gap-1.5 sm:gap-2 w-full shrink-0 flex-wrap"
      @click="isOpen = !isOpen"
    >
      <span class="text-zinc-500">
        <ChevronDown v-if="isOpen" class="w-3.5 h-3.5" />
        <ChevronRight v-else class="w-3.5 h-3.5" />
      </span>
      <TerminalSquare class="w-4 h-4 text-pink-400" />
      <span class="text-xs sm:text-sm text-pink-400 font-mono">
        &gt;_ code snippet
      </span>
      <span
        :class="[
          'text-[9px] sm:text-[10px] font-mono px-1 sm:px-1.5 py-0.5 rounded border',
          fc.color,
          fc.bgColor,
          fc.borderColor,
        ]"
      >
        {{ fc.label }}
      </span>
      <span
        v-if="isModified"
        class="text-[9px] sm:text-[10px] font-mono text-amber-400 bg-amber-500/15 px-1 sm:px-1.5 py-0.5 rounded border border-amber-500/30"
      >
        modified
      </span>
    </button>

    <!-- Content -->
    <div v-if="isOpen" class="flex-1 flex flex-col overflow-hidden min-h-0">
      <!-- Single scrollable area for both locked + editable -->
      <div class="flex-1 overflow-auto font-mono text-xs sm:text-sm scrollbar-pink">
        <!-- Locked Section: Core Logic (canvas-rendered, hidden from inspect) -->
        <div
          style="user-select: none; -webkit-user-select: none"
          @copy.prevent
          @cut.prevent
          @contextmenu.prevent
        >
          <canvas
            ref="lockedCanvasRef"
            class="w-full block"
            :style="{ height: `${lockedLines.length * CANVAS_LINE_HEIGHT}px` }"
          />
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
          <div class="hidden sm:block flex-1 border-t border-[#2d1b4e]/60" />
          <div
            class="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] font-mono shrink-0"
          >
            <Pencil class="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400/60" />
            <span class="text-emerald-400/60">ui layer — editable</span>
          </div>
          <button
            v-if="isModified"
            class="flex items-center gap-1 text-[9px] sm:text-[10px] font-mono text-amber-400/70 hover:text-amber-400 transition-colors sm:ml-1 shrink-0"
            title="Reset to original"
            @click="resetEditable"
          >
            <RotateCcw class="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            <span>reset</span>
          </button>
        </div>

        <!-- Editable Section: UI Layer -->
        <div class="relative flex">
          <!-- Line numbers column -->
          <div ref="lineNumRef" class="shrink-0 select-none pointer-events-none">
            <div
              v-for="(_, i) in editableLines"
              :key="`ln-${i}`"
              class="flex items-center justify-end gap-0.5 sm:gap-1 pr-1.5 sm:pr-2 pl-1.5 sm:pl-2 leading-[1.35rem]"
            >
              <Pencil
                class="w-2 h-2 sm:w-2.5 sm:h-2.5 text-emerald-500/30 hidden sm:block"
              />
              <span
                class="text-emerald-500/40 text-[10px] sm:text-xs font-mono"
              >{{ lockedLineCount + i + 1 }}</span>
            </div>
          </div>

          <!-- Editable textarea -->
          <textarea
            ref="editableRef"
            :value="editableText"
            class="flex-1 bg-transparent text-zinc-300 font-mono text-xs sm:text-sm resize-none outline-none border-l-2 border-emerald-500/20 pl-1.5 sm:pl-2 pr-3 sm:pr-4 py-0 leading-[1.35rem] overflow-hidden"
            spellcheck="false"
            autocomplete="off"
            :style="{
              height: `${editableLines.length * 1.35}rem`,
              tabSize: 2,
            }"
            @input="handleEditableInput"
            @scroll="handleEditableScroll"
          />
        </div>
      </div>

      <!-- Command Line -->
      <div class="border-t border-[#2d1b4e] bg-[#0d0118] shrink-0">
        <!-- Command History -->
        <div
          v-if="commandHistory.length > 0"
          ref="historyRef"
          class="max-h-[80px] overflow-auto px-3 sm:px-4 py-2 space-y-1 border-b border-[#2d1b4e]/50 scrollbar-pink"
        >
          <div
            v-for="(entry, i) in commandHistory"
            :key="i"
            class="font-mono text-[10px] sm:text-xs"
          >
            <div class="text-zinc-500">
              <span class="text-emerald-500">$</span> {{ entry.input }}
            </div>
            <pre
              :class="[
                'whitespace-pre-wrap pl-3',
                entry.isError ? 'text-red-400' : 'text-cyan-400',
              ]"
            >{{ entry.output }}</pre>
          </div>
        </div>

        <!-- Pending Switch Confirmation -->
        <div
          v-if="pendingSwitch"
          class="px-3 sm:px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 flex flex-wrap items-center gap-2 text-[10px] sm:text-xs font-mono"
        >
          <span class="text-amber-400">
            Switch to {{ FRAMEWORK_CONFIG[pendingSwitch].label }}?
          </span>
          <label class="flex items-center gap-1 text-zinc-400 cursor-pointer select-none">
            <input
              type="checkbox"
              v-model="keepEdits"
              class="accent-pink-500 w-3 h-3"
            />
            keep custom edits
          </label>
          <button
            class="px-2 py-0.5 rounded bg-emerald-600/80 text-emerald-100 hover:bg-emerald-600 transition-colors"
            @click="confirmSwitch"
          >
            confirm
          </button>
          <button
            class="px-2 py-0.5 rounded bg-zinc-700/80 text-zinc-300 hover:bg-zinc-700 transition-colors"
            @click="cancelSwitch"
          >
            cancel
          </button>
        </div>

        <!-- Input -->
        <div class="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2">
          <span class="text-emerald-500 font-mono text-xs sm:text-sm">$</span>
          <input
            ref="inputRef"
            v-model="commandInput"
            placeholder="use react | use vue | use svelte | reset | help"
            class="flex-1 bg-transparent border-none outline-none text-zinc-100 placeholder:text-zinc-700 font-mono text-xs sm:text-sm"
            spellcheck="false"
            autocomplete="off"
            @keydown.enter.prevent="handleSubmit"
          />
        </div>
      </div>
    </div>
  </div>
</template>
