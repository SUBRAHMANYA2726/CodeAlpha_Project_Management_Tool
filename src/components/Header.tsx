import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Search, 
  Star, 
  Archive, 
  Plus, 
  CheckCheck,
  Moon,
  Sun,
  ShieldCheck,
  UserCheck,
  Keyboard
} from 'lucide-react';
import { Project, Notification, Task, User } from '../types.ts';
import { useToast } from './Toast.tsx';

interface HeaderProps {
  selectedProject: Project | null;
  onUpdateProject: (updates: Partial<Project>) => void;
  notifications: Notification[];
  onRefreshNotifications: () => void;
  tasks: Task[]; // used for global search filtering
  users: User[]; // used for global search filtering
  onSelectTask: (t: Task) => void; // allow clicking search result to open task details
  onCreateTask: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onToggleShortcutsHelp: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedProject,
  onUpdateProject,
  notifications,
  onRefreshNotifications,
  tasks,
  users,
  onSelectTask,
  onCreateTask,
  darkMode,
  onToggleDarkMode,
  onToggleShortcutsHelp,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  const { showSuccess, showError } = useToast();

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Global Search Filtering
  const filteredTasks = searchQuery 
    ? tasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.description.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const filteredUsers = searchQuery
    ? users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const handleMarkNotificationsRead = async () => {
    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        onRefreshNotifications();
        showSuccess('✅ All notifications cleared.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleFavorite = () => {
    if (!selectedProject) return;
    const nextState = !selectedProject.isFavorite;
    onUpdateProject({ isFavorite: nextState });
    showSuccess(nextState ? '✅ Project starred successfully.' : '✅ Project removed from favorites.');
  };

  const toggleArchive = () => {
    if (!selectedProject) return;
    const nextState = !selectedProject.isArchived;
    onUpdateProject({ isArchived: nextState });
    showSuccess(nextState ? '✅ Project archived successfully.' : '✅ Project restored from archives.');
  };

  // Close drawers when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.notifications-container')) {
        setShowNotifications(false);
      }
      if (!target.closest('.search-container')) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  return (
    <header className="sticky top-0 z-40 glass-header px-8 py-4 flex items-center justify-between select-none shadow-sm dark:text-white">
      
      {/* Title / Project Context Controls */}
      <div className="flex items-center gap-4 max-w-[40%]">
        {selectedProject ? (
          <div className="flex items-center gap-3 overflow-hidden">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 truncate tracking-tight">{selectedProject.name}</h2>
            
            {/* Quick Star Toggle */}
            <button
              onClick={toggleFavorite}
              className={`p-1.5 rounded-xl border hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer ${
                selectedProject.isFavorite 
                  ? 'text-amber-500 border-amber-200 bg-amber-50/50' 
                  : 'text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
              title={selectedProject.isFavorite ? 'Remove from favorites' : 'Mark as favorite'}
            >
              <Star className={`w-4.5 h-4.5 ${selectedProject.isFavorite ? 'fill-amber-500' : ''}`} />
            </button>

            {/* Quick Archive Toggle */}
            <button
              onClick={toggleArchive}
              className={`p-1.5 rounded-xl border hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer ${
                selectedProject.isArchived 
                  ? 'text-indigo-500 border-indigo-200 bg-indigo-50/50' 
                  : 'text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
              title={selectedProject.isArchived ? 'Restore project' : 'Archive project'}
            >
              <Archive className="w-4.5 h-4.5" />
            </button>
          </div>
        ) : (
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">System Overview</h2>
        )}
      </div>

      {/* Center and Right controls */}
      <div className="flex items-center gap-4 flex-grow justify-end">
        
        {/* Dynamic Global Search */}
        <div className="relative max-w-sm w-full search-container hidden md:block">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              placeholder="Search tasks or members..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 hover:bg-slate-100/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
            />
          </div>

          {/* Search Results Dropdown Overlay */}
          {showSearchResults && searchQuery && (
            <div className="absolute top-12 left-0 right-0 bg-white border border-slate-100 shadow-2xl rounded-2xl p-4 max-h-96 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Search Results</p>
              
              {filteredTasks.length === 0 && filteredUsers.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4 font-medium">No matches found for "{searchQuery}"</p>
              ) : (
                <div className="space-y-4">
                  {/* Matching Tasks */}
                  {filteredTasks.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-indigo-500 mb-1.5 uppercase tracking-wider">Matching Tasks ({filteredTasks.length})</p>
                      <div className="space-y-1">
                        {filteredTasks.map(t => (
                          <button
                            key={t.id}
                            onClick={() => {
                              onSelectTask(t);
                              setSearchQuery('');
                              setShowSearchResults(false);
                            }}
                            className="w-full text-left p-2 hover:bg-slate-50 rounded-xl transition-all flex items-center justify-between text-sm cursor-pointer"
                          >
                            <span className="font-semibold text-slate-700 truncate mr-2">{t.title}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              t.priority === 'high' ? 'bg-rose-50 text-rose-600' :
                              t.priority === 'medium' ? 'bg-amber-50 text-amber-600' :
                              'bg-slate-50 text-slate-600'
                            }`}>{t.priority}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Members */}
                  {filteredUsers.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-violet-500 mb-1.5 uppercase tracking-wider">Matching Members ({filteredUsers.length})</p>
                      <div className="space-y-1">
                        {filteredUsers.map(u => (
                          <div
                            key={u.id}
                            className="p-2 flex items-center gap-2.5 text-sm"
                          >
                            <div 
                              className="w-7 h-7 rounded-lg text-white flex items-center justify-center font-bold text-xs"
                              style={{ backgroundColor: u.avatarColor }}
                            >
                              {u.name[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{u.name}</p>
                              <p className="text-[11px] text-slate-500 font-mono">{u.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Create Task Action Button */}
        {selectedProject && !selectedProject.isArchived && (
          <button
            onClick={onCreateTask}
            className="px-4 py-2 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:opacity-95 shadow-md shadow-indigo-600/10 flex items-center gap-1.5 cursor-pointer transition-opacity"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        )}

        {/* Notifications Icon with Indicator */}
        <div className="relative notifications-container">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              onRefreshNotifications();
            }}
            className={`p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50/50 transition-all cursor-pointer relative ${
              showNotifications ? 'bg-slate-50 border-slate-300' : ''
            }`}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-black text-white flex items-center justify-center animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {showNotifications && (
            <div className="absolute right-0 top-12 bg-white border border-slate-100 shadow-2xl rounded-2xl w-80 max-h-96 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <p className="font-bold text-slate-950 text-sm">Notifications</p>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkNotificationsRead}
                    className="text-xs text-indigo-600 hover:text-indigo-500 transition-colors font-bold flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> Clear all
                  </button>
                )}
              </div>

              <div className="overflow-y-auto max-h-72 divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8 font-medium">All caught up! No notifications.</p>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id}
                      className={`p-4 hover:bg-slate-50/50 transition-colors ${!n.isRead ? 'bg-indigo-50/20' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold text-slate-900 leading-tight">{n.title}</p>
                        <span className="text-[9px] text-slate-400 font-medium">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-snug font-medium">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Keyboard Shortcuts Guide Button */}
        <button
          onClick={onToggleShortcutsHelp}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all cursor-pointer flex items-center justify-center"
          title="Keyboard Shortcuts (Press ?)"
        >
          <Keyboard className="w-5 h-5" />
        </button>

      </div>
    </header>
  );
};
