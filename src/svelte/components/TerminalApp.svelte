<script lang="ts">
  import { Plus, X, LogOut, ArrowLeft, Shield, Users, User } from 'lucide-svelte';
  import type { TabData } from '../../core/types';
  import { useSession } from '../sessionStore';
  import TerminalTab from './TerminalTab.svelte';

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

  let tabs: TabData[] = $state([createEmptyTab(1, 'Terminal 1')]);
  let activeTabId = $state(1);

  const activeTab = $derived(tabs.find((t) => t.id === activeTabId));

  function addNewTab() {
    const id = nextTabId++;
    tabs = [...tabs, createEmptyTab(id, `Terminal ${id}`)];
    activeTabId = id;
  }

  function closeTab(id: number) {
    if (tabs.length <= 1) return;
    const idx = tabs.findIndex((t) => t.id === id);
    tabs = tabs.filter((t) => t.id !== id);
    if (activeTabId === id) {
      activeTabId = tabs[Math.max(0, idx - 1)].id;
    }
  }

  function updateTab(id: number, updates: Partial<TabData>) {
    tabs = tabs.map((t) => (t.id === id ? { ...t, ...updates } : t));
  }

  const role = $derived(session.currentUser?.role || 'guest');

  const roleConfig = $derived.by(() => {
    const configs: Record<string, { color: string; iconName: string }> = {
      super_admin: { color: 'purple', iconName: 'shield' },
      vendor: { color: 'cyan', iconName: 'users' },
      guest: { color: 'zinc', iconName: 'user' },
    };
    return configs[role] || configs.guest;
  });

  const showBackToAdmin = $derived(isActingAsVendor());

  function roleBadgeClass(color: string): string {
    switch (color) {
      case 'purple': return 'bg-purple-500/20 text-purple-400';
      case 'cyan': return 'bg-cyan-500/20 text-cyan-400';
      default: return 'bg-zinc-500/20 text-zinc-400';
    }
  }
</script>

<div class="h-screen flex flex-col bg-[#0d0118]">
  <!-- Top Bar -->
  <div class="flex items-center gap-2 px-3 py-2 bg-[#1a0b2e] border-b border-[#2d1b4e]">
    <!-- Back to admin -->
    {#if showBackToAdmin}
      <button
        class="p-1.5 text-zinc-400 hover:text-purple-400 transition-colors"
        title="Back to Admin"
        onclick={() => backToAdmin()}
      >
        <ArrowLeft size={16} />
      </button>
    {/if}

    <!-- Role badge -->
    <div class="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-mono {roleBadgeClass(roleConfig.color)}">
      {#if roleConfig.iconName === 'shield'}
        <Shield size={12} />
      {:else if roleConfig.iconName === 'users'}
        <Users size={12} />
      {:else}
        <User size={12} />
      {/if}
      <span>{session.currentUser?.username || 'guest'}</span>
    </div>

    <!-- Tabs -->
    <div class="flex-1 flex items-center gap-1 overflow-x-auto mx-2">
      {#each tabs as tab (tab.id)}
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors group whitespace-nowrap {tab.id === activeTabId ? 'bg-pink-500/20 text-pink-400' : 'text-zinc-500 hover:text-zinc-300'}"
          onclick={() => activeTabId = tab.id}
        >
          <span>{tab.title}</span>
          {#if tabs.length > 1}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <span
              class="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
              onclick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
            >
              <X size={12} />
            </span>
          {/if}
        </button>
      {/each}

      <button
        class="p-1.5 text-zinc-500 hover:text-pink-400 transition-colors"
        onclick={addNewTab}
      >
        <Plus size={14} />
      </button>
    </div>

    <!-- Logout -->
    <button
      class="flex items-center gap-1.5 px-2 py-1.5 text-zinc-500 hover:text-red-400 text-xs font-mono transition-colors"
      onclick={() => logout()}
    >
      <LogOut size={14} />
      <span class="hidden sm:inline">Logout</span>
    </button>
  </div>

  <!-- Active Tab Content -->
  <div class="flex-1 overflow-hidden">
    {#if activeTab}
      <TerminalTab
        tab={activeTab}
        userRole={role}
        onupdate={(updates) => updateTab(activeTab.id, updates)}
      />
    {/if}
  </div>
</div>
