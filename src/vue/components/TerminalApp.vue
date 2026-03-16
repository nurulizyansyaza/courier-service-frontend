<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { Plus, X } from 'lucide-vue-next';
import type { TabData } from '../../core/types';
import {
  createEmptyTab,
  addTab,
  closeTab as closeTabLogic,
  updateTab as updateTabLogic,
} from '../../core/tabManager';
import { loadSession, saveSession } from '../../core/sessionPersistence';
import { loadTabStates, exportTabStates, pruneTabStates, getTabState } from '../../core/tabStateManager';
import { parseUrl, updateUrl } from '../../core/urlHelpers';
import TerminalTab from './TerminalTab.vue';

function initFromStorage() {
  const saved = loadSession();
  const { tabId: urlTabId } = parseUrl();

  if (saved) {
    loadTabStates(saved.tabUIStates);
    const activeTabId =
      urlTabId && saved.tabs.some(t => t.id === urlTabId)
        ? urlTabId
        : saved.activeTabId;
    return {
      tabs: saved.tabs,
      activeTabId,
      nextTabNumber: saved.nextTabNumber,
    };
  }
  return {
    tabs: [createEmptyTab('1', 'courier_cli')],
    activeTabId: '1',
    nextTabNumber: 2,
  };
}

const initial = initFromStorage();
const tabs = ref<TabData[]>(initial.tabs);
const activeTabId = ref<string>(initial.activeTabId);
let nextTabNumber = initial.nextTabNumber;

const activeTab = computed(() => tabs.value.find((t) => t.id === activeTabId.value));

function persist() {
  const tabIds = tabs.value.map(t => t.id);
  pruneTabStates(tabIds);
  saveSession({
    tabs: tabs.value,
    activeTabId: activeTabId.value,
    nextTabNumber,
    tabUIStates: exportTabStates(),
  });
}

watch([tabs, activeTabId], persist, { deep: true });

// Sync URL with active tab
watch(activeTabId, (id) => updateUrl(getTabState(id).framework, id), { immediate: true });

function handleBeforeUnload() { persist(); }
onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload);
  // Fresh session — redirect to default framework if build/URL differs
  if (!initial.hadSession) {
    const { framework: urlFramework } = parseUrl();
    const current = urlFramework ?? (typeof __FRAMEWORK__ !== 'undefined' ? __FRAMEWORK__ : DEFAULT_FRAMEWORK);
    if (current !== DEFAULT_FRAMEWORK) {
      switchFramework(DEFAULT_FRAMEWORK, '1');
    }
  }
});
onUnmounted(() => window.removeEventListener('beforeunload', handleBeforeUnload));

function addNewTab() {
  const id = String(nextTabNumber);
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
