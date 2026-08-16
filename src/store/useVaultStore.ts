import { create } from 'zustand';
import { TaskItem, ProfileType, Priority, TaskStatus, ViewMode, UIMode, ProfileVisibility } from '../types';
import { VaultStorage } from '../services/vaultStorage';
import { SyncRelay } from '../services/syncRelay';
import { CryptoEngine } from '../services/cryptoEngine';

interface VaultState {
  activeProfile: ProfileType;
  profileVisibility: ProfileVisibility;
  uiMode: UIMode;
  workTasks: TaskItem[];
  personalTasks: TaskItem[];
  delegationInbox: TaskItem[];
  filterStatus: 'all' | TaskStatus | 'delegated';
  searchQuery: string;
  selectedTag: string | null;
  viewMode: ViewMode;
  stealthMode: boolean;
  
  // Delegation room credentials (for personal sharing)
  roomId: string;
  roomKey: string;

  // Active Focus Timer
  activeTimerTaskId: string | null;
  timerSecondsRemaining: number;
  isTimerRunning: boolean;

  // Actions
  switchProfile: (profile: ProfileType) => void;
  setProfileVisibility: (visibility: ProfileVisibility) => void;
  setUIMode: (mode: UIMode) => void;
  addTask: (
    title: string,
    priority?: Priority,
    tags?: string[],
    dueDate?: string,
    description?: string,
    estimatedMinutes?: number
  ) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  updateTask: (id: string, updates: Partial<TaskItem>) => void;
  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  
  setFilterStatus: (status: 'all' | TaskStatus | 'delegated') => void;
  setSearchQuery: (query: string) => void;
  setSelectedTag: (tag: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleStealthMode: () => void;
  
  // Delegation Actions
  generateNewRoom: () => void;
  acceptDelegatedTask: (task: TaskItem) => void;
  dismissDelegatedTask: (id: string) => void;

  // Timer Actions
  startTimer: (taskId: string, minutes?: number) => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  tickTimer: () => void;

  // Vault Actions
  exportEncryptedVault: (passphrase: string) => Promise<string>;
  importEncryptedVault: (backup: string, passphrase: string) => Promise<{ workCount: number; personalCount: number }>;
  clearVaultData: () => void;
}

// Work-specific initial tasks (focused on memory & never forgetting corporate tasks)
const initialWorkTasks: TaskItem[] = [
  {
    id: 'w-1',
    title: 'Submit weekly sprint deliverable status report',
    description: 'Ensure deliverables are marked and reviewed for Friday standup.',
    profile: 'work',
    status: 'pending',
    priority: 'urgent',
    dueDate: new Date().toISOString().split('T')[0],
    tags: ['deliverables', 'standup'],
    estimatedMinutes: 20,
    createdAt: Date.now() - 3600000,
    subtasks: [
      { id: 's1', title: 'Verify commit log on main branch', completed: true },
      { id: 's2', title: 'Fill in standup summary notes', completed: false }
    ],
  },
  {
    id: 'w-2',
    title: 'Review production monitoring & performance alerts',
    description: 'Verify error rate is below 0.1% and no latency regressions.',
    profile: 'work',
    status: 'pending',
    priority: 'high',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    tags: ['monitoring', 'ops'],
    estimatedMinutes: 30,
    createdAt: Date.now() - 7200000,
    subtasks: [],
  }
];

// Personal tasks with sharing/delegation
const initialPersonalTasks: TaskItem[] = [
  {
    id: 'p-1',
    title: 'Pick up organic grocery order & fresh sourdough',
    description: 'Remember the decaf coffee beans and oat milk.',
    profile: 'personal',
    status: 'pending',
    priority: 'medium',
    dueDate: new Date().toISOString().split('T')[0],
    tags: ['shopping', 'home'],
    estimatedMinutes: 25,
    createdAt: Date.now() - 86400000,
    delegatedBy: 'Family Member',
    delegatedNote: 'Please grab the sourdough before the bakery closes at 6pm!',
    subtasks: [],
  },
  {
    id: 'p-2',
    title: 'Schedule dentist checkup for next month',
    profile: 'personal',
    status: 'pending',
    priority: 'low',
    tags: ['health'],
    estimatedMinutes: 15,
    createdAt: Date.now() - 43200000,
    subtasks: [],
  }
];

// Initialize storage if empty
const savedWork = VaultStorage.loadTasks('work');
const savedPersonal = VaultStorage.loadTasks('personal');
const workTasks = savedWork.length > 0 ? savedWork : initialWorkTasks;
const personalTasks = savedPersonal.length > 0 ? savedPersonal : initialPersonalTasks;

if (savedWork.length === 0) VaultStorage.saveTasks('work', workTasks);
if (savedPersonal.length === 0) VaultStorage.saveTasks('personal', personalTasks);

const initialRoomId = 'room_' + Math.random().toString(36).substring(2, 9);
const initialRoomKey = CryptoEngine.generateRoomSecret();
const initialUiMode: UIMode = (localStorage.getItem('intodo_ui_mode') as UIMode) || 'simple';
const initialProfileVisibility: ProfileVisibility = (localStorage.getItem('intodo_profile_visibility') as ProfileVisibility) || 'both';
const initialActiveProfile: ProfileType = initialProfileVisibility === 'personal_only' ? 'personal' : 'work';

SyncRelay.joinRoom(initialRoomId, initialRoomKey);

export const useVaultStore = create<VaultState>((set, get) => {
  // Wire up incoming delegated tasks (routed to Personal vault)
  SyncRelay.onTaskReceived((incomingTask) => {
    set((state) => ({
      delegationInbox: [{ ...incomingTask, profile: 'personal' }, ...state.delegationInbox],
    }));
  });

  return {
    activeProfile: initialActiveProfile,
    profileVisibility: initialProfileVisibility,
    uiMode: initialUiMode,
    workTasks,
    personalTasks,
    delegationInbox: [],
    filterStatus: 'all',
    searchQuery: '',
    selectedTag: null,
    viewMode: 'workspace',
    stealthMode: false,
    
    roomId: initialRoomId,
    roomKey: initialRoomKey,

    activeTimerTaskId: null,
    timerSecondsRemaining: 25 * 60,
    isTimerRunning: false,

    switchProfile: (profile) => {
      const { profileVisibility } = get();
      if (profileVisibility === 'work_only' && profile !== 'work') return;
      if (profileVisibility === 'personal_only' && profile !== 'personal') return;
      set({ activeProfile: profile, selectedTag: null });
    },

    setProfileVisibility: (visibility) => {
      localStorage.setItem('intodo_profile_visibility', visibility);
      const updates: Partial<VaultState> = { profileVisibility: visibility, selectedTag: null };
      if (visibility === 'work_only') {
        updates.activeProfile = 'work';
      } else if (visibility === 'personal_only') {
        updates.activeProfile = 'personal';
      }
      set(updates as any);
    },

    setUIMode: (mode) => {
      localStorage.setItem('intodo_ui_mode', mode);
      set({ uiMode: mode });
    },

    addTask: (title, priority = 'medium', tags = [], dueDate, description, estimatedMinutes) => {
      const { activeProfile, workTasks, personalTasks } = get();
      const newTask: TaskItem = {
        id: 'task_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        title,
        description,
        profile: activeProfile,
        status: 'pending',
        priority,
        dueDate,
        tags,
        estimatedMinutes: estimatedMinutes || 25,
        createdAt: Date.now(),
        subtasks: [],
      };

      if (activeProfile === 'work') {
        const updated = [newTask, ...workTasks];
        VaultStorage.saveTasks('work', updated);
        set({ workTasks: updated });
      } else {
        const updated = [newTask, ...personalTasks];
        VaultStorage.saveTasks('personal', updated);
        set({ personalTasks: updated });
      }
    },

    toggleTask: (id) => {
      const { activeProfile, workTasks, personalTasks } = get();
      const targetList = activeProfile === 'work' ? workTasks : personalTasks;

      const updated = targetList.map((t) => {
        if (t.id === id) {
          const isDone = t.status === 'completed';
          return {
            ...t,
            status: (isDone ? 'pending' : 'completed') as TaskStatus,
            completedAt: isDone ? undefined : Date.now(),
          };
        }
        return t;
      });

      VaultStorage.saveTasks(activeProfile, updated);
      if (activeProfile === 'work') {
        set({ workTasks: updated });
      } else {
        set({ personalTasks: updated });
      }
    },

    deleteTask: (id) => {
      const { activeProfile, workTasks, personalTasks } = get();
      const targetList = activeProfile === 'work' ? workTasks : personalTasks;
      const updated = targetList.filter((t) => t.id !== id);

      VaultStorage.saveTasks(activeProfile, updated);
      if (activeProfile === 'work') {
        set({ workTasks: updated });
      } else {
        set({ personalTasks: updated });
      }
    },

    updateTask: (id, updates) => {
      const { activeProfile, workTasks, personalTasks } = get();
      const targetList = activeProfile === 'work' ? workTasks : personalTasks;
      const updated = targetList.map((t) => (t.id === id ? { ...t, ...updates } : t));

      VaultStorage.saveTasks(activeProfile, updated);
      if (activeProfile === 'work') {
        set({ workTasks: updated });
      } else {
        set({ personalTasks: updated });
      }
    },

    addSubtask: (taskId, title) => {
      const { activeProfile, workTasks, personalTasks } = get();
      const targetList = activeProfile === 'work' ? workTasks : personalTasks;
      const updated = targetList.map((t) => {
        if (t.id === taskId) {
          const newSub = {
            id: 'sub_' + Math.random().toString(36).substring(2, 8),
            title,
            completed: false,
          };
          return { ...t, subtasks: [...t.subtasks, newSub] };
        }
        return t;
      });

      VaultStorage.saveTasks(activeProfile, updated);
      if (activeProfile === 'work') set({ workTasks: updated });
      else set({ personalTasks: updated });
    },

    toggleSubtask: (taskId, subtaskId) => {
      const { activeProfile, workTasks, personalTasks } = get();
      const targetList = activeProfile === 'work' ? workTasks : personalTasks;
      const updated = targetList.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            subtasks: t.subtasks.map((s) =>
              s.id === subtaskId ? { ...s, completed: !s.completed } : s
            ),
          };
        }
        return t;
      });

