import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Task } from '../types.ts';

interface CalendarViewProps {
  tasks: Task[];
  onSelectTask: (t: Task) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onSelectTask }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mode, setMode] = useState<'month' | 'week' | 'day'>('month');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper: Get days in month
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  // Helper: Get day of week for first day (0 = Sunday, 6 = Saturday)
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);

  // Generate day array
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null); // padding for preceding month
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Filter tasks with deadlines this month
  const getTasksForDay = (day: number) => {
    return tasks.filter(t => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  return (
    <div className="glass-panel shadow-lg rounded-3xl p-6 select-none space-y-6">
      
      {/* Calendar Header with Navigation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100/50 dark:border-slate-800/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">Deadlines Calendar</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">{monthNames[month]} {year}</p>
          </div>
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {(['month', 'week', 'day'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 text-xs font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                  mode === m ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5">
            <button onClick={prevMonth} className="p-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer">
              <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </button>
            <button onClick={nextMonth} className="p-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer">
              <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Month View Grid Rendering */}
      {mode === 'month' && (
        <div className="space-y-1">
          {/* Weekday Labels */}
          <div className="grid grid-cols-7 text-center font-black text-xs text-slate-400 uppercase tracking-widest py-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Month Cell Grid */}
          <div className="grid grid-cols-7 gap-2 bg-slate-50/10 dark:bg-slate-950/20 p-2 border border-slate-100/30 dark:border-slate-800/60 rounded-2xl">
            {days.map((day, idx) => {
              const dayTasks = day ? getTasksForDay(day) : [];
              const isToday = day && 
                new Date().getDate() === day && 
                new Date().getMonth() === month && 
                new Date().getFullYear() === year;

              return (
                <div
                  key={idx}
                  className={`min-h-24 glass-card rounded-xl p-2 flex flex-col justify-between transition-all group ${
                    day === null ? 'opacity-20 bg-slate-50/10 pointer-events-none' : ''
                  } ${isToday ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                >
                  <span className={`text-xs font-bold leading-none ${
                    isToday ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 rounded-md' : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    {day}
                  </span>

                  {/* Cell Tasks List */}
                  <div className="mt-2 space-y-1 flex-grow overflow-y-auto max-h-16 scrollbar-none">
                    {dayTasks.map(task => (
                      <button
                        key={task.id}
                        onClick={() => onSelectTask(task)}
                        className={`w-full text-left truncate text-[10px] font-bold px-1.5 py-0.5 rounded-md border text-slate-700 hover:scale-95 transition-all cursor-pointer ${
                          task.priority === 'high' ? 'bg-rose-50 border-rose-100 text-rose-700' :
                          task.priority === 'medium' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                          'bg-indigo-50 border-indigo-100 text-indigo-700'
                        }`}
                        title={task.title}
                      >
                        {task.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {mode === 'week' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400 font-semibold italic text-center">Week-view focus mode active. Showing tasks scheduled for the following dates:</p>
          <div className="grid grid-cols-7 gap-4">
            {[0, 1, 2, 3, 4, 5, 6].map(offset => {
              // Get date starting from current date minus its dayOfWeek
              const temp = new Date(currentDate);
              const dayOfWeek = temp.getDay();
              temp.setDate(temp.getDate() - dayOfWeek + offset);
              
              const dayLabel = temp.toLocaleDateString([], { weekday: 'short' });
              const dateVal = temp.getDate();
              
              const dayTasks = tasks.filter(t => {
                if (!t.dueDate) return false;
                const d = new Date(t.dueDate);
                return d.getDate() === temp.getDate() && d.getMonth() === temp.getMonth() && d.getFullYear() === temp.getFullYear();
              });

              return (
                <div key={offset} className="bg-slate-50/40 dark:bg-slate-900/40 p-4 rounded-2xl min-h-60 border border-slate-100/50 dark:border-slate-800/60 flex flex-col">
                  <div className="text-center border-b border-slate-200/50 dark:border-slate-800/50 pb-2 mb-3">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{dayLabel}</p>
                    <p className="text-lg font-black text-slate-800 dark:text-slate-100">{dateVal}</p>
                  </div>

                  <div className="flex-grow space-y-2 overflow-y-auto max-h-48 scrollbar-none">
                    {dayTasks.length === 0 ? (
                      <p className="text-[10px] text-slate-400 text-center py-4 font-semibold italic">Clear day</p>
                    ) : (
                      dayTasks.map(t => (
                        <button
                          key={t.id}
                          onClick={() => onSelectTask(t)}
                          className="w-full text-left p-2.5 glass-card border border-white/20 dark:border-slate-800/50 rounded-xl hover:shadow-sm transition-all text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          <p className="truncate">{t.title}</p>
                          <span className="text-[9px] text-slate-400 font-semibold block mt-1">{t.priority}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day View */}
      {mode === 'day' && (
        <div className="max-w-2xl mx-auto space-y-4">
          <p className="text-xs text-slate-400 font-semibold text-center uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
            <Clock className="w-4 h-4 text-slate-400 animate-pulse" /> Focus timeline for: {currentDate.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <div className="bg-slate-50/40 dark:bg-slate-900/40 border border-slate-100/50 dark:border-slate-800/60 rounded-2xl p-6 space-y-4">
            {tasks.filter(t => {
              if (!t.dueDate) return false;
              const d = new Date(t.dueDate);
              return d.getDate() === currentDate.getDate() && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
            }).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8 font-semibold italic">Zero critical milestone deadlines scheduled for today.</p>
            ) : (
              tasks.filter(t => {
                if (!t.dueDate) return false;
                const d = new Date(t.dueDate);
                return d.getDate() === currentDate.getDate() && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
              }).map(t => (
                <div
                  key={t.id}
                  onClick={() => onSelectTask(t)}
                  className="glass-card p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-snug">{t.title}</h5>
                    <p className="text-xs text-slate-400 mt-1 leading-normal truncate max-w-md font-medium">{t.description}</p>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl ${
                    t.priority === 'high' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                    t.priority === 'medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                    'bg-slate-50 text-slate-600 border border-slate-100'
                  }`}>
                    {t.priority}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
};
