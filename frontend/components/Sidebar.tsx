import React, { useState, useEffect, useRef } from 'react';
import { Annotation, User, Attachment } from '../types';
import { Button } from './ui/Button';
import { MessageSquare, Clock, PenTool, Send, Paperclip, X, File, Image as ImageIcon } from 'lucide-react';

interface SidebarProps {
  annotations: Annotation[];
  currentTime: number;
  selectionRange: { start: number; end: number } | null;
  currentUser: User;
  onAnnotationSelect: (annotation: Annotation) => void;
  onAddComment: (text: string, attachments: Attachment[]) => void;
  activeAnnotationId?: string;
  isDrawingMode: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  annotations,
  currentTime,
  selectionRange,
  onAnnotationSelect,
  onAddComment,
  activeAnnotationId,
  isDrawingMode
}) => {
  const [newComment, setNewComment] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatRange = (start: number, end: number) => {
      if (Math.abs(end - start) < 0.1) return formatTime(start);
      return `${formatTime(start)} - ${formatTime(end)}`;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() && attachments.length === 0) return;
    onAddComment(newComment, attachments);
    setNewComment('');
    setAttachments([]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const file = e.target.files[0];
          
          // Convert file to base64
          const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file); // This creates a base64 data URL
          });
          
          const newAttachment: Attachment = {
              id: Math.random().toString(36).substring(7),
              name: file.name,
              type: file.type.startsWith('image/') ? 'image' : 'file',
              url: base64 // Store as base64 data URL instead of blob URL
          };
          setAttachments(prev => [...prev, newAttachment]);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const removeAttachment = (id: string) => {
      setAttachments(prev => prev.filter(a => a.id !== id));
  }

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
          if (item.type.startsWith('image/')) {
              e.preventDefault();
              const file = item.getAsFile();
              if (!file) continue;

              // Convert pasted image to base64
              const base64 = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result as string);
                  reader.onerror = reject;
                  reader.readAsDataURL(file);
              });

              const newAttachment: Attachment = {
                  id: Math.random().toString(36).substring(7),
                  name: `pasted-image-${Date.now()}.${file.type.split('/')[1] || 'png'}`,
                  type: 'image',
                  url: base64
              };
              setAttachments(prev => [...prev, newAttachment]);
              break; // Only handle the first image
          }
      }
  }

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [annotations.length]);

  return (
    <div className="w-96 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col h-full shrink-0 transition-colors">
      
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md sticky top-0 z-20">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-500" />
          Comments
        </h2>
        <div className="text-xs text-zinc-500 mt-1">
          {annotations.length} items
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {annotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-400 dark:text-zinc-600 text-center">
            <MessageSquare className="w-12 h-12 mb-2 opacity-20" />
            <p className="text-sm">No comments yet.</p>
          </div>
        ) : (
          annotations.map((ann) => (
            <div 
              key={ann.id}
              onClick={() => onAnnotationSelect(ann)}
              className={`group p-3 rounded-lg border transition-all cursor-pointer ${
                activeAnnotationId === ann.id 
                  ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-500/50' 
                  : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/50 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {ann.author.avatar ? (
                    <img 
                      src={ann.author.avatar} 
                      alt={ann.author.name} 
                      className="w-6 h-6 rounded-full ring-2 ring-white dark:ring-zinc-800"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full ring-2 ring-white dark:ring-zinc-800 bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                      {ann.author.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{ann.author.name}</span>
                </div>
                <div className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
                   activeAnnotationId === ann.id 
                     ? 'bg-purple-500 text-white' 
                     : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                }`}>
                  {ann.type === 'drawing' ? <PenTool className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  <span className="font-mono">{formatRange(ann.startTime, ann.endTime)}</span>
                </div>
              </div>
              
              <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                {ann.text}
              </p>

              {/* Attachments List */}
              {ann.attachments && ann.attachments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                      {ann.attachments.map(att => (
                          <div key={att.id} className="relative group/att">
                              {att.type === 'image' ? (
                                  <img src={att.url} alt={att.name} className="w-16 h-16 object-cover rounded-md border border-zinc-200 dark:border-zinc-700" />
                              ) : (
                                  <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-md border border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center text-zinc-500">
                                      <File className="w-6 h-6" />
                                      <span className="text-[9px] mt-1 w-full text-center truncate px-1">{att.name}</span>
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>
              )}
              
              <div className="mt-2 text-[10px] text-zinc-400 dark:text-zinc-500 flex justify-between items-center">
                 <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                 {ann.drawingData && <span className="text-emerald-500 flex items-center gap-1">Has Drawing</span>}
              </div>
            </div>
          ))
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-center justify-between mb-2 text-xs text-zinc-500">
            <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded font-mono ${
                    selectionRange 
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30' 
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                }`}>
                {selectionRange 
                    ? `${formatTime(selectionRange.start)} - ${formatTime(selectionRange.end)}`
                    : formatTime(currentTime)
                }
                </span>
                <span>
                {isDrawingMode ? 'Drawing' : (selectionRange ? 'Range Selected' : 'Current Frame')}
                </span>
            </div>
            {attachments.length > 0 && <span>{attachments.length} attached</span>}
          </div>

          {/* New Attachments Preview */}
          {attachments.length > 0 && (
              <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                  {attachments.map(att => (
                      <div key={att.id} className="relative shrink-0">
                          {att.type === 'image' ? (
                               <img src={att.url} className="w-12 h-12 object-cover rounded border border-zinc-200 dark:border-zinc-700" />
                          ) : (
                              <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center rounded border border-zinc-200 dark:border-zinc-700">
                                  <File className="w-5 h-5 text-zinc-400" />
                              </div>
                          )}
                          <button 
                             type="button"
                             onClick={() => removeAttachment(att.id)}
                             className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                          >
                              <X className="w-3 h-3" />
                          </button>
                      </div>
                  ))}
              </div>
          )}

          <div className="flex gap-2">
            <div className="relative flex-1">
                <textarea
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 pr-10 text-sm text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-purple-600 focus:border-transparent focus:outline-none resize-none placeholder-zinc-400 dark:placeholder-zinc-600"
                placeholder={isDrawingMode ? "Describe your drawing..." : "Add a comment... (paste images with Ctrl+V)"}
                rows={3}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                    }
                }}
                onPaste={handlePaste}
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-white bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                    title="Attach file"
                >
                    <Paperclip className="w-4 h-4" />
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileSelect}
                    accept="image/*,.pdf,.doc,.docx" 
                />
            </div>
            <Button 
              type="submit" 
              variant="primary" 
              className="h-auto self-end mb-1"
              disabled={!newComment.trim() && attachments.length === 0}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};