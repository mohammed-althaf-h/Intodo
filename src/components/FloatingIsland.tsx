import React, { useState } from 'react';
import { useVaultStore } from '../store/useVaultStore';
import { Priority } from '../types';
import { 
  ChevronUp, 
  ChevronDown, 
  Plus, 
  Check, 
  Briefcase, 
  User, 
  AppWindow,
  Maximize2
} from 'lucide-react';

export const FloatingIsland: React.FC = () => {
  const { 
    activeProfile, 
    switchProfile, 
    workTasks, 
    personalTasks, 
    addTask, 
    toggleTask,
    setViewMode,
    isTimerRunning,
    timerSecondsRemaining,
    activeTimerTaskId
  } = useVaultStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<Priority>('medium');

  const isWork = activeProfile === 'work';
  const currentTasks = isWork ? workTasks : personalTasks;
  const pendingTasks = currentTasks.filter((t) => t.status !== 'completed');
  const activeTask = pendingTasks.find((t) => t.id === activeTimerTaskId) || pendingTasks[0];

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    addTask(quickTitle.trim(), quickPriority);
    setQuickTitle('');
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out">
      <div 
        className={`backdrop-blur-2xl rounded-2xl border shadow-2xl transition-all duration-300 overflow-hidden ${
          isWork 
            ? 'bg-obsidian-950/90 border-sky-500/30 shadow-sky-950/40' 
            : 'bg-obsidian-950/90 border-emerald-500/30 shadow-emerald-950/40'
        } ${isExpanded ? 'w-[420px] p-4' : 'w-auto px-4 py-2 flex items-center gap-3 cursor-pointer hover:border-slate-600'}`}
      >
        
        {/* Collapsed Pill State */}
        {!isExpanded && (
          <div 
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-3 select-none"
          >
            {/* Profile Dot */}
            <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${
              isWork ? 'bg-sky-400' : 'bg-emerald-400'
            }`} />

            {/* Current Top Task or Status */}
            <div className="flex items-center gap-2 max-w-[220px] truncate text-xs font-medium text-slate-200">
              {activeTask ? (
                <span>{activeTask.title}</span>
              ) : (
                <span className="text-slate-400 italic">No pending tasks</span>
              )}
            </div>

            {/* Focus Timer Pill if active */}
            {isTimerRunning && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-600/40">
                {formatTime(timerSecondsRemaining)}
              </span>
            )}

            {/* Expand Icon */}
            <ChevronDown className="w-4 h-4 text-slate-400 hover:text-white transition-colors" />
          </div>
        )}

        {/* Expanded Spotlight Island State */}
        {isExpanded && (
          <div className="space-y-3 animate-fade-in">
            
            {/* Header: Title + Profile Switch + Collapse */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded uppercase ${
                  isWork ? 'bg-sky-500/20 text-sky-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  Spotlight Island
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {pendingTasks.length} pending
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Profile Toggle */}
                <button
                  onClick={() => switchProfile(isWork ? 'personal' : 'work')}
                  className="p-1 rounded bg-obsidian-900 border border-slate-800 text-slate-300 hover:text-white text-xs flex items-center gap-1"
                  title="Switch Profile"
                >
                  {isWork ? <Briefcase className="w-3 h-3 text-sky-400" /> : <User className="w-3 h-3 text-emerald-400" />}
                </button>

                {/* Open Full Workspace */}
                <button
                  onClick={() => setViewMode('workspace')}
                  className="p-1 rounded bg-obsidian-900 border border-slate-800 text-slate-400 hover:text-white"
                  title="Open Full Workspace"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>

                {/* Collapse Button */}
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1 rounded bg-obsidian-900 border border-slate-800 text-slate-400 hover:text-white"
                  title="Collapse to Notch"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Capture Input in Floating Island */}
            <form onSubmit={handleQuickAdd} className="flex items-center gap-2">
              <input
                type="text"
                autoFocus
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="Quick-capture task..."
                className="flex-1 bg-obsidian-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <select
                value={quickPriority}
                onChange={(e) => setQuickPriority(e.target.value as Priority)}
                aria-label="Priority level"
                className="bg-obsidian-900 border border-slate-800 rounded px-1.5 py-1.5 text-[11px] text-slate-300 focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Med</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <button
                type="submit"
                className={`p-1.5 rounded-lg text-white font-medium text-xs ${
                  isWork ? 'bg-sky-500 hover:bg-sky-400' : 'bg-emerald-500 hover:bg-emerald-400'
                }`}
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            {/* Top 3 Priority Tasks List */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {pendingTasks.slice(0, 4).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-2 p-2 bg-obsidian-900/60 hover:bg-obsidian-900 rounded-lg border border-slate-800/60 text-xs group"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="text-slate-500 hover:text-emerald-400"
                      title="Complete"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <span className="truncate text-slate-200">{task.title}</span>
                  </div>

                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase ${
                    task.priority === 'urgent'
                      ? 'bg-red-500/20 text-red-400'
                      : task.priority === 'high'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>

            {/* Footer Tip */}
            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
              <span>EDR Safe • Zero Background Footprint</span>
              <button 
                onClick={() => setViewMode('workspace')}
                className="text-sky-400 hover:underline flex items-center gap-0.5"
              >
                <AppWindow className="w-3 h-3" />
                <span>Full Board</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
