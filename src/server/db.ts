import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// Read firebase-applet-config.json and initialize Firestore on the server side
let firestoreDb: any = null;
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const app = initializeApp(config);
    firestoreDb = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    }, config.firestoreDatabaseId);
    console.log('✅ Server database initialized Firebase with Firestore!');
  }
} catch {
  // Firebase initialization is optional in local development and should not break startup.
}

// Define DB Types
export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'manager' | 'member';
  avatarColor: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: string[]; // User IDs
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
  reactions?: Record<string, string[]>; // emoji -> array of user names
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
  assignees: string[]; // User IDs
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

export interface DatabaseState {
  users: User[];
  projects: Project[];
  columns: Column[];
  tasks: Task[];
  comments: Comment[];
  teamMessages: TeamMessage[];
  activityLogs: ActivityLog[];
  notifications: Notification[];
  attachments: Attachment[];
}

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

// Ensure database file directory exists
function ensureDbDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Initial seed data
const getInitialState = (): DatabaseState => {
  // Simple password hashes (using simple text representation or salted hash. Since we use bcryptjs, we will hash "password" on the fly)
  // To avoid slowing down startup, we pre-hash 'password' with bcryptjs:
  // $2a$10$Xm57Xf3Tf6GqN2RlyE3/Oul3b482m5QZ3rY4/s/m8o2yCO1bFpE.2
  const defaultPasswordHash = '$2a$10$Xm57Xf3Tf6GqN2RlyE3/Oul3b482m5QZ3rY4/s/m8o2yCO1bFpE.2'; // "password"

  const users: User[] = [
    {
      id: 'usr_admin',
      name: 'Sarah Connor',
      email: 'admin@taskflow.pro',
      passwordHash: defaultPasswordHash,
      role: 'admin',
      avatarColor: '#4F46E5', // Indigo
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'usr_pm',
      name: 'Alex Mercer',
      email: 'pm@taskflow.pro',
      passwordHash: defaultPasswordHash,
      role: 'manager',
      avatarColor: '#7C3AED', // Violet
      createdAt: '2026-01-02T00:00:00Z',
    },
    {
      id: 'usr_dev',
      name: 'James Cole',
      email: 'dev@taskflow.pro',
      passwordHash: defaultPasswordHash,
      role: 'member',
      avatarColor: '#06B6D4', // Cyan
      createdAt: '2026-01-03T00:00:00Z',
    },
  ];

  const projects: Project[] = [
    {
      id: 'proj_alpha',
      name: 'Alpha Launch Campaign',
      description: 'The core rollout campaign for the CodeAlpha Enterprise platform. Includes landing page updates, marketing coordination, and security reviews.',
      ownerId: 'usr_admin',
      members: ['usr_admin', 'usr_pm', 'usr_dev'],
      isArchived: false,
      isFavorite: true,
      createdAt: '2026-06-01T10:00:00Z',
      updatedAt: '2026-07-07T12:00:00Z',
    },
    {
      id: 'proj_mobile',
      name: 'Mobile Client v2',
      description: 'Redesigning the iOS and Android application with fluid motion layout, gesture controls, and native biometrics.',
      ownerId: 'usr_pm',
      members: ['usr_pm', 'usr_dev'],
      isArchived: false,
      isFavorite: false,
      createdAt: '2026-06-15T09:00:00Z',
      updatedAt: '2026-07-07T11:30:00Z',
    },
    {
      id: 'proj_legacy',
      name: 'SaaS Analytics Dashboard v1',
      description: 'Old client monitoring dashboards. Archived in favor of the unified v2 dashboard.',
      ownerId: 'usr_admin',
      members: ['usr_admin'],
      isArchived: true,
      isFavorite: false,
      createdAt: '2025-10-01T08:00:00Z',
      updatedAt: '2025-12-31T18:00:00Z',
    },
  ];

  const columns: Column[] = [
    // proj_alpha Columns
    { id: 'col_todo_alpha', projectId: 'proj_alpha', name: 'Todo', position: 0 },
    { id: 'col_inprogress_alpha', projectId: 'proj_alpha', name: 'In Progress', position: 1 },
    { id: 'col_review_alpha', projectId: 'proj_alpha', name: 'Review', position: 2 },
    { id: 'col_testing_alpha', projectId: 'proj_alpha', name: 'Testing', position: 3 },
    { id: 'col_completed_alpha', projectId: 'proj_alpha', name: 'Completed', position: 4 },

    // proj_mobile Columns
    { id: 'col_todo_mobile', projectId: 'proj_mobile', name: 'Todo', position: 0 },
    { id: 'col_inprogress_mobile', projectId: 'proj_mobile', name: 'In Progress', position: 1 },
    { id: 'col_completed_mobile', projectId: 'proj_mobile', name: 'Completed', position: 2 },
  ];

  const tasks: Task[] = [
    // proj_alpha tasks
    {
      id: 'task_1',
      columnId: 'col_inprogress_alpha',
      projectId: 'proj_alpha',
      title: 'Design fluid layout transitions',
      description: 'Create ultra-smooth animations using Framer Motion for project switching and kanban drag indicators. Must look modern and high-performance.',
      priority: 'high',
      labels: ['Design', 'UX'],
      assignees: ['usr_pm'],
      dueDate: '2026-07-15T23:59:59Z',
      subtasks: [
        { id: 'sub_1_1', title: 'Define custom cubic-bezier curves', isCompleted: true },
        { id: 'sub_1_2', title: 'Build card dragging hover guides', isCompleted: false },
        { id: 'sub_1_3', title: 'Fine-tune micro-interactions', isCompleted: false },
      ],
      checklist: [
        { id: 'chk_1_1', text: 'Confirm zero flicker on re-renders', checked: true },
        { id: 'chk_1_2', text: 'Verify touch screen responsiveness', checked: false },
      ],
      isStarred: true,
      createdAt: '2026-07-01T10:00:00Z',
      updatedAt: '2026-07-07T12:00:00Z',
    },
    {
      id: 'task_2',
      columnId: 'col_todo_alpha',
      projectId: 'proj_alpha',
      title: 'Integrate full-stack database & JWT keys',
      description: 'Build safe database transactions with persistent storage. Secure all API endpoints behind verification middleware.',
      priority: 'high',
      labels: ['Security', 'Backend'],
      assignees: ['usr_dev', 'usr_admin'],
      dueDate: '2026-07-12T18:00:00Z',
      subtasks: [
        { id: 'sub_2_1', title: 'Setup database schema state', isCompleted: true },
        { id: 'sub_2_2', title: 'Write token verification middleware', isCompleted: true },
        { id: 'sub_2_3', title: 'Enforce role-based access gates', isCompleted: false },
      ],
      checklist: [
        { id: 'chk_2_1', text: 'Salt password hashes', checked: true },
        { id: 'chk_2_2', text: 'Secure auth cookieless flow', checked: true },
      ],
      isStarred: false,
      createdAt: '2026-07-02T11:00:00Z',
      updatedAt: '2026-07-06T14:30:00Z',
    },
    {
      id: 'task_3',
      columnId: 'col_review_alpha',
      projectId: 'proj_alpha',
      title: 'Run production security audit',
      description: 'Scan dependency list for outdated items and review Firestore/API endpoints for logic bypass opportunities.',
      priority: 'medium',
      labels: ['Audit', 'Security'],
      assignees: ['usr_admin'],
      dueDate: '2026-07-10T12:00:00Z',
      subtasks: [
        { id: 'sub_3_1', title: 'Run ESLint checks', isCompleted: true },
        { id: 'sub_3_2', title: 'Check environment keys are server-side', isCompleted: true },
      ],
      checklist: [],
      isStarred: false,
      createdAt: '2026-07-03T14:00:00Z',
      updatedAt: '2026-07-07T09:15:00Z',
    },
    {
      id: 'task_4',
      columnId: 'col_completed_alpha',
      projectId: 'proj_alpha',
      title: 'Generate SVG vector launcher assets',
      description: 'Replace standard image placeholders with clean vector designs optimized for crisp 2K retina screens.',
      priority: 'low',
      labels: ['Design'],
      assignees: ['usr_dev'],
      dueDate: '2026-07-05T17:00:00Z',
      subtasks: [],
      checklist: [],
      isStarred: false,
      createdAt: '2026-07-01T09:00:00Z',
      updatedAt: '2026-07-05T16:50:00Z',
    },

    // proj_mobile tasks
    {
      id: 'task_m1',
      columnId: 'col_todo_mobile',
      projectId: 'proj_mobile',
      title: 'Setup Apple Developer Provisioning Profile',
      description: 'Create proper enterprise profiles to support push notifications and background state syncing.',
      priority: 'medium',
      labels: ['DevOps'],
      assignees: ['usr_pm'],
      dueDate: '2026-07-20T23:59:59Z',
      subtasks: [],
      checklist: [],
      isStarred: false,
      createdAt: '2026-07-06T10:00:00Z',
      updatedAt: '2026-07-06T10:00:00Z',
    },
  ];

  const comments: Comment[] = [
    {
      id: 'comm_1',
      taskId: 'task_1',
      userId: 'usr_admin',
      userName: 'Sarah Connor',
      userAvatarColor: '#4F46E5',
      text: 'Make sure the animation speeds align with the Vercel design framework — around 200ms duration with sharp bezier easing.',
      createdAt: '2026-07-07T10:00:00Z',
      reactions: {
        '👍': ['Alex Mercer'],
        '🔥': ['Sarah Connor', 'James Cole'],
      },
    },
    {
      id: 'comm_2',
      taskId: 'task_1',
      userId: 'usr_pm',
      userName: 'Alex Mercer',
      userAvatarColor: '#7C3AED',
      text: 'Good point. Added custom curves to variables, will apply them today.',
      createdAt: '2026-07-07T11:45:00Z',
      reactions: {
        '🙌': ['Sarah Connor'],
      },
    },
  ];

  const teamMessages: TeamMessage[] = [
    {
      id: 'msg_1',
      projectId: 'proj_alpha',
      userId: 'usr_admin',
      userName: 'Sarah Connor',
      userAvatarColor: '#4F46E5',
      text: 'Hello team! Welcome to the Alpha launch room. Let us post general updates here.',
      createdAt: '2026-07-07T09:00:00Z',
    },
    {
      id: 'msg_2',
      projectId: 'proj_alpha',
      userId: 'usr_dev',
      userName: 'James Cole',
      userAvatarColor: '#06B6D4',
      text: 'Thanks Sarah. Working on the JWT auth routers now.',
      createdAt: '2026-07-07T09:30:00Z',
    },
  ];

  const activityLogs: ActivityLog[] = [
    {
      id: 'log_1',
      projectId: 'proj_alpha',
      taskId: 'task_1',
      taskTitle: 'Design fluid layout transitions',
      userId: 'usr_pm',
      userName: 'Alex Mercer',
      action: 'move',
      details: 'Moved task to In Progress',
      createdAt: '2026-07-07T12:00:00Z',
    },
    {
      id: 'log_2',
      projectId: 'proj_alpha',
      taskId: 'task_4',
      taskTitle: 'Generate SVG vector launcher assets',
      userId: 'usr_dev',
      userName: 'James Cole',
      action: 'complete',
      details: 'Completed task',
      createdAt: '2026-07-05T16:50:00Z',
    },
  ];

  const notifications: Notification[] = [
    {
      id: 'not_1',
      userId: 'usr_pm',
      type: 'assigned',
      title: 'Task Assigned',
      message: 'Sarah Connor assigned you to: "Design fluid layout transitions"',
      isRead: false,
      createdAt: '2026-07-07T10:05:00Z',
    },
    {
      id: 'not_2',
      userId: 'usr_dev',
      type: 'assigned',
      title: 'Task Assigned',
      message: 'Alex Mercer assigned you to: "Integrate full-stack database & JWT keys"',
      isRead: true,
      createdAt: '2026-07-06T14:35:00Z',
    },
  ];

  const attachments: Attachment[] = [
    {
      id: 'att_1',
      name: 'System_Architecture_v2.pdf',
      url: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=80&w=600',
      type: 'application/pdf',
      size: '2.4 MB',
      uploadedAt: '2026-07-06T14:30:00Z',
    },
  ];

  return {
    users,
    projects,
    columns,
    tasks,
    comments,
    teamMessages,
    activityLogs,
    notifications,
    attachments,
  };
};

