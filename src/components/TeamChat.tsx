import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Users, Sparkles, Smile } from 'lucide-react';
import { TeamMessage, User, Project } from '../types.ts';
import { useToast } from './Toast.tsx';

interface TeamChatProps {
  project: Project | null;
  currentUser: User;
  members: User[];
}

export const TeamChat: React.FC<TeamChatProps> = ({
  project,
  currentUser,
  members,
}) => {
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const { showSuccess, showError } = useToast();

  // Load chat messages
  const fetchMessages = async () => {
    if (!project) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/chat`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMessages();
    // Poll chat messages every 4 seconds for immediate real-time sync emulation
    const timer = setInterval(fetchMessages, 4000);
    return () => clearInterval(timer);
  }, [project]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !project) return;

    // Optimistic update
    const tempMsg: TeamMessage = {
      id: `temp_${Date.now()}`,
      projectId: project.id,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatarColor: currentUser.avatarColor,
      text: inputText.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    const originalText = inputText;
    setInputText('');

    try {
      const res = await fetch(`/api/projects/${project.id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ text: originalText.trim() }),
      });
      
      if (res.ok) {
        fetchMessages();
      } else {
        throw new Error('Message sending failed.');
      }
    } catch (err) {
      showError('Failed to send message.');
      setInputText(originalText);
    }
  };

  return (
    <div className="glass-panel shadow-lg rounded-3xl p-6 select-none h-[72vh] flex flex-col md:flex-row gap-6">
      
      {/* Main Chat Workspace (Left) */}
      <div className="flex-grow flex flex-col h-full overflow-hidden">
        
        {/* Chat Title bar */}
        <div className="flex items-center gap-3 border-b border-slate-100/50 dark:border-slate-800/50 pb-4 flex-shrink-0">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">Project Discussion Board</h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold leading-none mt-1">Direct team communication room for task coordinations.</p>
          </div>
        </div>

        {/* Message logs scrolling list */}
        <div className="flex-grow overflow-y-auto py-4 space-y-4 pr-1 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-8 space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-300 animate-pulse" />
              <p className="text-xs font-semibold text-slate-700">Discuss tasks with the team</p>
              <p className="text-[11px]">Type an update or post questions below to notify your collaborators.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isSelf = msg.userId === currentUser.id;
              return (
                <div 
                  key={msg.id}
                  className={`flex gap-3 text-xs max-w-[85%] ${isSelf ? 'ml-auto flex-row-reverse text-right' : ''}`}
                >
                  <div 
                    className="w-8 h-8 rounded-xl text-white font-black flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm border border-white/10"
                    style={{ backgroundColor: msg.userAvatarColor }}
                  >
                    {msg.userName[0].toUpperCase()}
                  </div>
                  <div>
                    <div className={`flex items-center gap-1.5 mb-1 ${isSelf ? 'justify-end' : ''}`}>
                      <span className="font-bold text-slate-950 dark:text-slate-100">{msg.userName}</span>
                      <span className="text-[9px] text-slate-400 font-semibold">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className={`p-3 rounded-2xl leading-relaxed text-left font-medium ${
                      isSelf 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-slate-50/60 dark:bg-slate-900/40 text-slate-800 dark:text-slate-200 border border-slate-100/50 dark:border-slate-800/60 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Message composer form footer */}
        <form onSubmit={handleSendMessage} className="border-t border-slate-100/50 dark:border-slate-800/50 pt-4 flex gap-2 flex-shrink-0">
          <input
            type="text"
            required
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message #discussion...`}
            className="flex-grow px-4 py-2.5 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100/50 dark:border-slate-800/60 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 font-medium"
          />
          <button
            type="submit"
            className="p-3 bg-indigo-600 text-white rounded-xl hover:opacity-95 shadow-md shadow-indigo-600/10 transition-opacity flex items-center justify-center cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>

      {/* Collaborators Active Sidebar (Right) */}
      <div className="w-full md:w-56 border-t md:border-t-0 md:border-l border-slate-100/50 dark:border-slate-800/50 pt-4 md:pt-0 md:pl-6 flex-shrink-0 flex flex-col h-full">
        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-widest flex items-center gap-1.5 mb-4">
          <Users className="w-4 h-4 text-slate-400" /> Active Members
        </h4>

        <div className="space-y-3 overflow-y-auto flex-grow pr-1">
          {members.map(usr => {
            const isOnline = true; // Emulate active status
            return (
              <div key={usr.id} className="flex items-center justify-between p-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 rounded-xl text-xs">
                <div className="flex items-center gap-2.5">
                  <div 
                    className="w-7 h-7 rounded-lg text-white font-black flex items-center justify-center text-xs shadow-sm"
                    style={{ backgroundColor: usr.avatarColor }}
                  >
                    {usr.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{usr.name}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">{usr.role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] text-slate-400 font-bold uppercase">Online</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
