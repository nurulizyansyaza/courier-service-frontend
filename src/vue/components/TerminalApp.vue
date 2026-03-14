<script setup lang="ts">
import { ref, computed } from 'vue';
import { Plus, X } from 'lucide-vue-next';
import type { TabData } from '../../core/types';
import TerminalTab from './TerminalTab.vue';

function createEmptyTab(id: string, title: string): TabData {
  return {
    id,
    title,
    calculationType: 'cost',
    input: '',
    output: '',
    error: '',
    hasExecuted: false,
    transitPackages: [],
    executionTransitSnapshot: [],
    renamedPackages: [],
    isGenerating: false,
  };
}

const tabs = ref<TabData[]>([createEmptyTab('1', 'Terminal 1')]);
const activeTabId = ref<string>('1');

const activeTab = computed(() => tabs.value.find((t) => t.id === activeTabId.value));

function addNewTab() {
  const id = String(Date.now());
  tabs.value.push(createEmptyTab(id, `Terminal ${tabs.value.length + 1}`));
  activeTabId.value = id;
}

function closeTab(id: string) {
  if (tabs.value.length <= 1) return;
  const idx = tabs.value.findIndex((t) => t.id === id);
  tabs.value = tabs.value.filter((t) => t.id !== id);
  if (activeTabId.value === id) {
    activeTabId.value = tabs.value[tabs.value.length - 1].id;
  }
}

function updateTab(id: string, updates: Partial<TabData>) {
  tabs.value = tabs.value.map((t) => (t.id === id ? { ...t, ...updates } : t));
}
</script>

<template>
  <div class="h-screen flex flex-col bg-[#0d0118]">
    <!-- Top Bar -->
    <div class="flex items-center bg-[#1a0b2e] border-b border-[#2d1b4e]">
      <!-- Tab Bar -->
      <div class="flex-1 flex items-center gap-0 overflow-x-auto" style="scrollbar-width: none; -ms-overflow-style: none">
        <div
          v-for="tab in tabs"
          :key="tab.id"
          class="group flex items-center gap-2 px-4 py-2.5 border-r border-[#2d1b4e] cursor-pointer transition-colors shrink-0"
          :class="tab.id === activeTabId
            ? 'bg-[#0d0118] text-pink-400'
            : 'bg-[#1a0b2e] text-zinc-400 hover:bg-[#251440] hover:text-pink-300'"
          @click="activeTabId = tab.id"
        >
          <span class="text-sm font-medium">{{ tab.title }}</span>
          <button
            class="p-0.5 rounded hover:bg-pink-500/20"
            :class="tabs.length === 1 ? 'invisible' : ''"
            @click.stop="closeTab(tab.id)"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          class="p-2.5 text-zinc-400 hover:text-pink-400 hover:bg-[#251440] transition-colors"
          @click="addNewTab"
        >
          <Plus class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Active Tab Content -->
    <TerminalTab
      v-if="activeTab"
      :key="activeTab.id"
      :tab="activeTab"
      @update="(updates: Partial<TabData>) => updateTab(activeTab!.id, updates)"
    />
  </div>
</template>
