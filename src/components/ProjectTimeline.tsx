import React, { useState } from 'react';
import { CalendarRange, Milestone, Layers, Clock } from 'lucide-react';
import { Task } from '../types.ts';

interface ProjectTimelineProps {
  tasks: Task[];
  onSelectTask: (t: Task) => void;
}

export const ProjectTimeline: React.FC<ProjectTimelineProps> = ({ tasks, onSelectTask }) => {
  const [timelineSpan, setTimelineSpan] = useState<'days' | 'months'>('days');

  // Filter for tasks with valid due dates
  const timedTasks = tasks.filter(t => t.dueDate);

  // Generate day array starting from today for 15 days
  const today = new Date();
  const timelineDays: Date[] = [];
  for (let i = -2; i < 13; i++) {
    const temp = new Date(today);
    temp.setDate(today.getDate() + i);
    timelineDays.push(temp);
  }

  const getTaskGridPlacement = (task: Task) => {
    if (!task.dueDate) return null;
    const taskDue = new Date(task.dueDate);
    const taskStart = new Date(task.createdAt);

    // Find indices on our timeline list
    const startIndex = timelineDays.findIndex(d => d.getDate() === taskStart.getDate() && d.getMonth() === taskStart.getMonth());
    const endIndex = timelineDays.findIndex(d => d.getDate() === taskDue.getDate() && d.getMonth() === taskDue.getMonth());

    const start = startIndex > -1 ? startIndex : 0;
    const end = endIndex > -1 ? endIndex : timelineDays.length - 1;

    // Safety check: ensure end >= start
    const span = Math.max(1, end - start + 1);

    return { startCol: start + 2, colSpan: span }; // Col 1 is the task title sidebar
  };

  return (
    <div className="glass-panel shadow-lg rounded-3xl p-6 select-none space-y-6">
      
      {/* Title Segment */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100/50 dark:border-slate-800/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <CalendarRange className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">Project Gantt Timeline</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Operational roadmap and milestone dependencies.</p>
          </div>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setTimelineSpan('days')}
            className={`px-3 py-1 text-xs font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
              timelineSpan === 'days' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'
            }`}
          >
            2-Week View
          </button>
        </div>
      </div>

      {/* Grid Layout Container */}
      {timedTasks.length === 0 ? (
        <div className="py-12 text-center text-slate-400 max-w-md mx-auto space-y-2">
          <Milestone className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Scheduled Tasks Detected</p>
          <p className="text-xs">Timeline plotting requires due dates. Open the Kanban board, click a task card, and assign a deadline to map its operational timeline.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-100/30 dark:border-slate-800/60 rounded-2xl bg-slate-50/10">
          <div className="min-w-[1000px] divide-y divide-slate-100/30 dark:divide-slate-800/60">
            
            {/* Timeline Day Header Row */}
            <div className="grid grid-cols-16 bg-slate-50/40 dark:bg-slate-900/40 py-3.5 px-4 font-black text-[10px] text-slate-400 uppercase tracking-widest text-center items-center">
              <div className="col-span-3 text-left pl-2">Task Title</div>
              {timelineDays.map((date, idx) => {
                const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth();
                return (
                  <div key={idx} className={`col-span-1 flex flex-col items-center justify-center ${isToday ? 'text-indigo-600 dark:text-indigo-400 font-black' : ''}`}>
                    <span>{date.toLocaleDateString([], { weekday: 'short' })[0]}</span>
                    <span className={`text-[12px] mt-0.5 leading-none ${isToday ? 'bg-indigo-100 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded-md font-black' : ''}`}>{date.getDate()}</span>
                  </div>
                );
              })}
            </div>

            {/* Timed Task Bars Rows */}
            <div className="divide-y divide-slate-100/30 dark:divide-slate-800/60">
              {timedTasks.map(task => {
                const placement = getTaskGridPlacement(task);
                if (!placement) return null;

                return (
                  <div key={task.id} className="grid grid-cols-16 py-4 px-4 items-center group hover:bg-slate-50/10 dark:hover:bg-slate-800/20 transition-colors">
                    {/* Task Title Selector Sidebar (Col 1 to 3) */}
                    <div className="col-span-3 text-left pl-2">
                      <button
                        onClick={() => onSelectTask(task)}
                        className="font-bold text-slate-800 dark:text-slate-200 text-xs hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left truncate max-w-xs cursor-pointer block"
                        title={task.title}
                      >
                        {task.title}
                      </button>
                      <span className={`text-[9px] font-bold uppercase tracking-wider block mt-1 ${
                        task.priority === 'high' ? 'text-rose-500' :
                        task.priority === 'medium' ? 'text-amber-500' :
                        'text-slate-400 dark:text-slate-500'
                      }`}>
                        {task.priority} Priority
                      </span>
                    </div>

                    {/* Timeline plotted bars (Col 4 to 16) */}
                    <div className="col-span-13 relative h-8 flex items-center">
                      <button
                        onClick={() => onSelectTask(task)}
                        className={`absolute h-6 rounded-lg shadow-sm border text-[10px] font-black text-white px-3 flex items-center justify-between truncate cursor-pointer select-none transition-transform hover:scale-[1.01] ${
                          task.priority === 'high' ? 'bg-gradient-to-r from-rose-500 to-rose-600 border-rose-400 shadow-rose-500/10' :
                          task.priority === 'medium' ? 'bg-gradient-to-r from-amber-500 to-amber-600 border-amber-400 shadow-amber-500/10' :
                          'bg-gradient-to-r from-indigo-500 to-indigo-600 border-indigo-400 shadow-indigo-500/10'
                        }`}
                        style={{
                          left: `${((placement.startCol - 2) / 15) * 100}%`,
                          width: `${(placement.colSpan / 15) * 100}%`,
                          minWidth: '50px'
                        }}
                      >
                        <span className="truncate pr-1">{task.title}</span>
                        <span className="text-[8px] bg-black/10 px-1 py-0.5 rounded flex-shrink-0">
                          {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
