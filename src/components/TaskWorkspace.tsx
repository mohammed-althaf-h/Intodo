import React, { useState } from 'react';
import { useVaultStore } from '../store/useVaultStore';
import { Priority } from '../types';
import { 
  Plus, 
  Search, 
  Calendar, 
  Tag, 
  Clock, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Check, 
  X, 
  ArrowUpRight, 
  Play, 
  Pause, 
  AlertCircle, 
  MessageSquare, 
  Sparkles, 
  ChevronDown, 
  ChevronRight 
} from 'lucide-react';

export const TaskWorkspace: React.FC = () => {
  const { 
    activeProfile, 
    workTasks, 
    personalTasks, 
    delegationInbox,
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    selectedTag,
    setSelectedTag,
    stealthMode,
    addTask,
    toggleTask,
    deleteTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    acceptDelegatedTask,
    dismissDelegatedTask,
    startTimer,
    pauseTimer,
    activeTimerTaskId,
    isTimerRunning
  } = useVaultStore();

  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [newEstMinutes, setNewEstMinutes] = useState('25');
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const [newSubtaskInputs, setNewSubtaskInputs] = useState<Record<string, string>>({});

  const isWork = activeProfile === 'work';
  const currentTasks = isWork ? workTasks : personalTasks;

  // Extract all unique tags
  const allTags = Array.from(
    new Set(currentTasks.flatMap((t) => t.tags || []))
  );

  // Filter tasks based on status, search, and tag
  const filteredTasks = currentTasks.filter((task) => {
    // Status filter
    if (filterStatus === 'pending' && task.status !== 'pending') return false;
    if (filterStatus === 'in_progress' && task.status !== 'in_progress') return false;
    if (filterStatus === 'completed' && task.status !== 'completed') return false;
    if (filterStatus === 'delegated' && !task.delegatedBy) return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      const matchTag = task.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchTag) return false;
    }

    // Tag filter
    if (selectedTag && !task.tags.includes(selectedTag)) {
      return false;
    }

    return true;
  });

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const tags = newTagInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const estMins = parseInt(newEstMinutes, 10) || 25;

    addTask(
      newTitle.trim(),
      newPriority,
      tags,
      newDueDate || undefined,
      undefined,
      estMins
    );

    setNewTitle('');
    setNewTagInput('');
    setNewDueDate('');
  };

  const toggleExpand = (id: string) => {
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddSubtask = (taskId: string) => {
    const text = newSubtaskInputs[taskId]?.trim();
    if (!text) return;
    addSubtask(taskId, text);
    setNewSubtaskInputs((prev) => ({ ...prev, [taskId]: '' }));
  };

  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">URGENT</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">HIGH</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-sky-500/20 text-sky-400 border border-sky-500/30">MED</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-700/40 text-slate-400 border border-slate-700/60">LOW</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      
      {/* Profile Banner */}
      <div className={`p-6 rounded-2xl border backdrop-blur-xl relative overflow-hidden transition-all duration-300 ${
        isWork 
          ? 'bg-gradient-to-br from-obsidian-900/90 via-obsidian-900/40 to-sky-950/20 border-sky-900/40 shadow-xl shadow-sky-950/20' 
          : 'bg-gradient-to-br from-obsidian-900/90 via-obsidian-900/40 to-emerald-950/20 border-emerald-900/40 shadow-xl shadow-emerald-950/20'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isWork ? 'bg-sky-500/20 text-sky-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {isWork ? 'Corporate / Work Vault' : 'Personal Vault'}
              </span>
              <span className="text-xs text-slate-500">• Encrypted Local Storage</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {isWork ? 'Work Priorities & Delegation Board' : 'Personal Goals & Daily Tasks'}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {isWork 
                ? 'Zero corporate risk, EDR/XDR-safe. Colleague task drops land directly in your pending inbox.' 
                : 'Isolated offline vault for your life, personal projects, and healthy habits.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-extrabold text-white">
                {currentTasks.filter((t) => t.status === 'completed').length} / {currentTasks.length}
              </div>
              <div className="text-xs text-slate-400 font-medium">Tasks Completed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Delegation Inbox Banner (If Work Profile & Inbound tasks exist) */}
      {isWork && delegationInbox.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-950/20 backdrop-blur-md animate-slide-up space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
              <h2 className="text-sm font-bold text-amber-300">
                Pending Work Delegated from Colleagues ({delegationInbox.length})
              </h2>
            </div>
            <span className="text-xs text-amber-400/80">Received via E2EE WebSocket</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {delegationInbox.map((delTask) => (
              <div 
                key={delTask.id}
                className="p-3 bg-obsidian-900/90 border border-amber-500/30 rounded-lg flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="font-semibold text-amber-300 flex items-center gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      From: {delTask.delegatedBy}
                    </span>
                    {getPriorityBadge(delTask.priority)}
                  </div>
                  <div className="text-sm font-medium text-white">{delTask.title}</div>
                  {delTask.delegatedNote && (
                    <div className="text-xs text-slate-400 mt-1 italic bg-obsidian-950/50 p-1.5 rounded border border-slate-800">
                      "{delTask.delegatedNote}"
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => dismissDelegatedTask(delTask.id)}
                    className="px-2.5 py-1 text-xs text-slate-400 hover:text-red-400 rounded transition-colors"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => acceptDelegatedTask(delTask)}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-obsidian-950 rounded transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Accept to Board
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Task Capture Form */}
      <form onSubmit={handleQuickAdd} className="p-3 bg-obsidian-900 border border-slate-800/80 rounded-xl shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={
                isWork
                  ? "Capture work item (e.g. 'Review architecture spec', 'Audit EDR ports')..."
                  : "Capture personal task (e.g. 'Workout 45m', 'Pay utility bill')..."
              }
              className="w-full bg-obsidian-950 border border-slate-800 text-sm text-white placeholder-slate-500 rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            className={`flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold text-white shadow-md transition-all ${
              isWork
                ? 'bg-sky-500 hover:bg-sky-400 shadow-sky-500/20'
                : 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>

        {/* Quick Options Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/60 text-xs text-slate-400">
          
          {/* Priority */}
          <div className="flex items-center gap-1">
            <span>Priority:</span>
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as Priority)}
              aria-label="Task Priority"
              className="bg-obsidian-950 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs focus:outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Due Date */}
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              aria-label="Due Date"
              className="bg-obsidian-950 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs focus:outline-none"
            />
          </div>

          {/* Tags */}
          <div className="flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              placeholder="tags (e.g. eng, sprint)"
              className="bg-obsidian-950 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs focus:outline-none w-32"
            />
          </div>

          {/* Focus Estimate */}
          <div className="flex items-center gap-1 ml-auto">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={newEstMinutes}
              onChange={(e) => setNewEstMinutes(e.target.value)}
              aria-label="Estimated Focus Time"
              className="bg-obsidian-950 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs focus:outline-none"
            >
              <option value="15">15 min</option>
              <option value="25">25 min (Pomodoro)</option>
              <option value="45">45 min</option>
              <option value="60">60 min</option>
            </select>
          </div>
        </div>
      </form>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Status Filters */}
        <div className="flex items-center gap-1 p-1 bg-obsidian-900 border border-slate-800 rounded-lg text-xs">
          {(['all', 'pending', 'in_progress', 'completed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-md font-medium capitalize transition-colors ${
                filterStatus === status
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search & Tag Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="bg-obsidian-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-700 w-44"
            />
          </div>

          {allTags.length > 0 && (
            <select
              value={selectedTag || ''}
              onChange={(e) => setSelectedTag(e.target.value || null)}
              aria-label="Filter by Tag"
              className="bg-obsidian-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="">All Tags</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  #{tag}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-obsidian-900/30">
            <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-slate-300">No tasks in this view</h3>
            <p className="text-xs text-slate-500 mt-1">
              Add a new task using the input above or adjust your filter settings.
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isExpanded = expandedTaskIds.has(task.id);
            const isTimerActive = isTimerRunning && activeTimerTaskId === task.id;

            return (
              <div
                key={task.id}
                className={`group p-4 rounded-xl border transition-all duration-200 ${
                  isCompleted
                    ? 'bg-obsidian-950/40 border-slate-800/40 opacity-70'
                    : isTimerActive
                    ? 'bg-sky-950/30 border-sky-500/50 shadow-lg shadow-sky-950/30'
                    : 'bg-obsidian-900/90 border-slate-800/80 hover:border-slate-700 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  
                  {/* Left: Checkbox + Title */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="mt-0.5 text-slate-500 hover:text-emerald-400 transition-colors"
                      title={isCompleted ? 'Mark Pending' : 'Mark Completed'}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-500 hover:text-slate-300" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        
                        {/* Title (Masked if Stealth Mode is on) */}
                        <span className={`text-sm font-medium tracking-tight break-words ${
                          isCompleted ? 'line-through text-slate-500' : 'text-slate-100'
                        }`}>
                          {stealthMode ? `[Confidential Work Item #${task.id.slice(-4)}]` : task.title}
                        </span>

                        {getPriorityBadge(task.priority)}

                        {task.delegatedBy && (
                          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-700/50 font-mono">
                            <ArrowUpRight className="w-3 h-3" />
                            {task.delegatedBy}
                          </span>
                        )}
                      </div>

                      {/* Description if present */}
                      {task.description && !stealthMode && (
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      {/* Meta Pills (Due date, tags, estimated time) */}
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-400">
                        {task.dueDate && (
                          <span className="flex items-center gap-1 bg-obsidian-950 px-2 py-0.5 rounded border border-slate-800">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>Due: {task.dueDate}</span>
                          </span>
                        )}

                        {task.estimatedMinutes && (
                          <span className="flex items-center gap-1 bg-obsidian-950 px-2 py-0.5 rounded border border-slate-800">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>{task.estimatedMinutes}m focus</span>
                          </span>
                        )}

                        {task.tags?.map((tag) => (
                          <span
                            key={tag}
                            className="bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded text-[10px] font-mono border border-slate-700/60"
                          >
                            #{tag}
                          </span>
                        ))}

                        {task.subtasks.length > 0 && (
                          <button
                            onClick={() => toggleExpand(task.id)}
                            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 font-mono text-[10px]"
                          >
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            <span>{task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length} subtasks</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                    
                    {/* Focus Timer Button */}
                    {!isCompleted && (
                      <button
                        onClick={() => {
                          if (isTimerActive) pauseTimer();
                          else startTimer(task.id, task.estimatedMinutes || 25);
                        }}
                        className={`p-1.5 rounded-lg text-xs transition-colors ${
                          isTimerActive
                            ? 'bg-sky-500 text-obsidian-950 font-bold'
                            : 'text-slate-400 hover:text-sky-300 hover:bg-slate-800'
                        }`}
                        title={isTimerActive ? 'Pause focus timer' : 'Start Focus Timer'}
                      >
                        {isTimerActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                    )}

                    {/* Subtask expand button */}
                    <button
                      onClick={() => toggleExpand(task.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Manage subtasks"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>

                    {/* Delete Task */}
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Subtask Section */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 pl-8">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Subtasks & Action Checklist
                    </div>

                    <div className="space-y-1.5">
                      {task.subtasks.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between gap-2 p-1.5 rounded bg-obsidian-950/70 border border-slate-800 text-xs"
                        >
                          <button
                            onClick={() => toggleSubtask(task.id, sub.id)}
                            className="flex items-center gap-2 flex-1 text-left"
                          >
                            {sub.completed ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-slate-500" />
                            )}
                            <span className={sub.completed ? 'line-through text-slate-500' : 'text-slate-200'}>
                              {sub.title}
                            </span>
                          </button>

                          <button
                            onClick={() => deleteSubtask(task.id, sub.id)}
                            className="text-slate-500 hover:text-red-400 p-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add Subtask Input */}
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="text"
                        value={newSubtaskInputs[task.id] || ''}
                        onChange={(e) =>
                          setNewSubtaskInputs((prev) => ({ ...prev, [task.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddSubtask(task.id);
                        }}
                        placeholder="Add a subtask..."
                        className="flex-1 bg-obsidian-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-700"
                      />
                      <button
                        onClick={() => handleAddSubtask(task.id)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-medium"
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
    </div>
  );
};
