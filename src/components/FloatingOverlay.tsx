import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useVaultStore } from '../store/useVaultStore';
import { Priority } from '../types';
import {
  showMainBoard, setOverlaySize, isTauri,
  snapOverlayToEdge, restoreOverlayPosition,
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
const POMODORO_TOTAL = 25 * 60; // 1500 s
const ARC_R = 32; // radius (fits inside 80px window with margin)
const ARC_CIRC = 2 * Math.PI * ARC_R;

const TimerArc: React.FC<{ remaining: number; color: string }> = ({ remaining, color }) => {
  const progress = Math.min(1, remaining / POMODORO_TOTAL);
  const dash = ARC_CIRC * progress;
  return (
    <svg
      width="80" height="80"
      className="absolute inset-0 pointer-events-none"
      style={{ transform: 'rotate(-90deg)' }}
    >
      {/* Background track */}
      <circle cx="40" cy="40" r={ARC_R} fill="none" stroke={`${color}22`} strokeWidth="3" />
      {/* Progress arc */}
      <circle
        cx="40" cy="40" r={ARC_R}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${ARC_CIRC - dash}`}
        style={{ transition: 'stroke-dasharray 0.9s linear' }}
      />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

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
  const [pulse, setPulse] = useState(false); // badge pulse on new task from other window
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

  // Restore position on mount
  useEffect(() => { restoreOverlayPosition(); }, []);

  // Sync window size with open/closed state
  useEffect(() => {
    setOverlaySize(!isOpen);
    if (isOpen) {
      resetIdle();
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Timer tick
  useEffect(() => {
    if (!isTimerRunning) return;
    const id = window.setInterval(tickTimer, 1000);
    return () => clearInterval(id);
  }, [isTimerRunning, tickTimer]);

  // Badge pulse when tasks arrive from main window (storage event adds tasks)
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
   * Drag-or-click with edge-snap on release.
   * < 5px movement → click (open panel)
   * ≥ 5px → startDragging() then snap to nearest edge after mouseup
   */
  const handleDotMouseDown = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    let dragged = false;
    let dragStarted = false;

    const onMove = async (mv: MouseEvent) => {
      if (dragStarted) return;
      if (Math.abs(mv.clientX - startX) > 5 || Math.abs(mv.clientY - startY) > 5) {
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

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (!dragged) {
        setIsOpen(true);
        Sound.playPop();
      } else {
        // Snap to nearest screen edge after native drag completes
        // Small delay to let the OS finish positioning the window
        setTimeout(() => snapOverlayToEdge(), 120);
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

  /* ─────────── COLLAPSED DOT ─────────── */
  if (!isOpen) {
    return (
      <div
        className="w-screen h-screen flex items-center justify-center"
        style={{ background: 'transparent' }}
      >
        <div
          onMouseDown={handleDotMouseDown}
          onMouseEnter={resetIdle}
          onMouseMove={resetIdle}
          style={{
            opacity: idle ? 0.28 : 0.95,
            transition: 'opacity 0.8s ease',
            cursor: 'grab',
            position: 'relative',
            width: 80,
            height: 80,
          }}
          className="select-none"
        >
          {/* Outer ambient glow */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, ${dotColor}30 0%, transparent 70%)`,
              boxShadow: `0 0 ${pulse ? '32px 12px' : '20px 6px'} ${dotColor}${pulse ? '99' : '44'}`,
              transition: 'box-shadow 0.3s ease',
              borderRadius: '50%',
            }}
          />

          {/* SVG timer arc */}
          {isTimerRunning && (
            <TimerArc remaining={timerSecondsRemaining} color={dotColor} />
          )}

          {/* Main circle */}
          <div
            className="absolute rounded-full border-2 flex flex-col items-center justify-center gap-0.5 pointer-events-none"
            style={{
              inset: '8px',
              background: isWork
                ? 'linear-gradient(145deg, #0c1a2e 0%, #102040 100%)'
                : 'linear-gradient(145deg, #031a0f 0%, #062e18 100%)',
              borderColor: dotColor,
              boxShadow: `0 4px 24px ${dotColor}66, inset 0 1px 0 ${dotColor}33`,
              transition: 'border-color 0.6s ease, box-shadow 0.6s ease',
            }}
          >
            {isTimerRunning ? (
              /* Timer running: show MM:SS countdown */
              <span
                className="text-[11px] font-mono font-bold leading-none tabular-nums"
                style={{ color: dotColor, letterSpacing: '-0.5px' }}
              >
                {formatTime(timerSecondsRemaining)}
              </span>
            ) : (
              /* Idle: profile icon + pending count */
              <>
                {isWork
                  ? <Briefcase className="w-4 h-4" style={{ color: dotColor }} />
                  : <User className="w-4 h-4" style={{ color: dotColor }} />
                }
                {pending.length > 0 && (
                  <span
                    className="text-[9px] font-bold leading-none tabular-nums"
                    style={{ color: dotColor }}
                  >
                    {pending.length}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Pulse ring (new task from main window) */}
          {pulse && (
            <div
              className="absolute inset-0 rounded-full border-2 animate-ping"
              style={{ borderColor: dotColor, opacity: 0.6 }}
            />
          )}
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
            ? 'linear-gradient(160deg, #070e1bee 0%, #0a1525ee 100%)'
            : 'linear-gradient(160deg, #03100bee 0%, #04180dee 100%)',
          borderColor: `${dotColor}55`,
          backdropFilter: 'blur(24px)',
          boxShadow: `0 25px 60px #00000066, 0 0 0 1px ${dotColor}22`,
        }}
      >
        {/* ── Header (drag region) ── */}
        <div
          data-tauri-drag-region
          className="flex items-center gap-2.5 px-4 py-3 cursor-grab active:cursor-grabbing border-b"
          style={{ borderColor: `${dotColor}20` }}
        >
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{
              background: dotColor,
              boxShadow: `0 0 8px ${dotColor}`,
              transition: 'background 0.6s ease',
            }}
          />

          <span className="text-xs font-semibold text-slate-300 flex-1 select-none" data-tauri-drag-region>
            {isWork ? 'Work' : 'Personal'} · {pending.length} pending
          </span>

          {isTimerRunning && (
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
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
            className="p-1 rounded-md text-slate-500 hover:text-slate-300 transition-colors"
            title="Open full board"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

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
              style={{ borderColor: `${dotColor}30` }}
              onFocus={(e) => (e.target.style.borderColor = `${dotColor}70`)}
              onBlur={(e)  => (e.target.style.borderColor = `${dotColor}30`)}
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
              className="p-1.5 rounded-lg transition-colors"
              style={{ background: isWork ? '#075985' : '#065f46' }}
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
          </form>

          {/* ── Task list ── */}
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {pending.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-3">All done! 🎉</p>
            ) : (
              pending.slice(0, 6).map((task) => {
                const priorityDot: Record<string, string> = {
                  urgent: '#f87171', high: '#fb923c', medium: '#facc15', low: '#34d399',
                };
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-2.5 group rounded-xl px-2.5 py-2 transition-colors hover:bg-white/5"
                  >
                    <button
                      onClick={() => handleToggle(task.id)}
                      className="w-4 h-4 rounded border border-slate-700 group-hover:border-emerald-500 flex items-center justify-center shrink-0 transition-colors"
                    >
                      <Check className="w-2.5 h-2.5 text-transparent group-hover:text-emerald-400 transition-colors" />
                    </button>

                    {/* Priority indicator */}
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: priorityDot[task.priority ?? 'medium'] ?? '#64748b' }}
                    />

                    <span className="flex-1 text-xs text-slate-300 truncate">{task.title}</span>

                    {task.id !== activeTimerTaskId ? (
                      <button
                        onClick={() => startTimer(task.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Start focus timer"
                      >
                        <Play className="w-3 h-3 text-slate-500 hover:text-sky-400" />
                      </button>
                    ) : (
                      <span className="text-[10px] font-mono" style={{ color: dotColor }}>
                        {formatTime(timerSecondsRemaining)}
                      </span>
                    )}
                  </div>
                );
              })
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
              style={{ borderColor: `${dotColor}20` }}
            >
              <span className="text-xs text-slate-500 flex-1 truncate">
                {activeTask?.title ?? 'Focus timer'}
              </span>
              <button
                onClick={() => isTimerRunning ? pauseTimer() : startTimer(activeTimerTaskId)}
                className="p-1.5 rounded-lg text-white transition-all"
                style={{ background: isWork ? '#075985' : '#065f46' }}
              >
                {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
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
            style={{ borderColor: `${dotColor}20` }}
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
