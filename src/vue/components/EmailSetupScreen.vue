<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue';
import { TerminalSquare } from 'lucide-vue-next';
import type { HistoryLine } from '../../core/types';
import { useSession } from '../sessionStore';

const emit = defineEmits<{ complete: [] }>();

const { session, updateEmail } = useSession();
const username = session.currentUser?.username || 'user';

const input = ref('');
const history = ref<HistoryLine[]>([
  { type: 'system', text: '┌─────────────────────────────────────┐' },
  { type: 'system', text: '│         EMAIL SETUP REQUIRED        │' },
  { type: 'system', text: '└─────────────────────────────────────┘' },
  { type: 'system', text: '' },
  { type: 'output', text: `Welcome, ${username}!` },
  { type: 'output', text: 'Please set up your email address.' },
  { type: 'system', text: '' },
  { type: 'system', text: '─── Instructions ───' },
  { type: 'output', text: 'Type your email address and press Enter.' },
  { type: 'output', text: 'Email must contain @ and a valid domain.' },
  { type: 'system', text: '' },
  { type: 'output', text: 'Example: vendor@example.com' },
]);
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

  pushLines({ type: 'input', text: `> ${raw}` });
  isProcessing.value = true;

  // Validate email
  if (!raw.includes('@') || !raw.includes('.')) {
    pushLines({ type: 'error', text: 'Invalid email. Must contain @ and a valid domain.' });
    isProcessing.value = false;
    return;
  }
  if (raw.startsWith('@') || raw.endsWith('@')) {
    pushLines({ type: 'error', text: 'Invalid email format.' });
    isProcessing.value = false;
    return;
  }
  if (raw.endsWith('.')) {
    pushLines({ type: 'error', text: 'Invalid email. Cannot end with a period.' });
    isProcessing.value = false;
    return;
  }

  await new Promise((r) => setTimeout(r, 400));
  const result = updateEmail(raw);
  if (result.success) {
    pushLines({ type: 'success', text: `Email set to: ${raw}` });
    await new Promise((r) => setTimeout(r, 500));
    emit('complete');
  } else {
    pushLines({ type: 'error', text: result.error || 'Failed to update email.' });
  }
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
          <span>Email Setup</span>
        </div>
      </div>

      <!-- Terminal Body -->
      <div
        class="bg-[#0d0118] border border-[#2d1b4e] rounded-b-lg p-4 cursor-text"
        @click="focusInput"
      >
        <div ref="scrollRef" class="overflow-y-auto space-y-1 font-mono text-sm" style="max-height: 70vh">
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

          <div class="flex items-center gap-2">
            <span class="text-cyan-400 font-bold">&gt;</span>
            <input
              ref="inputRef"
              v-model="input"
              type="email"
              class="flex-1 bg-transparent outline-none text-pink-100 caret-pink-400 font-mono text-sm"
              :class="{ 'animate-pulse opacity-50': isProcessing }"
              :disabled="isProcessing"
              placeholder="your@email.com"
              autocomplete="off"
              spellcheck="false"
              @keydown="handleKeyDown"
            />
          </div>
        </div>

        <div class="mt-3 flex justify-end xl:hidden">
          <button
            class="px-3 py-1.5 bg-pink-500/20 text-pink-400 rounded text-xs font-mono hover:bg-pink-500/30 transition-colors"
            :disabled="isProcessing"
            @click="handleSubmit"
          >
            Submit ⏎
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
