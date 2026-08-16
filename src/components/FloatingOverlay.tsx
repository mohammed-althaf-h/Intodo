import React, { useState, useEffect, useRef } from 'react';
import { useVaultStore } from '../store/useVaultStore';
import { Priority } from '../types';
import { showMainBoard, setOverlaySize } from '../services/windowBridge';
import { Sound } from '../services/soundEngine';
import {
  Check, Plus, Play, Pause, RotateCcw, Maximize2,
  Briefcase, User, X, ChevronRight,
} from 'lucide-react';

/**
 * AssistiveTouch-style overlay — renders in the "overlay" Tauri window.
 *
 * Collapsed: 80×80 semi-transparent dot (fades when idle, pulses on tasks)
 * Expanded:  340×460 compact panel with quick-add, task list, timer, profile switcher
 *
 * Drag is native via data-tauri-drag-region on the dot.
 */
export const FloatingOverlay: React.FC = () => {
  const {
    activeProfile, switchProfile,
    workTasks, personalTasks,
    addTask, toggleTask,
    isTimerRunning, timerSecondsRemaining, activeTimerTaskId,
    startTimer, pauseTimer, resetTimer,
    tickTimer,
  } = useVaultStore();

  const [isOpen, setIsOpen] = useState(false);
  const [idle, setIdle] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<Priority>('medium');
  const idleTimer = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isWork = activeProfile === 'work';
  const currentTasks = isWork ? workTasks : personalTasks;
  const pending = currentTasks.filter((t) => t.status !== 'completed');
  const activeTask = pending.find((t) => t.id === activeTimerTaskId) ?? pending[0];
  const dotColor = isWork ? '#38bdf8' : '#34d399'; // sky-400 / emerald-400

  // Sync window size with open/closed state
  useEffect(() => {
    setOverlaySize(!isOpen);
    if (isOpen) {
      resetIdle();
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Timer tick
  useEffect(() => {
    if (!isTimerRunning) return;
    const id = window.setInterval(tickTimer, 1000);
    return () => clearInterval(id);
  }, [isTimerRunning, tickTimer]);

  // Idle fade: after 4 s of no interaction on the dot, go semi-transparent
  const resetIdle = () => {
    setIdle(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (!isOpen) {
      idleTimer.current = window.setTimeout(() => setIdle(true), 4000);
    }
  };

  useEffect(() => {
    resetIdle();
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current); };
  }, [isOpen]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const handleToggle = (id: string) => { toggleTask(id); Sound.playComplete(); };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    addTask(quickTitle.trim(), quickPriority);
    setQuickTitle('');
    Sound.playComplete();
  };

  /* ─────────── COLLAPSED DOT ─────────── */
  if (!isOpen) {
    return (
      <div
        className="w-screen h-screen flex items-center justify-center"
        style={{ background: 'transparent' }}
      >
        {/* The dot — draggable via Tauri native drag, click to open */}
        <div
          data-tauri-drag-region
          onMouseEnter={resetIdle}
          onMouseMove={resetIdle}
          style={{
            opacity: idle ? 0.35 : 0.92,
            transition: 'opacity 0.6s ease',
            cursor: 'grab',
          }}
          className="relative w-16 h-16 rounded-full flex items-center justify-center select-none"
        >
          {/* Outer glow ring */}
          <div
            className="absolute inset-0 rounded-full animate-pulse"
            style={{
              background: `radial-gradient(circle, ${dotColor}22 0%, transparent 70%)`,
              boxShadow: `0 0 24px 6px ${dotColor}44`,
            }}
          />

          {/* Main circle */}
          <button
            onClick={() => setIsOpen(true)}
            className="relative z-10 w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center gap-0.5 transition-transform active:scale-95"
            style={{
              background: isWork
                ? 'linear-gradient(135deg, #0c1a2e 0%, #0f2544 100%)'
                : 'linear-gradient(135deg, #031a0f 0%, #052e18 100%)',
              borderColor: dotColor,
              boxShadow: `0 4px 20px ${dotColor}55, inset 0 1px 0 ${dotColor}33`,
            }}
          >
            {/* Profile icon */}
            {isWork
              ? <Briefcase className="w-4 h-4" style={{ color: dotColor }} />
              : <User className="w-4 h-4" style={{ color: dotColor }} />}

            {/* Pending count badge */}
            {pending.length > 0 && (
              <span
                className="text-[9px] font-bold leading-none"
                style={{ color: dotColor }}
              >
                {pending.length}
              </span>
            )}

            {/* Timer ring overlay */}
            {isTimerRunning && (
              <div
                className="absolute -inset-1 rounded-full border-2 animate-spin"
                style={{
                  borderColor: `${dotColor} transparent transparent transparent`,
                  animationDuration: '3s',
                }}
              />
            )}
          </button>
        </div>
      </div>
    );
  }

  /* ─────────── EXPANDED PANEL ─────────── */
  return (
    <div
      className="w-screen h-screen flex items-start justify-start p-1"
      style={{ background: 'transparent' }}
    >
      <div
        className="w-[332px] rounded-2xl border overflow-hidden shadow-2xl"
        style={{
          background: isWork
            ? 'linear-gradient(160deg, #080f1aee 0%, #0a1628ee 100%)'
            : 'linear-gradient(160deg, #03110cee 0%, #041a10ee 100%)',
          borderColor: isWork ? '#38bdf855' : '#34d39955',
          backdropFilter: 'blur(24px)',
          boxShadow: isWork
            ? '0 25px 60px #020c1a99, 0 0 0 1px #38bdf822'
            : '0 25px 60px #011a0a99, 0 0 0 1px #34d39922',
        }}
      >
        {/* ── Header bar (drag region) ── */}
        <div
          data-tauri-drag-region
          className="flex items-center gap-2.5 px-4 py-3 cursor-grab active:cursor-grabbing border-b"
          style={{ borderColor: isWork ? '#38bdf820' : '#34d39920' }}
        >
          {/* Profile dot */}
          <div
            className="w-2.5 h-2.5 rounded-full animate-pulse shrink-0"
            style={{ background: dotColor, boxShadow: `0 0 8px ${dotColor}` }}
          />

          <span className="text-xs font-semibold text-slate-300 flex-1" data-tauri-drag-region>
            {isWork ? 'Work' : 'Personal'} · {pending.length} pending
          </span>

          {isTimerRunning && (
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
              style={{
                color: dotColor,
                borderColor: isWork ? '#38bdf840' : '#34d39940',
                background: isWork ? '#38bdf410' : '#34d39910',
              }}
            >
              {formatTime(timerSecondsRemaining)}
            </span>
          )}

          {/* Open full board */}
          <button
            onClick={showMainBoard}
            className="p-1 rounded-md text-slate-500 hover:text-slate-300 transition-colors"
            title="Open full board (Ctrl+Shift+Space)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Close panel back to dot */}
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-md text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-4 py-3 space-y-3">
          {/* ── Quick-add ── */}
          <form onSubmit={handleQuickAdd} className="flex gap-2">
            <input
              ref={inputRef}
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="Add task… press Enter"
              className="flex-1 bg-slate-900/60 border rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 outline-none transition-colors"
              style={{ borderColor: isWork ? '#38bdf830' : '#34d39930' }}
              onFocus={(e) =>
                (e.target.style.borderColor = isWork ? '#38bdf870' : '#34d39970')
              }
              onBlur={(e) =>
                (e.target.style.borderColor = isWork ? '#38bdf830' : '#34d39930')
              }
            />
            <select
              value={quickPriority}
              onChange={(e) => setQuickPriority(e.target.value as Priority)}
              className="bg-slate-900/60 border border-slate-700 rounded-lg px-1.5 py-1.5 text-xs text-slate-400 outline-none"
            >
              <option value="urgent">🔴</option>
              <option value="high">🟠</option>
              <option value="medium">🟡</option>
              <option value="low">🟢</option>
            </select>
            <button
              type="submit"
              className="p-1.5 rounded-lg transition-all"
              style={{ background: isWork ? '#0369a1' : '#047857' }}
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
          </form>

          {/* ── Task list ── */}
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {pending.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-3">All done! 🎉</p>
            ) : (
              pending.slice(0, 6).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2.5 group rounded-xl px-2.5 py-2 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <button
                    onClick={() => handleToggle(task.id)}
                    className="w-4 h-4 rounded border border-slate-700 group-hover:border-emerald-500 flex items-center justify-center shrink-0 transition-colors"
                  >
                    <Check className="w-2.5 h-2.5 text-transparent group-hover:text-emerald-400 transition-colors" />
                  </button>

                  <span className="flex-1 text-xs text-slate-300 truncate">
                    {task.title}
                  </span>

                  {task.id !== activeTimerTaskId ? (
                    <button
                      onClick={() => startTimer(task.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Start focus timer"
                    >
                      <Play className="w-3 h-3 text-slate-500 hover:text-sky-400" />
                    </button>
                  ) : (
                    <span
                      className="text-[10px] font-mono"
                      style={{ color: dotColor }}
                    >
                      {formatTime(timerSecondsRemaining)}
                    </span>
                  )}
                </div>
              ))
            )}
            {pending.length > 6 && (
              <button
                onClick={showMainBoard}
                className="w-full flex items-center justify-center gap-1 text-xs text-slate-600 hover:text-slate-400 py-1 transition-colors"
              >
                +{pending.length - 6} more <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* ── Timer controls ── */}
          {activeTimerTaskId && (
            <div
              className="flex items-center gap-2 pt-2 border-t"
              style={{ borderColor: isWork ? '#38bdf820' : '#34d39920' }}
            >
              <span className="text-xs text-slate-500 flex-1 truncate">
                {activeTask?.title ?? 'Focus timer'}
              </span>
              <button
                onClick={() => isTimerRunning ? pauseTimer() : startTimer(activeTimerTaskId)}
                className="p-1.5 rounded-lg text-white transition-all"
                style={{ background: isWork ? '#075985' : '#065f46' }}
              >
                {isTimerRunning
                  ? <Pause className="w-3.5 h-3.5" />
                  : <Play className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={resetTimer}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ── Profile switcher ── */}
          <div
            className="flex gap-2 pt-2 border-t"
            style={{ borderColor: isWork ? '#38bdf820' : '#34d39920' }}
          >
            <button
              onClick={() => switchProfile('work')}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-medium transition-all border"
              style={
                isWork
                  ? { background: '#0c2a4a', borderColor: '#38bdf850', color: '#7dd3fc' }
                  : { background: 'transparent', borderColor: '#1e293b', color: '#64748b' }
              }
            >
              <Briefcase className="w-3 h-3" /> Work
            </button>
            <button
              onClick={() => switchProfile('personal')}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-medium transition-all border"
              style={
                !isWork
                  ? { background: '#052e18', borderColor: '#34d39950', color: '#6ee7b7' }
                  : { background: 'transparent', borderColor: '#1e293b', color: '#64748b' }
              }
            >
              <User className="w-3 h-3" /> Personal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
