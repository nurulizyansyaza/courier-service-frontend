<script lang="ts">
  import { Plus, X } from 'lucide-svelte';
  import type { TabData } from '../../core/types';
  import TerminalTab from './TerminalTab.svelte';

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

  let tabs: TabData[] = $state([createEmptyTab('1', 'Terminal 1')]);
  let activeTabId = $state('1');

  const activeTab = $derived(tabs.find((t) => t.id === activeTabId));

  function addNewTab() {
    const newId = String(Date.now());
    const newTab = createEmptyTab(newId, `Terminal ${tabs.length + 1}`);
    tabs = [...tabs, newTab];
    activeTabId = newId;
  }

  function closeTab(id: string) {
    if (tabs.length === 1) return;
    const newTabs = tabs.filter((tab) => tab.id !== id);
    tabs = newTabs;
    if (activeTabId === id) {
      activeTabId = newTabs[newTabs.length - 1].id;
    }
  }

  function updateTab(id: string, updates: Partial<TabData>) {
    tabs = tabs.map((tab) => (tab.id === id ? { ...tab, ...updates } : tab));
  }
</script>

<div class="h-screen flex flex-col bg-[#0d0118]">
  <!-- Tab Bar -->
  <div class="flex items-center bg-[#1a0b2e] border-b border-[#2d1b4e]">
    <!-- Tab Bar -->
    <div class="flex-1 flex items-center gap-0 overflow-x-auto" style="scrollbar-width: none;">
      {#each tabs as tab (tab.id)}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="group flex items-center gap-2 px-4 py-2.5 border-r border-[#2d1b4e] cursor-pointer transition-colors shrink-0 {activeTabId === tab.id ? 'bg-[#0d0118] text-pink-400' : 'bg-[#1a0b2e] text-zinc-400 hover:bg-[#251440] hover:text-pink-300'}"
          onclick={() => (activeTabId = tab.id)}
        >
          <span class="text-sm font-medium">{tab.title}</span>
          <button
            onclick={(e) => {
              e.stopPropagation();
              closeTab(tab.id);
            }}
            class="p-0.5 rounded hover:bg-pink-500/20 {tabs.length === 1 ? 'invisible' : ''}"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
      {/each}
      <button
        onclick={addNewTab}
        class="p-2.5 text-zinc-400 hover:text-pink-400 hover:bg-[#251440] transition-colors"
      >
        <Plus class="w-4 h-4" />
      </button>
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
