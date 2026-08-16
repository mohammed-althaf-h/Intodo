export type ProfileType = 'work' | 'personal';

export type ProfileVisibility = 'work_only' | 'personal_only' | 'both';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export type UIMode = 'simple' | 'advanced';

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
  delegatedBy?: string; // Name of sender if delegated
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

export type ViewMode = 'workspace' | 'floating_island' | 'delegation_portal';
