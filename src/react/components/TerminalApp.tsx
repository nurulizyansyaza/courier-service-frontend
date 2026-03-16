import { useState, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { TerminalTab } from './TerminalTab';
import type { TabData } from '../../core/types';
import { createEmptyTab, addTab, closeTab as closeTabLogic, updateTab as updateTabLogic } from '../../core/tabManager';
import { loadSession, saveSession } from '../../core/sessionPersistence';
import { loadTabStates, exportTabStates, pruneTabStates } from '../../core/tabStateManager';
import { parseUrl, updateUrl } from '../../core/urlHelpers';

function initFromStorage() {
  const saved = loadSession();
  const { tabId: urlTabId } = parseUrl();

  if (saved) {
    loadTabStates(saved.tabUIStates);
    // If the URL contains a valid tab ID, activate that tab
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

export function TerminalApp() {
  const [initial] = useState(initFromStorage);
  const [tabs, setTabs] = useState<TabData[]>(initial.tabs);
  const [activeTabId, setActiveTabId] = useState(initial.activeTabId);
  const nextTabNumber = useRef(initial.nextTabNumber);

  // Refs for stable beforeunload handler
  const tabsRef = useRef(tabs);
  const activeTabIdRef = useRef(activeTabId);
  tabsRef.current = tabs;
  activeTabIdRef.current = activeTabId;

  // Sync URL with active tab on mount and whenever activeTabId changes
  useEffect(() => {
    updateUrl(activeTabId);
  }, [activeTabId]);

  // Persist on state changes
  useEffect(() => {
    const tabIds = tabs.map(t => t.id);
    pruneTabStates(tabIds);
    saveSession({
      tabs,
      activeTabId,
      nextTabNumber: nextTabNumber.current,
      tabUIStates: exportTabStates(),
    });
  }, [tabs, activeTabId]);

  // Persist before page unload (registered once)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentTabs = tabsRef.current;
      const tabIds = currentTabs.map(t => t.id);
      pruneTabStates(tabIds);
      saveSession({
        tabs: currentTabs,
        activeTabId: activeTabIdRef.current,
        nextTabNumber: nextTabNumber.current,
        tabUIStates: exportTabStates(),
      });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const addNewTab = () => {
    const newId = String(Date.now());
    const result = addTab(tabs, newId, `courier_${nextTabNumber.current}`);
    nextTabNumber.current += 1;
    setTabs(result.tabs);
    setActiveTabId(result.activeTabId);
  };

  const closeTab = (id: string) => {
    const result = closeTabLogic(tabs, id, activeTabId);
    if (!result) return;
    setTabs(result.tabs);
    setActiveTabId(result.activeTabId);
  };

  const updateTab = (id: string, updates: Partial<TabData>) => {
    setTabs(updateTabLogic(tabs, id, updates));
  };

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  return (
    <div className="h-screen flex flex-col bg-[#0d0118]">
      {/* macOS-style window header */}
      <div className="flex items-center bg-[#1a0b2e] border-b border-[#2d1b4e] px-4 py-2">
        {/* macOS traffic lights */}
        <div className="flex items-center gap-2 mr-4">
          <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
        </div>

        {/* Tab Bar */}
        <div className="flex-1 flex items-center gap-0 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`group flex items-center gap-2 px-3 py-1.5 border-r border-[#2d1b4e] cursor-pointer transition-colors shrink-0 ${
                activeTabId === tab.id
                  ? 'bg-[#0d0118] text-pink-400'
                  : 'bg-[#1a0b2e] text-zinc-400 hover:bg-[#251440] hover:text-pink-300'
              }`}
              onClick={() => setActiveTabId(tab.id)}
            >
              <span className="text-xs font-mono">{tab.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className={`p-0.5 rounded hover:bg-pink-500/20 ${
                  tabs.length === 1 ? 'invisible' : ''
                }`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            onClick={addNewTab}
            className="p-2 text-zinc-400 hover:text-pink-400 hover:bg-[#251440] transition-colors"
            title="New tab"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* User info area */}
        <div className="ml-4 text-xs text-zinc-600 font-mono hidden sm:block">
          courier_cli
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
