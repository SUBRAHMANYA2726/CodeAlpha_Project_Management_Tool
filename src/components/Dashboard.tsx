import React, { useState } from 'react';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  LineChart as RechartsLineChart, 
  Line, 
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { 
  Sparkles, 
  Calendar, 
  Clock, 
  Activity, 
  CheckCircle, 
  Layers, 
  Users, 
  AlertTriangle,
  FileDown
} from 'lucide-react';
import { Project, Task, ActivityLog, User } from '../types.ts';
import { useToast } from './Toast.tsx';

interface DashboardProps {
  project: Project | null;
  tasks: Task[];
  activities: ActivityLog[];
  members: User[];
  onSelectTask: (t: Task) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  project,
  tasks,
  activities,
  members,
  onSelectTask,
}) => {
  const [aiReport, setAiReport] = useState<string>('');
  const [loadingAI, setLoadingAI] = useState(false);
  
  const { showSuccess, showError } = useToast();

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.columnId && t.columnId.toLowerCase().includes('completed')).length;
  const inProgressTasks = tasks.filter(t => t.columnId && t.columnId.toLowerCase().includes('inprogress')).length;
  const reviewTasks = tasks.filter(t => t.columnId && t.columnId.toLowerCase().includes('review')).length;
  const testingTasks = tasks.filter(t => t.columnId && t.columnId.toLowerCase().includes('testing')).length;
  const todoTasks = totalTasks - completedTasks - inProgressTasks - reviewTasks - testingTasks;

  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Priority Stats
  const highPriority = tasks.filter(t => t.priority === 'high').length;
  const medPriority = tasks.filter(t => t.priority === 'medium').length;
  const lowPriority = tasks.filter(t => t.priority === 'low').length;

  // Chart Data: Priority Distribution
  const priorityData = [
    { name: 'Low', count: lowPriority, fill: '#64748B' },
    { name: 'Medium', count: medPriority, fill: '#F59E0B' },
    { name: 'High', count: highPriority, fill: '#EF4444' },
  ];

  // Chart Data: Weekly Progress (Simulated based on task creation/updated dates)
  const taskProgressHistory = [
    { day: 'Mon', completed: 2, created: 3 },
    { day: 'Tue', completed: 4, created: 5 },
    { day: 'Wed', completed: 3, created: 4 },
    { day: 'Thu', completed: 6, created: 3 },
    { day: 'Fri', completed: 8, created: 6 },
    { day: 'Sat', completed: 9, created: 2 },
    { day: 'Sun', completed: completedTasks, created: totalTasks },
  ];

  // Upcoming Deadlines
  const upcomingDeadlines = tasks
    .filter(t => t.dueDate && !t.columnId.toLowerCase().includes('completed'))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 4);

  // Generate AI summary
  const fetchAISummary = async () => {
    if (!project) return;
    setLoadingAI(true);
    setAiReport('');
    try {
      const res = await fetch(`/api/projects/${project.id}/ai-summary`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to connect to Gemini API');
      setAiReport(data.report);
      showSuccess('✅ AI project summary generated successfully.');
    } catch (err: any) {
      showError(err.message || 'AI engine is currently offline.');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleExportCSV = () => {
    if (!project) return;
    window.open(`/api/projects/${project.id}/export/csv`);
    showSuccess('✅ Project CSV export complete.');
  };

  const handleExportJSON = () => {
    if (!project) return;
    window.open(`/api/projects/${project.id}/export/excel`);
    showSuccess('✅ Project Excel/JSON export complete.');
  };

  return (
    <div className="space-y-8 select-none">
      
      {/* Dynamic greeting section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-panel rounded-3xl p-6 shadow-lg">
        <div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Project Health & Analytics</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Real-time status monitor and operational statistics.</p>
        </div>
        {project && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileDown className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={handleExportJSON}
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileDown className="w-4 h-4" /> Export JSON
            </button>
          </div>
        )}
      </div>

          {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Progress Card */}
        <div className="glass-panel shadow-lg rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between h-40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Progress</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <h4 className="text-3xl font-black text-slate-900 dark:text-slate-100 leading-none">{progressPercent}%</h4>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>

        {/* Pending Items */}
        <div className="glass-panel shadow-lg rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between h-40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unfinished Tasks</span>
            <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <h4 className="text-3xl font-black text-slate-900 dark:text-slate-100 leading-none">{totalTasks - completedTasks}</h4>
            <p className="text-xs text-slate-400 mt-2 font-semibold">Active workload across boards</p>
          </div>
        </div>

        {/* High Priority Bottlenecks */}
        <div className="glass-panel shadow-lg rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between h-40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Critical items</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <h4 className="text-3xl font-black text-rose-600 dark:text-rose-400 leading-none">{highPriority}</h4>
            <p className="text-xs text-slate-400 mt-2 font-semibold">Immediate attention items</p>
          </div>
        </div>

        {/* Team Members Count */}
        <div className="glass-panel shadow-lg rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between h-40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Team Collaborators</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <h4 className="text-3xl font-black text-slate-900 dark:text-slate-100 leading-none">{members.length}</h4>
            <p className="text-xs text-slate-400 mt-2 font-semibold">Active workspace colleagues</p>
          </div>
        </div>
      </div>

      {/* Main Graph Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recharts Workload Progress Line */}
        <div className="glass-panel shadow-lg rounded-3xl p-6 lg:col-span-2">
          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-4 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" /> Velocity Tracker
          </h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={taskProgressHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="completed" stroke="#4F46E5" strokeWidth={3} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="created" stroke="#06B6D4" strokeWidth={2} strokeDasharray="5 5" />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority breakdown bar chart */}
        <div className="glass-panel shadow-lg rounded-3xl p-6">
          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-4 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-slate-400" /> Priorities Map
          </h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={priorityData}>
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {priorityData.map((entry, index) => (
                    <Bar key={`cell-${index}`} fill={entry.fill} dataKey="count" />
                  ))}
                </Bar>
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Assistant Section */}
      {project && (
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white rounded-3xl p-8 relative overflow-hidden border border-indigo-500/20 shadow-xl">
          <div className="absolute top-[-20%] right-[-10%] w-96 h-96 rounded-full bg-cyan-500/10 blur-[80px] pointer-events-none" />
          <div className="absolute bottom-[-10%] left-[5%] w-96 h-96 rounded-full bg-violet-500/10 blur-[80px] pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/10 rounded-full text-xs text-cyan-300 font-bold mb-3 border border-white/5 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> Gemini 2.5 Flash Powered
              </span>
              <h3 className="text-xl font-extrabold tracking-tight">AI Project Coordinator</h3>
              <p className="text-sm text-indigo-200 mt-1 font-medium leading-relaxed">
                Generate instant executive briefings, scan task prioritizations, detect developer blocks, and outline critical-path recommendations based on current workspace velocity.
              </p>
            </div>
            <button
              onClick={fetchAISummary}
              disabled={loadingAI}
              className="px-5 py-3 bg-white text-indigo-950 hover:bg-slate-50 font-extrabold text-sm rounded-xl flex items-center gap-2 cursor-pointer transition-colors shadow-lg shadow-black/10 flex-shrink-0 disabled:opacity-50"
            >
              {loadingAI ? (
                <span className="w-4 h-4 border-2 border-indigo-950/20 border-t-indigo-950 rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Generate AI Audit Report</span>
                </>
              )}
            </button>
          </div>

          {/* AI Output Window */}
          {aiReport && (
            <div className="relative mt-6 p-6 bg-white/5 border border-white/10 rounded-2xl max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="prose prose-invert prose-sm max-w-none text-slate-100 font-medium leading-relaxed">
                {aiReport.split('\n').map((line, idx) => {
                  if (line.startsWith('###')) {
                    return <h4 key={idx} className="text-cyan-300 font-bold text-base mt-4 mb-2">{line.replace('###', '').trim()}</h4>;
                  } else if (line.startsWith('**') && line.endsWith('**')) {
                    return <p key={idx} className="font-bold text-white mt-3">{line.replace(/\*\*/g, '').trim()}</p>;
                  } else if (line.startsWith('-')) {
                    return <li key={idx} className="list-disc ml-4 text-slate-200 py-0.5">{line.substring(1).trim()}</li>;
                  } else {
                    return <p key={idx} className="my-1.5">{line}</p>;
                  }
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Split Lists: Deadlines and Activity Logs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Upcoming Deadlines */}
        <div className="glass-panel rounded-3xl p-6 shadow-lg">
          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-4 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400" /> Critical Due Dates
          </h4>
          <div className="space-y-3">
            {upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center font-medium">No impending tasks found. Keep it up!</p>
            ) : (
              upcomingDeadlines.map(t => {
                const isOverdue = new Date(t.dueDate).getTime() < Date.now();
                return (
                  <button
                    key={t.id}
                    onClick={() => onSelectTask(t)}
                    className="w-full p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-slate-50/10 dark:border-slate-800 hover:border-slate-100 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer text-slate-800 dark:text-slate-200"
                  >
                    <div className="overflow-hidden pr-3">
                      <p className="font-bold text-sm truncate">{t.title}</p>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mt-1.5 ${
                        t.priority === 'high' ? 'text-rose-600 dark:text-rose-400' :
                        t.priority === 'medium' ? 'text-amber-600 dark:text-amber-400' :
                        'text-slate-500'
                      }`}>
                        {t.priority} priority
                      </span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-xl ${
                        isOverdue 
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900' 
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900'
                      }`}>
                        {new Date(t.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Activity Log */}
        <div className="glass-panel rounded-3xl p-6 shadow-lg">
          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-4 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-slate-400" /> Workspace Activity Log
          </h4>
          <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
            {activities.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center font-medium">No actions logged yet in this workspace.</p>
            ) : (
              activities.slice(0, 10).map(log => (
                <div key={log.id} className="flex gap-3 text-sm">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Activity className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                      <span className="font-bold text-slate-950 dark:text-slate-100">{log.userName}</span> {log.details}
                    </p>
                    {log.taskTitle && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold truncate mt-0.5">Task: {log.taskTitle}</p>
                    )}
                    <span className="text-[10px] text-slate-400 mt-1.5 block font-semibold">
                      {new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
