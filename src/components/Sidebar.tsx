import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Kanban, 
  CalendarRange, 
  CalendarDays, 
  MessageSquare, 
  FolderGit, 
  FileLock, 
  LogOut, 
  FolderPlus,
  Star,
  Archive,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Project, User } from '../types.ts';

interface SidebarProps {
  projects: Project[];
  selectedProject: Project | null;
  onSelectProject: (p: Project) => void;
  currentView: string;
  onSelectView: (v: string) => void;
  currentUser: User;
  onLogout: () => void;
  onCreateProject: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  projects,
  selectedProject,
  onSelectProject,
  currentView,
  onSelectView,
  currentUser,
  onLogout,
  onCreateProject,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const activeProjects = projects.filter(p => !p.isArchived);
  const archivedProjects = projects.filter(p => p.isArchived);
  const favoriteProjects = activeProjects.filter(p => p.isFavorite);

  const mainTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'board', label: 'Kanban Board', icon: Kanban },
    { id: 'timeline', label: 'Timeline View', icon: CalendarRange },
    { id: 'calendar', label: 'Calendar View', icon: CalendarDays },
    { id: 'chat', label: 'Team Discussions', icon: MessageSquare },
    { id: 'files', label: 'File Manager', icon: FolderGit },
    { id: 'ai-research', label: 'AI Research Lab', icon: Sparkles },
  ];

  if (currentUser.role === 'admin') {
    mainTabs.push({ id: 'admin', label: 'Admin Console', icon: FileLock });
  }

  return (
    <div 
      className={`relative h-screen glass-sidebar text-white flex flex-col transition-all duration-300 ease-in-out select-none flex-shrink-0 z-20 ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* Collapse Trigger Button */}
      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-6 -right-3 w-6 h-6 rounded-full bg-indigo-900/80 border border-indigo-700/50 text-white flex items-center justify-center hover:bg-indigo-950 transition-colors cursor-pointer z-50 shadow-md"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Brand Header */}
      <div className="p-6 border-b border-white/10 flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white flex items-center justify-center font-extrabold text-xl shadow-md">
          TF
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="font-extrabold text-lg tracking-tight leading-none">TaskFlow Pro</h1>
            <p className="text-[10px] text-indigo-200 mt-1 uppercase font-bold tracking-wider">Workspace Alpha</p>
          </div>
        )}
      </div>

      {/* View Tabs */}
      <div className="px-3 py-4 flex-grow overflow-y-auto space-y-6">
        <div className="space-y-1">
          {!collapsed && <p className="px-3 text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-2">Workspace Navigation</p>}
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectView(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-white/20 text-white shadow-lg border border-white/20 backdrop-blur-md' 
                    : 'text-indigo-100 hover:bg-white/10 hover:text-white'
                }`}
                title={collapsed ? tab.label : undefined}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-cyan-300' : 'text-indigo-200'}`} />
                {!collapsed && <span>{tab.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Selected Project Details (Compact summary inline) */}
        {!collapsed && selectedProject && (
          <div className="px-3 py-3 bg-white/10 rounded-2xl border border-white/20 shadow-sm backdrop-blur-md mx-1">
            <p className="text-[10px] font-bold text-cyan-300 uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Active Project
            </p>
            <h4 className="font-bold text-sm text-white truncate">{selectedProject.name}</h4>
            <p className="text-[11px] text-indigo-100 line-clamp-2 mt-1 leading-normal font-medium">{selectedProject.description}</p>
          </div>
        )}

        {/* Projects Segment */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-3">
            {!collapsed && <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Active Projects</p>}
            <button 
              onClick={onCreateProject}
              className="text-indigo-200 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-lg cursor-pointer"
              title="Create New Project"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            {activeProjects.map((p) => {
              const isSelected = selectedProject?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => onSelectProject(p)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-white/10 text-white border-l-4 border-cyan-400 pl-2 rounded-l-none' 
                      : 'text-indigo-100 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden pr-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.isFavorite ? 'bg-amber-400' : 'bg-indigo-300'}`} />
                    {!collapsed && <span className="truncate">{p.name}</span>}
                  </div>
                  {!collapsed && p.isFavorite && <Star className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 fill-amber-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Favorite Projects Segment */}
        {!collapsed && favoriteProjects.length > 0 && (
          <div className="space-y-1.5">
            <p className="px-3 text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Starred</p>
            {favoriteProjects.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelectProject(p)}
                className="w-full flex items-center gap-2 px-3 py-1 text-xs font-semibold text-indigo-100 hover:text-white transition-colors text-left"
              >
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="truncate">{p.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Archived Segment */}
        {!collapsed && archivedProjects.length > 0 && (
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Archived</p>
            {archivedProjects.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelectProject(p)}
                className="w-full flex items-center justify-between px-3 py-1 text-xs font-semibold text-indigo-300 hover:text-indigo-100 transition-colors text-left"
              >
                <span className="truncate max-w-[80%]">{p.name}</span>
                <Archive className="w-3 h-3 text-indigo-300" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* User Session Footer */}
      <div className="p-4 border-t border-white/10 bg-indigo-950/20">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <div 
              className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-sm text-white shadow-md border border-white/10"
              style={{ backgroundColor: currentUser.avatarColor }}
            >
              {currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <h4 className="font-bold text-sm truncate leading-tight">{currentUser.name}</h4>
                <p className="text-[10px] text-indigo-200 truncate font-semibold uppercase tracking-wider">{currentUser.role}</p>
              </div>
            )}
          </div>
          <button 
            onClick={onLogout}
            className="p-2 text-indigo-200 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
            title="Log out of session"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
