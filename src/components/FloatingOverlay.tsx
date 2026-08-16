import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useVaultStore } from '../store/useVaultStore';
import { Priority } from '../types';
import {
  showMainBoard, setOverlaySize, isTauri,
  saveOverlayPosition, restoreOverlayPosition,
} from '../services/windowBridge';
import { Sound } from '../services/soundEngine';
import {
  Check, Plus, Play, Pause, RotateCcw, Maximize2,
  Briefcase, User, X, ChevronRight,
} from 'lucide-react';

// ── Urgency color based on highest priority pending task ──────────────────────
const PRIORITY_ORDER = ['urgent', 'high', 'medium', 'low'];

function urgencyColor(pending: { priority?: string }[]): string {
  if (pending.length === 0) return '#34d399'; // all done → emerald
  const top = PRIORITY_ORDER.find((p) => pending.some((t) => t.priority === p));
  switch (top) {
    case 'urgent': return '#f87171'; // red-400
    case 'high':   return '#fb923c'; // orange-400
    case 'medium': return '#facc15'; // yellow-400
    default:       return '#34d399'; // emerald-400
  }
}

// ── SVG timer arc ─────────────────────────────────────────────────────────────
const POMODORO_TOTAL = 25 * 60;
const ARC_R = 23;
const ARC_CIRC = 2 * Math.PI * ARC_R;

