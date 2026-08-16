export type ProfileType = 'work' | 'personal';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  profile: ProfileType;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  tags: string[];
  estimatedMinutes?: number;
  createdAt: number;
  completedAt?: number;
  delegatedBy?: string; // Name of colleague if delegated
  delegatedNote?: string;
  subtasks: Subtask[];
}

export interface DelegatedTaskPayload {
  title: string;
  description?: string;
  priority: Priority;
  dueDate?: string;
  senderName: string;
  note?: string;
}

export interface VaultMetadata {
  profile: ProfileType;
  taskCount: number;
  lastUpdated: number;
  encrypted: boolean;
}

export type ViewMode = 'workspace' | 'floating_island' | 'delegation_portal';
