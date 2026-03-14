<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue';
import { TerminalSquare } from 'lucide-vue-next';
import type { HistoryLine } from '../../core/types';
import { WELCOME_LINES } from '../../core/constants';
import { useSession } from '../sessionStore';

const { login, register, loginAsGuest } = useSession();

const input = ref('');
const history = ref<HistoryLine[]>([...WELCOME_LINES]);
const isProcessing = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);
const scrollRef = ref<HTMLDivElement | null>(null);

function scrollToBottom() {
  nextTick(() => {
    if (scrollRef.value) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight;
    }
  });
}

function focusInput() {
  inputRef.value?.focus();
}

onMounted(() => {
  focusInput();
});

function pushLines(...lines: HistoryLine[]) {
  history.value = [...history.value, ...lines];
  scrollToBottom();
}

async function handleSubmit() {
  const raw = input.value.trim();
  input.value = '';
  if (!raw) return;

  pushLines({ type: 'input', text: `$ ${raw}` });
  isProcessing.value = true;

  const parts = raw.split(/\s+/);
  const cmd = parts[0].toLowerCase();

  if (cmd === 'clear') {
    history.value = [
      { type: 'system', text: '─── Terminal Cleared ───' },
      { type: 'system', text: '' },
    ];
    isProcessing.value = false;
    scrollToBottom();
    return;
  }

  if (cmd === 'guest') {
    await new Promise((r) => setTimeout(r, 400));
    loginAsGuest();
    isProcessing.value = false;
    return;
  }

  if (cmd === 'login') {
    if (parts.length < 3) {
      pushLines({ type: 'error', text: 'Usage: login <username> <password>' });
      isProcessing.value = false;
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
    const result = login(parts[1], parts[2]);
    if (!result.success) {
      pushLines({ type: 'error', text: result.error || 'Login failed' });
    }
    isProcessing.value = false;
    return;
  }

  if (cmd === 'register') {
    if (parts.length < 3 || parts.length > 3) {
      pushLines({ type: 'error', text: 'Usage: register <username> <password>' });
      isProcessing.value = false;
      return;
    }
    await new Promise((r) => setTimeout(r, 400));
    const result = register(parts[1], parts[2]);
    if (result.success) {
      pushLines({ type: 'success', text: `Vendor "${parts[1]}" registered & logged in.` });
    } else {
      pushLines({ type: 'error', text: result.error || 'Registration failed' });
    }
    isProcessing.value = false;
    return;
  }

  pushLines(
    { type: 'error', text: `Unknown command: ${cmd}` },
    { type: 'output', text: 'Available: login <user> <pass> | register <user> <pass> | guest | clear' }
  );
  isProcessing.value = false;
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleSubmit();
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#0d0118] flex items-center justify-center p-4 relative overflow-hidden">
    <!-- Background glow -->
    <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
    <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />

    <div class="w-full max-w-xl relative z-10">
      <!-- Terminal Chrome -->
      <div class="bg-[#1a0b2e] rounded-t-lg border border-b-0 border-[#2d1b4e] px-4 py-3 flex items-center gap-3">
        <div class="flex gap-1.5">
          <div class="w-3 h-3 rounded-full bg-red-500/80" />
          <div class="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div class="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <div class="flex items-center gap-2 text-zinc-400 text-sm">
          <TerminalSquare :size="14" />
          <span>Courier Service App</span>
        </div>
      </div>

      <!-- Terminal Body -->
      <div
        class="bg-[#0d0118] border border-[#2d1b4e] rounded-b-lg p-4 cursor-text"
        @click="focusInput"
      >
        <div ref="scrollRef" class="overflow-y-auto space-y-1 font-mono text-sm" style="max-height: 70vh">
          <!-- History lines -->
          <div
            v-for="(line, i) in history"
            :key="i"
            :class="[
              line.type === 'input' ? 'text-pink-400' : '',
              line.type === 'error' ? 'text-red-400' : '',
              line.type === 'success' ? 'text-emerald-400' : '',
              line.type === 'output' ? 'text-cyan-400/80' : '',
              line.type === 'system' ? 'text-zinc-600' : '',
            ]"
          >
            {{ line.text }}
          </div>

          <!-- Active input -->
          <div class="flex items-center gap-2">
            <span class="text-pink-400 font-bold">$</span>
            <input
              ref="inputRef"
              v-model="input"
              type="text"
              class="flex-1 bg-transparent outline-none text-pink-100 caret-pink-400 font-mono text-sm"
              :class="{ 'animate-pulse opacity-50': isProcessing }"
              :disabled="isProcessing"
              autocomplete="off"
              spellcheck="false"
              @keydown="handleKeyDown"
            />
          </div>
        </div>

        <!-- Mobile Run button -->
        <div class="mt-3 flex justify-end xl:hidden">
          <button
            class="px-3 py-1.5 bg-pink-500/20 text-pink-400 rounded text-xs font-mono hover:bg-pink-500/30 transition-colors"
            :disabled="isProcessing"
            @click="handleSubmit"
          >
            Run ⏎
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
