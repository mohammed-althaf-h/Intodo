import { create } from 'zustand';
import { TaskItem, ProfileType, Priority, TaskStatus, ViewMode } from '../types';
import { VaultStorage } from '../services/vaultStorage';
import { SyncRelay } from '../services/syncRelay';
import { CryptoEngine } from '../services/cryptoEngine';

interface VaultState {
  activeProfile: ProfileType;
  workTasks: TaskItem[];
  personalTasks: TaskItem[];
  delegationInbox: TaskItem[];
  filterStatus: 'all' | TaskStatus | 'delegated';
  searchQuery: string;
  selectedTag: string | null;
  viewMode: ViewMode;
  stealthMode: boolean;
  
  // Delegation room credentials
  roomId: string;
  roomKey: string;

  // Active Focus Timer
  activeTimerTaskId: string | null;
  timerSecondsRemaining: number;
  isTimerRunning: boolean;

  // Actions
  switchProfile: (profile: ProfileType) => void;
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

// Initial tasks with helpful demo content
const initialWorkTasks: TaskItem[] = [
  {
    id: 'w-1',
    title: 'Review Q3 Security & EDR Audit Checklist',
    description: 'Ensure all user-space executables comply with Zero-Privilege corporate policies.',
    profile: 'work',
    status: 'in_progress',
    priority: 'high',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    tags: ['security', 'compliance'],
    estimatedMinutes: 45,
    createdAt: Date.now() - 3600000,
    subtasks: [
      { id: 's1', title: 'Verify no global DLL hooks in binary', completed: true },
      { id: 's2', title: 'Audit port 443 HTTPS WSS egress', completed: true },
      { id: 's3', title: 'Test user-mode portable launch', completed: false },
    ],
  },
  {
    id: 'w-2',
    title: 'Sync with Dev Team on Task Delegation API',
    description: 'Provide team lead with our zero-knowledge room code so pending tasks land in our inbox.',
    profile: 'work',
    status: 'pending',
    priority: 'urgent',
    dueDate: new Date().toISOString().split('T')[0],
    tags: ['delegation', 'sync'],
    estimatedMinutes: 20,
    createdAt: Date.now() - 7200000,
    delegatedBy: 'Sarah (Lead Eng)',
    delegatedNote: 'Althaf, please prioritize this before the 3pm sprint demo.',
    subtasks: [],
  }
];

const initialPersonalTasks: TaskItem[] = [
  {
    id: 'p-1',
    title: 'Order new ergonomic split mechanical keyboard',
    description: 'Check reviews on low-profile wireless boards with quiet switches.',
    profile: 'personal',
    status: 'pending',
    priority: 'medium',
    tags: ['gear', 'shopping'],
    estimatedMinutes: 15,
    createdAt: Date.now() - 86400000,
    subtasks: [],
  },
  {
    id: 'p-2',
    title: 'Weekend 10km trail run & hydration prep',
    profile: 'personal',
    status: 'pending',
    priority: 'low',
    dueDate: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    tags: ['fitness', 'health'],
    estimatedMinutes: 60,
    createdAt: Date.now() - 43200000,
    subtasks: [
      { id: 's4', title: 'Charge GPS watch', completed: true },
      { id: 's5', title: 'Pack electrolytes', completed: false }
    ],
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

SyncRelay.joinRoom(initialRoomId, initialRoomKey);

export const useVaultStore = create<VaultState>((set, get) => {
  // Wire up incoming delegated tasks
  SyncRelay.onTaskReceived((incomingTask) => {
    set((state) => ({
      delegationInbox: [incomingTask, ...state.delegationInbox],
    }));
  });

  return {
    activeProfile: 'work',
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
      set({ activeProfile: profile, selectedTag: null });
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
          const newSub: { id: string; title: string; completed: boolean } = {
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
      const { workTasks, delegationInbox } = get();
      const updatedWork = [task, ...workTasks];
      const updatedInbox = delegationInbox.filter((t) => t.id !== task.id);
      
      VaultStorage.saveTasks('work', updatedWork);
      set({
        workTasks: updatedWork,
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