      VaultStorage.saveTasks(activeProfile, updated);
      if (activeProfile === 'work') set({ workTasks: updated });
      else set({ personalTasks: updated });
    },

    deleteSubtask: (taskId, subtaskId) => {
      const { activeProfile, workTasks, personalTasks } = get();
      const targetList = activeProfile === 'work' ? workTasks : personalTasks;
      const updated = targetList.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            subtasks: t.subtasks.filter((s) => s.id !== subtaskId),
          };
        }
        return t;
      });

      VaultStorage.saveTasks(activeProfile, updated);
      if (activeProfile === 'work') set({ workTasks: updated });
      else set({ personalTasks: updated });
    },

    setFilterStatus: (status) => set({ filterStatus: status }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    setSelectedTag: (tag) => set({ selectedTag: tag }),
    setViewMode: (mode) => set({ viewMode: mode }),
    toggleStealthMode: () => set((state) => ({ stealthMode: !state.stealthMode })),

    generateNewRoom: () => {
      const newRoom = 'room_' + Math.random().toString(36).substring(2, 9);
      const newKey = CryptoEngine.generateRoomSecret();
      SyncRelay.joinRoom(newRoom, newKey);
      set({ roomId: newRoom, roomKey: newKey });
    },

    acceptDelegatedTask: (task) => {
      const { personalTasks, delegationInbox } = get();
      const acceptedTask: TaskItem = { ...task, profile: 'personal' };
      const updatedPersonal = [acceptedTask, ...personalTasks];
      const updatedInbox = delegationInbox.filter((t) => t.id !== task.id);
      
      VaultStorage.saveTasks('personal', updatedPersonal);
      set({
        personalTasks: updatedPersonal,
        delegationInbox: updatedInbox,
      });
    },

    dismissDelegatedTask: (id) => {
      set((state) => ({
        delegationInbox: state.delegationInbox.filter((t) => t.id !== id),
      }));
    },

    startTimer: (taskId, minutes = 25) => {
      set({
        activeTimerTaskId: taskId,
        timerSecondsRemaining: minutes * 60,
        isTimerRunning: true,
      });
    },

    pauseTimer: () => set({ isTimerRunning: false }),
    resetTimer: () => set({ isTimerRunning: false, activeTimerTaskId: null, timerSecondsRemaining: 25 * 60 }),
    tickTimer: () => {
      const { timerSecondsRemaining, isTimerRunning } = get();
      if (isTimerRunning && timerSecondsRemaining > 0) {
        set({ timerSecondsRemaining: timerSecondsRemaining - 1 });
      } else if (timerSecondsRemaining === 0) {
        set({ isTimerRunning: false });
      }
    },

    exportEncryptedVault: async (passphrase) => {
      return await VaultStorage.exportEncryptedBackup(passphrase);
    },

    importEncryptedVault: async (backup, passphrase) => {
      const result = await VaultStorage.importEncryptedBackup(backup, passphrase);
      set({
        workTasks: VaultStorage.loadTasks('work'),
        personalTasks: VaultStorage.loadTasks('personal'),
      });
      return result;
    },

    clearVaultData: () => {
      VaultStorage.clearAllData();
      set({
        workTasks: [],
        personalTasks: [],
        delegationInbox: [],
      });
    }
  };
});

/**
 * Cross-window sync: when the OTHER Tauri window (overlay ↔ main) writes to
 * localStorage, the browser fires a `storage` event here. Re-read both vaults
 * and push the fresh data into the Zustand store so both windows stay in sync.
 *
 * ponytail: uses the platform's built-in storage event — zero deps, zero polling.
 */
window.addEventListener('storage', (e) => {
  if (!e.key?.startsWith('intodo_vault_')) return;
  useVaultStore.setState({
    workTasks: VaultStorage.loadTasks('work'),
    personalTasks: VaultStorage.loadTasks('personal'),
  });
});
