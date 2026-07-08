import React, { useState, useEffect, useRef } from 'react';
import { FolderGit, Upload, File, FileText, Image as ImageIcon, Download, Eye, X, CheckCircle } from 'lucide-react';
import { Attachment } from '../types.ts';
import { useToast } from './Toast.tsx';

export const FileManager: React.FC = () => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { showSuccess, showError } = useToast();

  const fetchAttachments = async () => {
    try {
      const res = await fetch('/api/attachments', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok) {
        setAttachments(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAttachments();
  }, []);

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setUploading(true);

      try {
        const res = await fetch('/api/attachments/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            name: file.name,
            type: file.type,
            size: formatSize(file.size),
            fileData: base64Data
          }),
        });

        const data = await res.json();
        if (res.ok) {
          fetchAttachments();
          showSuccess('✅ File uploaded successfully.');
        } else {
          throw new Error(data.error);
        }
      } catch (err: any) {
        showError(err.message || 'File upload failed.');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // File click selector handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-8 h-8 text-cyan-500" />;
    if (type.includes('pdf')) return <FileText className="w-8 h-8 text-rose-500" />;
    return <File className="w-8 h-8 text-indigo-500" />;
  };

  return (
    <div className="glass-panel shadow-lg rounded-3xl p-6 select-none space-y-8">
      
      {/* Title Segment */}
      <div className="flex items-center gap-3 border-b border-slate-100/50 dark:border-slate-800/50 pb-4">
        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
          <FolderGit className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">Vault Document Storage</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Upload attachments, PDFs, imagery and specifications.</p>
        </div>
      </div>

      {/* Dual Selector / Drop upload box */}
      <div 
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
          dragActive 
            ? 'border-indigo-600 bg-indigo-50/10 scale-[1.01]' 
            : 'border-slate-200/50 dark:border-slate-800 hover:border-slate-300 bg-slate-50/10 dark:bg-slate-900/10 hover:bg-slate-50/20 dark:hover:bg-slate-900/20'
        }`}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          className="hidden" 
          onChange={handleFileChange}
        />
        
        <div className="p-4 bg-white/40 dark:bg-slate-900/40 shadow-md rounded-2xl text-slate-500 mb-4 border border-slate-50/20">
          <Upload className="w-6 h-6 text-indigo-600 animate-bounce" />
        </div>

        {uploading ? (
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Transmitting file data...</p>
            <p className="text-xs text-slate-400 mt-1">Converting to base64 buffer...</p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Drag and drop file here</p>
            <p className="text-xs text-slate-400 mt-1 font-semibold">Or click to browse storage</p>
            <p className="text-[10px] text-slate-400 mt-3 font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full inline-block">PDF, Doc, JPG, PNG up to 10MB</p>
          </div>
        )}
      </div>

      {/* Uploaded items grid list */}
      <div className="space-y-4">
        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-widest">Repository Files ({attachments.length})</h4>

        {attachments.length === 0 ? (
          <p className="text-sm text-slate-400 py-12 text-center font-semibold italic bg-slate-50/10 dark:bg-slate-900/10 border border-slate-100/20 dark:border-slate-800/60 rounded-2xl">No documents uploaded to this workspace yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {attachments.map((file) => (
              <div 
                key={file.id} 
                className="glass-card rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-4 relative overflow-hidden group"
              >
                <div className="p-3 bg-slate-50/50 dark:bg-slate-900/40 rounded-xl animate-pulse-slow">
                  {getFileIcon(file.type)}
                </div>

                <div className="overflow-hidden flex-grow pr-6">
                  <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate leading-normal" title={file.name}>
                    {file.name}
                  </h5>
                  <p className="text-[10px] text-slate-400 mt-1.5 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span>{file.size}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                    <span>{new Date(file.uploadedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </p>
                </div>

                {/* Operations overlay */}
                <div className="absolute right-3 top-3 flex items-center gap-1">
                  {file.type.startsWith('image/') && (
                    <button 
                      onClick={() => setPreviewImage(file.url)}
                      className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                      title="Preview Image"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  <a 
                    href={file.url} 
                    download={file.name}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors"
                    title="Download File"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Preview Image Overlay Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="relative max-w-3xl w-full bg-white/90 dark:bg-slate-950/90 backdrop-blur-md rounded-3xl p-2 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 border border-white/20 dark:border-slate-800">
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute right-4 top-4 p-2 bg-slate-900/10 hover:bg-slate-900/20 text-slate-800 dark:text-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <img 
              src={previewImage} 
              alt="Attachment Preview" 
              className="w-full h-auto max-h-[70vh] object-contain rounded-2xl bg-slate-50/10"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}

    </div>
  );
};
