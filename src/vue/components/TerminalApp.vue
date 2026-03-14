<script setup lang="ts">
import { ref, computed } from 'vue';
import { Plus, X, LogOut, ArrowLeft, Shield, Users, User } from 'lucide-vue-next';
import type { TabData } from '../../core/types';
import { useSession } from '../sessionStore';
import TerminalTab from './TerminalTab.vue';

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

const role = computed(() => session.currentUser?.role || 'guest');

const username = computed(() => session.currentUser?.username || 'guest');
const actingAsVendor = computed(() => isActingAsVendor());

const roleConfig = computed(() => {
  const configs: Record<string, { label: string; color: string; icon: typeof Shield }> = {
    super_admin: { label: 'Super Admin', color: 'text-purple-400', icon: Shield },
    vendor: { label: 'Vendor', color: 'text-cyan-400', icon: Users },
    guest: { label: 'Guest', color: 'text-zinc-400', icon: User },
  };
  return configs[role.value] || configs.guest;
});
</script>

<template>
  <div class="h-screen flex flex-col bg-[#0d0118]">
    <!-- Top Bar -->
    <div class="flex items-center bg-[#1a0b2e] border-b border-[#2d1b4e]">
      <!-- Back to Admin button (when acting as vendor) -->
      <button
        v-if="actingAsVendor"
        class="flex items-center gap-1.5 px-3 py-2 border-r border-[#2d1b4e] text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 transition-colors shrink-0"
        title="Back to Admin"
        @click="backToAdmin"
      >
        <ArrowLeft class="w-3.5 h-3.5" />
        <span class="text-xs font-mono hidden sm:inline">Admin</span>
      </button>

      <!-- Role Badge -->
      <div class="flex items-center gap-2 px-3 py-2 border-r border-[#2d1b4e] shrink-0">
        <component :is="roleConfig.icon" class="w-3.5 h-3.5" :class="roleConfig.color" />
        <span class="text-xs font-mono" :class="roleConfig.color">{{ username }}</span>
        <span class="text-[10px] font-mono text-zinc-600 bg-[#251440] px-1.5 py-0.5 rounded">{{ roleConfig.label }}</span>
        <span
          v-if="actingAsVendor"
          class="text-[10px] font-mono text-violet-400 bg-violet-500/20 px-1.5 py-0.5 rounded border border-violet-500/30"
        >
          via admin
        </span>
      </div>

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

      <!-- Logout -->
      <button
        class="flex items-center gap-2 px-3 py-2 border-l border-[#2d1b4e] text-zinc-500 hover:text-pink-400 transition-colors shrink-0"
        @click="actingAsVendor ? backToAdmin() : logout()"
      >
        <LogOut class="w-3.5 h-3.5" />
        <span class="text-xs font-mono hidden sm:inline">{{ actingAsVendor ? 'back' : 'logout' }}</span>
      </button>
    </div>

    <!-- Active Tab Content -->
    <TerminalTab
      v-if="activeTab"
      :key="activeTab.id"
      :tab="activeTab"
      :userRole="role"
      @update="(updates: Partial<TabData>) => updateTab(activeTab!.id, updates)"
    />
  </div>
</template>
