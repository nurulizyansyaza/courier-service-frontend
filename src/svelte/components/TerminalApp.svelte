<script lang="ts">
  import { Plus, X, LogOut, ArrowLeft, Shield, Users, User } from 'lucide-svelte';
  import type { TabData, UserRole } from '../../core/types';
  import { useSession } from '../sessionStore.svelte';
  import TerminalTab from './TerminalTab.svelte';

  const { session, logout, isActingAsVendor, backToAdmin } = useSession();

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
      commandType: 'delivery',
    };
  }

  let tabs: TabData[] = $state([createEmptyTab('1', 'Terminal 1')]);
  let activeTabId = $state('1');

  const activeTab = $derived(tabs.find((t) => t.id === activeTabId));
  const userRole = $derived((session.currentUser?.role || 'guest') as UserRole);
  const username = $derived(session.currentUser?.username || 'guest');
  const actingAsVendor = $derived(isActingAsVendor());

  const roleConfig: Record<UserRole, { label: string; color: string }> = {
    super_admin: { label: 'Super Admin', color: 'text-purple-400' },
    vendor: { label: 'Vendor', color: 'text-cyan-400' },
    guest: { label: 'Guest', color: 'text-zinc-400' },
  };

  const rc = $derived(roleConfig[userRole]);

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
  <!-- Top Bar: Role badge + Tab Bar + Logout -->
  <div class="flex items-center bg-[#1a0b2e] border-b border-[#2d1b4e]">
    <!-- Back to Admin button (when acting as vendor) -->
    {#if actingAsVendor}
      <button
        onclick={backToAdmin}
        class="flex items-center gap-1.5 px-3 py-2 border-r border-[#2d1b4e] text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 transition-colors shrink-0"
        title="Back to Admin"
      >
        <ArrowLeft class="w-3.5 h-3.5" />
        <span class="text-xs font-mono hidden sm:inline">Admin</span>
      </button>
    {/if}

    <!-- Role Badge -->
    <div class="flex items-center gap-2 px-3 py-2 border-r border-[#2d1b4e] shrink-0">
      {#if userRole === 'super_admin'}
        <Shield class="w-3.5 h-3.5 {rc.color}" />
      {:else if userRole === 'vendor'}
        <Users class="w-3.5 h-3.5 {rc.color}" />
      {:else}
        <User class="w-3.5 h-3.5 {rc.color}" />
      {/if}
      <span class="text-xs font-mono {rc.color}">{username}</span>
      <span class="text-[10px] font-mono text-zinc-600 bg-[#251440] px-1.5 py-0.5 rounded">{rc.label}</span>
      {#if actingAsVendor}
        <span class="text-[10px] font-mono text-violet-400 bg-violet-500/20 px-1.5 py-0.5 rounded border border-violet-500/30">
          via admin
        </span>
      {/if}
    </div>

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

    <!-- Logout -->
    <button
      onclick={actingAsVendor ? backToAdmin : logout}
      class="flex items-center gap-2 px-3 py-2 border-l border-[#2d1b4e] text-zinc-500 hover:text-pink-400 transition-colors shrink-0"
    >
      <LogOut class="w-3.5 h-3.5" />
      <span class="text-xs font-mono hidden sm:inline">{actingAsVendor ? 'back' : 'logout'}</span>
    </button>
  </div>

  <!-- Active Tab Content -->
  {#if activeTab}
    <TerminalTab
      tab={activeTab}
      onupdate={(updates) => updateTab(activeTab.id, updates)}
      userRole={userRole}
    />
  {/if}
</div>
