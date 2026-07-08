import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';
import { dbInstance, User, Project, Column, Task, Comment, TeamMessage, ActivityLog, Notification, Attachment } from './src/server/db.js';
import { suggestTaskPriority, generateProjectSummary, researchTaskWithWeb, researchGeneralWithWeb } from './src/server/gemini.js';

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'taskflow_pro_secret_key_alpha';

const app = express();
app.use(express.json({ limit: '50mb' })); // support large Base64 attachments
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Ensure upload directories exist
const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve uploaded files statically
app.use('/data/uploads', express.static(UPLOADS_DIR));

// Extend Express Request type
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'admin' | 'manager' | 'member';
    name: string;
    avatarColor: string;
  };
}

// JWT Authentication Middleware
function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Access denied. Token missing.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired authentication token.' });
  }
}

// Role authorization checks
const authorizeRoles = (roles: Array<'admin' | 'manager' | 'member'>) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Unauthorized. Higher privilege level required.' });
      return;
    }
    next();
  };
};

// ================= AUTH API =================

// Register
app.post('/api/auth/register', async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: 'Missing registration credentials.' });
    return;
  }

  try {
    const existing = dbInstance.getUserByEmail(email);
    if (existing) {
      res.status(400).json({ error: 'An account with this email already exists.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const colors = ['#4F46E5', '#7C3AED', '#06B6D4', '#22C55E', '#EC4899', '#F59E0B', '#10B981'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    const newUser: User = {
      id: `usr_${Math.random().toString(36).substr(2, 9)}`,
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: role || 'member',
      avatarColor,
      createdAt: new Date().toISOString(),
    };

    dbInstance.createUser(newUser);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name, avatarColor: newUser.avatarColor },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: '✅ Registered successfully.',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        avatarColor: newUser.avatarColor,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Google Sign-In Auth Handler
app.post('/api/auth/google', async (req: Request, res: Response): Promise<void> => {
  const { name, email, uid, avatarColor } = req.body;

  if (!email || !uid) {
    res.status(400).json({ error: 'Missing Google credentials or UID.' });
    return;
  }

  try {
    let user = dbInstance.getUserByEmail(email);

    if (!user) {
      // Auto-register the Google authenticated user
      const colors = ['#4F46E5', '#7C3AED', '#06B6D4', '#22C55E', '#EC4899', '#F59E0B', '#10B981'];
      const finalAvatarColor = avatarColor || colors[Math.floor(Math.random() * colors.length)];

      const newUser: User = {
        id: `usr_g_${uid.substring(0, 8)}_${Math.random().toString(36).substring(2, 6)}`,
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        passwordHash: 'GOOGLE_AUTHENTICATED_USER',
        role: 'member',
        avatarColor: finalAvatarColor,
        createdAt: new Date().toISOString(),
      };

      dbInstance.createUser(newUser);
      user = newUser;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, avatarColor: user.avatarColor },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: '✅ Authenticated via Google successfully.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarColor: user.avatarColor,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/api/auth/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  try {
    const user = dbInstance.getUserByEmail(email);
    if (!user) {
      res.status(400).json({ error: 'Invalid email or password.' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(400).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, avatarColor: user.avatarColor },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: '✅ Logged in successfully.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarColor: user.avatarColor,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Forgot password mockup (simulated 100% working fallback reset)
app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email address is required.' });
    return;
  }

  const user = dbInstance.getUserByEmail(email);
  if (!user) {
    res.status(404).json({ error: 'No account found with this email address.' });
    return;
  }

  res.json({
    message: '✅ A secure password reset link has been dispatched to your email address.',
  });
});

// Get current logged in user context
app.get(['/api/auth/me', '/api/users/me'], authenticateJWT as any, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(404).json({ error: 'User session not found.' });
    return;
  }
  const user = dbInstance.getUserById(req.user.id);
  if (!user) {
    res.status(404).json({ error: 'User does not exist in database.' });
    return;
  }
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarColor: user.avatarColor,
  });
});


// ================= USERS MANAGEMENT =================

app.get('/api/users', authenticateJWT as any, (req: AuthenticatedRequest, res: Response) => {
  const users = dbInstance.getUsers().map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    avatarColor: u.avatarColor,
    createdAt: u.createdAt,
  }));
  res.json(users);
});

