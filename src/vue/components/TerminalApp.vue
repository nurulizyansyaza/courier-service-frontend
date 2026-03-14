<script setup lang="ts">
import { ref, computed } from 'vue';
import { Plus, X } from 'lucide-vue-next';
import type { TabData } from '../../core/types';
import {
  createEmptyTab,
  addTab,
  closeTab as closeTabLogic,
  updateTab as updateTabLogic,
} from '../../core/tabManager';
import TerminalTab from './TerminalTab.vue';

const tabs = ref<TabData[]>([createEmptyTab('1', 'courier_cli')]);
const activeTabId = ref<string>('1');
let nextTabNumber = 2;

const activeTab = computed(() => tabs.value.find((t) => t.id === activeTabId.value));

function addNewTab() {
  const id = String(Date.now());
  const result = addTab(tabs.value, id, `courier_${nextTabNumber}`);
  tabs.value = result.tabs;
  activeTabId.value = result.activeTabId;
  nextTabNumber += 1;
}

function closeTab(id: string) {
  const result = closeTabLogic(tabs.value, id, activeTabId.value);
  if (!result) return;
  tabs.value = result.tabs;
  activeTabId.value = result.activeTabId;
}

function updateTab(id: string, updates: Partial<TabData>) {
  tabs.value = updateTabLogic(tabs.value, id, updates);
}
</script>

<template>
  <div class="h-screen flex flex-col bg-[#0d0118]">
    <!-- macOS-style window header -->
    <div class="flex items-center bg-[#1a0b2e] border-b border-[#2d1b4e] px-4 py-2">
      <!-- macOS traffic lights -->
      <div class="flex items-center gap-2 mr-4">
        <div class="w-3 h-3 rounded-full bg-red-500/80"></div>
        <div class="w-3 h-3 rounded-full bg-yellow-500/80"></div>
        <div class="w-3 h-3 rounded-full bg-green-500/80"></div>
      </div>

      <!-- Tab Bar -->
      <div class="flex-1 flex items-center gap-0 overflow-x-auto" style="scrollbar-width: none; -ms-overflow-style: none">
        <div
          v-for="tab in tabs"
          :key="tab.id"
          class="group flex items-center gap-2 px-3 py-1.5 border-r border-[#2d1b4e] cursor-pointer transition-colors shrink-0"
          :class="tab.id === activeTabId
            ? 'bg-[#0d0118] text-pink-400'
            : 'bg-[#1a0b2e] text-zinc-400 hover:bg-[#251440] hover:text-pink-300'"
          @click="activeTabId = tab.id"
        >
          <span class="text-xs font-mono">{{ tab.title }}</span>
          <button
            class="p-0.5 rounded hover:bg-pink-500/20"
            :class="tabs.length === 1 ? 'invisible' : ''"
            @click.stop="closeTab(tab.id)"
          >
            <X class="w-3 h-3" />
          </button>
        </div>
        <button
          class="p-2 text-zinc-400 hover:text-pink-400 hover:bg-[#251440] transition-colors"
          title="New tab"
          @click="addNewTab"
        >
          <Plus class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- User info area -->
      <div class="ml-4 text-xs text-zinc-600 font-mono hidden sm:block">
        courier_cli
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
