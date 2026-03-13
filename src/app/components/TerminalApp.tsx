import { useState } from 'react';
import { Plus, X, LogOut, Shield, User, Users, ArrowLeft } from 'lucide-react';
import { TerminalTab } from './TerminalTab';
import { useSession, type UserRole, type AdminResult } from '../utils/sessionStore';

export type CalculationType = 'cost' | 'time';

export interface TransitPackage {
  id: string;
  weight: number;
  distance: number;
  offerCode: string;
}

export interface TabData {
  id: string;
  title: string;
  calculationType: CalculationType;
  input: string;
  output: string;
  error: string;
  hasExecuted: boolean;
  transitPackages: TransitPackage[];
  executionTransitSnapshot: TransitPackage[];
  renamedPackages: { oldId: string; newId: string }[];
  isGenerating: boolean;
  commandType: 'delivery' | 'admin';
  adminResult?: AdminResult;
}

const createEmptyTab = (id: string, title: string): TabData => ({
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
});

export function TerminalApp() {
  const { session, logout, isActingAsVendor, backToAdmin } = useSession();
  const [tabs, setTabs] = useState<TabData[]>([
    createEmptyTab('1', 'Terminal 1'),
  ]);
  const [activeTabId, setActiveTabId] = useState('1');

  const userRole = session.currentUser?.role || 'guest';
  const username = session.currentUser?.username || 'guest';
  const actingAsVendor = isActingAsVendor();

  const addNewTab = () => {
    const newId = String(Date.now());
    const newTab = createEmptyTab(newId, `Terminal ${tabs.length + 1}`);
    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
  };

  const closeTab = (id: string) => {
    if (tabs.length === 1) return;
    const newTabs = tabs.filter(tab => tab.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  const updateTab = (id: string, updates: Partial<TabData>) => {
    setTabs(tabs.map(tab =>
      tab.id === id ? { ...tab, ...updates } : tab
    ));
  };

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  const roleConfig: Record<UserRole, { label: string; color: string; icon: typeof Shield }> = {
    super_admin: { label: 'Super Admin', color: 'text-purple-400', icon: Shield },
    vendor: { label: 'Vendor', color: 'text-cyan-400', icon: Users },
    guest: { label: 'Guest', color: 'text-zinc-400', icon: User },
  };
  const rc = roleConfig[userRole];
  const RoleIcon = rc.icon;

  return (
    <div className="h-screen flex flex-col bg-[#0d0118]">
      {/* Top Bar: Role badge + Tab Bar + Logout */}
      <div className="flex items-center bg-[#1a0b2e] border-b border-[#2d1b4e]">
        {/* Back to Admin button (when acting as vendor) */}
        {actingAsVendor && (
          <button
            onClick={backToAdmin}
            className="flex items-center gap-1.5 px-3 py-2 border-r border-[#2d1b4e] text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 transition-colors shrink-0"
            title="Back to Admin"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="text-xs font-mono hidden sm:inline">Admin</span>
          </button>
        )}

        {/* Role Badge */}
        <div className="flex items-center gap-2 px-3 py-2 border-r border-[#2d1b4e] shrink-0">
          <RoleIcon className={`w-3.5 h-3.5 ${rc.color}`} />
          <span className={`text-xs font-mono ${rc.color}`}>{username}</span>
          <span className="text-[10px] font-mono text-zinc-600 bg-[#251440] px-1.5 py-0.5 rounded">{rc.label}</span>
          {actingAsVendor && (
            <span className="text-[10px] font-mono text-violet-400 bg-violet-500/20 px-1.5 py-0.5 rounded border border-violet-500/30">
              via admin
            </span>
          )}
        </div>

        {/* Tab Bar */}
        <div className="flex-1 flex items-center gap-0 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`group flex items-center gap-2 px-4 py-2.5 border-r border-[#2d1b4e] cursor-pointer transition-colors shrink-0 ${
                activeTabId === tab.id
                  ? 'bg-[#0d0118] text-pink-400'
                  : 'bg-[#1a0b2e] text-zinc-400 hover:bg-[#251440] hover:text-pink-300'
              }`}
              onClick={() => setActiveTabId(tab.id)}
            >
              <span className="text-sm font-medium">{tab.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className={`p-0.5 rounded hover:bg-pink-500/20 ${
                  tabs.length === 1 ? 'invisible' : ''
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={addNewTab}
            className="p-2.5 text-zinc-400 hover:text-pink-400 hover:bg-[#251440] transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={actingAsVendor ? backToAdmin : logout}
          className="flex items-center gap-2 px-3 py-2 border-l border-[#2d1b4e] text-zinc-500 hover:text-pink-400 transition-colors shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="text-xs font-mono hidden sm:inline">{actingAsVendor ? 'back' : 'logout'}</span>
        </button>
      </div>

      {/* Active Tab Content */}
      {activeTab && (
        <TerminalTab
          key={activeTab.id}
          tab={activeTab}
          onUpdate={(updates) => updateTab(activeTab.id, updates)}
          userRole={userRole}
        />
      )}
    </div>
  );
}