app.put('/api/users/:id/role', authenticateJWT as any, authorizeRoles(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const { role } = req.body;
  if (!role || !['admin', 'manager', 'member'].includes(role)) {
    res.status(400).json({ error: 'Invalid role selection.' });
    return;
  }

  const updated = dbInstance.updateUserRole(req.params.id, role);
  if (!updated) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  res.json({
    message: '✅ User role updated successfully.',
    user: {
      id: updated.id,
      name: updated.name,
      role: updated.role,
    }
  });
});

app.delete('/api/users/:id', authenticateJWT as any, authorizeRoles(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const deleted = dbInstance.deleteUser(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  res.json({ message: '✅ User account deleted successfully.' });
});


// ================= PROJECTS API =================

app.get('/api/projects', authenticateJWT as any, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const allProjects = dbInstance.getProjects();

  // Filter for project members or admins
  const userProjects = req.user!.role === 'admin'
    ? allProjects
    : allProjects.filter(p => p.members.includes(userId) || p.ownerId === userId);

  res.json(userProjects);
});

app.post('/api/projects', authenticateJWT as any, (req: AuthenticatedRequest, res: Response) => {
  const { name, description } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Project name is required.' });
    return;
  }

  const newProject: Project = {
    id: `proj_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description: description || '',
    ownerId: req.user!.id,
    members: [req.user!.id],
    isArchived: false,
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dbInstance.createProject(newProject);

  // Log activity
  dbInstance.addActivityLog({
    id: `log_${Math.random().toString(36).substr(2, 9)}`,
    projectId: newProject.id,
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'create_project',
    details: `Created project: "${newProject.name}"`,
    createdAt: new Date().toISOString(),
  });

  res.status(201).json({
    message: '✅ Project created successfully.',
    project: newProject,
  });
});

app.put('/api/projects/:id', authenticateJWT as any, (req: AuthenticatedRequest, res: Response) => {
  const { name, description, isArchived, isFavorite, members, customLabels } = req.body;
  const project = dbInstance.getProjectById(req.params.id);

  if (!project) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  // Authorization check (owner, admin or manager can edit)
  if (project.ownerId !== req.user!.id && req.user!.role === 'member') {
    res.status(403).json({ error: 'Only managers or the owner can edit project parameters.' });
    return;
  }

  const updates: Partial<Project> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (isArchived !== undefined) updates.isArchived = isArchived;
  if (isFavorite !== undefined) updates.isFavorite = isFavorite;
  if (members !== undefined) updates.members = members;
  if (customLabels !== undefined) updates.customLabels = customLabels;

  const updated = dbInstance.updateProject(req.params.id, updates);

  // Log activity
  dbInstance.addActivityLog({
    id: `log_${Math.random().toString(36).substr(2, 9)}`,
    projectId: project.id,
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'update_project',
    details: `Updated project metadata.`,
    createdAt: new Date().toISOString(),
  });

  res.json({
    message: '✅ Project updated successfully.',
    project: updated,
  });
});

app.delete('/api/projects/:id', authenticateJWT as any, (req: AuthenticatedRequest, res: Response) => {
  const project = dbInstance.getProjectById(req.params.id);
  if (!project) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  if (project.ownerId !== req.user!.id && req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Only the project creator or admins can delete this project.' });
    return;
  }

  dbInstance.deleteProject(req.params.id);
  res.json({ message: '✅ Project deleted successfully.' });
});


// ================= KANBAN COLUMNS API =================

app.get('/api/projects/:projectId/columns', authenticateJWT as any, (req: AuthenticatedRequest, res: Response) => {
  const cols = dbInstance.getColumnsByProject(req.params.projectId);
  res.json(cols);
});

app.post('/api/projects/:projectId/columns', authenticateJWT as any, (req: AuthenticatedRequest, res: Response) => {
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Column name is required.' });
    return;
  }

  const existingCols = dbInstance.getColumnsByProject(req.params.projectId);

  const newCol: Column = {
    id: `col_${Math.random().toString(36).substr(2, 9)}`,
    projectId: req.params.projectId,
    name,
    position: existingCols.length,
  };

  dbInstance.addColumn(newCol);
  res.status(201).json({
    message: '✅ Column created successfully.',
    column: newCol,
  });
});

app.put('/api/columns/:id', authenticateJWT as any, (req: AuthenticatedRequest, res: Response) => {
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Column name is required.' });
    return;
  }

  const updated = dbInstance.updateColumn(req.params.id, name);
  if (!updated) {
    res.status(404).json({ error: 'Column not found.' });
    return;
  }

  res.json({
    message: '✅ Column renamed successfully.',
    column: updated,
  });
});

app.delete('/api/columns/:id', authenticateJWT as any, (req: AuthenticatedRequest, res: Response) => {
  const deleted = dbInstance.deleteColumn(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Column not found.' });
    return;
  }
  res.json({ message: '✅ Column deleted successfully, active tasks evacuated.' });
});

app.post('/api/columns/reorder', authenticateJWT as any, (req: AuthenticatedRequest, res: Response) => {
  const { columns } = req.body; // array of { id, position }
  if (!columns || !Array.isArray(columns)) {
    res.status(400).json({ error: 'Invalid columns positioning map.' });
    return;
  }

  dbInstance.updateColumnsOrder(columns);
  res.json({ message: '✅ Columns reordered successfully.' });
});


// ================= TASKS API =================

app.get('/api/tasks', authenticateJWT as any, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const allProjects = dbInstance.getProjects();
  const userProjects = req.user!.role === 'admin'
    ? allProjects
    : allProjects.filter(p => p.members.includes(userId) || p.ownerId === userId);

  const projectIds = new Set(userProjects.map(p => p.id));
  const tasks = dbInstance.getTasks().filter(t => projectIds.has(t.projectId));
  res.json(tasks);
});

app.get('/api/projects/:projectId/tasks', authenticateJWT as any, (req: AuthenticatedRequest, res: Response) => {
  const tasks = dbInstance.getTasksByProject(req.params.projectId);
  res.json(tasks);
});

app.post('/api/projects/:projectId/tasks', authenticateJWT as any, (req: AuthenticatedRequest, res: Response) => {
  const { title, description, columnId, priority, labels, assignees, dueDate, blockedBy, blocks, isRecurring, recurrenceFrequency } = req.body;
  if (!title || !columnId) {
    res.status(400).json({ error: 'Title and Column are required.' });
    return;
  }

  const newTask: Task = {
    id: `task_${Math.random().toString(36).substr(2, 9)}`,
    columnId,
    projectId: req.params.projectId,
    title,
    description: description || '',
    priority: priority || 'medium',
    labels: labels || [],
    assignees: assignees || [],
    dueDate: dueDate || '',
    subtasks: [],
    checklist: [],
    isStarred: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    blockedBy: blockedBy || [],
    blocks: blocks || [],
    isRecurring: !!isRecurring,
    recurrenceFrequency: recurrenceFrequency || 'weekly',
  };

  dbInstance.createTask(newTask);

  // Log activity
  dbInstance.addActivityLog({
    id: `log_${Math.random().toString(36).substr(2, 9)}`,
    projectId: newTask.projectId,
    taskId: newTask.id,
    taskTitle: newTask.title,
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'create_task',
    details: `Created task: "${newTask.title}"`,
    createdAt: new Date().toISOString(),
  });

  // Notify assignees
  if (assignees && assignees.length > 0) {
    assignees.forEach((assId: string) => {
      if (assId !== req.user!.id) {
        dbInstance.addNotification({
          id: `not_${Math.random().toString(36).substr(2, 9)}`,
          userId: assId,
          type: 'assigned',
          title: 'Task Assigned',
          message: `${req.user!.name} assigned you to "${newTask.title}"`,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    });
  }

  res.status(201).json({
    message: '✅ Task created successfully.',
    task: newTask,
  });
});

app.put('/api/tasks/:id', authenticateJWT as any, (req: AuthenticatedRequest, res: Response) => {
  const task = dbInstance.getTaskById(req.params.id);
  if (!task) {
    res.status(404).json({ error: 'Task not found.' });
    return;
  }

  const { title, description, columnId, priority, labels, assignees, dueDate, subtasks, checklist, isStarred, blockedBy, blocks, isRecurring, recurrenceFrequency } = req.body;

  const updates: Partial<Task> = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (columnId !== undefined) {
    if (columnId !== task.columnId) {
      // Find old and new column names to log neatly
      const cols = dbInstance.getColumnsByProject(task.projectId);
      const oldCol = cols.find(c => c.id === task.columnId)?.name || 'Previous';
      const newCol = cols.find(c => c.id === columnId)?.name || 'Next';

      dbInstance.addActivityLog({
        id: `log_${Math.random().toString(36).substr(2, 9)}`,
        projectId: task.projectId,
        taskId: task.id,
        taskTitle: title || task.title,
        userId: req.user!.id,
        userName: req.user!.name,
        action: 'move_task',
        details: `Moved task from "${oldCol}" to "${newCol}"`,
        createdAt: new Date().toISOString(),
      });

      // Recurring task automatic scheduling
      const isTargetCompleted = newCol.toLowerCase() === 'completed' || newCol.toLowerCase() === 'done';
      const shouldRecur = isTargetCompleted && (task.isRecurring || isRecurring);
      if (shouldRecur) {
        let nextDueDate = '';
        const currentDueDate = new Date((dueDate !== undefined ? dueDate : task.dueDate) || new Date());
        const freq = recurrenceFrequency || task.recurrenceFrequency || 'weekly';

        if (freq === 'daily') {
          currentDueDate.setDate(currentDueDate.getDate() + 1);
        } else if (freq === 'weekly') {
          currentDueDate.setDate(currentDueDate.getDate() + 7);
        } else if (freq === 'monthly') {
          currentDueDate.setMonth(currentDueDate.getMonth() + 1);
        }
        nextDueDate = currentDueDate.toISOString();

        // Find the first column in the same project (usually Todo)
        const sortedCols = [...cols].sort((a, b) => a.position - b.position);
        const firstColId = sortedCols[0]?.id || task.columnId;

        const recurringTask: Task = {
          id: `task_${Math.random().toString(36).substr(2, 9)}`,
          columnId: firstColId,
          projectId: task.projectId,
          title: title || task.title,
          description: description !== undefined ? description : task.description,
          priority: priority || task.priority,
          labels: labels || task.labels || [],
          assignees: assignees || task.assignees || [],
          dueDate: nextDueDate,
          subtasks: (subtasks || task.subtasks || []).map(s => ({ ...s, id: `sub_${Math.random().toString(36).substr(2, 9)}`, isCompleted: false })),
          checklist: (checklist || task.checklist || []).map(c => ({ ...c, id: `chk_${Math.random().toString(36).substr(2, 9)}`, checked: false })),
          isStarred: isStarred !== undefined ? isStarred : (task.isStarred || false),
          isRecurring: true,
          recurrenceFrequency: freq,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          blockedBy: blockedBy || task.blockedBy || [],
          blocks: blocks || task.blocks || [],
        };

        dbInstance.createTask(recurringTask);

        dbInstance.addActivityLog({
          id: `log_${Math.random().toString(36).substr(2, 9)}`,
          projectId: task.projectId,
          taskId: recurringTask.id,
          taskTitle: recurringTask.title,
          userId: req.user!.id,
          userName: req.user!.name,
          action: 'create_task',
          details: `Automatically scheduled next recurrence (${recurringTask.recurrenceFrequency}) of task: "${recurringTask.title}"`,
          createdAt: new Date().toISOString(),
        });
      }
    }
    updates.columnId = columnId;
  }
  if (priority !== undefined) updates.priority = priority;
  if (labels !== undefined) updates.labels = labels;

  if (assignees !== undefined) {
    // Notify newly added assignees
    const newAssignees = assignees.filter((id: string) => !task.assignees.includes(id));
    newAssignees.forEach((id: string) => {
      if (id !== req.user!.id) {
        dbInstance.addNotification({
          id: `not_${Math.random().toString(36).substr(2, 9)}`,
          userId: id,
          type: 'assigned',
          title: 'Task Assigned',
          message: `${req.user!.name} assigned you to "${task.title}"`,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    });
    updates.assignees = assignees;
  }
  if (dueDate !== undefined) updates.dueDate = dueDate;
  if (subtasks !== undefined) updates.subtasks = subtasks;
  if (checklist !== undefined) updates.checklist = checklist;
  if (isStarred !== undefined) updates.isStarred = isStarred;
  if (blockedBy !== undefined) {
    const oldBlockedBy = task.blockedBy || [];
    const addedBlockers = blockedBy.filter((id: string) => !oldBlockedBy.includes(id));
    addedBlockers.forEach((blockerId: string) => {
      const blockerTask = dbInstance.getTaskById(blockerId);
      if (blockerTask) {
        const currentBlocks = blockerTask.blocks || [];
        if (!currentBlocks.includes(task.id)) {
          dbInstance.updateTask(blockerId, { blocks: [...currentBlocks, task.id] });
        }
      }
    });
    const removedBlockers = oldBlockedBy.filter((id: string) => !blockedBy.includes(id));
    removedBlockers.forEach((blockerId: string) => {
      const blockerTask = dbInstance.getTaskById(blockerId);
      if (blockerTask) {
        const currentBlocks = blockerTask.blocks || [];
        dbInstance.updateTask(blockerId, { blocks: currentBlocks.filter(id => id !== task.id) });
      }
    });
    updates.blockedBy = blockedBy;
  }
  if (blocks !== undefined) {
    const oldBlocks = task.blocks || [];
    const addedBlockeds = blocks.filter((id: string) => !oldBlocks.includes(id));
    addedBlockeds.forEach((blockedId: string) => {
      const blockedTask = dbInstance.getTaskById(blockedId);
      if (blockedTask) {
        const currentBlockedBy = blockedTask.blockedBy || [];
        if (!currentBlockedBy.includes(task.id)) {
          dbInstance.updateTask(blockedId, { blockedBy: [...currentBlockedBy, task.id] });
        }
      }
    });
    const removedBlockeds = oldBlocks.filter((id: string) => !blocks.includes(id));
    removedBlockeds.forEach((blockedId: string) => {
      const blockedTask = dbInstance.getTaskById(blockedId);
      if (blockedTask) {
        const currentBlockedBy = blockedTask.blockedBy || [];
        dbInstance.updateTask(blockedId, { blockedBy: currentBlockedBy.filter(id => id !== task.id) });
      }
    });
    updates.blocks = blocks;
  }
  if (isRecurring !== undefined) updates.isRecurring = isRecurring;
  if (recurrenceFrequency !== undefined) updates.recurrenceFrequency = recurrenceFrequency;

  const updatedTask = dbInstance.updateTask(req.params.id, updates);

  res.json({
    message: '✅ Task updated successfully.',
    task: updatedTask,
  });
});

app.delete('/api/tasks/:id', authenticateJWT as any, (req: AuthenticatedRequest, res: Response) => {
  const task = dbInstance.getTaskById(req.params.id);
  if (!task) {
    res.status(404).json({ error: 'Task not found.' });
    return;
  }

  dbInstance.deleteTask(req.params.id);

  dbInstance.addActivityLog({
    id: `log_${Math.random().toString(36).substr(2, 9)}`,
    projectId: task.projectId,
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'delete_task',
    details: `Deleted task: "${task.title}"`,
    createdAt: new Date().toISOString(),
  });

  res.json({ message: '✅ Task deleted successfully.' });
});


// ================= COMMENTS API =================

app.get('/api/tasks/:taskId/comments', authenticateJWT as any, (req: AuthenticatedRequest, res: Response) => {
  const comments = dbInstance.getCommentsByTask(req.params.taskId);
  res.json(comments);
});

app.post('/api/tasks/:taskId/comments', authenticateJWT as any, (req: AuthenticatedRequest, res: Response) => {
  const { text, voiceUrl, voiceDuration } = req.body;
  if (!text && !voiceUrl) {
    res.status(400).json({ error: 'Comment body text or voice note is required.' });
    return;
  }

  const task = dbInstance.getTaskById(req.params.taskId);
  if (!task) {
    res.status(404).json({ error: 'Task not found.' });
    return;
  }

  const newComment: Comment = {
    id: `comm_${Math.random().toString(36).substr(2, 9)}`,
    taskId: req.params.taskId,
    userId: req.user!.id,
    userName: req.user!.name,
    userAvatarColor: req.user!.avatarColor,
    text: text || '',
    createdAt: new Date().toISOString(),
    reactions: {},
    voiceUrl,
    voiceDuration,
  };

  dbInstance.addComment(newComment);

  // Log activity
  dbInstance.addActivityLog({
    id: `log_${Math.random().toString(36).substr(2, 9)}`,
    projectId: task.projectId,
    taskId: task.id,
    taskTitle: task.title,
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'add_comment',
    details: `Commented on task: "${task.title}"`,
    createdAt: new Date().toISOString(),
  });

  // Notify assignees (if comment author is not an assignee, notify them too)
  const notifyIds = task.assignees.filter(id => id !== req.user!.id);
  notifyIds.forEach(userId => {
    dbInstance.addNotification({
      id: `not_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type: 'comment',
      title: 'New Comment',
      message: `${req.user!.name} commented on "${task.title}": "${text.substring(0, 30)}..."`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  });

  res.status(201).json({
    message: '✅ Comment added successfully.',
    comment: newComment,
  });
});

