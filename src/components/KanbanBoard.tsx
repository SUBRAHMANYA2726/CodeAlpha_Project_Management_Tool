import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  CheckSquare, 
  MessageSquare, 
  Star, 
  UserPlus, 
  Sparkles, 
  X, 
  Smile, 
  Tag,
  Paperclip,
  CheckCheck,
  Lock,
  GitBranch,
  RefreshCw,
  Mic,
  Square,
  Play,
  Volume2,
  Pause,
  Trash
} from 'lucide-react';
import { Column, Task, User, Comment, Subtask, ChecklistItem, Project } from '../types.ts';
import { useToast } from './Toast.tsx';
import { GroundedMarkdownRenderer } from './AIResearchLab.tsx';
import { Globe, ExternalLink } from 'lucide-react';

interface KanbanBoardProps {
  projectId: string;
  project?: Project | null;
  onUpdateProject?: (updates: Partial<Project>) => void;
  columns: Column[];
  tasks: Task[];
  users: User[];
  onRefreshTasks: () => void;
  onRefreshColumns: () => void;
  onRefreshActivities: () => void;
  initialActiveTask?: Task | null;
  onClearInitialActiveTask?: () => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  projectId,
  project = null,
  onUpdateProject,
  columns,
  tasks,
  users,
  onRefreshTasks,
  onRefreshColumns,
  onRefreshActivities,
  initialActiveTask,
  onClearInitialActiveTask,
}) => {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Synchronize initialActiveTask to activeTask state
  useEffect(() => {
    if (initialActiveTask) {
      setActiveTask(initialActiveTask);
      if (onClearInitialActiveTask) {
        onClearInitialActiveTask();
      }
    }
  }, [initialActiveTask, onClearInitialActiveTask]);

  const [activeComments, setActiveComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  
  // Quick adding states per column
  const [quickAddColumnId, setQuickAddColumnId] = useState<string | null>(null);
  const [quickTitle, setQuickTitle] = useState('');

  // Column operations
  const [newColName, setNewColName] = useState('');
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColName, setEditingColName] = useState('');

  // Drag over states
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedOverColumnId, setDraggedOverColumnId] = useState<string | null>(null);
  const [hasDropped, setHasDropped] = useState(false);

  // AI Suggestion states
  const [suggestedPriority, setSuggestedPriority] = useState<'low' | 'medium' | 'high' | null>(null);
  const [aiReasoning, setAiReasoning] = useState<string>('');
  const [loadingAI, setLoadingAI] = useState(false);

  // Grounded task research states
  const [researchingTask, setResearchingTask] = useState(false);
  const [researchGuide, setResearchGuide] = useState<any | null>(null);

  // Comment emoji selection states
  const [activeCommentEmojiId, setActiveCommentEmojiId] = useState<string | null>(null);

  // New subtask / checklist inputs inside modal
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newChecklistText, setNewChecklistText] = useState('');

  const { showSuccess, showError } = useToast();

  // Voice note recording states
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);

  // Start recording voice note
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: BlobPart[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };
      
      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
    } catch (err) {
      console.error('Failed to start recording:', err);
      showError('Could not access microphone.');
    }
  };

  // Stop recording voice note
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  // Cancel recording and reset
  const cancelRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    setIsRecording(false);
    setRecordedBlob(null);
    setAudioUrl(null);
    setRecordingSeconds(0);
  };

  // Recording timer increment
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Voice/Standard comment submission dispatcher
  const handlePostCommentWithVoice = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeTask) return;
    
    if (!recordedBlob) {
      if (!newCommentText.trim()) return;
      handleAddCommentStandard(newCommentText.trim());
      return;
    }

    try {
      setIsUploadingVoice(true);
      const reader = new FileReader();
      reader.readAsDataURL(recordedBlob);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        
        const uploadRes = await fetch('/api/attachments/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            name: `voice_note_${Date.now()}.webm`,
            type: 'audio/webm',
            size: `${(recordedBlob.size / 1024).toFixed(1)} KB`,
            fileData: base64data,
          }),
        });
        
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'Failed to upload audio file');
        }
        
        const voiceUrl = uploadData.attachment.url;
        
        const commentRes = await fetch(`/api/tasks/${activeTask.id}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            text: newCommentText.trim(),
            voiceUrl,
            voiceDuration: recordingSeconds,
          }),
        });
        
        const commentData = await commentRes.json();
        if (commentRes.ok) {
          setNewCommentText('');
          cancelRecording();
          fetchComments(activeTask.id);
          onRefreshTasks();
          onRefreshActivities();
          showSuccess('🎙️ Voice comment added successfully.');
        } else {
          throw new Error(commentData.error || 'Failed to post comment');
        }
        setIsUploadingVoice(false);
      };
    } catch (err: any) {
      console.error(err);
      showError(err.message || 'Failed to attach voice note.');
      setIsUploadingVoice(false);
    }
  };

  const handleAddCommentStandard = async (text: string) => {
    try {
      const res = await fetch(`/api/tasks/${activeTask.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewCommentText('');
        fetchComments(activeTask.id);
        onRefreshTasks();
        onRefreshActivities();
        showSuccess('✅ Comment added successfully.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Dependency operations
  const handleAddBlockedByRelationship = (blockerId: string) => {
    if (!activeTask) return;
    const current = activeTask.blockedBy || [];
    if (!current.includes(blockerId)) {
      updateTaskDetails({ blockedBy: [...current, blockerId] });
    }
  };

  const handleRemoveBlockedByRelationship = (blockerId: string) => {
    if (!activeTask) return;
    const current = activeTask.blockedBy || [];
    updateTaskDetails({ blockedBy: current.filter(id => id !== blockerId) });
  };

  const handleAddBlockRelationship = (blockedId: string) => {
    if (!activeTask) return;
    const current = activeTask.blocks || [];
    if (!current.includes(blockedId)) {
      updateTaskDetails({ blocks: [...current, blockedId] });
    }
  };

  const handleRemoveBlockRelationship = (blockedId: string) => {
    if (!activeTask) return;
    const current = activeTask.blocks || [];
    updateTaskDetails({ blocks: current.filter(id => id !== blockedId) });
  };

  // Label management state
  const [isManagingLabels, setIsManagingLabels] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#6366f1'); // Indigo default

  const AVAILABLE_COLORS = [
    '#6366f1', // Indigo
    '#f43f5e', // Rose
    '#f59e0b', // Amber
    '#0ea5e9', // Sky
    '#ec4899', // Pink
    '#10b981', // Emerald
    '#a855f7', // Purple
    '#6b7280', // Slate Gray
    '#ef4444', // Red
    '#eab308'  // Yellow
  ];

  const defaultLabels = [
    { name: 'Feature', color: '#6366f1' },
    { name: 'Bug', color: '#f43f5e' },
    { name: 'Urgent', color: '#f59e0b' },
    { name: 'Docs', color: '#0ea5e9' },
    { name: 'Design', color: '#ec4899' },
    { name: 'Refactor', color: '#10b981' }
  ];

  const getLabelColor = (name: string): string => {
    const match = project?.customLabels?.find(l => l.name.toLowerCase() === name.toLowerCase());
    if (match) return match.color;

    const defMatch = defaultLabels.find(l => l.name.toLowerCase() === name.toLowerCase());
    if (defMatch) return defMatch.color;

    // Hash name for color
    const colors = ['#6366f1', '#f43f5e', '#f59e0b', '#0ea5e9', '#ec4899', '#10b981', '#a855f7', '#6b7280'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Create custom label in project
  const handleCreateProjectLabel = async () => {
    if (!newLabelName.trim() || !project || !onUpdateProject) return;
    const nameTrimmed = newLabelName.trim();
    
    // Check if label already exists
    const currentLabels = project.customLabels || defaultLabels;
    if (currentLabels.some(l => l.name.toLowerCase() === nameTrimmed.toLowerCase())) {
      showError('A label with this name already exists.');
      return;
    }

    const updatedLabels = [...(project.customLabels || defaultLabels), { name: nameTrimmed, color: newLabelColor }];
    try {
      await onUpdateProject({ customLabels: updatedLabels });
      setNewLabelName('');
      showSuccess('✅ Label created successfully!');
    } catch (err: any) {
      showError('Failed to create custom label.');
    }
  };

  // Delete custom label from project
  const handleDeleteProjectLabel = async (labelNameToDelete: string) => {
    if (!project || !onUpdateProject) return;
    const currentLabels = project.customLabels || defaultLabels;
    const updatedLabels = currentLabels.filter(l => l.name.toLowerCase() !== labelNameToDelete.toLowerCase());
    try {
      await onUpdateProject({ customLabels: updatedLabels });
      showSuccess('✅ Label deleted successfully!');
    } catch (err: any) {
      showError('Failed to delete label.');
    }
  };

  const handleToggleTaskLabel = async (labelName: string) => {
    if (!activeTask) return;
    const exists = activeTask.labels.includes(labelName);
    const updatedLabels = exists 
      ? activeTask.labels.filter(l => l !== labelName)
      : [...activeTask.labels, labelName];
    
    updateTaskDetails({ labels: updatedLabels });
  };

  // Load comments for active task
  useEffect(() => {
    if (activeTask) {
      fetchComments(activeTask.id);
      setResearchGuide(null);
    }
  }, [activeTask]);

  const fetchComments = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok) {
        setActiveComments(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    setHasDropped(false);
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = async () => {
    if (draggedTaskId && draggedOverColumnId && hasDropped) {
      const taskToMove = tasks.find(t => t.id === draggedTaskId);
      if (taskToMove && taskToMove.columnId !== draggedOverColumnId) {
        try {
          const res = await fetch(`/api/tasks/${draggedTaskId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ columnId: draggedOverColumnId }),
          });
          
          const data = await res.json();
          if (res.ok) {
            onRefreshTasks();
            onRefreshActivities();
            showSuccess('✅ Task moved successfully.');
          } else {
            throw new Error(data.error);
          }
        } catch (err: any) {
          showError(err.message || 'Failed to update task location.');
        }
      }
    }
    setDraggedTaskId(null);
    setDraggedOverColumnId(null);
    setHasDropped(false);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggedOverColumnId !== columnId) {
      setDraggedOverColumnId(columnId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    setDraggedOverColumnId(targetColumnId);
    setHasDropped(true);
  };

  // Create Column
  const handleCreateColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/columns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name: newColName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        onRefreshColumns();
        setNewColName('');
        showSuccess('✅ Column created successfully.');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      showError(err.message);
    }
  };

  // Rename Column
  const handleRenameColumn = async (columnId: string) => {
    if (!editingColName.trim()) return;
    try {
      const res = await fetch(`/api/columns/${columnId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name: editingColName.trim() }),
      });
      if (res.ok) {
        onRefreshColumns();
        setEditingColumnId(null);
        showSuccess('✅ Column renamed successfully.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Column
  const handleDeleteColumn = async (columnId: string) => {
    try {
      const res = await fetch(`/api/columns/${columnId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        onRefreshColumns();
        onRefreshTasks();
        showSuccess('✅ Column deleted successfully.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Task Creation (Quick add bottom)
  const handleQuickAdd = async (columnId: string) => {
    if (!quickTitle.trim()) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ title: quickTitle.trim(), columnId }),
      });
      const data = await res.json();
      if (res.ok) {
        onRefreshTasks();
        onRefreshActivities();
        setQuickTitle('');
        setQuickAddColumnId(null);
        showSuccess('✅ Task created successfully.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Task Update Handler (inside modal)
  const updateTaskDetails = async (updates: Partial<Task>) => {
    if (!activeTask) return;
    // Optimistic update in modal UI
    const updated = { ...activeTask, ...updates };
    setActiveTask(updated as any);

    try {
      const res = await fetch(`/api/tasks/${activeTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        onRefreshTasks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        onRefreshTasks();
        onRefreshActivities();
        setActiveTask(null);
        showSuccess('✅ Task deleted successfully.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !activeTask) return;

    try {
      const res = await fetch(`/api/tasks/${activeTask.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ text: newCommentText.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewCommentText('');
        fetchComments(activeTask.id);
        onRefreshTasks();
        onRefreshActivities();
        showSuccess('✅ Comment added successfully.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Comment Reaction
  const handleAddReaction = async (commentId: string, emoji: string) => {
    if (!activeTask) return;
    try {
      const res = await fetch(`/api/comments/${commentId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ emoji }),
      });
      if (res.ok) {
        fetchComments(activeTask.id);
        setActiveCommentEmojiId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Subtask Management
  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim() || !activeTask) return;
    const newSub: Subtask = {
      id: `sub_${Date.now()}`,
      title: newSubtaskTitle.trim(),
      isCompleted: false,
    };
    const nextList = [...activeTask.subtasks, newSub];
    updateTaskDetails({ subtasks: nextList });
    setNewSubtaskTitle('');
    showSuccess('✅ Subtask added.');
  };

  const handleToggleSubtask = (subId: string) => {
    if (!activeTask) return;
    const nextList = activeTask.subtasks.map(s => s.id === subId ? { ...s, isCompleted: !s.isCompleted } : s);
    updateTaskDetails({ subtasks: nextList });
  };

  const handleRemoveSubtask = (subId: string) => {
    if (!activeTask) return;
    const nextList = activeTask.subtasks.filter(s => s.id !== subId);
    updateTaskDetails({ subtasks: nextList });
  };

  // Checklist Management
  const handleAddChecklist = () => {
    if (!newChecklistText.trim() || !activeTask) return;
    const newChk: ChecklistItem = {
      id: `chk_${Date.now()}`,
      text: newChecklistText.trim(),
      checked: false,
    };
    const nextList = [...activeTask.checklist, newChk];
    updateTaskDetails({ checklist: nextList });
    setNewChecklistText('');
    showSuccess('✅ Checklist item added.');
  };

  const handleToggleChecklist = (chkId: string) => {
    if (!activeTask) return;
    const nextList = activeTask.checklist.map(c => c.id === chkId ? { ...c, checked: !c.checked } : c);
    updateTaskDetails({ checklist: nextList });
  };

  const handleRemoveChecklist = (chkId: string) => {
    if (!activeTask) return;
    const nextList = activeTask.checklist.filter(c => c.id !== chkId);
    updateTaskDetails({ checklist: nextList });
  };

  // Toggle Assignee Membership on active task
  const handleToggleAssignee = (userId: string) => {
    if (!activeTask) return;
    const list = [...activeTask.assignees];
    const index = list.indexOf(userId);
    if (index > -1) {
      list.splice(index, 1);
      showSuccess('✅ Member unassigned successfully.');
    } else {
      list.push(userId);
      showSuccess('✅ Task assigned successfully.');
    }
    updateTaskDetails({ assignees: list });
  };

  // Gemini AI Suggestion Engine Call
  const handleFetchAISuggestion = async () => {
    if (!activeTask) return;
    setLoadingAI(true);
    setSuggestedPriority(null);
    setAiReasoning('');

    try {
      const res = await fetch('/api/ai/suggest-priority', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ title: activeTask.title, description: activeTask.description }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuggestedPriority(data.priority);
        setAiReasoning(data.reasoning);
        showSuccess('✅ AI Suggestion loaded.');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      showError(err.message || 'AI suggestor service failed.');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleApplyAIPriority = () => {
    if (suggestedPriority) {
      updateTaskDetails({ priority: suggestedPriority });
      setSuggestedPriority(null);
      setAiReasoning('');
      showSuccess(`✅ Applied ${suggestedPriority.toUpperCase()} priority suggestion.`);
    }
  };

  const handleFetchTaskResearch = async () => {
    if (!activeTask) return;
    setResearchingTask(true);
    try {
      const res = await fetch('/api/ai/research-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: activeTask.title,
          description: activeTask.description || ''
        })
      });
      const data = await res.json();
      if (res.ok) {
        setResearchGuide(data);
        showSuccess('✅ Grounded implementation guide loaded!');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      showError(err.message || 'Task research grounding failed.');
    } finally {
      setResearchingTask(false);
    }
  };

  return (
    <div className="space-y-6 select-none h-full flex flex-col">
      
      {/* Board Headers and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Kanban Workspace</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-semibold">Sprint board layout featuring drag-and-drop orchestration.</p>
        </div>

        {/* Add column quick form */}
        <form onSubmit={handleCreateColumn} className="flex gap-2">
          <input
            type="text"
            required
            placeholder="Add new list..."
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            className="px-4 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 font-medium w-40 sm:w-48 transition-all"
          />
          <button
            type="submit"
            className="p-2.5 bg-indigo-600 text-white rounded-xl hover:opacity-95 shadow-sm shadow-indigo-600/10 cursor-pointer flex items-center justify-center"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Board Layout Columns Scroll Area */}
      <div className="flex-grow overflow-x-auto pb-4 flex items-start gap-6 select-none scrollbar-thin">
        {columns.map((column) => {
          const colTasks = tasks.filter(t => t.columnId === column.id);
          const isQuickAdding = quickAddColumnId === column.id;
          const isDragTarget = draggedOverColumnId === column.id;

          return (
            <div
              key={column.id}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDrop={(e) => handleDrop(e, column.id)}
              className={`w-72 flex-shrink-0 glass-panel rounded-3xl p-4 flex flex-col max-h-[75vh] transition-all duration-200 ${
                isDragTarget ? 'border-dashed border-indigo-500 bg-indigo-50/10 scale-[1.01]' : 'border-slate-200/50'
              }`}
            >
              {/* Column Title and Operations Header */}
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                {editingColumnId === column.id ? (
                  <input
                    type="text"
                    value={editingColName}
                    onChange={(e) => setEditingColName(e.target.value)}
                    onBlur={() => handleRenameColumn(column.id)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRenameColumn(column.id)}
                    className="bg-white border rounded-lg px-2 py-0.5 text-xs text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                    autoFocus
                  />
                ) : (
                  <h4 
                    onClick={() => {
                      setEditingColumnId(column.id);
                      setEditingColName(column.name);
                    }}
                    className="font-black text-slate-900 text-xs uppercase tracking-widest cursor-pointer hover:text-indigo-600 truncate max-w-[70%]"
                  >
                    {column.name} <span className="text-[10px] text-slate-400 font-bold lowercase ml-1">({colTasks.length})</span>
                  </h4>
                )}

                <button
                  onClick={() => handleDeleteColumn(column.id)}
                  className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                  title="Remove Column"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Draggable Task List Container */}
              <div className="space-y-3 overflow-y-auto flex-grow pb-2 max-h-[50vh] scrollbar-none">
                {colTasks.length === 0 ? (
                  <div className="h-20 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center text-[10px] text-slate-400 dark:text-slate-500 font-semibold tracking-wider uppercase">
                    Empty Column
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const completedSubs = task.subtasks.filter(s => s.isCompleted).length;
                    const totalSubs = task.subtasks.length;
                    const completedChks = task.checklist.filter(c => c.checked).length;
                    const totalChks = task.checklist.length;

                    return (
                      <motion.div
                        key={task.id}
                        layoutId={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setActiveTask(task)}
                        className="glass-card rounded-2xl p-4 cursor-grab active:cursor-grabbing border-b-2 hover:border-b-indigo-500"
                      >
                        {/* Tags / Priority Badge */}
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            task.priority === 'high' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400' :
                            task.priority === 'medium' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400' :
                            'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}>
                            {task.priority}
                          </span>
                          
                          {task.isStarred && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                        </div>

                        {/* Title & Description */}
                        <h5 className="font-bold text-slate-900 dark:text-slate-100 text-sm tracking-tight leading-snug truncate">{task.title}</h5>
                        {task.description && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-2 mt-1 leading-normal font-medium">{task.description}</p>
                        )}

                        {/* Labels row */}
                        {task.labels && task.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {task.labels.map((lbl, idx) => {
                              const color = getLabelColor(lbl);
                              return (
                                <span 
                                  key={idx} 
                                  style={{ 
                                    backgroundColor: `${color}15`, 
                                    color: color, 
                                    borderColor: `${color}30` 
                                  }}
                                  className="text-[9px] font-extrabold px-2 py-0.5 rounded-md border"
                                >
                                  {lbl}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* Dependencies & Recurring Badges */}
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {task.blockedBy && task.blockedBy.length > 0 && (
                            <div className="flex items-center gap-1 text-[9px] text-rose-500 dark:text-rose-400 font-extrabold bg-rose-50/50 dark:bg-rose-950/20 px-1.5 py-0.5 rounded-lg border border-rose-100/40 dark:border-rose-900/30" title="This task is blocked by other tasks">
                              <Lock className="w-2.5 h-2.5" />
                              <span>Blocked ({task.blockedBy.length})</span>
                            </div>
                          )}
                          {task.blocks && task.blocks.length > 0 && (
                            <div className="flex items-center gap-1 text-[9px] text-indigo-500 dark:text-indigo-400 font-extrabold bg-indigo-50/50 dark:bg-indigo-950/20 px-1.5 py-0.5 rounded-lg border border-indigo-100/40 dark:border-indigo-900/30" title="This task blocks other tasks">
                              <GitBranch className="w-2.5 h-2.5" />
                              <span>Blocks ({task.blocks.length})</span>
                            </div>
                          )}
                          {task.isRecurring && (
                            <div className="flex items-center gap-1 text-[9px] text-emerald-500 dark:text-emerald-400 font-extrabold bg-emerald-50/50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded-lg border border-emerald-100/40 dark:border-emerald-900/30" title={`Repeats automatically ${task.recurrenceFrequency || 'weekly'}`}>
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" style={{ animationDuration: '8s' }} />
                              <span className="capitalize">{task.recurrenceFrequency || 'weekly'}</span>
                            </div>
                          )}
                        </div>

                        {/* Subtasks / Checklist completion progress metrics footer */}
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50 text-slate-400">
                          <div className="flex items-center gap-3">
                            {totalSubs > 0 && (
                              <div className="flex items-center gap-1 text-[10px] font-semibold" title="Subtasks Completed">
                                <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                                <span>{completedSubs}/{totalSubs}</span>
                              </div>
                            )}

                            {totalChks > 0 && (
                              <div className="flex items-center gap-1 text-[10px] font-semibold" title="Checklist Progress">
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                                <span>{completedChks}/{totalChks}</span>
                              </div>
                            )}
                          </div>

                          {/* Member assignment avatar stack */}
                          <div className="flex -space-x-1.5 overflow-hidden">
                            {task.assignees.slice(0, 3).map((assId) => {
                              const member = users.find(u => u.id === assId);
                              if (!member) return null;
                              return (
                                <div
                                  key={assId}
                                  className="w-5.5 h-5.5 rounded-full border border-white text-[9px] font-black text-white flex items-center justify-center shadow-sm"
                                  style={{ backgroundColor: member.avatarColor }}
                                  title={member.name}
                                >
                                  {member.name[0]}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* Quick addition bottom handler */}
              <div className="mt-4 flex-shrink-0">
                {isQuickAdding ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Enter task title..."
                      value={quickTitle}
                      onChange={(e) => setQuickTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd(column.id)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                      autoFocus
                    />
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleQuickAdd(column.id)}
                        className="px-3 py-1.5 bg-indigo-600 text-white font-bold text-[10px] rounded-lg hover:opacity-90 cursor-pointer"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setQuickAddColumnId(null)}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-[10px] rounded-lg hover:bg-slate-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setQuickAddColumnId(column.id);
                      setQuickTitle('');
                    }}
                    className="w-full py-2 bg-white/40 border border-white/50 hover:bg-white/60 dark:bg-slate-900/30 dark:border-slate-800/60 dark:hover:bg-slate-900/50 rounded-2xl flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold transition-all cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Quick Add</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Details Interactive Modal Dialog */}
      <AnimatePresence>
        {activeTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-950 rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col md:flex-row border border-slate-100 dark:border-slate-800/80"
            >
              {/* Modal Left section: main task editing content */}
              <div className="flex-grow p-6 overflow-y-auto max-h-[85vh] md:max-h-none space-y-6">
                
                {/* Header title inputs */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-grow">
                    <input
                      type="text"
                      value={activeTask.title}
                      onChange={(e) => updateTaskDetails({ title: e.target.value })}
                      className="w-full bg-transparent border-b border-transparent hover:border-slate-200 dark:hover:border-slate-800 focus:border-indigo-500 font-black text-xl text-slate-900 dark:text-slate-100 tracking-tight leading-snug py-1 focus:outline-none"
                    />
                  </div>
                  
                  {/* Star Toggle / Close */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateTaskDetails({ isStarred: !activeTask.isStarred })}
                      className={`p-2 rounded-xl border hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors ${
                        activeTask.isStarred ? 'text-amber-500 border-amber-100 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20' : 'text-slate-400 border-slate-200'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${activeTask.isStarred ? 'fill-amber-500' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(activeTask.id)}
                      className="p-2 rounded-xl border border-rose-100 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-955/20 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/40 cursor-pointer"
                      title="Delete Task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActiveTask(null)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Task description */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Description</label>
                  <textarea
                    value={activeTask.description}
                    onChange={(e) => updateTaskDetails({ description: e.target.value })}
                    placeholder="Provide full description parameters for the developer squad..."
                    className="w-full h-24 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500 rounded-2xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none resize-none font-medium leading-relaxed"
                  />
                </div>

                {/* Task Dependencies (Bottleneck Tracking) */}
                <div className="bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Task Dependencies & Bottleneck Tracking
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Blocked By (Pre-requisites) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Is Blocked By (Pre-requisites)</span>
                      </div>
                      
                      {/* List existing blockers */}
                      <div className="space-y-1.5 min-h-[36px]">
                        {(!activeTask.blockedBy || activeTask.blockedBy.length === 0) ? (
                          <p className="text-[10px] text-slate-400 italic font-medium py-1">No prerequisite blockers specified.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {activeTask.blockedBy.map(blockerId => {
                              const t = tasks.find(x => x.id === blockerId);
                              if (!t) return null;
                              return (
                                <span key={blockerId} className="inline-flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900 px-2.5 py-1 rounded-xl text-[10px] font-bold">
                                  <Lock className="w-2.5 h-2.5" />
                                  <span className="truncate max-w-[120px]">{t.title}</span>
                                  <button 
                                    type="button" 
                                    onClick={() => handleRemoveBlockedByRelationship(blockerId)}
                                    className="hover:text-rose-900 dark:hover:text-rose-200 cursor-pointer"
                                    title="Remove dependency"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Dropdown to add blocker */}
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddBlockedByRelationship(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-[11px] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                        defaultValue=""
                      >
                        <option value="" disabled>+ Add Pre-requisite Task...</option>
                        {tasks
                          .filter(t => t.id !== activeTask.id && (!activeTask.blockedBy || !activeTask.blockedBy.includes(t.id)))
                          .map(t => (
                            <option key={t.id} value={t.id}>{t.title}</option>
                          ))
                        }
                      </select>
                    </div>

                    {/* Blocks (Downstream Impacts) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Blocks (Downstream impact)</span>
                      </div>
                      
                      {/* List existing blocked tasks */}
                      <div className="space-y-1.5 min-h-[36px]">
                        {(!activeTask.blocks || activeTask.blocks.length === 0) ? (
                          <p className="text-[10px] text-slate-400 italic font-medium py-1">Does not block any other tasks.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {activeTask.blocks.map(blockedId => {
                              const t = tasks.find(x => x.id === blockedId);
                              if (!t) return null;
                              return (
                                <span key={blockedId} className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 px-2.5 py-1 rounded-xl text-[10px] font-bold">
                                  <GitBranch className="w-2.5 h-2.5" />
                                  <span className="truncate max-w-[120px]">{t.title}</span>
                                  <button 
                                    type="button" 
                                    onClick={() => handleRemoveBlockRelationship(blockedId)}
                                    className="hover:text-indigo-900 dark:hover:text-indigo-200 cursor-pointer"
                                    title="Remove impact"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Dropdown to add blocked task */}
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddBlockRelationship(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-[11px] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                        defaultValue=""
                      >
                        <option value="" disabled>+ Add Blocked Task...</option>
                        {tasks
                          .filter(t => t.id !== activeTask.id && (!activeTask.blocks || !activeTask.blocks.includes(t.id)))
                          .map(t => (
                            <option key={t.id} value={t.id}>{t.title}</option>
                          ))
                        }
                      </select>
                    </div>
                  </div>
                </div>

                {/* Checklist widget */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Task Checklist</label>
                  <div className="space-y-1.5">
                    {activeTask.checklist?.map((chk) => (
                      <div key={chk.id} className="flex items-center justify-between gap-3 p-2 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs border border-slate-100/40 dark:border-slate-800/40">
                        <label className="flex items-center gap-2.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={chk.checked}
                            onChange={() => handleToggleChecklist(chk.id)}
                            className="rounded-md border-slate-300 dark:border-slate-750 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                          />
                          <span className={chk.checked ? 'line-through text-slate-400 dark:text-slate-500' : ''}>{chk.text}</span>
                        </label>
                        <button onClick={() => handleRemoveChecklist(chk.id)} className="text-slate-400 hover:text-rose-500 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add checklist item..."
                        value={newChecklistText}
                        onChange={(e) => setNewChecklistText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddChecklist()}
                        className="flex-grow px-3 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button onClick={handleAddChecklist} className="px-3 py-1.5 bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-200 rounded-xl hover:opacity-90 text-xs font-bold cursor-pointer">Add</button>
                    </div>
                  </div>
                </div>

                {/* Subtask nested components */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Subtasks</label>
                  <div className="space-y-1.5">
                    {activeTask.subtasks?.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between gap-3 p-2 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs border border-slate-100/40 dark:border-slate-800/40">
                        <label className="flex items-center gap-2.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={sub.isCompleted}
                            onChange={() => handleToggleSubtask(sub.id)}
                            className="rounded-md border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 bg-white dark:bg-slate-950"
                          />
                          <span className={sub.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''}>{sub.title}</span>
                        </label>
                        <button onClick={() => handleRemoveSubtask(sub.id)} className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add new subtask..."
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                        className="flex-grow px-3 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button onClick={handleAddSubtask} className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl hover:opacity-90 text-xs font-bold cursor-pointer">Add</button>
                    </div>
                  </div>
                </div>

                {/* Discussions Comments thread */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <h5 className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-slate-400" /> Discussion Thread
                  </h5>

                  <div className="space-y-3">
                    {/* Recording Review Box */}
                    {audioUrl && (
                      <div className="flex items-center justify-between bg-indigo-50/40 dark:bg-slate-900/50 p-3 rounded-2xl border border-indigo-100/30 dark:border-indigo-900/30">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-indigo-600 rounded-xl text-white">
                            <Volume2 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Voice Note Captured</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Duration: {formatTime(recordingSeconds)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <audio src={audioUrl} className="h-8 accent-indigo-600" controls />
                          <button
                            type="button"
                            onClick={cancelRecording}
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                            title="Discard voice note"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Active Recording State */}
                    {isRecording && (
                      <div className="flex items-center justify-between bg-rose-50/40 dark:bg-rose-955/20 p-3 rounded-2xl border border-rose-100/20 dark:border-rose-900/20 animate-pulse">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                          <span className="text-[11px] font-extrabold text-rose-600 dark:text-rose-400 tracking-wider uppercase">Recording Audio...</span>
                          <span className="text-xs font-mono text-rose-700 dark:text-rose-300">{formatTime(recordingSeconds)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="p-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors flex items-center justify-center cursor-pointer shadow-md shadow-rose-600/10"
                            title="Stop Recording"
                          >
                            <Square className="w-3.5 h-3.5 fill-current" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelRecording}
                            className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-200 cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Form for commenting */}
                    <form onSubmit={handlePostCommentWithVoice} className="flex gap-2">
                      <input
                        type="text"
                        placeholder={isRecording ? "Voice recording active..." : "Post a response or tag @username..."}
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        disabled={isRecording || isUploadingVoice}
                        className="flex-grow px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-950 font-medium"
                      />

                      {!audioUrl && !isRecording && (
                        <button
                          type="button"
                          onClick={startRecording}
                          disabled={isUploadingVoice}
                          className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 dark:hover:border-indigo-900/60 rounded-xl transition-colors cursor-pointer flex items-center justify-center shadow-sm"
                          title="Record Voice Note"
                        >
                          <Mic className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="submit"
                        disabled={isRecording || isUploadingVoice || (!newCommentText.trim() && !audioUrl)}
                        className={`px-4 py-2 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-md ${
                          isUploadingVoice 
                            ? 'bg-slate-400 cursor-not-allowed shadow-none'
                            : 'bg-slate-950 hover:bg-indigo-600 dark:bg-slate-800 dark:hover:bg-slate-700 shadow-slate-950/5'
                        }`}
                      >
                        {isUploadingVoice ? 'Uploading...' : 'Comment'}
                      </button>
                    </form>
                  </div>

                  <div className="space-y-4 max-h-56 overflow-y-auto pr-1">
                    {activeComments.map((comm) => (
                      <div key={comm.id} className="text-xs space-y-1 relative">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-6 h-6 rounded-lg text-white font-black flex items-center justify-center text-[10px]"
                              style={{ backgroundColor: comm.userAvatarColor }}
                            >
                              {comm.userName[0]}
                            </div>
                            <span className="font-bold text-slate-900">{comm.userName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-semibold">{new Date(comm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            
                            {/* Emoji react button */}
                            <div className="relative">
                              <button 
                                onClick={() => setActiveCommentEmojiId(activeCommentEmojiId === comm.id ? null : comm.id)}
                                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                              >
                                <Smile className="w-3.5 h-3.5" />
                              </button>
                              {activeCommentEmojiId === comm.id && (
                                <div className="absolute right-0 bottom-6 bg-white border shadow-xl rounded-xl p-1.5 flex gap-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                                  {['👍', '🔥', '🙌', '👀', '💡'].map(em => (
                                    <button 
                                      key={em}
                                      onClick={() => handleAddReaction(comm.id, em)}
                                      className="hover:scale-125 transition-transform p-1 text-sm"
                                    >
                                      {em}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {comm.text && (
                          <p className="text-slate-600 dark:text-slate-300 pl-8 font-medium leading-relaxed bg-slate-50/50 dark:bg-slate-900/40 p-2 rounded-xl">{comm.text}</p>
                        )}
                        
                        {comm.voiceUrl && (
                          <div className="pl-8 py-1.5">
                            <div className="flex items-center gap-3 bg-indigo-50/50 dark:bg-slate-900/60 p-2 rounded-xl border border-indigo-100/30 dark:border-indigo-900/20 max-w-sm">
                              <div className="p-1.5 bg-indigo-600 rounded-lg text-white">
                                <Volume2 className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-grow min-w-0">
                                <audio controls className="w-full h-7 mt-0.5 accent-indigo-600 rounded text-xs" src={comm.voiceUrl} />
                                <div className="text-[9px] text-slate-400 font-semibold mt-0.5">
                                  Voice Note Attachment {comm.voiceDuration ? `(${formatTime(comm.voiceDuration)})` : ''}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Render Reactions badges */}
                        {comm.reactions && Object.keys(comm.reactions).length > 0 && (
                          <div className="flex flex-wrap gap-1 pl-8 pt-1">
                            {Object.entries(comm.reactions).map(([emoji, val]) => {
                              const usersArr = val as string[];
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => handleAddReaction(comm.id, emoji)}
                                  className="inline-flex items-center gap-1 bg-slate-100 hover:bg-indigo-50 text-[10px] font-bold text-slate-600 hover:text-indigo-600 px-2 py-0.5 rounded-md"
                                  title={usersArr.join(', ')}
                                >
                                  <span>{emoji}</span>
                                  <span>{usersArr.length}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Modal Right section: settings / assignees / dates sidebar */}
              <div className="w-full md:w-72 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 p-6 flex flex-col justify-between max-h-[85vh] md:max-h-none overflow-y-auto">
                <div className="space-y-6">
                  
                  {/* Priority Select */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Priority</label>
                    <select
                      value={activeTask.priority}
                      onChange={(e) => updateTaskDetails({ priority: e.target.value as any })}
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>

                  {/* Column placement placement */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Agile Stage</label>
                    <select
                      value={activeTask.columnId}
                      onChange={(e) => updateTaskDetails({ columnId: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    >
                      {columns.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Due Date Calendar */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Deadline Due Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="date"
                        value={activeTask.dueDate ? activeTask.dueDate.substring(0, 10) : ''}
                        onChange={(e) => updateTaskDetails({ dueDate: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                      />
                    </div>
                  </div>

                  {/* Labels & Tags Section */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" /> Labels & Tags
                      </label>
                      <button
                        onClick={() => setIsManagingLabels(!isManagingLabels)}
                        className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-0.5 cursor-pointer"
                      >
                        {isManagingLabels ? 'Back' : 'Manage'}
                      </button>
                    </div>

                    {isManagingLabels ? (
                      <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Create Custom Tag</span>
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Tag name (e.g. Frontend)"
                            value={newLabelName}
                            onChange={(e) => setNewLabelName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateProjectLabel()}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          
                          {/* Color Palette */}
                          <div className="flex flex-wrap gap-1.5">
                            {AVAILABLE_COLORS.map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => setNewLabelColor(color)}
                                className={`w-5 h-5 rounded-full border transition-transform ${
                                  newLabelColor === color ? 'scale-125 ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900' : 'opacity-80 hover:scale-110'
                                }`}
                                style={{ backgroundColor: color, borderColor: 'rgba(0,0,0,0.1)' }}
                              />
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={handleCreateProjectLabel}
                            className="w-full py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 cursor-pointer"
                          >
                            Create Tag
                          </button>
                        </div>

                        {/* Existing Project Tags */}
                        <div className="border-t border-slate-200/60 dark:border-slate-800/60 pt-2.5 space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-1">Existing Tags</span>
                          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                            {(project?.customLabels || defaultLabels).map((lbl) => (
                              <div key={lbl.name} className="flex items-center justify-between gap-2 p-1.5 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: lbl.color }} />
                                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{lbl.name}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProjectLabel(lbl.name)}
                                  className="text-slate-400 hover:text-rose-500 cursor-pointer shrink-0 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Task specific Tags Selector */}
                        <div className="flex flex-wrap gap-1.5">
                          {(project?.customLabels || defaultLabels).map((lbl) => {
                            const isAssigned = activeTask.labels.includes(lbl.name);
                            return (
                              <button
                                key={lbl.name}
                                onClick={() => handleToggleTaskLabel(lbl.name)}
                                style={{ 
                                  backgroundColor: isAssigned ? lbl.color : `${lbl.color}15`,
                                  color: isAssigned ? '#ffffff' : lbl.color,
                                  borderColor: isAssigned ? lbl.color : `${lbl.color}30`
                                }}
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 cursor-pointer transition-all hover:scale-105`}
                              >
                                {isAssigned && <CheckCheck className="w-3 h-3 text-white" />}
                                {lbl.name}
                              </button>
                            );
                          })}
                        </div>
                        
                        {(project?.customLabels || defaultLabels).length === 0 && (
                          <p className="text-[11px] text-slate-400 font-medium">No custom labels defined for this project.</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Assignees select lists checkboxes */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                      <UserPlus className="w-3.5 h-3.5" /> Assignees
                    </label>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {users.map((usr) => {
                        const isAssigned = activeTask.assignees.includes(usr.id);
                        return (
                          <label
                            key={usr.id}
                            className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-5.5 h-5.5 rounded-md text-white font-black flex items-center justify-center text-[10px]"
                                style={{ backgroundColor: usr.avatarColor }}
                              >
                                {usr.name[0]}
                              </div>
                              <span className="font-bold text-slate-700 dark:text-slate-300">{usr.name}</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={() => handleToggleAssignee(usr.id)}
                              className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 bg-white dark:bg-slate-950"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>

                </div>

                {/* Gemini AI Sidecar recommendations */}
                <div className="border-t border-slate-100 pt-6 mt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> AI Priority Advisor
                    </span>
                    <button
                      onClick={handleFetchAISuggestion}
                      disabled={loadingAI}
                      className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      {loadingAI ? 'Predicting...' : 'Suggest'}
                    </button>
                  </div>

                  {aiReasoning ? (
                    <div className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100 text-[11px] text-indigo-950 font-medium leading-relaxed">
                      <p className="font-bold text-indigo-600 mb-1">Recommended: {suggestedPriority?.toUpperCase()}</p>
                      <p className="italic">"{aiReasoning}"</p>
                      <button
                        onClick={handleApplyAIPriority}
                        className="mt-2 w-full py-1 bg-indigo-600 text-white font-bold rounded-lg hover:opacity-90 transition-colors cursor-pointer text-[10px]"
                      >
                        Apply priority level
                      </button>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">No prediction loaded. Click "Suggest" to run LLM assessment of task title and details.</p>
                  )}
                </div>

                {/* Grounded Task Research Guide */}
                <div className="border-t border-slate-100 pt-6 mt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-widest flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 animate-pulse" /> Grounded Task Guide
                    </span>
                    <button
                      onClick={handleFetchTaskResearch}
                      disabled={researchingTask}
                      className="text-[10px] font-bold text-cyan-500 hover:text-cyan-700 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                    >
                      {researchingTask ? 'Researching...' : 'Generate Guide'}
                    </button>
                  </div>

                  {researchGuide ? (
                    <div className="p-3.5 bg-slate-900 rounded-2xl border border-white/10 text-[11px] text-slate-100 font-medium leading-relaxed max-h-60 overflow-y-auto scrollbar-none">
                      {researchGuide.queries && researchGuide.queries.length > 0 && (
                        <div className="mb-2 text-[9px] text-cyan-400 font-mono">
                          Google Search: "{researchGuide.queries[0]}"
                        </div>
                      )}
                      
                      <div className="text-xs mb-3">
                        <GroundedMarkdownRenderer content={researchGuide.answer} />
                      </div>

                      {researchGuide.sources && researchGuide.sources.length > 0 && (
                        <div className="border-t border-white/10 pt-2.5 mt-2.5 space-y-1.5">
                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Citations:</p>
                          {researchGuide.sources.slice(0, 2).map((src: any, idx: number) => (
                            <a
                              key={idx}
                              href={src.uri}
                              target="_blank"
                              referrerPolicy="no-referrer"
                              className="flex items-center justify-between p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[9px] text-slate-300 hover:text-white transition-all font-bold"
                            >
                              <span className="truncate max-w-[150px]">{src.title}</span>
                              <ExternalLink className="w-2.5 h-2.5 text-slate-500" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">No guide generated. Click "Generate Guide" to fetch live technical details using Google Search.</p>
                  )}
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
