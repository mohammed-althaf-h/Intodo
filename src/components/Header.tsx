import React from 'react';
import { useVaultStore } from '../store/useVaultStore';
import { 
  Briefcase, 
  User, 
  Eye, 
  EyeOff, 
  Layers, 
  Share2, 
  Settings, 
  Clock,
  Sparkles
} from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenDelegation: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, onOpenDelegation }) => {
  const { 
    activeProfile, 
    switchProfile, 
    uiMode,
    setUIMode,
    stealthMode, 
    toggleStealthMode,
    viewMode,
    setViewMode,
    delegationInbox,
    isTimerRunning,
    timerSecondsRemaining,
    pauseTimer,
    resetTimer
  } = useVaultStore();

  const isWork = activeProfile === 'work';
  const isAdvanced = uiMode === 'advanced';

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl border-b border-slate-800/80 bg-obsidian-950/80 transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        
        {/* Brand & Profile Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg shadow-lg transition-all duration-300 ${
              isWork 
                ? 'bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-sky-500/20' 
                : 'bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-emerald-500/20'
            }`}>
              ✓
            </div>
            <div className="hidden sm:block">
              <span className="font-bold tracking-tight text-white text-base">Intodo</span>
              <span className="ml-1.5 text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/60">
                {isWork ? 'Work Focus' : 'Personal & Share'}
              </span>
            </div>
          </div>

          {/* Profile Switcher Tabs */}
          <div className="flex items-center p-1 bg-obsidian-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => switchProfile('work')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                isWork
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Work</span>
            </button>

            <button
              onClick={() => switchProfile('personal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                !isWork
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Personal</span>
            </button>
          </div>
        </div>

        {/* Center: Live Timer if Active (in Advanced Mode) */}
        {isAdvanced && isTimerRunning && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-sky-950/40 border border-sky-500/30 text-sky-300 rounded-full text-xs font-mono animate-pulse">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>Focus: {formatTime(timerSecondsRemaining)}</span>
            <button 
              onClick={pauseTimer}
              className="text-[10px] text-sky-400 hover:text-white px-1 ml-1 underline"
            >
              Pause
            </button>
            <button 
              onClick={resetTimer}
              className="text-[10px] text-slate-400 hover:text-red-300 px-1"
            >
              ×
            </button>
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          
          {/* Quick UI Mode Toggle Pill */}
          <button
            onClick={() => setUIMode(isAdvanced ? 'simple' : 'advanced')}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono rounded-lg bg-obsidian-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
            title="Click to toggle between Simple & Advanced view mode"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>{isAdvanced ? 'Advanced' : 'Simple'}</span>
          </button>

          {/* Personal Delegation / Sharing Button (Active on Personal Profile) */}
          {!isWork && (
            <button
              onClick={onOpenDelegation}
              className="relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-950/40 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 hover:text-white transition-all shadow-sm"
              title="Share delegation link so family/friends can drop personal tasks"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Share / Delegate</span>
              {delegationInbox.length > 0 && (
                <span className="flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold bg-amber-500 text-obsidian-950 rounded-full px-1 animate-pulse">
                  {delegationInbox.length}
                </span>
              )}
            </button>
          )}

          {/* Desktop Island View Toggle (in Advanced Mode) */}
          {isAdvanced && (
            <button
              onClick={() => setViewMode(viewMode === 'floating_island' ? 'workspace' : 'floating_island')}
              className={`p-2 rounded-lg border text-xs transition-colors ${
                viewMode === 'floating_island'
                  ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                  : 'bg-obsidian-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Desktop Spotlight Island"
            >
              <Layers className="w-4 h-4" />
            </button>
          )}

          {/* Stealth Mode (in Advanced Mode) */}
          {isAdvanced && (
            <button
              onClick={toggleStealthMode}
              className={`p-2 rounded-lg border text-xs transition-colors ${
                stealthMode 
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' 
                  : 'bg-obsidian-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title={stealthMode ? 'Stealth Mode Active' : 'Enable Stealth Mode for Meetings'}
            >
              {stealthMode ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
            </button>
          )}

          {/* Settings & Mode Switcher */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-obsidian-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
            title="Settings & UI Mode"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