export class Database {
  private state: DatabaseState;

  constructor() {
    ensureDbDir();
    // Start with default template state
    this.state = getInitialState();

    // Load local cache as instant fallback
    if (fs.existsSync(DB_PATH)) {
      try {
        const fileContent = fs.readFileSync(DB_PATH, 'utf-8');
        this.state = JSON.parse(fileContent);
      } catch (err) {
        console.error('Failed to parse database file, starting fresh', err);
      }
    }

    // Overwrite local state with persistent Cloud Firestore state asynchronously
    if (firestoreDb) {
      this.loadFromFirestore();
    } else {
      this.save();
    }
  }

  private async loadFromFirestore() {
    try {
      const keys: Array<keyof DatabaseState> = [
        'users',
        'projects',
        'columns',
        'tasks',
        'comments',
        'teamMessages',
        'activityLogs',
        'notifications',
        'attachments'
      ];
      let loadedAny = false;
      for (const key of keys) {
        const docRef = doc(firestoreDb, 'app_state', key);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const fetched = docSnap.data();
          if (fetched && Array.isArray(fetched.data)) {
            this.state[key] = fetched.data as any;
            loadedAny = true;
          }
        }
      }
      if (loadedAny) {
        // Keep local cache updated
        fs.writeFileSync(DB_PATH, JSON.stringify(this.state, null, 2), 'utf-8');
      } else {
        await this.saveAllToFirestore();
      }
    } catch {
      // Ignore Firestore restore errors so the app can continue in local mode.
    }
  }

  private async saveAllToFirestore() {
    if (!firestoreDb) return;
    try {
      const keys: Array<keyof DatabaseState> = [
        'users',
        'projects',
        'columns',
        'tasks',
        'comments',
        'teamMessages',
        'activityLogs',
        'notifications',
        'attachments'
      ];
      for (const key of keys) {
        const docRef = doc(firestoreDb, 'app_state', key);
        await setDoc(docRef, { data: this.state[key] });
      }
    } catch {
      // Firestore sync failures are non-blocking for local development.
    }
  }

  private save() {
    try {
      ensureDbDir();
      fs.writeFileSync(DB_PATH, JSON.stringify(this.state, null, 2), 'utf-8');

      // Trigger async write to Cloud Firestore
      if (firestoreDb) {
        this.saveAllToFirestore();
      }
    } catch (err) {
      console.error('Error writing database to disk:', err);
    }
  }

  // Users Operations
  getUsers(): User[] {
    return this.state.users;
  }

  getUserByEmail(email: string): User | undefined {
    return this.state.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  getUserById(id: string): User | undefined {
    return this.state.users.find(u => u.id === id);
  }

  createUser(user: User): User {
    this.state.users.push(user);
    this.save();
    return user;
  }

  updateUserRole(userId: string, role: 'admin' | 'manager' | 'member'): User | null {
    const user = this.getUserById(userId);
    if (!user) return null;
    user.role = role;
    this.save();
    return user;
  }

  deleteUser(userId: string): boolean {
    const index = this.state.users.findIndex(u => u.id === userId);
    if (index === -1) return false;
    this.state.users.splice(index, 1);
    this.save();
    return true;
  }

  // Projects Operations
  getProjects(): Project[] {
    return this.state.projects;
  }

  getProjectById(id: string): Project | undefined {
    return this.state.projects.find(p => p.id === id);
  }

  createProject(project: Project): Project {
    this.state.projects.push(project);

    // Auto-create standard columns for this new project
    const defaultCols = ['Todo', 'In Progress', 'Review', 'Testing', 'Completed'];
    defaultCols.forEach((colName, index) => {
      this.state.columns.push({
        id: `col_${Math.random().toString(36).substr(2, 9)}`,
        projectId: project.id,
        name: colName,
        position: index,
      });
    });

    this.save();
    return project;
  }

  updateProject(id: string, updates: Partial<Project>): Project | null {
    const proj = this.getProjectById(id);
    if (!proj) return null;
    Object.assign(proj, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return proj;
  }

  deleteProject(id: string): boolean {
    const index = this.state.projects.findIndex(p => p.id === id);
    if (index === -1) return false;
    this.state.projects.splice(index, 1);
    // Cascade delete columns and tasks for this project
    this.state.columns = this.state.columns.filter(c => c.projectId !== id);
    this.state.tasks = this.state.tasks.filter(t => t.projectId !== id);
    this.state.teamMessages = this.state.teamMessages.filter(m => m.projectId !== id);
    this.state.activityLogs = this.state.activityLogs.filter(l => l.projectId !== id);
    this.save();
    return true;
  }

  // Columns Operations
  getColumnsByProject(projectId: string): Column[] {
    return this.state.columns
      .filter(c => c.projectId === projectId)
      .sort((a, b) => a.position - b.position);
  }

  addColumn(column: Column): Column {
    this.state.columns.push(column);
    this.save();
    return column;
  }

  updateColumn(id: string, name: string): Column | null {
    const col = this.state.columns.find(c => c.id === id);
    if (!col) return null;
    col.name = name;
    this.save();
    return col;
  }

  deleteColumn(id: string): boolean {
    const index = this.state.columns.findIndex(c => c.id === id);
    if (index === -1) return false;
    const col = this.state.columns[index];
    this.state.columns.splice(index, 1);
    // Move tasks in deleted column to another column if any exists
    const projectCols = this.getColumnsByProject(col.projectId);
    const fallbackCol = projectCols[0];
    if (fallbackCol) {
      this.state.tasks.forEach(t => {
        if (t.columnId === id) {
          t.columnId = fallbackCol.id;
        }
      });
    } else {
      this.state.tasks = this.state.tasks.filter(t => t.columnId !== id);
    }
    this.save();
    return true;
  }

  updateColumnsOrder(columns: { id: string; position: number }[]): void {
    columns.forEach(item => {
      const col = this.state.columns.find(c => c.id === item.id);
      if (col) col.position = item.position;
    });
    this.save();
  }

  // Tasks Operations
  getTasks(): Task[] {
    return this.state.tasks;
  }

  getTasksByProject(projectId: string): Task[] {
    return this.state.tasks.filter(t => t.projectId === projectId);
  }

  getTaskById(id: string): Task | undefined {
    return this.state.tasks.find(t => t.id === id);
  }

  createTask(task: Task): Task {
    this.state.tasks.push(task);
    this.save();
    return task;
  }

  updateTask(id: string, updates: Partial<Task>): Task | null {
    const task = this.getTaskById(id);
    if (!task) return null;
    Object.assign(task, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return task;
  }

  deleteTask(id: string): boolean {
    const index = this.state.tasks.findIndex(t => t.id === id);
    if (index === -1) return false;
    this.state.tasks.splice(index, 1);
    // Cascade delete comments
    this.state.comments = this.state.comments.filter(c => c.taskId !== id);
    this.save();
    return true;
  }

  // Comments Operations
  getCommentsByTask(taskId: string): Comment[] {
    return this.state.comments.filter(c => c.taskId === taskId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  addComment(comment: Comment): Comment {
    this.state.comments.push(comment);
    this.save();
    return comment;
  }

  toggleCommentReaction(commentId: string, emoji: string, userName: string): Comment | null {
    const comm = this.state.comments.find(c => c.id === commentId);
    if (!comm) return null;
    if (!comm.reactions) comm.reactions = {};
    if (!comm.reactions[emoji]) comm.reactions[emoji] = [];

    const index = comm.reactions[emoji].indexOf(userName);
    if (index > -1) {
      comm.reactions[emoji].splice(index, 1);
      if (comm.reactions[emoji].length === 0) {
        delete comm.reactions[emoji];
      }
    } else {
      comm.reactions[emoji].push(userName);
    }
    this.save();
    return comm;
  }

  deleteComment(id: string): boolean {
    const index = this.state.comments.findIndex(c => c.id === id);
    if (index === -1) return false;
    this.state.comments.splice(index, 1);
    this.save();
    return true;
  }

  // Team Messages Operations
  getTeamMessages(projectId: string): TeamMessage[] {
    return this.state.teamMessages
      .filter(m => m.projectId === projectId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  addTeamMessage(msg: TeamMessage): TeamMessage {
    this.state.teamMessages.push(msg);
    this.save();
    return msg;
  }

  // Activity Logs
  getActivityLogs(projectId: string): ActivityLog[] {
    return this.state.activityLogs
      .filter(l => l.projectId === projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  addActivityLog(log: ActivityLog): ActivityLog {
    this.state.activityLogs.push(log);
    // Keep last 150 log entries to save file size
    if (this.state.activityLogs.length > 200) {
      this.state.activityLogs = this.state.activityLogs.slice(-150);
    }
    this.save();
    return log;
  }

  // Notifications Operations
  getNotifications(userId: string): Notification[] {
    return this.state.notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  addNotification(notif: Notification): Notification {
    this.state.notifications.push(notif);
    this.save();
    return notif;
  }

  markNotificationsRead(userId: string): void {
    this.state.notifications.forEach(n => {
      if (n.userId === userId) n.isRead = true;
    });
    this.save();
  }

  // Attachments Operations
  getAttachments(): Attachment[] {
    return this.state.attachments;
  }

  addAttachment(att: Attachment): Attachment {
    this.state.attachments.push(att);
    this.save();
    return att;
  }
}

export const dbInstance = new Database();
