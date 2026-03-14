<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue';
import { Terminal } from 'lucide-vue-next';
import type { HistoryLine } from '../../core/types';
import { useSession } from '../sessionStore';

const emit = defineEmits<{ complete: [] }>();

const { session, updateEmail } = useSession();
const username = session.currentUser?.username || 'user';

const input = ref('');
const history = ref<HistoryLine[]>([
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
  if (!raw || isProcessing.value) return;

  pushLines({ type: 'input', text: raw });
  input.value = '';

  // Validate email
  if (!raw.includes('@') || !raw.includes('.')) {
    pushLines(
      { type: 'error', text: 'Invalid email format. Must contain @ and .' },
      { type: 'output', text: 'Please enter a valid email address.' },
    );
    return;
  }
  if (raw.startsWith('@') || raw.endsWith('@') || raw.endsWith('.')) {
    pushLines(
      { type: 'error', text: 'Invalid email format.' },
      { type: 'output', text: 'Please enter a valid email address.' },
    );
    return;
  }

  isProcessing.value = true;
  pushLines({ type: 'output', text: `Setting email to ${raw}...` });
  await new Promise((r) => setTimeout(r, 400));

  const result = updateEmail(raw);
  if (!result.success) {
    pushLines({ type: 'error', text: result.error || 'Failed to set email' });
    isProcessing.value = false;
    return;
  }

  pushLines({ type: 'success', text: 'Email set successfully. Launching terminal...' });
  await new Promise((r) => setTimeout(r, 500));
  emit('complete');
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
          <span class="text-xs text-zinc-500 font-mono">Courier Service App — email setup</span>
        </div>
        <div class="w-[54px]" />
      </div>

      <!-- Terminal Body -->
      <div
        class="bg-[#0d0118] border-x border-b border-[#2d1b4e] rounded-b-xl font-mono text-sm cursor-text"
        @click="focusInput"
      >
        <div ref="scrollRef" class="p-4 sm:p-6 overflow-auto" style="max-height: 70vh">
          <div
            v-for="(line, i) in history"
            :key="i"
            class="leading-relaxed"
          >
            <template v-if="line.type === 'input'">
              <span>
                <span class="text-pink-400">&gt; </span>
                <span class="text-zinc-100">{{ line.text }}</span>
              </span>
            </template>
            <template v-else-if="line.type === 'error'">
              <span class="text-red-400">  {{ line.text }}</span>
            </template>
            <template v-else-if="line.type === 'success'">
              <span class="text-emerald-400">  {{ line.text }}</span>
            </template>
            <template v-else-if="line.type === 'output'">
              <span class="text-cyan-400/80">  {{ line.text }}</span>
            </template>
            <template v-else>
              <span class="text-zinc-600">{{ line.text }}</span>
            </template>
          </div>

          <!-- Active input line -->
          <div class="flex items-center gap-0 mt-1">
            <span class="text-pink-400 shrink-0">&gt; </span>
            <input
              ref="inputRef"
              v-model="input"
              type="email"
              class="ml-2 flex-1 bg-transparent border-none outline-none text-zinc-100 font-mono text-sm placeholder:text-zinc-700 disabled:opacity-50 caret-pink-400"
              :disabled="isProcessing"
              :placeholder="isProcessing ? '' : 'your@email.com'"
              autocomplete="email"
              :spellcheck="false"
              @keydown="handleKeyDown"
            />
            <span v-if="isProcessing" class="text-pink-400/50 animate-pulse text-xs ml-2">saving...</span>
          </div>
        </div>

        <!-- Mobile submit button -->
        <div class="xl:hidden px-4 pb-4 sm:px-6 sm:pb-6 flex justify-end">
          <button
            class="px-4 py-1.5 text-sm rounded bg-pink-500/20 text-pink-400 border border-pink-500/30 hover:bg-pink-500/30 transition-colors disabled:opacity-30 font-mono"
            :disabled="isProcessing || !input.trim()"
            @click="handleSubmit"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
