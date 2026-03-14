<script setup lang="ts">
import { ref, computed } from 'vue';
import { Plus, X, LogOut, ArrowLeft, Shield, Users, User } from 'lucide-vue-next';
import type { TabData } from '../../core/types';
import { useSession } from '../sessionStore';
import TerminalTab from './TerminalTab.vue';

const { session, logout, isActingAsVendor, backToAdmin } = useSession();

let nextTabId = 2;

function createEmptyTab(id: number, title: string): TabData {
  return {
    id,
    title,
    input: '',
    output: '',
    history: [],
    calcType: 'cost' as const,
    activeCommandIndex: -1,
    commandHistory: [],
    editedCode: null,
    isCodeEdited: false,
    showCodePanel: false,
    showEditConfirm: false,
  };
}

const tabs = ref<TabData[]>([createEmptyTab(1, 'Terminal 1')]);
const activeTabId = ref(1);

const activeTab = computed(() => tabs.value.find((t) => t.id === activeTabId.value));

function addNewTab() {
  const id = nextTabId++;
  tabs.value.push(createEmptyTab(id, `Terminal ${id}`));
  activeTabId.value = id;
}

function closeTab(id: number) {
  if (tabs.value.length <= 1) return;
  const idx = tabs.value.findIndex((t) => t.id === id);
  tabs.value = tabs.value.filter((t) => t.id !== id);
  if (activeTabId.value === id) {
    activeTabId.value = tabs.value[Math.max(0, idx - 1)].id;
  }
}

function updateTab(id: number, updates: Partial<TabData>) {
  tabs.value = tabs.value.map((t) => (t.id === id ? { ...t, ...updates } : t));
}

const role = computed(() => session.currentUser?.role || 'guest');

const roleConfig = computed(() => {
  const configs: Record<string, { color: string; icon: typeof Shield }> = {
    super_admin: { color: 'purple', icon: Shield },
    vendor: { color: 'cyan', icon: Users },
    guest: { color: 'zinc', icon: User },
  };
  return configs[role.value] || configs.guest;
});

const showBackToAdmin = computed(() => isActingAsVendor());
</script>

<template>
  <div class="h-screen flex flex-col bg-[#0d0118]">
    <!-- Top Bar -->
    <div class="flex items-center gap-2 px-3 py-2 bg-[#1a0b2e] border-b border-[#2d1b4e]">
      <!-- Back to admin -->
      <button
        v-if="showBackToAdmin"
        class="p-1.5 text-zinc-400 hover:text-purple-400 transition-colors"
        title="Back to Admin"
        @click="backToAdmin"
      >
        <ArrowLeft :size="16" />
      </button>

      <!-- Role badge -->
      <div
        class="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-mono"
        :class="{
          'bg-purple-500/20 text-purple-400': roleConfig.color === 'purple',
          'bg-cyan-500/20 text-cyan-400': roleConfig.color === 'cyan',
          'bg-zinc-500/20 text-zinc-400': roleConfig.color === 'zinc',
        }"
      >
        <component :is="roleConfig.icon" :size="12" />
        <span>{{ session.currentUser?.username || 'guest' }}</span>
      </div>

      <!-- Tabs -->
      <div class="flex-1 flex items-center gap-1 overflow-x-auto mx-2">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors group whitespace-nowrap"
          :class="tab.id === activeTabId
            ? 'bg-pink-500/20 text-pink-400'
            : 'text-zinc-500 hover:text-zinc-300'"
          @click="activeTabId = tab.id"
        >
          <span>{{ tab.title }}</span>
          <X
            v-if="tabs.length > 1"
            :size="12"
            class="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
            @click.stop="closeTab(tab.id)"
          />
        </button>

        <button
          class="p-1.5 text-zinc-500 hover:text-pink-400 transition-colors"
          @click="addNewTab"
        >
          <Plus :size="14" />
        </button>
      </div>

      <!-- Logout -->
      <button
        class="flex items-center gap-1.5 px-2 py-1.5 text-zinc-500 hover:text-red-400 text-xs font-mono transition-colors"
        @click="logout"
      >
        <LogOut :size="14" />
        <span class="hidden sm:inline">Logout</span>
      </button>
    </div>

    <!-- Active Tab Content -->
    <div class="flex-1 overflow-hidden">
      <TerminalTab
        v-if="activeTab"
        :tab="activeTab"
        @update="(updates: Partial<TabData>) => updateTab(activeTab!.id, updates)"
      />
    </div>
  </div>
</template>
