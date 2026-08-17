import React, { useState, useRef, useEffect } from 'react';
import { useVaultStore } from '../store/useVaultStore';
import { Sound } from '../services/soundEngine';
import { Priority } from '../types';
import { 
  ChevronUp, 
  ChevronDown, 
  Plus, 
  Check, 
  Briefcase, 
  User, 
  Maximize2,
  GripVertical,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Move,
  MessageSquare,
  CheckCircle2,
  Circle,
  X
} from 'lucide-react';

export const FloatingIsland: React.FC = () => {
  const { 
    activeProfile, 
    switchProfile, 
    workTasks, 
    personalTasks, 
    addTask, 
    toggleTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    setViewMode,
    isTimerRunning,
    timerSecondsRemaining,
    activeTimerTaskId,
    startTimer,
    pauseTimer,
    resetTimer
  } = useVaultStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<Priority>('medium');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [subtaskInputs, setSubtaskInputs] = useState<Record<string, string>>({});

  // Dragging & Positioning State
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
  });

  const isWork = activeProfile === 'work';
  const currentTasks = isWork ? workTasks : personalTasks;
  const pendingTasks = currentTasks.filter((t) => t.status !== 'completed');
  const activeTask = pendingTasks.find((t) => t.id === activeTimerTaskId) || pendingTasks[0];

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, form, .no-drag')) return;
    setIsDragging(true);

    const currentX = position ? position.x : (window.innerWidth / 2 - 190);
    const currentY = position ? position.y : 16;

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: currentX,
      posY: currentY,
    };
  };

  const handleToggleExpand = (nextExpanded: boolean) => {
    setIsExpanded(nextExpanded);
    Sound.playPop();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const newX = Math.max(10, Math.min(window.innerWidth - 380, dragRef.current.posX + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - 80, dragRef.current.posY + dy));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      if (isDragging) setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

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

  const handleAddSubtask = (taskId: string) => {
    const text = subtaskInputs[taskId]?.trim();
    if (!text) return;
    addSubtask(taskId, text);
    setSubtaskInputs((prev) => ({ ...prev, [taskId]: '' }));
    Sound.playComplete();
  };

  const handleToggleSubtask = (taskId: string, subId: string) => {
    toggleSubtask(taskId, subId);
    Sound.playComplete();
  };

  const handleDeleteSubtask = (taskId: string, subId: string) => {
    deleteSubtask(taskId, subId);
  };

  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
  };

  const snapToNotch = () => {
    setPosition(null);
    Sound.playPop();
  };

  return (
    <div
      style={
        position
          ? { left: `${position.x}px`, top: `${position.y}px`, transform: 'none' }
          : undefined
      }
      className={`fixed z-50 transition-all duration-200 select-none ${
        position ? '' : 'top-3 left-1/2 -translate-x-1/2'
      }`}
    >
      <div
        onMouseDown={handleMouseDown}
        className={`backdrop-blur-2xl rounded-2xl border shadow-2xl transition-all duration-300 overflow-hidden ${
          isWork
            ? 'bg-obsidian-950/95 border-sky-500/40 shadow-sky-950/50'
            : 'bg-[#03110C]/95 border-emerald-500/40 shadow-emerald-950/50'
        } ${isExpanded ? 'w-[400px] p-4' : 'w-auto px-3.5 py-1.5 flex items-center gap-3 cursor-grab hover:border-slate-500 active:cursor-grabbing'}`}
      >
        
        {/* ================= STATE 1: COLLAPSED NOTCH PILL ================= */}
        {!isExpanded && (
          <div className="flex items-center gap-2.5">
            
            {/* Grip handle */}
            <div className="text-slate-600 hover:text-slate-400 cursor-grab">
              <GripVertical className="w-3.5 h-3.5" />
            </div>

            {/* Profile glowing dot */}
            <div 
              onClick={() => switchProfile(isWork ? 'personal' : 'work')}
              className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-all hover:scale-125 ${
                isWork ? 'bg-sky-400 shadow-sm shadow-sky-400 animate-pulse' : 'bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse'
              }`}
              title={`Active: ${isWork ? 'Work' : 'Personal'} (Click to switch)`}
            />

            {/* Active task title */}
            <div 
              onClick={() => handleToggleExpand(true)}
              className="flex items-center gap-2 max-w-[200px] truncate text-xs font-semibold text-slate-200 cursor-pointer"
            >
              {activeTask ? (
                <span>{activeTask.title}</span>
              ) : (
                <span className="text-slate-500 italic">No pending tasks</span>
              )}
            </div>

            {/* 1-Click Quick Complete active task button */}
            {activeTask && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleTaskWithSound(activeTask.id);
                }}
                className="p-1 rounded-full bg-slate-800/80 hover:bg-emerald-500 text-slate-400 hover:text-obsidian-950 transition-all"
                title="Mark Active Task Complete"
              >
                <Check className="w-3 h-3" />
              </button>
            )}

            {/* Focus Timer Pill */}
            {isTimerRunning && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-500/40 animate-pulse">
                {formatTime(timerSecondsRemaining)}
              </span>
            )}

            {/* Expand Arrow Button */}
            <button
              onClick={() => handleToggleExpand(true)}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Expand Dynamic Island"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ================= STATE 2: EXPANDED DYNAMIC ISLAND HUD ================= */}
        {isExpanded && (
          <div className="space-y-3 animate-scale-in">
            
            {/* Header: Grip Handle + Title + Actions */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 cursor-grab">
              <div className="flex items-center gap-2">
                <GripVertical className="w-3.5 h-3.5 text-slate-600" />
                <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isWork ? 'bg-sky-500/20 text-sky-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {isWork ? 'Work Island' : 'Personal Island'}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {pendingTasks.length} pending
                </span>
              </div>

              <div className="flex items-center gap-1">
                {/* Snap to Top Notch Preset */}
                {position && (
                  <button
                    onClick={snapToNotch}
                    className="p-1 rounded bg-obsidian-900 border border-slate-800 text-slate-400 hover:text-white text-[10px]"
                    title="Snap back to Top Center Notch"
                  >
                    <Move className="w-3 h-3" />
                  </button>
                )}

                {/* Profile Toggle */}
                <button
                  onClick={() => switchProfile(isWork ? 'personal' : 'work')}
                  className="p-1 rounded bg-obsidian-900 border border-slate-800 text-slate-300 hover:text-white text-xs"
                  title="Switch Profile"
                >
                  {isWork ? <Briefcase className="w-3 h-3 text-sky-400" /> : <User className="w-3 h-3 text-emerald-400" />}
                </button>

                {/* Maximize to Workspace */}
                <button
                  onClick={() => setViewMode('workspace')}
                  className="p-1 rounded bg-obsidian-900 border border-slate-800 text-slate-400 hover:text-white"
                  title="Open Full Workspace Board"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>

                {/* Collapse to Notch */}
                <button
                  onClick={() => handleToggleExpand(false)}
                  className="p-1 rounded bg-obsidian-900 border border-slate-800 text-slate-400 hover:text-white"
                  title="Collapse to Notch"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Capture Input */}
            <form onSubmit={handleQuickAdd} className="flex items-center gap-1.5">
              <input
                type="text"
                autoFocus
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="Quick-capture task (e.g. Call Alex !high)..."
                className="flex-1 bg-obsidian-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <select
                value={quickPriority}
                onChange={(e) => setQuickPriority(e.target.value as Priority)}
                aria-label="Priority"
                className="bg-obsidian-900 border border-slate-800 rounded px-1.5 py-1.5 text-[10px] text-slate-300 focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Med</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <button
                type="submit"
                className={`p-1.5 rounded-lg text-white font-bold text-xs ${
                  isWork ? 'bg-sky-500 hover:bg-sky-400' : 'bg-emerald-500 hover:bg-emerald-400'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Top Tasks List */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {pendingTasks.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  All caught up! Type a task above.
                </div>
              ) : (
                pendingTasks.slice(0, 4).map((task) => {
                  const isTaskExpanded = expandedTaskId === task.id;
                  const taskSubtasks = task.subtasks || [];
                  const completedSubs = taskSubtasks.filter((s) => s.completed).length;

                  return (
                    <div
                      key={task.id}
                      className="rounded-lg border border-slate-800/80 bg-obsidian-900/70 overflow-hidden"
                    >
                      <div className="flex items-center justify-between gap-2 p-2 hover:bg-obsidian-900 text-xs group">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <button
                            onClick={() => handleToggleTaskWithSound(task.id)}
                            className="text-slate-500 hover:text-emerald-400 shrink-0"
                            title="Mark Complete"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <span
                            onClick={() => toggleTaskExpanded(task.id)}
                            className="truncate text-slate-200 cursor-pointer hover:text-white"
                          >
                            {task.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {taskSubtasks.length > 0 && (
                            <button
                              onClick={() => toggleTaskExpanded(task.id)}
                              className="px-1.5 py-0.5 rounded-full text-[9px] font-mono bg-slate-800 text-slate-300 border border-slate-700 hover:text-sky-300"
                              title="View subtasks"
                            >
                              {completedSubs}/{taskSubtasks.length}
                            </button>
                          )}

                          <button
                            onClick={() => toggleTaskExpanded(task.id)}
                            className={`p-1 rounded text-slate-400 hover:text-white ${
                              isTaskExpanded ? 'text-sky-400 bg-sky-500/20' : ''
                            }`}
                            title={isTaskExpanded ? 'Hide subtasks' : 'Add/view subtasks'}
                          >
                            <MessageSquare className="w-3 h-3" />
                          </button>

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
                      </div>

                      {/* Subtasks Drawer in Floating Island */}
                      {isTaskExpanded && (
                        <div className="px-3 pb-2.5 pt-1 border-t border-slate-800/80 bg-black/30 space-y-2 animate-fade-in">
                          {taskSubtasks.length > 0 && (
                            <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                              {taskSubtasks.map((sub) => (
                                <div
                                  key={sub.id}
                                  className="flex items-center justify-between gap-2 text-xs group/sub"
                                >
                                  <button
                                    onClick={() => handleToggleSubtask(task.id, sub.id)}
                                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                                  >
                                    {sub.completed ? (
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                    ) : (
                                      <Circle className="w-3 h-3 text-slate-600 hover:text-slate-400 shrink-0" />
                                    )}
                                    <span className={`truncate text-[11px] ${sub.completed ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                                      {sub.title}
                                    </span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSubtask(task.id, sub.id)}
                                    className="opacity-0 group-hover/sub:opacity-100 text-slate-500 hover:text-red-400 p-0.5"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={subtaskInputs[task.id] || ''}
                              onChange={(e) => setSubtaskInputs((prev) => ({ ...prev, [task.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddSubtask(task.id);
                                }
                              }}
                              placeholder="Add subtask... (Enter)"
                              className="flex-1 bg-obsidian-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddSubtask(task.id)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] font-semibold"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Focus Timer Bar in Island */}
            {activeTask && (
              <div className="p-2 rounded-xl bg-obsidian-900/90 border border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-sky-400 font-bold">
                    {formatTime(timerSecondsRemaining)}
                  </span>
                  <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                    {activeTask.title}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      if (isTimerRunning) pauseTimer();
                      else startTimer(activeTask.id, activeTask.estimatedMinutes || 25);
                    }}
                    className={`p-1 rounded text-xs font-semibold ${
                      isTimerRunning ? 'bg-sky-500 text-obsidian-950' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  </button>

                  <button
                    onClick={resetTimer}
                    className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                    title="Reset Timer"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Footer Tip */}
            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Drag handle to reposition anywhere</span>
              </span>
              <button 
                onClick={() => setViewMode('workspace')}
                className="text-sky-400 hover:underline"
              >
                Open Full Board
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
