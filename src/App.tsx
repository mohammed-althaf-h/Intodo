import React, { useState, useEffect } from 'react';
import { useVaultStore } from './store/useVaultStore';
import { Header } from './components/Header';
import { TaskWorkspace } from './components/TaskWorkspace';
import { FloatingIsland } from './components/FloatingIsland';
import { FloatingOverlay } from './components/FloatingOverlay';
import { DelegationModal } from './components/DelegationModal';
import { SettingsModal } from './components/SettingsModal';
import { getWindowLabel } from './services/windowBridge';

/**
 * App root — detects which Tauri window we are running in.
 * "overlay" window renders FloatingOverlay (borderless, always-on-top).
 * "main" or browser renders the full board.
 */
export const App: React.FC = () => {
  // null = detecting, 'main'/'overlay'/'browser' = resolved
  const [windowLabel, setWindowLabel] = useState<string | null>(null);

  useEffect(() => {
    getWindowLabel().then(setWindowLabel);
  }, []);

  // Avoid flicker: render nothing until we know which window we are
  if (windowLabel === null) return null;

  if (windowLabel === 'overlay') {
    return <FloatingOverlay />;
  }

  return <MainApp />;
};

/** Full main board — only rendered in the "main" window. */
const MainApp: React.FC = () => {
  const {
    activeProfile,
    uiMode,
    viewMode,
    setViewMode,
    toggleStealthMode,
    switchProfile,
    isTimerRunning,
    tickTimer,
  } = useVaultStore();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDelegationOpen, setIsDelegationOpen] = useState(false);

  // Timer interval
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = window.setInterval(tickTimer, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, tickTimer]);

  // Global keyboard shortcuts (main window only)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.shiftKey && e.code === 'Space') || (e.altKey && e.code === 'Space')) {
        e.preventDefault();
        setViewMode(viewMode === 'floating_island' ? 'workspace' : 'floating_island');
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        toggleStealthMode();
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        switchProfile(activeProfile === 'work' ? 'personal' : 'work');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, activeProfile, setViewMode, toggleStealthMode, switchProfile]);

  const isWork = activeProfile === 'work';
  const isAdvanced = uiMode === 'advanced';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isWork ? 'bg-obsidian-950 text-slate-100' : 'bg-[#03110C] text-slate-100'
    }`}>
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDelegation={() => setIsDelegationOpen(true)}
      />
      <main className="pb-16">
        <TaskWorkspace />
      </main>

      {viewMode === 'floating_island' && <FloatingIsland />}

      <DelegationModal isOpen={isDelegationOpen} onClose={() => setIsDelegationOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {isAdvanced && (
        <div className="fixed bottom-4 right-4 z-40">
          <button
            onClick={() => setViewMode(viewMode === 'floating_island' ? 'workspace' : 'floating_island')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-full backdrop-blur-xl border text-xs font-semibold shadow-xl transition-all ${
              viewMode === 'floating_island'
                ? 'bg-sky-500 text-obsidian-950 border-sky-400 font-bold shadow-sky-500/30'
                : 'bg-obsidian-900/90 hover:bg-slate-800 text-slate-300 border-slate-700/80 hover:text-white'
            }`}
            title="Toggle Floating Spotlight Island (Ctrl+Shift+Space)"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{viewMode === 'floating_island' ? 'Dock Island' : 'Spotlight Island'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
