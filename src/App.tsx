import React, { useState, useEffect } from 'react';
import { useVaultStore } from './store/useVaultStore';
import { Header } from './components/Header';
import { TaskWorkspace } from './components/TaskWorkspace';
import { FloatingIsland } from './components/FloatingIsland';
import { DelegationModal } from './components/DelegationModal';
import { SettingsModal } from './components/SettingsModal';

export const App: React.FC = () => {
  const { 
    activeProfile, 
    viewMode, 
    setViewMode, 
    toggleStealthMode,
    switchProfile,
    isTimerRunning,
    tickTimer
  } = useVaultStore();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDelegationOpen, setIsDelegationOpen] = useState(false);

  // Timer interval
  useEffect(() => {
    let interval: number | null = null;
    if (isTimerRunning) {
      interval = window.setInterval(() => {
        tickTimer();
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, tickTimer]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Floating Island: Ctrl + Shift + Space or Alt + Space
      if ((e.ctrlKey && e.shiftKey && e.code === 'Space') || (e.altKey && e.code === 'Space')) {
        e.preventDefault();
        setViewMode(viewMode === 'floating_island' ? 'workspace' : 'floating_island');
      }

      // Toggle Stealth Mode: Ctrl + Shift + S
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        toggleStealthMode();
      }

      // Toggle Profile: Ctrl + Shift + P
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        switchProfile(activeProfile === 'work' ? 'personal' : 'work');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, activeProfile, setViewMode, toggleStealthMode, switchProfile]);

  const isWork = activeProfile === 'work';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isWork ? 'bg-obsidian-950 text-slate-100' : 'bg-[#03110C] text-slate-100'
    }`}>
      
      {/* Top Header */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDelegation={() => setIsDelegationOpen(true)}
      />

      {/* Main Workspace Board */}
      <main className="pb-16">
        <TaskWorkspace />
      </main>

      {/* Ambient Floating Spotlight / Island Widget */}
      {viewMode === 'floating_island' && <FloatingIsland />}

      {/* Collaborative Delegation Modal */}
      <DelegationModal
        isOpen={isDelegationOpen}
        onClose={() => setIsDelegationOpen(false)}
      />

      {/* Settings & Cryptographic Backup Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Floating Island Shortcut Floating Button (Desktop Quick Toggle) */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setViewMode(viewMode === 'floating_island' ? 'workspace' : 'floating_island')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-full backdrop-blur-xl border text-xs font-semibold shadow-xl transition-all ${
            viewMode === 'floating_island'
              ? 'bg-sky-500 text-obsidian-950 border-sky-400 font-bold shadow-sky-500/30'
              : 'bg-obsidian-900/90 hover:bg-slate-800 text-slate-300 border-slate-700/80 hover:text-white'
          }`}
          title="Toggle Floating Desktop Widget (Shortcut: Ctrl + Shift + Space)"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{viewMode === 'floating_island' ? 'Dock Island' : 'Spotlight Island'}</span>
          <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-obsidian-950 text-[10px] text-slate-400 font-mono border border-slate-700">
            Ctrl+Shift+Space
          </kbd>
        </button>
      </div>
    </div>
  );
};
export default App;
