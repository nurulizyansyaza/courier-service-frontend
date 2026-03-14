<script lang="ts">
  import { Plus, X } from 'lucide-svelte';
  import type { TabData } from '../../core/types';
  import {
    createEmptyTab,
    addTab,
    closeTab as closeTabLogic,
    updateTab as updateTabLogic,
  } from '../../core/tabManager';
  import TerminalTab from './TerminalTab.svelte';

  let tabs: TabData[] = $state([createEmptyTab('1', 'courier_cli')]);
  let activeTabId = $state('1');
  let nextTabNumber = 2;

  const activeTab = $derived(tabs.find((t) => t.id === activeTabId));

  function addNewTab() {
    const newId = String(Date.now());
    const result = addTab(tabs, newId, `courier_${nextTabNumber}`);
    nextTabNumber += 1;
    tabs = result.tabs;
    activeTabId = result.activeTabId;
  }

  function closeTab(id: string) {
    const result = closeTabLogic(tabs, id, activeTabId);
    if (!result) return;
    tabs = result.tabs;
    activeTabId = result.activeTabId;
  }

  function updateTab(id: string, updates: Partial<TabData>) {
    tabs = updateTabLogic(tabs, id, updates);
  }
</script>

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
    <div class="flex-1 flex items-center gap-0 overflow-x-auto" style="scrollbar-width: none;">
      {#each tabs as tab (tab.id)}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="group flex items-center gap-2 px-3 py-1.5 border-r border-[#2d1b4e] cursor-pointer transition-colors shrink-0 {activeTabId === tab.id ? 'bg-[#0d0118] text-pink-400' : 'bg-[#1a0b2e] text-zinc-400 hover:bg-[#251440] hover:text-pink-300'}"
          onclick={() => (activeTabId = tab.id)}
        >
          <span class="text-xs font-mono">{tab.title}</span>
          <button
            onclick={(e) => {
              e.stopPropagation();
              closeTab(tab.id);
            }}
            class="p-0.5 rounded hover:bg-pink-500/20 {tabs.length === 1 ? 'invisible' : ''}"
          >
            <X class="w-3 h-3" />
          </button>
        </div>
      {/each}
      <button
        onclick={addNewTab}
        class="p-2 text-zinc-400 hover:text-pink-400 hover:bg-[#251440] transition-colors"
        title="New tab"
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
  {#if activeTab}
    <TerminalTab
      tab={activeTab}
      onupdate={(updates) => updateTab(activeTab.id, updates)}
    />
  {/if}
</div>
