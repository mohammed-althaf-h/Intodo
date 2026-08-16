import React, { useState, useRef, useEffect } from 'react';
import { useVaultStore } from '../store/useVaultStore';
import { Sound } from '../services/soundEngine';
import { setDesktopIslandMode, startDesktopDrag, isTauri } from '../services/windowBridge';
import { Priority } from '../types';
import { 
  Plus, 
  Check, 
  Briefcase, 
  User, 
  Maximize2, 
  X, 
  Play, 
  Pause, 
  RotateCcw,
  ChevronRight
} from 'lucide-react';

export const AssistiveOrb: React.FC = () => {
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
    activeTimerTaskId,
    startTimer,
    pauseTimer,
    resetTimer
  } = useVaultStore();

  const [isOpen, setIsOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority] = useState<Priority>('medium');

  // Position state (for web browser fallback)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);

  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
  });

  const isWork = activeProfile === 'work';
  const currentTasks = isWork ? workTasks : personalTasks;
  const pendingTasks = currentTasks.filter((t) => t.status !== 'completed');
  const activeTask = pendingTasks.find((t) => t.id === activeTimerTaskId) || pendingTasks[0];
  const inDesktop = isTauri();

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, form')) return;
    
    // In Tauri, use OS window dragging
    if (inDesktop) {
      startDesktopDrag();
    }

    setIsDragging(true);
    setHasMoved(false);

    const defaultX = window.innerWidth - 70;
    const defaultY = 120;
    const currentX = position ? position.x : defaultX;
    const currentY = position ? position.y : defaultY;

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: currentX,
      initialY: currentY,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        setHasMoved(true);
      }

      if (!inDesktop) {
        const newX = Math.max(10, Math.min(window.innerWidth - 60, dragStartRef.current.initialX + dx));
        const newY = Math.max(10, Math.min(window.innerHeight - 60, dragStartRef.current.initialY + dy));
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        if (!inDesktop && position && !isOpen) {
          const snapX = position.x < window.innerWidth / 2 ? 16 : window.innerWidth - 64;
          setPosition((prev) => prev ? { x: snapX, y: prev.y } : null);
        }
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isOpen, position, inDesktop]);

  const handleOrbClick = () => {
    if (!hasMoved) {
      const nextState = !isOpen;
      setIsOpen(nextState);
      Sound.playPop();
      setDesktopIslandMode(true, nextState);
    }
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    addTask(quickTitle.trim(), quickPriority);
    setQuickTitle('');
    Sound.playComplete();
  };

  const handleToggleTaskWithSound = (id: string) => {
    toggleTask(id);
    Sound.playComplete();
  };

  // Determine popup position relative to orb (open left if orb is on right side)
  const isRightSide = !position || position.x > window.innerWidth / 2;

  return (
    <div
      style={
        !inDesktop && position
          ? { left: `${position.x}px`, top: `${position.y}px`, transform: 'none' }
          : undefined
      }
      className={`select-none ${
        inDesktop
          ? 'w-full h-full flex items-center justify-center p-0 m-0 bg-transparent'
          : `fixed z-50 transition-transform duration-200 ${position ? '' : 'top-24 right-5'}`
      }`}
    >
      {/* ================= 1. THE FLOATING WHITE ASSISTIVETOUCH ORB ================= */}
      {!isOpen && (
        <div
          onMouseDown={handleMouseDown}
          onClick={handleOrbClick}
          className={`w-[54px] h-[54px] rounded-full cursor-pointer transition-all duration-300 flex items-center justify-center backdrop-blur-2xl border shadow-2xl group ${
            isWork
              ? 'bg-slate-950/90 hover:bg-slate-900 border-sky-400/50 hover:border-sky-400 shadow-sky-950/80'
              : 'bg-slate-950/90 hover:bg-slate-900 border-emerald-400/50 hover:border-emerald-400 shadow-emerald-950/80'
          } ${isDragging ? 'scale-110 opacity-100 cursor-grabbing' : 'opacity-90 hover:opacity-100 hover:scale-105'}`}
          title="Intodo Assistive Dot (Click to open, drag anywhere)"
        >
          {/* Outer Translucent Ring */}
          <div className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center bg-white/10 group-hover:bg-white/20 transition-all">
            {/* Center Core Dot with pulsing color */}
            <div className={`w-4 h-4 rounded-full transition-all duration-300 shadow-md ${
              isWork 
                ? 'bg-sky-400 shadow-sky-400/90' 
                : 'bg-emerald-400 shadow-emerald-400/90'
            } ${isTimerRunning ? 'animate-ping' : 'animate-pulse'}`} />
          </div>

          {/* Active task badge counter */}
          {pendingTasks.length > 0 && (
            <span className={`absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 text-[9px] font-extrabold rounded-full flex items-center justify-center shadow-lg ${
              isWork ? 'bg-sky-400 text-obsidian-950' : 'bg-emerald-400 text-obsidian-950'
            }`}>
              {pendingTasks.length}
            </span>
          )}
        </div>
      )}

      {/* ================= 2. THE SPRING EXPANDED ASSISTIVETOUCH HUD ================= */}
      {isOpen && (
        <div
          onMouseDown={handleMouseDown}
          className={`w-full max-w-[360px] p-4 rounded-3xl backdrop-blur-3xl border shadow-2xl transition-all duration-300 animate-scale-in cursor-grab ${
            isWork
              ? 'bg-obsidian-950/98 border-sky-500/50 shadow-sky-950/90'
              : 'bg-[#03110C]/98 border-emerald-500/50 shadow-emerald-950/90'
          } ${!inDesktop && isRightSide ? '-translate-x-[300px]' : ''}`}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full animate-pulse ${isWork ? 'bg-sky-400' : 'bg-emerald-400'}`} />
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-white">
                {isWork ? 'Work Assistant' : 'Personal Assistant'}
              </span>
              <span className="text-[11px] text-slate-400">
                ({pendingTasks.length} left)
              </span>
            </div>

            <div className="flex items-center gap-1">
              {/* Profile Toggle */}
              <button
                onClick={() => switchProfile(isWork ? 'personal' : 'work')}
                className="p-1.5 rounded-lg bg-obsidian-900 border border-slate-800 text-slate-300 hover:text-white text-xs"
                title="Switch Profile"
              >
                {isWork ? <Briefcase className="w-3.5 h-3.5 text-sky-400" /> : <User className="w-3.5 h-3.5 text-emerald-400" />}
              </button>

              {/* Open Full Workspace */}
              <button
                onClick={() => {
                  setViewMode('workspace');
                  setIsOpen(false);
                }}
                className="p-1.5 rounded-lg bg-obsidian-900 border border-slate-800 text-slate-400 hover:text-white"
                title="Open Full Workspace Window"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              {/* Close back to Dot */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  Sound.playPop();
                  setDesktopIslandMode(true, false);
                }}
                className="p-1.5 rounded-lg bg-obsidian-900 border border-slate-800 text-slate-400 hover:text-white"
                title="Collapse to Floating Dot"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Add Task Input */}
          <form onSubmit={handleQuickAdd} className="mt-3 flex items-center gap-2">
            <input
              type="text"
              autoFocus
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="Quick add (e.g. Call client !urgent)..."
              className="flex-1 bg-obsidian-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              className={`p-2 rounded-xl text-white font-bold text-xs shadow-md transition-all ${
                isWork ? 'bg-sky-500 hover:bg-sky-400' : 'bg-emerald-500 hover:bg-emerald-400'
              }`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          {/* Active Tasks List */}
          <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {pendingTasks.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 bg-obsidian-900/40 rounded-xl border border-slate-800/40">
                ✨ Zero pending tasks. You're all caught up!
              </div>
            ) : (
              pendingTasks.slice(0, 4).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-2 p-2 bg-obsidian-900/80 hover:bg-obsidian-900 rounded-xl border border-slate-800/80 text-xs group"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                      onClick={() => handleToggleTaskWithSound(task.id)}
                      className="text-slate-500 hover:text-emerald-400 shrink-0"
                      title="Complete Task"
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
              ))
            )}
          </div>

          {/* Active Pomodoro Focus Widget */}
          {activeTask && (
            <div className="mt-3 p-2.5 rounded-2xl bg-obsidian-900/90 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-sky-400">
                  {formatTime(timerSecondsRemaining)}
                </span>
                <span className="text-[11px] text-slate-400 truncate max-w-[130px]">
                  {activeTask.title}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    if (isTimerRunning) pauseTimer();
                    else startTimer(activeTask.id, activeTask.estimatedMinutes || 25);
                  }}
                  className={`p-1.5 rounded-lg text-xs font-semibold ${
                    isTimerRunning ? 'bg-sky-500 text-obsidian-950' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                  title={isTimerRunning ? 'Pause Focus' : 'Start Focus'}
                >
                  {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                </button>

                <button
                  onClick={resetTimer}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                  title="Reset Timer"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Footer Note */}
          <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
            <span>Drag anywhere on screen</span>
            <button
              onClick={() => {
                setViewMode('workspace');
                setIsOpen(false);
              }}
              className="text-sky-400 hover:underline flex items-center gap-0.5 font-medium"
            >
              <span>Full Board</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