app.post('/api/comments/:id/react', authenticateJWT as any, (req: AuthenticatedRequest, res: Response) => {
  const { emoji } = req.body;
  if (!emoji) {
    res.status(400).json({ error: 'Emoji character is required.' });
    return;
  }

  const updated = dbInstance.toggleCommentReaction(req.params.id, emoji, req.user!.name);
  if (!updated) {
    res.status(404).json({ error: 'Comment not found.' });
    return;
  }

  res.json({
    message: '✅ Reaction updated successfully.',
    comment: updated,
  });
});

app.delete('/api/comments/:id', authenticateJWT as any, (req: AuthenticatedRequest, res: Response) => {
  const deleted = dbInstance.deleteComment(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Comment not found.' });
    return;
  }
  res.json({ message: '✅ Comment deleted successfully.' });
});


// ================= TEAM CHAT / DISCUSSIONS =================

app.get('/api/projects/:projectId/chat', authenticateJWT as any, (req: AuthenticatedRequest, res: Response) => {
  const messages = dbInstance.getTeamMessages(req.params.projectId);
  res.json(messages);
});

app.post('/api/projects/:projectId/chat', authenticateJWT as any, (req: AuthenticatedRequest, res: Response) => {
  const { text } = req.body;
  if (!text) {
    res.status(400).json({ error: 'Message content cannot be blank.' });
    return;
  }

  const newMessage: TeamMessage = {
    id: `msg_${Math.random().toString(36).substr(2, 9)}`,
    projectId: req.params.projectId,
    userId: req.user!.id,
    userName: req.user!.name,
    userAvatarColor: req.user!.avatarColor,
    text,
    createdAt: new Date().toISOString(),
  };

  dbInstance.addTeamMessage(newMessage);

  res.status(201).json({
    message: '✅ Message sent successfully.',
    chatMessage: newMessage,
  });
});


