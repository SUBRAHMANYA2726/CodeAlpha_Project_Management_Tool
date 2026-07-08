import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { AuthScreens } from './components/AuthScreens.tsx';
import { ToastProvider, useToast } from './components/Toast.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { KanbanBoard } from './components/KanbanBoard.tsx';
import { ProjectTimeline } from './components/ProjectTimeline.tsx';
import { CalendarView } from './components/CalendarView.tsx';
import { TeamChat } from './components/TeamChat.tsx';
import { FileManager } from './components/FileManager.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { AIResearchLab } from './components/AIResearchLab.tsx';
import { CommandPalette } from './components/CommandPalette.tsx';
import { Project, Column, Task, User, Notification, ActivityLog } from './types.ts';
import { Sparkles, X, Plus, Keyboard } from 'lucide-react';

export function AppContent() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Workspace entities
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  // Navigation & theme states
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const cached = localStorage.getItem('darkMode');
    return cached !== null ? cached === 'true' : true; // Default to true (Dark Mode)
  });

  // Apply dark mode theme class to document element and persist selection
  useEffect(() => {
    localStorage.setItem('darkMode', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      // Toggle Command Palette globally (Cmd+K / Ctrl+K)
      if ((e.metaKey || e.ctrlKey) && key === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
        return;
      }

      // Ignore if typing in editable fields
      const activeElement = document.activeElement;
      if (activeElement) {
        const tagName = activeElement.tagName;
        if (
          tagName === 'INPUT' || 
          tagName === 'TEXTAREA' || 
          activeElement.hasAttribute('contenteditable') ||
          activeElement.closest('[contenteditable="true"]')
        ) {
          return;
        }
      }

      // Toggle create task modal: 'c'
      if (key === 'c') {
        e.preventDefault();
        setShowCreateTaskModal((prev) => !prev);
      }
      // Toggle help modal: '?'
      else if (e.key === '?') {
        e.preventDefault();
        setShowShortcutsHelp((prev) => !prev);
      }
      // Quick view toggles
      else if (key === '1') {
        setCurrentView('dashboard');
      } else if (key === '2') {
        setCurrentView('board');
      } else if (key === '3') {
        setCurrentView('calendar');
      } else if (key === '4') {
        setCurrentView('timeline');
      } else if (key === '5') {
        setCurrentView('chat');
      } else if (key === '6') {
        setCurrentView('files');
      } else if (key === '7') {
        setCurrentView('ai-research');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Creation modals toggles
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTaskIsRecurring, setNewTaskIsRecurring] = useState(false);
  const [newTaskRecurrenceFrequency, setNewTaskRecurrenceFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  const { showSuccess, showError } = useToast();

  // On mount / token change, fetch user profile
  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setCurrentUser(null);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/users/me', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data);
        fetchProjects();
        fetchUsers();
        fetchNotifications();
      } else {
        // Token expired/invalidated
        handleLogout();
      }
    } catch (err) {
      console.error(err);
      handleLogout();
    }
  };

  // Fetch Projects list
  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok && data.length > 0) {
        setProjects(data);
        // Default select first project if none is active
        if (!selectedProject) {
          setSelectedProject(data[0]);
        } else {
          // Sync changes
          const activeProj = data.find((p: Project) => p.id === selectedProject.id);
          if (activeProj) setSelectedProject(activeProj);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch all users list
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok) {
        setAllUsers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok) {
        setNotifications(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch project columns, tasks, activities whenever selection changes
  useEffect(() => {
    if (selectedProject) {
      fetchProjectAssets(selectedProject.id);
    } else {
      setColumns([]);
      setTasks([]);
      setActivities([]);
    }
  }, [selectedProject]);

  const fetchProjectAssets = async (projectId: string) => {
    try {
      // Columns
      const colRes = await fetch(`/api/projects/${projectId}/columns`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const cols = await colRes.json();
      if (colRes.ok) setColumns(cols);

      // Tasks
      const taskRes = await fetch(`/api/projects/${projectId}/tasks`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const tks = await taskRes.json();
      if (taskRes.ok) setTasks(tks);

      // Activities
      const actRes = await fetch(`/api/projects/${projectId}/activities`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const acts = await actRes.json();
      if (actRes.ok) setActivities(acts);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
    setProjects([]);
    setSelectedProject(null);
    setColumns([]);
    setTasks([]);
  };

  // Create Project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name: newProjectName.trim(), description: newProjectDesc.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewProjectName('');
        setNewProjectDesc('');
        setShowCreateProjectModal(false);
        showSuccess('🎉 Project created successfully!');
        
        // Refresh project index and auto-select new project
        const freshRes = await fetch('/api/projects', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const freshProjects = await freshRes.json();
        if (freshRes.ok) {
          setProjects(freshProjects);
          const newlyCreated = freshProjects.find((p: Project) => p.name === data.name);
          if (newlyCreated) setSelectedProject(newlyCreated);
        }
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      showError(err.message || 'Could not construct new project.');
    }
  };

  // Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedProject) return;

    // Use first column as default target stage
    const defaultColId = columns.length > 0 ? columns[0].id : 'todo';

    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          description: newTaskDesc.trim(),
          priority: newTaskPriority,
          columnId: defaultColId,
          isRecurring: newTaskIsRecurring,
          recurrenceFrequency: newTaskRecurrenceFrequency,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewTaskTitle('');
        setNewTaskDesc('');
        setNewTaskPriority('medium');
        setNewTaskIsRecurring(false);
        setNewTaskRecurrenceFrequency('weekly');
        setShowCreateTaskModal(false);
        showSuccess('🎉 Task assigned to sprint!');
        fetchProjectAssets(selectedProject.id);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      showError(err.message || 'Task insertion failed.');
    }
  };

  // Update Project Star/Archive State
  const handleUpdateProjectState = async (updates: Partial<Project>) => {
    if (!selectedProject) return;
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.project) {
          setSelectedProject(data.project);
        }
        fetchProjects();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // View task details in detail dialog (Kanban modal handler)
  const [taskDetailTarget, setTaskDetailTarget] = useState<Task | null>(null);

  // Command Palette handlers
  const handleSelectProjectFromPalette = (project: Project) => {
    setSelectedProject(project);
    setCurrentView('board');
  };

  const handleSelectTaskFromPalette = (task: Task) => {
    const parentProj = projects.find(p => p.id === task.projectId);
    if (parentProj) {
      setSelectedProject(parentProj);
    }
    setCurrentView('board');
    setTaskDetailTarget(task);
  };

  const handleSelectUserFromPalette = (user: User) => {
    setCurrentView('chat');
    showSuccess(`Selected ${user.name} (${user.role}). Opened project discussion workspace.`);
  };

  if (!token || !currentUser) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <AuthScreens onAuthSuccess={(t, user) => {
          localStorage.setItem('token', t);
          setToken(t);
          setCurrentUser(user);
        }} />
      </div>
    );
  }

  // Subview Router
  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard 
            project={selectedProject}
            tasks={tasks}
            activities={activities}
            members={allUsers}
            onSelectTask={(t) => {
              setCurrentView('board');
              setTaskDetailTarget(t);
            }}
          />
        );
      case 'board':
        return (
          <KanbanBoard 
            projectId={selectedProject?.id || ''}
            project={selectedProject}
            onUpdateProject={handleUpdateProjectState}
            columns={columns}
            tasks={tasks}
            users={allUsers}
            onRefreshTasks={() => selectedProject && fetchProjectAssets(selectedProject.id)}
            onRefreshColumns={() => selectedProject && fetchProjectAssets(selectedProject.id)}
            onRefreshActivities={() => selectedProject && fetchProjectAssets(selectedProject.id)}
            initialActiveTask={taskDetailTarget}
            onClearInitialActiveTask={() => setTaskDetailTarget(null)}
          />
        );
      case 'timeline':
        return (
          <ProjectTimeline 
            tasks={tasks}
            onSelectTask={(t) => {
              setCurrentView('board');
              setTaskDetailTarget(t);
            }}
          />
        );
      case 'calendar':
        return (
          <CalendarView 
            tasks={tasks}
            onSelectTask={(t) => {
              setCurrentView('board');
              setTaskDetailTarget(t);
            }}
          />
        );
      case 'chat':
        return (
          <TeamChat 
            project={selectedProject}
            currentUser={currentUser}
            members={allUsers}
          />
        );
      case 'files':
        return <FileManager />;
      case 'ai-research':
        return <AIResearchLab />;
      case 'admin':
        return <AdminPanel currentUser={currentUser} />;
      default:
        return <div className="text-sm font-semibold text-slate-500">View not compiled yet.</div>;
    }
  };

  return (
    <div className={`relative h-screen flex overflow-hidden font-sans bg-gradient-to-tr from-indigo-50/40 via-slate-50/80 to-violet-50/40 dark:from-slate-950 dark:via-indigo-950/10 dark:to-slate-950 text-slate-900 dark:text-slate-100 ${darkMode ? 'dark' : ''}`}>
      {/* Ambient background glassmorphism glow blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-indigo-500/8 dark:bg-indigo-500/5 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/8 dark:bg-purple-500/5 blur-[150px] pointer-events-none z-0" />
      
      {/* Sidebar Navigation */}
      <Sidebar 
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={(p) => {
          setSelectedProject(p);
          setCurrentView('dashboard');
        }}
        currentView={currentView}
        onSelectView={(v) => setCurrentView(v)}
        currentUser={currentUser}
        onLogout={handleLogout}
        onCreateProject={() => setShowCreateProjectModal(true)}
      />

      {/* Main Content Pane */}
      <div className="flex-grow flex flex-col overflow-hidden h-full">
        {/* Sticky Header Topnav */}
        <Header 
          selectedProject={selectedProject}
          onUpdateProject={handleUpdateProjectState}
          notifications={notifications}
          onRefreshNotifications={fetchNotifications}
          tasks={tasks}
          users={allUsers}
          onSelectTask={(t) => {
            setCurrentView('board');
            setTaskDetailTarget(t);
          }}
          onCreateTask={() => setShowCreateTaskModal(true)}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          onToggleShortcutsHelp={() => setShowShortcutsHelp(prev => !prev)}
        />

        {/* Dynamic Screen Stage */}
        <main className="flex-grow overflow-y-auto p-8 bg-transparent scrollbar-thin z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView + (selectedProject?.id || 'none')}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              className="h-full"
            >
              {renderActiveView()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* CREATE PROJECT DIALOG MODAL OVERLAY */}
      <AnimatePresence>
        {showCreateProjectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowCreateProjectModal(false)}
                className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h4 className="font-extrabold text-slate-900 text-lg tracking-tight mb-2">Create New Project</h4>
              <p className="text-xs text-slate-400 mb-6 font-semibold">Establish a collaborative workspace with default Kanban pipelines.</p>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Project Name</label>
                  <input
                    type="text"
                    required
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g. NextGen API Infrastructure"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Objective / Summary</label>
                  <textarea
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    placeholder="State high-level objectives for the development team..."
                    className="w-full h-24 p-3 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 resize-none font-semibold"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-xl transition-colors cursor-pointer shadow-md shadow-indigo-600/10 mt-2"
                >
                  Construct Project Space
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE TASK DIALOG MODAL OVERLAY */}
      <AnimatePresence>
        {showCreateTaskModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowCreateTaskModal(false)}
                className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h4 className="font-extrabold text-slate-900 text-lg tracking-tight mb-2">Insert New Task</h4>
              <p className="text-xs text-slate-400 mb-6 font-semibold">Assign backlog items directly into active workspace pipelines.</p>

              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Task Title</label>
                  <input
                    type="text"
                    required
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="e.g. Audit database indexing"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Backlog Details</label>
                  <textarea
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    placeholder="Specify specifications, test coordinates and constraints..."
                    className="w-full h-24 p-3 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 resize-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Priority Classification</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Recurring Task</label>
                      <span className="text-[10px] text-slate-400 font-medium">Schedule repeating duplicates automatically</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newTaskIsRecurring}
                        onChange={(e) => setNewTaskIsRecurring(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {newTaskIsRecurring && (
                    <div className="space-y-1 pt-1.5 border-t border-slate-200 dark:border-slate-800">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Frequency</label>
                      <select
                        value={newTaskRecurrenceFrequency}
                        onChange={(e) => setNewTaskRecurrenceFrequency(e.target.value as any)}
                        className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 font-semibold"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-xl transition-colors cursor-pointer shadow-md shadow-indigo-600/10 mt-2"
                >
                  Insert Backlog Item
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* KEYBOARD SHORTCUTS HELP DIALOG MODAL OVERLAY */}
      <AnimatePresence>
        {showShortcutsHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-3xl w-full max-w-md p-6 shadow-2xl relative border border-slate-200 dark:border-slate-800"
            >
              <button 
                onClick={() => setShowShortcutsHelp(false)}
                className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h4 className="font-extrabold text-slate-900 dark:text-white text-lg tracking-tight mb-2 flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-indigo-500 animate-pulse" />
                <span>Keyboard Shortcuts Guide</span>
              </h4>
              <p className="text-xs text-slate-400 dark:text-slate-400 mb-6 font-semibold">
                Maximize execution efficiency across project streams.
              </p>

              <div className="space-y-4">
                {/* Actions Section */}
                <div>
                  <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-2">Workspace Actions</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-600 dark:text-slate-300">Command Palette</span>
                      <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-mono shadow-sm">⌘K / ^K</kbd>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-600 dark:text-slate-300">Create Task Modal</span>
                      <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-mono shadow-sm">C</kbd>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-600 dark:text-slate-300">Toggle Shortcuts Guide</span>
                      <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-mono shadow-sm">?</kbd>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* Navigation Section */}
                <div>
                  <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-2">View Shortcuts</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-600 dark:text-slate-300">Dashboard</span>
                      <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-mono shadow-sm">1</kbd>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-600 dark:text-slate-300">Kanban Board</span>
                      <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-mono shadow-sm">2</kbd>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-600 dark:text-slate-300">Calendar View</span>
                      <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-mono shadow-sm">3</kbd>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-600 dark:text-slate-300">Timeline View</span>
                      <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-mono shadow-sm">4</kbd>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-600 dark:text-slate-300">Discussions</span>
                      <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-mono shadow-sm">5</kbd>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-600 dark:text-slate-300">File Manager</span>
                      <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-mono shadow-sm">6</kbd>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold col-span-2 mt-1 pt-1 border-t border-slate-50 dark:border-slate-800/50">
                      <span className="text-slate-600 dark:text-slate-300">AI Research Lab</span>
                      <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-mono shadow-sm">7</kbd>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-[10px] text-center font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Press any key to navigate
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Indirect Kanban Active detail dialog handler wrapper */}
      {taskDetailTarget && (
        <div className="hidden">
          {/* Handled natively inside KanbanBoard when passing state, but let's mount standard modal helpers if needed */}
        </div>
      )}

      {/* GLOBAL COMMAND PALETTE SEARCH MODAL OVERLAY */}
      <AnimatePresence>
        {showCommandPalette && (
          <CommandPalette
            isOpen={showCommandPalette}
            onClose={() => setShowCommandPalette(false)}
            projects={projects}
            allUsers={allUsers}
            onSelectProject={handleSelectProjectFromPalette}
            onSelectTask={handleSelectTaskFromPalette}
            onSelectUser={handleSelectUserFromPalette}
            token={token}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
