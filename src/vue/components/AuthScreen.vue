<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue';
import { Terminal } from 'lucide-vue-next';
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

  pushLines({ type: 'input', text: raw });
  isProcessing.value = true;

  const parts = raw.split(/\s+/);
  const cmd = parts[0].toLowerCase();

  if (cmd === 'clear') {
    history.value = [
      { type: 'system', text: '# Terminal cleared.' },
      { type: 'system', text: '# Commands: login <user> <pass> | guest | register <user> <pass> | clear' },
    ];
    isProcessing.value = false;
    scrollToBottom();
    return;
  }

  if (cmd === 'guest') {
    isProcessing.value = true;
    pushLines({ type: 'output', text: 'Authenticating as guest...' });
    await new Promise((r) => setTimeout(r, 400));
    pushLines({ type: 'success', text: 'Access granted. Redirecting...' });
    await new Promise((r) => setTimeout(r, 350));
    loginAsGuest();
    return;
  }

  if (cmd === 'login') {
    const [, username, password] = parts;
    if (!username || !password) {
      pushLines({ type: 'error', text: 'Usage: login <username> <password>' });
      isProcessing.value = false;
      return;
    }
    isProcessing.value = true;
    pushLines({ type: 'output', text: `Authenticating ${username}...` });
    await new Promise((r) => setTimeout(r, 500));
    const result = login(username, password);
    if (!result.success) {
      pushLines({ type: 'error', text: result.error || 'Login failed' });
      isProcessing.value = false;
    } else {
      pushLines({ type: 'success', text: `Access granted. Welcome, ${username}.` });
    }
    return;
  }

  if (cmd === 'register') {
    const [, username, password] = parts;
    if (!username || !password) {
      pushLines(
        { type: 'error', text: 'Usage: register <username> <password>' },
        { type: 'output', text: 'Creates a vendor account.' },
      );
      isProcessing.value = false;
      return;
    }
    if (parts.length > 3) {
      pushLines(
        { type: 'error', text: 'Register only creates vendor accounts. No role parameter needed.' },
        { type: 'output', text: 'Usage: register <username> <password>' },
      );
      isProcessing.value = false;
      return;
    }
    isProcessing.value = true;
    pushLines({ type: 'output', text: `Creating vendor account "${username}"...` });
    await new Promise((r) => setTimeout(r, 400));
    const regResult = register(username, password);
    if (!regResult.success) {
      pushLines({ type: 'error', text: regResult.error || 'Registration failed' });
      isProcessing.value = false;
      return;
    }
    pushLines({ type: 'success', text: `Vendor account created. Welcome, ${username}.` });
    return;
  }

  pushLines(
    { type: 'error', text: `Unknown command: "${cmd}"` },
    { type: 'output', text: 'Commands: login <user> <pass> | guest | register <user> <pass> | clear' },
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
  <div class="min-h-screen bg-[#0d0118] flex items-center justify-center p-4">
    <!-- Background glow -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl" />
    </div>

    <div class="relative w-full max-w-xl">
      <!-- Terminal Chrome -->
      <div class="bg-[#1a0b2e] border border-[#2d1b4e] rounded-t-xl px-4 py-3 flex items-center gap-3">
        <div class="flex gap-1.5">
          <div class="w-3 h-3 rounded-full bg-red-500/60" />
          <div class="w-3 h-3 rounded-full bg-amber-500/60" />
          <div class="w-3 h-3 rounded-full bg-emerald-500/60" />
        </div>
        <div class="flex-1 flex items-center justify-center gap-2">
          <Terminal class="w-3.5 h-3.5 text-zinc-500" />
          <span class="text-xs text-zinc-500 font-mono">Courier Service App</span>
        </div>
        <div class="w-[54px]" />
      </div>

      <!-- Terminal Body -->
      <div
        class="bg-[#0d0118] border-x border-b border-[#2d1b4e] rounded-b-xl font-mono text-sm cursor-text"
        @click="focusInput"
      >
        <div ref="scrollRef" class="p-4 sm:p-6 overflow-auto" style="max-height: 70vh">
          <!-- History lines -->
          <div v-for="(line, i) in history" :key="i" class="leading-relaxed">
            <span v-if="line.type === 'input'">
              <span class="text-pink-400">$ </span>
              <span class="text-zinc-100">{{ line.text }}</span>
            </span>
            <span v-else-if="line.type === 'error'" class="text-red-400">&nbsp;&nbsp;{{ line.text }}</span>
            <span v-else-if="line.type === 'success'" class="text-emerald-400">&nbsp;&nbsp;{{ line.text }}</span>
            <span v-else-if="line.type === 'output'" class="text-cyan-400/80">&nbsp;&nbsp;{{ line.text }}</span>
            <span v-else class="text-zinc-600">{{ line.text }}</span>
          </div>

          <!-- Active input line -->
          <div class="flex items-center gap-0 mt-1">
            <span class="text-pink-400 shrink-0">$ </span>
            <input
              ref="inputRef"
              v-model="input"
              type="text"
              class="ml-2 flex-1 bg-transparent border-none outline-none text-zinc-100 font-mono text-sm placeholder:text-zinc-700 disabled:opacity-50 caret-pink-400"
              :disabled="isProcessing"
              :placeholder="isProcessing ? '' : 'type a command...'"
              autocomplete="off"
              spellcheck="false"
              @keydown="handleKeyDown"
            />
            <span v-if="isProcessing" class="text-pink-400/50 animate-pulse text-xs ml-2">processing...</span>
          </div>
        </div>

        <!-- Mobile Run button -->
        <div class="xl:hidden px-4 pb-4 sm:px-6 sm:pb-6 flex justify-end">
          <button
            :disabled="isProcessing || !input.trim()"
            class="px-4 py-1.5 text-sm rounded bg-pink-500/20 text-pink-400 border border-pink-500/30 hover:bg-pink-500/30 transition-colors disabled:opacity-30 font-mono"
            @click="handleSubmit"
          >
            Run
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