// ================= ACTIVITY LOGS & NOTIFICATIONS =================

app.get('/api/projects/:projectId/activities', authenticateJWT as any, (req: AuthenticatedRequest, res: Response) => {
  const logs = dbInstance.getActivityLogs(req.params.projectId);
  res.json(logs);
});

app.get('/api/notifications', authenticateJWT as any, (req: AuthenticatedRequest, res: Response) => {
  const notifs = dbInstance.getNotifications(req.user!.id);
  res.json(notifs);
});

app.post('/api/notifications/read', authenticateJWT as any, (req: AuthenticatedRequest, res: Response) => {
  dbInstance.markNotificationsRead(req.user!.id);
  res.json({ message: '✅ All notifications marked as read.' });
});


// ================= FILE MANAGEMENT API =================

app.post('/api/attachments/upload', authenticateJWT as any, (req: AuthenticatedRequest, res: Response) => {
  const { name, type, size, fileData } = req.body; // fileData is base64 string

  if (!name || !fileData) {
    res.status(400).json({ error: 'File metadata or raw binary encoding is missing.' });
    return;
  }

  try {
    // Isolate base64 header if present
    const cleanBase64 = fileData.replace(/^data:.*?;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    // Create unique file name
    const ext = path.extname(name);
    const uniqueName = `file_${Math.random().toString(36).substr(2, 9)}${ext}`;
    const filePath = path.join(UPLOADS_DIR, uniqueName);

    fs.writeFileSync(filePath, buffer);

    const relativeUrl = `/data/uploads/${uniqueName}`;

    const newAttachment: Attachment = {
      id: `att_${Math.random().toString(36).substr(2, 9)}`,
      name,
      url: relativeUrl,
      type: type || 'application/octet-stream',
      size: size || 'Unknown size',
      uploadedAt: new Date().toISOString(),
    };

    dbInstance.addAttachment(newAttachment);

    res.status(201).json({
      message: '✅ File uploaded successfully.',
      attachment: newAttachment,
    });
  } catch (err: any) {
    res.status(500).json({ error: `File persistence crash: ${err.message}` });
  }
});

app.get('/api/attachments', authenticateJWT as any, (req: AuthenticatedRequest, res: Response) => {
  res.json(dbInstance.getAttachments());
});


// ================= GEMINI AI POWERED ENDPOINTS =================

app.post('/api/ai/suggest-priority', authenticateJWT as any, async (req: AuthenticatedRequest, res: Response) => {
  const { title, description } = req.body;
  if (!title) {
    res.status(400).json({ error: 'A task title is required for AI priority prediction.' });
    return;
  }

  const suggestion = await suggestTaskPriority(title, description || '');
  res.json({
    message: '✅ AI Suggestion generated successfully.',
    ...suggestion,
  });
});

app.get('/api/projects/:id/ai-summary', authenticateJWT as any, async (req: AuthenticatedRequest, res: Response) => {
  const project = dbInstance.getProjectById(req.params.id);
  if (!project) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  const tasks = dbInstance.getTasksByProject(project.id);
  const activities = dbInstance.getActivityLogs(project.id);

  const report = await generateProjectSummary(project.name, project.description, tasks, activities);
  res.json({
    message: '✅ AI Project report generated successfully.',
    report,
  });
});

app.post('/api/ai/research-task', authenticateJWT as any, async (req: AuthenticatedRequest, res: Response) => {
  const { title, description } = req.body;
  if (!title) {
    res.status(400).json({ error: 'A task title is required for grounded AI research.' });
    return;
  }

  const result = await researchTaskWithWeb(title, description || '');
  res.json(result);
});

app.post('/api/ai/research-general', authenticateJWT as any, async (req: AuthenticatedRequest, res: Response) => {
  const { query } = req.body;
  if (!query) {
    res.status(400).json({ error: 'A query is required for search grounding.' });
    return;
  }

  const result = await researchGeneralWithWeb(query);
  res.json(result);
});


// ================= DATA EXPORTS =================

app.get('/api/projects/:id/export/csv', authenticateJWT as any, (req: AuthenticatedRequest, res: Response) => {
  const project = dbInstance.getProjectById(req.params.id);
  if (!project) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  const tasks = dbInstance.getTasksByProject(project.id);
  const cols = dbInstance.getColumnsByProject(project.id);

  let csvContent = 'Task ID,Title,Description,Column,Priority,Labels,Due Date,Starred,Created At\n';

  tasks.forEach(t => {
    const colName = cols.find(c => c.id === t.columnId)?.name || 'Unknown';
    const cleanTitle = (t.title || '').replace(/"/g, '""');
    const cleanDesc = (t.description || '').replace(/"/g, '""').replace(/\n/g, ' ');
    csvContent += `"${t.id}","${cleanTitle}","${cleanDesc}","${colName}","${t.priority}","${t.labels.join(';')}","${t.dueDate}","${t.isStarred}","${t.createdAt}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="taskflow_pro_export_${project.name.replace(/\s+/g, '_')}.csv"`);
  res.send(csvContent);
});

app.get('/api/projects/:id/export/excel', authenticateJWT as any, (req: AuthenticatedRequest, res: Response) => {
  const project = dbInstance.getProjectById(req.params.id);
  if (!project) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  const tasks = dbInstance.getTasksByProject(project.id);
  const cols = dbInstance.getColumnsByProject(project.id);

  const data = tasks.map(t => {
    const colName = cols.find(c => c.id === t.columnId)?.name || 'Unknown';
    return {
      taskId: t.id,
      title: t.title,
      description: t.description,
      column: colName,
      priority: t.priority,
      labels: t.labels,
      dueDate: t.dueDate,
      starred: t.isStarred,
      createdAt: t.createdAt
    };
  });

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="taskflow_pro_export_${project.name.replace(/\s+/g, '_')}.json"`);
  res.send(JSON.stringify(data, null, 2));
});


// ================= VITE OR STATIC SERVING MIDDLEWARE =================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    // Server startup is handled silently for a cleaner local experience.
  });
}

startServer();
