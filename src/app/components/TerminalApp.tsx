import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { TerminalTab } from './TerminalTab';
import type { CalculationType, TransitPackage, TabData } from '../../core/types';

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
});

export function TerminalApp() {
  const [tabs, setTabs] = useState<TabData[]>([
    createEmptyTab('1', 'Terminal 1'),
  ]);
  const [activeTabId, setActiveTabId] = useState('1');

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

  return (
    <div className="h-screen flex flex-col bg-[#0d0118]">
      {/* Top Bar: Tab Bar */}
      <div className="flex items-center bg-[#1a0b2e] border-b border-[#2d1b4e]">
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
      </div>

      {/* Active Tab Content */}
      {activeTab && (
        <TerminalTab
          key={activeTab.id}
          tab={activeTab}
          onUpdate={(updates) => updateTab(activeTab.id, updates)}
        />
      )}
    </div>
  );
}
