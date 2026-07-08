export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'member';
  avatarColor: string;
  createdAt?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: string[];
  isArchived: boolean;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  customLabels?: { name: string; color: string; }[];
}

export interface Column {
  id: string;
  projectId: string;
  name: string;
  position: number;
}

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userAvatarColor: string;
  text: string;
  createdAt: string;
  reactions?: Record<string, string[]>;
  voiceUrl?: string;
  voiceDuration?: number;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: string;
  uploadedAt: string;
}

export interface Task {
  id: string;
  columnId: string;
  projectId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  labels: string[];
  assignees: string[];
  dueDate: string;
  subtasks: Subtask[];
  checklist: ChecklistItem[];
  isStarred: boolean;
  createdAt: string;
  updatedAt: string;
  blockedBy?: string[];
  blocks?: string[];
  isRecurring?: boolean;
  recurrenceFrequency?: 'daily' | 'weekly' | 'monthly';
}

export interface TeamMessage {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  userAvatarColor: string;
  text: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  projectId: string;
  taskId?: string;
  taskTitle?: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'assigned' | 'updated' | 'comment' | 'deadline' | 'mention';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
