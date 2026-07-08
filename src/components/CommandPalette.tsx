import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Folder, 
  CheckSquare, 
  User as UserIcon, 
  X, 
  Command, 
  CornerDownLeft, 
  Sparkles,
  UserCheck,
  ShieldAlert
} from 'lucide-react';
import { Project, Task, User } from '../types.ts';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  allUsers: User[];
  onSelectProject: (project: Project) => void;
  onSelectTask: (task: Task) => void;
  onSelectUser: (user: User) => void;
  token: string | null;
}

type FilterType = 'all' | 'tasks' | 'projects' | 'team';

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  projects,
  allUsers,
  onSelectProject,
  onSelectTask,
  onSelectUser,
  token,
}) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Fetch all tasks when the palette opens
  useEffect(() => {
    if (isOpen && token) {
      setIsLoadingTasks(true);
      fetch('/api/tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setTasks(data);
          }
        })
        .catch(err => console.error('Error fetching global tasks for command palette:', err))
        .finally(() => setIsLoadingTasks(false));

      // Reset states
      setQuery('');
      setFilter('all');
      setSelectedIndex(0);

      // Focus input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, token]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Compute search results
  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(query.toLowerCase()) || 
    p.description.toLowerCase().includes(query.toLowerCase())
  );

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(query.toLowerCase()) || 
    t.description.toLowerCase().includes(query.toLowerCase())
  );

  const filteredUsers = allUsers.filter(u => 
    u.name.toLowerCase().includes(query.toLowerCase()) || 
    u.email.toLowerCase().includes(query.toLowerCase()) ||
    u.role.toLowerCase().includes(query.toLowerCase())
  );

  // Grouped results based on filter selection
  const results: Array<{
    type: 'project' | 'task' | 'user';
    id: string;
    title: string;
    subtitle: string;
    data: any;
  }> = [];

  if (filter === 'all' || filter === 'projects') {
    filteredProjects.forEach(p => {
      results.push({
        type: 'project',
        id: p.id,
        title: p.name,
        subtitle: p.description || 'No description available',
        data: p,
      });
    });
  }

  if (filter === 'all' || filter === 'tasks') {
    filteredTasks.forEach(t => {
      const parentProj = projects.find(p => p.id === t.projectId);
      results.push({
        type: 'task',
        id: t.id,
        title: t.title,
        subtitle: `Task in ${parentProj?.name || 'Project'} • Priority: ${t.priority}`,
        data: t,
      });
    });
  }

  if (filter === 'all' || filter === 'team') {
    filteredUsers.forEach(u => {
      results.push({
        type: 'user',
        id: u.id,
        title: u.name,
        subtitle: `${u.email} • Role: ${u.role}`,
        data: u,
      });
    });
  }

  // Adjust selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, filter, tasks]);

  // Scroll active item into view
  useEffect(() => {
    if (resultsContainerRef.current) {
      const activeEl = resultsContainerRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleArrowNavigation = (e: React.KeyboardEvent) => {
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      triggerSelection(results[selectedIndex]);
    }
  };

  const triggerSelection = (item: typeof results[0]) => {
    if (!item) return;
    if (item.type === 'project') {
      onSelectProject(item.data);
    } else if (item.type === 'task') {
      onSelectTask(item.data);
    } else if (item.type === 'user') {
      onSelectUser(item.data);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 bg-slate-950/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.98 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] transition-colors"
      >
        {/* Search Header */}
        <div className="relative border-b border-slate-100 dark:border-slate-800 p-4 flex items-center">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleArrowNavigation}
            placeholder="Search tasks, projects, team members globally..."
            className="w-full bg-transparent border-none text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none text-sm font-medium"
          />
          <div className="flex items-center gap-1.5 ml-2">
            <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-mono text-slate-500 font-semibold shadow-sm flex items-center gap-0.5">
              <span>esc</span>
            </kbd>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 p-2 bg-slate-50/50 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800">
          {(['all', 'tasks', 'projects', 'team'] as FilterType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer capitalize ${
                filter === tab
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/10'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              {tab === 'all' ? 'All Results' : tab === 'team' ? 'Team' : tab}
            </button>
          ))}
        </div>

        {/* Search Results */}
        <div 
          ref={resultsContainerRef}
          className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[45vh]"
        >
          {isLoadingTasks && query === '' && (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span>Indexing global tasks...</span>
            </div>
          )}

          {!isLoadingTasks && results.length === 0 && (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center mb-1">
                <Search className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No matches found</p>
              <p className="text-xs">Try adjusting your keywords or active filters.</p>
            </div>
          )}

          {results.map((item, index) => {
            const isActive = index === selectedIndex;
            return (
              <div
                key={item.id}
                data-active={isActive}
                onClick={() => triggerSelection(item)}
                className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${
                  isActive 
                    ? 'bg-indigo-500/10 dark:bg-indigo-500/20 border-l-4 border-indigo-500 pl-2' 
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    item.type === 'task' 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                      : item.type === 'project' 
                        ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  }`}>
                    {item.type === 'task' && <CheckSquare className="w-5 h-5" />}
                    {item.type === 'project' && <Folder className="w-5 h-5" />}
                    {item.type === 'user' && <UserIcon className="w-5 h-5" />}
                  </div>
                  <div className="text-left">
                    <p className={`text-xs font-bold transition-all ${
                      isActive ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'
                    }`}>
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold line-clamp-1">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                {isActive && (
                  <motion.div 
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400"
                  >
                    <span>Jump</span>
                    <CornerDownLeft className="w-3.5 h-3.5" />
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>

        {/* Palette Footer */}
        <div className="bg-slate-50 dark:bg-slate-950/40 p-3 px-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-bold">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-sm text-[10px]">↑↓</span>
              <span>to navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-sm text-[10px]">enter</span>
              <span>to select</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-sm text-[10px]">esc</span>
              <span>to close</span>
            </span>
          </div>
          <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
            <Command className="w-3 h-3" />
            <span>TaskFlow Global Palette</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
