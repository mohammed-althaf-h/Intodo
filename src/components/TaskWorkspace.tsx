import React, { useState } from 'react';
import { useVaultStore } from '../store/useVaultStore';
import { Sound } from '../services/soundEngine';
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
  MessageSquare, 
  Sparkles, 
  ChevronDown, 
  ChevronRight,
  Flame,
  CheckSquare
} from 'lucide-react';

export const TaskWorkspace: React.FC = () => {
  const { 
    activeProfile, 
    uiMode,
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
  const isSimple = uiMode === 'simple';
  const currentTasks = isWork ? workTasks : personalTasks;

  // Extract all unique tags
  const allTags = Array.from(
    new Set(currentTasks.flatMap((t) => t.tags || []))
  );

  // Natural Language Input Parser (Ponytail stdlib approach)
  const parseNaturalLanguage = (text: string) => {
    let title = text;
    let priority: Priority = newPriority;
    let tags: string[] = newTagInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    let estMins = parseInt(newEstMinutes, 10) || 25;
    let dueDate = newDueDate || undefined;

    // Detect priority: !urgent, !high, !med, !low
    if (/!urgent/i.test(title)) { priority = 'urgent'; title = title.replace(/!urgent/gi, '').trim(); }
    else if (/!high/i.test(title)) { priority = 'high'; title = title.replace(/!high/gi, '').trim(); }
    else if (/!med/i.test(title) || /!medium/i.test(title)) { priority = 'medium'; title = title.replace(/!med(ium)?/gi, '').trim(); }
    else if (/!low/i.test(title)) { priority = 'low'; title = title.replace(/!low/gi, '').trim(); }

    // Detect tags: #work #urgent #shopping
    const tagMatches = title.match(/#([a-zA-Z0-9_-]+)/g);
    if (tagMatches) {
      tagMatches.forEach((t) => {
        tags.push(t.replace('#', '').toLowerCase());
      });
      title = title.replace(/#([a-zA-Z0-9_-]+)/g, '').trim();
    }

    // Detect estimated minutes: @25m, @45m, @1h
    const timeMatch = title.match(/@(\d+)(m|min|h|hr)/i);
    if (timeMatch) {
      const num = parseInt(timeMatch[1], 10);
      const unit = timeMatch[2].toLowerCase();
      estMins = unit.startsWith('h') ? num * 60 : num;
      title = title.replace(/@\d+(m|min|h|hr)/gi, '').trim();
    }

    // Detect quick relative dates: today, tomorrow
    const todayStr = new Date().toISOString().split('T')[0];
    if (/\btoday\b/i.test(title)) {
      dueDate = todayStr;
      title = title.replace(/\btoday\b/gi, '').trim();
    } else if (/\btomorrow\b/i.test(title)) {
      dueDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      title = title.replace(/\btomorrow\b/gi, '').trim();
    }

    return { title, priority, tags, dueDate, estMins };
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const parsed = parseNaturalLanguage(newTitle);
    if (!parsed.title) return;

    addTask(
      parsed.title,
      parsed.priority,
      parsed.tags,
      parsed.dueDate,
      undefined,
      parsed.estMins
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
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">URGENT</span>;
      case 'high':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">HIGH</span>;
      case 'medium':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-500/20 text-sky-400 border border-sky-500/30">MED</span>;
      case 'low':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-700/40 text-slate-400 border border-slate-700/60">LOW</span>;
    }
  };

  // Filter tasks based on status, search, and tag
  const filteredTasks = currentTasks.filter((task) => {
    if (filterStatus === 'pending' && task.status !== 'pending') return false;
    if (filterStatus === 'in_progress' && task.status !== 'in_progress') return false;
    if (filterStatus === 'completed' && task.status !== 'completed') return false;
    if (filterStatus === 'delegated' && !task.delegatedBy) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      const matchTag = task.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchTag) return false;
    }

    if (selectedTag && !task.tags.includes(selectedTag)) {
      return false;
    }

    return true;
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const pendingCount = currentTasks.filter((t) => t.status !== 'completed').length;
  const completedCount = currentTasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      
      {/* Header Banner */}
      <div className={`p-5 rounded-2xl border backdrop-blur-xl transition-all duration-300 ${
        isWork 
          ? 'bg-gradient-to-br from-obsidian-900/90 via-obsidian-900/40 to-sky-950/20 border-sky-900/40 shadow-xl shadow-sky-950/20' 
          : 'bg-gradient-to-br from-obsidian-900/90 via-obsidian-900/40 to-emerald-950/20 border-emerald-900/40 shadow-xl shadow-emerald-950/20'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isWork ? 'bg-sky-500/20 text-sky-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {isWork ? 'Corporate Work List' : 'Personal & Family Vault'}
              </span>
              <span className="text-xs text-slate-500">• {isSimple ? 'Simple Mode' : 'Advanced Mode'}</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {isWork ? 'Never Forget: Daily Work Checklist' : 'Personal Tasks & Shared Delegations'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isWork 
                ? 'Quickly record tasks you need to get done today so nothing slips through the cracks.' 
                : 'Manage your daily life and receive tasks shared by family, friends, or personal peers.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xl font-extrabold text-white">
                {completedCount} / {currentTasks.length}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">{pendingCount} remaining</div>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Inbound Delegation Banner (Only on Personal Profile) */}
      {!isWork && delegationInbox.length > 0 && (
        <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 backdrop-blur-md animate-slide-up space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
              <h2 className="text-sm font-bold text-emerald-300">
                Incoming Shared Tasks ({delegationInbox.length})
              </h2>
            </div>
            <span className="text-xs text-emerald-400/80">Received via Personal Room</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {delegationInbox.map((delTask) => (
              <div 
                key={delTask.id}
                className="p-3 bg-obsidian-900/90 border border-emerald-500/30 rounded-lg flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="font-semibold text-emerald-300 flex items-center gap-1">
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
                    className="flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 rounded transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Accept to Personal List
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Task Capture Bar */}
      <form onSubmit={handleQuickAdd} className="p-3 bg-obsidian-900 border border-slate-800/80 rounded-xl shadow-lg space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={
              isSimple
                ? (isWork ? "What do you need to do at work? (Press Enter to add)..." : "Add a personal task...")
                : (isWork ? "Quick add (e.g. 'Review pull request !high #work @30m today')..." : "Add task (e.g. 'Buy milk #home !urgent')...")
            }
            className="w-full bg-obsidian-950 border border-slate-800 text-sm text-white placeholder-slate-500 rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-sky-500 transition-colors"
          />

          <button
            type="submit"
            className={`flex items-center justify-center gap-1 px-4 py-2.5 rounded-lg text-xs font-bold text-white shadow-md transition-all shrink-0 ${
              isWork
                ? 'bg-sky-500 hover:bg-sky-400 shadow-sky-500/20'
                : 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>

        {/* Advanced Options Bar (Only when in Advanced Mode) */}
        {!isSimple && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60 text-xs text-slate-400 animate-fade-in">
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

            <div className="flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                placeholder="tags (e.g. dev, bug)"
                className="bg-obsidian-950 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs focus:outline-none w-28"
              />
            </div>

            <div className="flex items-center gap-1 ml-auto">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={newEstMinutes}
                onChange={(e) => setNewEstMinutes(e.target.value)}
                aria-label="Estimated Focus Time"
                className="bg-obsidian-950 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs focus:outline-none"
              >
                <option value="15">15m</option>
                <option value="25">25m (Pomodoro)</option>
                <option value="45">45m</option>
                <option value="60">60m</option>
              </select>
            </div>
          </div>
        )}
      </form>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-obsidian-900 border border-slate-800 rounded-lg text-xs">
          {(['all', 'pending', 'completed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1 rounded-md font-medium capitalize transition-colors ${
                filterStatus === status
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="bg-obsidian-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-700 w-40"
            />
          </div>

          {!isSimple && allTags.length > 0 && (
            <select
              value={selectedTag || ''}
              onChange={(e) => setSelectedTag(e.target.value || null)}
              aria-label="Filter by Tag"
              className="bg-obsidian-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none"
            >
              <option value="">All Tags</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>#{tag}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="p-10 text-center border border-dashed border-slate-800 rounded-2xl bg-obsidian-900/30">
            <CheckSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-300">No tasks in this list</h3>
            <p className="text-xs text-slate-500 mt-1">
              Type a task in the box above to keep track of your day!
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isExpanded = expandedTaskIds.has(task.id);
            const isTimerActive = isTimerRunning && activeTimerTaskId === task.id;
            const isDueToday = task.dueDate === todayStr;
            const isOverdue = task.dueDate && task.dueDate < todayStr && !isCompleted;

            return (
              <div
                key={task.id}
                className={`group p-3.5 rounded-xl border transition-all duration-200 ${
                  isCompleted
                    ? 'bg-obsidian-950/40 border-slate-800/40 opacity-60'
                    : isTimerActive
                    ? 'bg-sky-950/30 border-sky-500/50 shadow-lg shadow-sky-950/30'
                    : isOverdue
                    ? 'bg-red-950/10 border-red-900/40 hover:border-red-800/60'
                    : 'bg-obsidian-900/90 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  
                  {/* Left: Checkbox + Title */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => {
                        toggleTask(task.id);
                        Sound.playComplete();
                      }}
                      className="text-slate-500 hover:text-emerald-400 transition-colors shrink-0"
                      title={isCompleted ? 'Mark Incomplete' : 'Mark Done'}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-500 hover:text-slate-300" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-sm font-medium tracking-tight break-words ${
                          isCompleted ? 'line-through text-slate-500' : 'text-slate-100'
                        }`}>
                          {stealthMode ? `[Confidential Task #${task.id.slice(-4)}]` : task.title}
                        </span>

                        {getPriorityBadge(task.priority)}

                        {isOverdue && (
                          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-bold">
                            <Flame className="w-3 h-3" /> OVERDUE
                          </span>
                        )}

                        {isDueToday && !isCompleted && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-medium">
                            Today
                          </span>
                        )}

                        {task.delegatedBy && (
                          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 font-mono">
                            <ArrowUpRight className="w-3 h-3" />
                            From: {task.delegatedBy}
                          </span>
                        )}
                      </div>

                      {/* Meta Tags & Details (in Advanced Mode or if description/subtasks exist) */}
                      {(!isSimple || task.description || (task.subtasks && task.subtasks.length > 0)) && (
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                          {task.description && !stealthMode && (
                            <p className="text-xs text-slate-400 w-full mb-1">{task.description}</p>
                          )}

                          {task.dueDate && !isOverdue && !isDueToday && (
                            <span className="flex items-center gap-1 bg-obsidian-950 px-2 py-0.5 rounded border border-slate-800">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              <span>{task.dueDate}</span>
                            </span>
                          )}

                          {!isSimple && task.tags?.map((tag) => (
                            <span key={tag} className="bg-slate-800/80 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-mono border border-slate-700/60">
                              #{tag}
                            </span>
                          ))}

                          {task.subtasks && task.subtasks.length > 0 && (
                            <button
                              onClick={() => toggleExpand(task.id)}
                              className="flex items-center gap-1 text-slate-300 hover:text-white font-mono text-[10px] bg-slate-800/60 hover:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700/50 transition-colors"
                              title="Toggle subtasks list"
                            >
                              {isExpanded ? <ChevronDown className="w-3 h-3 text-sky-400" /> : <ChevronRight className="w-3 h-3" />}
                              <span>{task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length} subtasks</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    
                    {/* Focus Timer (in Advanced Mode) */}
                    {!isSimple && !isCompleted && (
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
                        {isTimerActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                    )}

                    {/* Subtask Button */}
                    <button
                      onClick={() => toggleExpand(task.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isExpanded
                          ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                      title={isExpanded ? 'Hide subtasks' : 'Add or view subtasks'}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Task */}
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded Subtasks (Both Simple and Advanced Mode) */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 pl-4 sm:pl-8 animate-fade-in">
                    <div className="space-y-1.5">
                      {(task.subtasks || []).map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between gap-2 p-1.5 rounded bg-obsidian-950/70 border border-slate-800 text-xs hover:border-slate-700 transition-colors"
                        >
                          <button
                            onClick={() => {
                              toggleSubtask(task.id, sub.id);
                              Sound.playComplete();
                            }}
                            className="flex items-center gap-2 flex-1 text-left"
                          >
                            {sub.completed ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 shrink-0" />
                            )}
                            <span className={sub.completed ? 'line-through text-slate-500' : 'text-slate-200'}>
                              {sub.title}
                            </span>
                          </button>

                          <button
                            onClick={() => deleteSubtask(task.id, sub.id)}
                            className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-800 transition-colors"
                            title="Delete subtask"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="text"
                        value={newSubtaskInputs[task.id] || ''}
                        onChange={(e) =>
                          setNewSubtaskInputs((prev) => ({ ...prev, [task.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSubtask(task.id);
                          }
                        }}
                        placeholder="Add a subtask... (Press Enter)"
                        className="flex-1 bg-obsidian-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                      />
                      <button
                        onClick={() => handleAddSubtask(task.id)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white rounded-lg text-xs font-medium transition-all"
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