const TimerArc: React.FC<{ remaining: number; color: string }> = ({ remaining, color }) => {
  const progress = Math.min(1, remaining / POMODORO_TOTAL);
  const dash = ARC_CIRC * progress;
  return (
    <svg
      width="56" height="56"
      className="absolute inset-0 pointer-events-none"
      style={{ transform: 'rotate(-90deg)' }}
    >
      {/* Background track */}
      <circle cx="28" cy="28" r={ARC_R} fill="none" stroke={`${color}22`} strokeWidth="2.5" />
      {/* Progress arc */}
      <circle
        cx="28" cy="28" r={ARC_R}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${ARC_CIRC - dash}`}
        style={{ transition: 'stroke-dasharray 0.9s linear' }}
      />
    </svg>
  );
};

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
  const [pulse, setPulse] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<Priority>('medium');
  const idleTimer = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevPendingCount = useRef<number>(-1);

  const isWork = activeProfile === 'work';
  const currentTasks = isWork ? workTasks : personalTasks;
  const pending = currentTasks.filter((t) => t.status !== 'completed');
  const activeTask = pending.find((t) => t.id === activeTimerTaskId) ?? pending[0];
  const dotColor = urgencyColor(pending);

  // Restore saved position on mount
  useEffect(() => {
    restoreOverlayPosition();
  }, []);

  // Sync window size with open/closed state
  useEffect(() => {
    setOverlaySize(!isOpen);
    if (isOpen) {
      resetIdle();
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Timer tick
  useEffect(() => {
    if (!isTimerRunning) return;
    const id = window.setInterval(tickTimer, 1000);
    return () => clearInterval(id);
  }, [isTimerRunning, tickTimer]);

  // Pulse ring when tasks change
  useEffect(() => {
    if (prevPendingCount.current === -1) {
      prevPendingCount.current = pending.length;
      return;
    }
    if (pending.length > prevPendingCount.current) {
      setPulse(true);
      setTimeout(() => setPulse(false), 1200);
    }
    prevPendingCount.current = pending.length;
  }, [pending.length]);

  // Idle fade
  const resetIdle = useCallback(() => {
    setIdle(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (!isOpen) {
      idleTimer.current = window.setTimeout(() => setIdle(true), 4000);
    }
  }, [isOpen]);

  useEffect(() => {
    resetIdle();
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current); };
  }, [isOpen, resetIdle]);

  /**
   * Drag-or-click handler:
   * < 4px movement → click (open panel)
   * >= 4px → native window drag, and remembers final location where left
   */
  const handleDotMouseDown = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    let dragged = false;
    let dragStarted = false;

    const onMove = async (mv: MouseEvent) => {
      if (dragStarted) return;
      if (Math.abs(mv.clientX - startX) > 4 || Math.abs(mv.clientY - startY) > 4) {
        dragged = true;
        dragStarted = true;
        if (isTauri()) {
          try {
            const { getCurrentWindow } = await import('@tauri-apps/api/window');
            await getCurrentWindow().startDragging();
          } catch { /* non-fatal */ }
        }
      }
    };

    const onUp = async () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (!dragged) {
        setIsOpen(true);
        Sound.playPop();
      } else {
        // Save current position after drag completes
        if (isTauri()) {
          try {
            const { getCurrentWindow } = await import('@tauri-apps/api/window');
            const pos = await getCurrentWindow().outerPosition();
            saveOverlayPosition(pos.x, pos.y);
          } catch { /* non-fatal */ }
        }
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

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

  /* ─────────── COLLAPSED COMPACT DOT ─────────── */
  if (!isOpen) {
    return (
      <div
        className="w-screen h-screen flex items-center justify-center select-none"
        style={{ background: 'transparent' }}
      >
        <div
          onMouseDown={handleDotMouseDown}
          onMouseEnter={resetIdle}
          onMouseMove={resetIdle}
          style={{
            opacity: idle ? 0.35 : 0.95,
            transition: 'opacity 0.6s ease',
            cursor: 'grab',
            position: 'relative',
            width: 56,
            height: 56,
          }}
        >
          {/* Outer glow */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, ${dotColor}25 0%, transparent 70%)`,
              boxShadow: `0 0 ${pulse ? '24px 8px' : '12px 4px'} ${dotColor}${pulse ? '99' : '44'}`,
              transition: 'box-shadow 0.3s ease',
            }}
          />

          {/* SVG timer arc */}
          {isTimerRunning && (
            <TimerArc remaining={timerSecondsRemaining} color={dotColor} />
          )}

          {/* Inner circle */}
          <div
            className="absolute rounded-full border flex flex-col items-center justify-center gap-0.5 pointer-events-none"
            style={{
              inset: '7px',
              background: isWork
                ? 'linear-gradient(145deg, #0c1a2e 0%, #102040 100%)'
                : 'linear-gradient(145deg, #031a0f 0%, #062e18 100%)',
              borderColor: dotColor,
              boxShadow: `0 2px 14px ${dotColor}55, inset 0 1px 0 ${dotColor}33`,
              transition: 'border-color 0.5s ease, box-shadow 0.5s ease',
            }}
          >
            {isTimerRunning ? (
              /* Timer running: show MM:SS countdown */
              <span
                className="text-[9px] font-mono font-bold leading-none tabular-nums"
                style={{ color: dotColor, letterSpacing: '-0.3px' }}
              >
                {formatTime(timerSecondsRemaining)}
              </span>
            ) : (
              /* Idle: profile icon + pending count */
              <>
                {isWork
                  ? <Briefcase className="w-3.5 h-3.5" style={{ color: dotColor }} />
                  : <User className="w-3.5 h-3.5" style={{ color: dotColor }} />
                }
                {pending.length > 0 && (
                  <span
                    className="text-[8px] font-bold leading-none tabular-nums"
                    style={{ color: dotColor }}
                  >
                    {pending.length}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Pulse ring */}
          {pulse && (
            <div
              className="absolute inset-0 rounded-full border animate-ping"
              style={{ borderColor: dotColor, opacity: 0.6 }}
            />
          )}
        </div>
      </div>
    );
  }

  /* ─────────── EXPANDED COMPACT PANEL ─────────── */
  return (
    <div
      className="w-screen h-screen flex items-start justify-start p-1 select-none"
      style={{ background: 'transparent' }}
    >
      <div
        className="w-[282px] rounded-xl border overflow-hidden shadow-2xl"
        style={{
          background: isWork
            ? 'linear-gradient(160deg, #070e1bfa 0%, #0a1525fa 100%)'
            : 'linear-gradient(160deg, #03100bfa 0%, #04180dfa 100%)',
          borderColor: `${dotColor}45`,
          backdropFilter: 'blur(20px)',
          boxShadow: `0 20px 50px #00000088, 0 0 0 1px ${dotColor}22`,
        }}
      >
        {/* ── Header (drag handle) ── */}
        <div
          data-tauri-drag-region
          className="flex items-center gap-2 px-3 py-2 cursor-grab active:cursor-grabbing border-b"
          style={{ borderColor: `${dotColor}20` }}
        >
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              background: dotColor,
              boxShadow: `0 0 6px ${dotColor}`,
              transition: 'background 0.5s ease',
            }}
          />

          <span className="text-[11px] font-semibold text-slate-300 flex-1 truncate" data-tauri-drag-region>
            {isWork ? 'Work' : 'Personal'} · {pending.length} pending
          </span>

          {isTimerRunning && (
            <span
              className="text-[9px] font-mono px-1.5 py-0.5 rounded-full border"
              style={{
                color: dotColor,
                borderColor: `${dotColor}40`,
                background: `${dotColor}10`,
              }}
            >
              {formatTime(timerSecondsRemaining)}
            </span>
          )}

          <button
            onClick={showMainBoard}
            className="p-1 rounded text-slate-500 hover:text-slate-200 transition-colors"
            title="Open full board"
          >
            <Maximize2 className="w-3 h-3" />
          </button>

          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded text-slate-500 hover:text-slate-200 transition-colors"
            title="Close"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        <div className="px-3 py-2 space-y-2">
          {/* ── Quick-add input ── */}
          <form onSubmit={handleQuickAdd} className="flex gap-1.5">
            <input
              ref={inputRef}
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="Add task… Enter"
              className="flex-1 bg-slate-900/70 border rounded-lg px-2.5 py-1 text-[11px] text-slate-200 placeholder-slate-600 outline-none transition-colors"
              style={{ borderColor: `${dotColor}30` }}
              onFocus={(e) => (e.target.style.borderColor = `${dotColor}70`)}
              onBlur={(e)  => (e.target.style.borderColor = `${dotColor}30`)}
            />
            <select
              value={quickPriority}
              onChange={(e) => setQuickPriority(e.target.value as Priority)}
              className="bg-slate-900/70 border border-slate-700 rounded-lg px-1 py-1 text-[11px] text-slate-400 outline-none"
            >
              <option value="urgent">🔴</option>
              <option value="high">🟠</option>
              <option value="medium">🟡</option>
              <option value="low">🟢</option>
            </select>
            <button
              type="submit"
              className="p-1 rounded-lg transition-colors shrink-0"
              style={{ background: isWork ? '#075985' : '#065f46' }}
            >
              <Plus className="w-3.5 h-3.5 text-white" />
            </button>
          </form>

          {/* ── Task list (compact) ── */}
          <div className="space-y-1 max-h-[140px] overflow-y-auto">
            {pending.length === 0 ? (
              <p className="text-[11px] text-slate-500 text-center py-2">All tasks completed! 🎉</p>
            ) : (
              pending.slice(0, 5).map((task) => {
                const priorityDot: Record<string, string> = {
                  urgent: '#f87171', high: '#fb923c', medium: '#facc15', low: '#34d399',
                };
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 group rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5"
                  >
                    <button
                      onClick={() => handleToggle(task.id)}
                      className="w-3.5 h-3.5 rounded border border-slate-700 group-hover:border-emerald-500 flex items-center justify-center shrink-0 transition-colors"
                    >
                      <Check className="w-2 h-2 text-transparent group-hover:text-emerald-400 transition-colors" />
                    </button>

                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: priorityDot[task.priority ?? 'medium'] ?? '#64748b' }}
                    />

                    <span className="flex-1 text-[11px] text-slate-300 truncate">{task.title}</span>

                    {task.id !== activeTimerTaskId ? (
                      <button
                        onClick={() => startTimer(task.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                        title="Start timer"
                      >
                        <Play className="w-2.5 h-2.5 text-slate-400 hover:text-sky-400" />
                      </button>
                    ) : (
                      <span className="text-[9px] font-mono font-semibold" style={{ color: dotColor }}>
                        {formatTime(timerSecondsRemaining)}
                      </span>
                    )}
                  </div>
                );
              })
            )}
            {pending.length > 5 && (
              <button
                onClick={showMainBoard}
                className="w-full flex items-center justify-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 py-0.5 transition-colors"
              >
                +{pending.length - 5} more on board <ChevronRight className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          {/* ── Pomodoro active controls ── */}
          {activeTimerTaskId && (
            <div
              className="flex items-center gap-2 pt-1.5 border-t"
              style={{ borderColor: `${dotColor}20` }}
            >
              <span className="text-[10px] text-slate-400 flex-1 truncate">
                {activeTask?.title ?? 'Focus session'}
              </span>
              <button
                onClick={() => isTimerRunning ? pauseTimer() : startTimer(activeTimerTaskId)}
                className="p-1 rounded text-white transition-all"
                style={{ background: isWork ? '#075985' : '#065f46' }}
              >
                {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
              <button
                onClick={resetTimer}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 transition-all"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* ── Profile switcher (Work / Personal) ── */}
          <div
            className="flex gap-1.5 pt-1.5 border-t"
            style={{ borderColor: `${dotColor}20` }}
          >
            <button
              onClick={() => switchProfile('work')}
              className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-medium transition-all border"
              style={
                isWork
                  ? { background: '#0c2a4a', borderColor: '#38bdf850', color: '#7dd3fc' }
                  : { background: 'transparent', borderColor: '#1e293b', color: '#64748b' }
              }
            >
              <Briefcase className="w-2.5 h-2.5" /> Work
            </button>
            <button
              onClick={() => switchProfile('personal')}
              className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-medium transition-all border"
              style={
                !isWork
                  ? { background: '#052e18', borderColor: '#34d39950', color: '#6ee7b7' }
                  : { background: 'transparent', borderColor: '#1e293b', color: '#64748b' }
              }
            >
              <User className="w-2.5 h-2.5" /> Personal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
