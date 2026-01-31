import React, { useState, useEffect, useRef } from 'react';
import { X, Send as SendIcon, FileText, CheckCircle2, Lock, Globe, Calendar, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brief, Brand, COLORS } from '../types';
import { useUser } from '../contexts/UserContext';
import { useActions } from '../contexts/ActionContext';
import { FileUpload } from './FileUpload';

interface SidePanelProps {
  brief: Brief | null;
  brand: Brand;
  onClose: () => void;
  activeTab?: 'details' | 'messages';
  messageFilter?: 'internal' | 'client';
  viewType: 'client' | 'internal';
  onClientSendMessage?: (briefId: string, text: string) => Promise<void>;
  focusMeta?: boolean;
  onMetaBlur?: () => void;
}

export const SidePanel: React.FC<SidePanelProps> = ({ 
    brief, 
    brand, 
    onClose, 
    activeTab, 
    messageFilter, 
    viewType,
    onClientSendMessage,
    focusMeta = false,
    onMetaBlur
}) => {
  const { currentUser, checkPermission } = useUser();
  const { 
    assignBrief, 
    updateBriefStatus, 
    addMessage, 
    addDeliverable,
    updateBriefMeta
  } = useActions();
  const metaRef = useRef<HTMLDivElement>(null);

  const [messageInput, setMessageInput] = useState('');
  const [msgVisibility, setMsgVisibility] = useState<'client' | 'internal'>('internal');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  
  useEffect(() => {
    if (viewType === 'client') {
        setMsgVisibility('client');
    } else if (messageFilter) {
        setMsgVisibility(messageFilter);
    }
  }, [messageFilter, viewType]);

  useEffect(() => {
    if (focusMeta && metaRef.current) {
      metaRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      onMetaBlur?.();
    }
  }, [focusMeta, onMetaBlur]);

  if (!brief) return null;

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;
    if (viewType === 'client' && onClientSendMessage) {
      await onClientSendMessage(brief.id, messageInput.trim());
      setMessageInput('');
    } else {
      addMessage(brief.id, messageInput, msgVisibility);
      setMessageInput('');
    }
  };

  const handleUploadFile = (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setUploadProgress(0);
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(progress);
        if (progress >= 100) {
            clearInterval(interval);
            addDeliverable(brief.id, file);
            setUploadProgress(null);
        }
    }, 100);
  };

  const visibleMessages = brief.messages.filter(m => {
      if (viewType === 'client') return m.visibility === 'client';
      if (msgVisibility === 'client') return m.visibility === 'client';
      return m.visibility === 'internal'; 
  });

  const canTake = checkPermission('take_brief') && brief.status === 'new';
  const canDeliver = checkPermission('deliver_brief', brief.ownerId);

  return (
    <motion.div 
        layout
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 400, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
        className="h-full bg-white border-l border-gray-100 flex flex-col z-30 shrink-0 overflow-hidden"
    >
      <div className="w-[400px] p-6 h-full flex flex-col overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{brand.name}</span>
            <button onClick={onClose} className="p-1.5 hover:bg-black/5 rounded-full text-[#111111] transition-colors">
              <X size={16} />
            </button>
          </div>
          <h2 className="text-xl font-semibold text-[#111111] leading-snug mb-3 tracking-tight">{brief.title}</h2>
          
          <div className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full shadow-sm"
              style={{ 
                  backgroundColor: brief.status === 'in_progress' ? COLORS.status.inProgress : 
                                  brief.status === 'delivered' ? COLORS.status.delivered : COLORS.status.new 
              }}
            />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{brief.status.replace('_', ' ')}</span>
          </div>
        </div>

        {/* Action Buttons */}
        {viewType === 'internal' && (
          <div className="flex flex-col gap-3 mb-8">
            {canTake && (
              <button onClick={() => assignBrief(brief.id, currentUser!.id, currentUser!.name)} className="h-10 w-full bg-[#111111] text-white text-sm font-medium rounded-xl shadow-lg shadow-black/10 hover:shadow-black/20 hover:scale-[1.02] transition-all">
                Take Brief
              </button>
            )}
            {canDeliver && brief.status === 'in_progress' && (
                 <button onClick={() => updateBriefStatus(brief.id, 'review')} className="h-10 w-full border border-gray-200 bg-white/50 text-[#111111] text-sm font-medium rounded-xl hover:bg-white transition-colors">
                   Move to Review
                 </button>
            )}
            {canDeliver && (brief.status === 'in_progress' || brief.status === 'review') && (
                 <button onClick={() => updateBriefStatus(brief.id, 'delivered')} className="h-10 w-full bg-green-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-green-500/20 hover:scale-[1.02] transition-all">
                   Send to Client
                 </button>
            )}
          </div>
        )}

        {/* Properties / Meta (internal only) */}
        {viewType === 'internal' && (
          <div ref={metaRef} className="mb-6">
            <h3 className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-3">Properties</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-gray-400" />
                <input
                  type="date"
                  className="flex-1 px-3 py-2 text-sm border border-gray-100 rounded-lg outline-none focus:border-gray-200"
                  value={brief.deadline ? new Date(brief.deadline).toISOString().slice(0, 10) : ''}
                  onChange={(e) => updateBriefMeta(brief.id, { deadline: e.target.value ? new Date(e.target.value) : null })}
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User size={14} className="text-gray-400" />
                <span>{brief.ownerName || 'Unassigned'}</span>
              </div>
            </div>
          </div>
        )}

        <div className="w-full h-px bg-black/5 mb-6" />

        {/* Deliverables Zone */}
        <div className="mb-6">
             <h3 className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-4">Delivery</h3>
             
             {viewType === 'internal' && (
                 <FileUpload
                    className="border-2 border-dashed border-gray-100 bg-gray-50/30 rounded-2xl p-6 mb-4 text-center cursor-pointer hover:border-gray-300 hover:bg-gray-100/50 transition-all group"
                    overlayText="Release"
                    onDrop={handleUploadFile}
                    clickToUpload={true}
                    progress={uploadProgress}
                 >
                     {!uploadProgress && (
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                <FileText size={14} className="text-gray-400" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Drop deliverables</span>
                        </div>
                     )}
                 </FileUpload>
             )}

             <div className="space-y-2">
                {brief.files.filter(f => f.type === 'deliverable' && (viewType === 'internal' || f.visibleToClient)).map(file => (
                    <a key={file.id} href={file.url} target="_blank" rel="noreferrer" {...(viewType === 'client' ? { download: file.name } : {})} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition-all group">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                            <span className="text-sm font-medium text-[#111111] truncate">{file.name}</span>
                        </div>
                    </a>
                ))}
             </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col min-h-[300px] bg-gray-50/50 rounded-2xl p-1 border border-gray-100 transition-colors ${activeTab === 'messages' ? 'ring-2 ring-blue-500/20 bg-blue-50/10' : ''}`}>
             {viewType === 'internal' && (
                 <div className="flex p-1 gap-1 mb-1">
                     <button 
                        onClick={() => setMsgVisibility('internal')}
                        className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-colors ${msgVisibility === 'internal' ? 'bg-white shadow-sm text-[#111111]' : 'text-gray-400 hover:text-gray-600'}`}
                     >
                         <Lock size={10} /> Internal
                     </button>
                     <button 
                        onClick={() => setMsgVisibility('client')}
                        className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-colors ${msgVisibility === 'client' ? 'bg-white shadow-sm text-[#111111]' : 'text-gray-400 hover:text-gray-600'}`}
                     >
                         <Globe size={10} /> Client
                     </button>
                 </div>
             )}

             <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
                 {visibleMessages.length === 0 && (
                     <div className="text-center text-[10px] uppercase tracking-widest text-gray-300 mt-8 font-bold">No Messages</div>
                 )}
                 {visibleMessages.map(msg => {
                     const date = msg.createdAt ? new Date(msg.createdAt) : null;
                     const timeStr = date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                     const dateStr = date ? date.toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
                     return (
                         <div key={msg.id} className={`p-3 rounded-2xl text-sm max-w-[85%] shadow-sm ${msg.authorName === 'Client' || msg.authorType === 'client' ? 'bg-white text-[#111111] self-start rounded-tl-sm' : 'bg-blue-500 text-white self-end ml-auto rounded-tr-sm'}`}>
                             <p className="mb-1.5 leading-relaxed">{msg.text}</p>
                             <div className="flex items-center gap-2 text-[9px] opacity-70">
                                 <span className="font-bold uppercase tracking-widest">{msg.authorName || (msg.authorType === 'client' ? 'Client' : 'Unknown')}</span>
                                 {date && <span className="opacity-80">{dateStr} {timeStr}</span>}
                             </div>
                         </div>
                     );
                 })}
             </div>
             
             <div className="relative p-2">
                 <input 
                     autoFocus={activeTab === 'messages'}
                     type="text" 
                     className="w-full h-11 pl-4 pr-12 bg-white rounded-xl text-sm outline-none placeholder:text-gray-400 shadow-sm border border-transparent focus:border-gray-200 transition-all"
                     placeholder={`Message ${msgVisibility}...`}
                     value={messageInput}
                     onChange={(e) => setMessageInput(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                 />
                 <button onClick={handleSendMessage} className="absolute right-3.5 top-1/2 -translate-y-1/2 p-2 bg-[#111111] rounded-lg hover:scale-105 transition-transform">
                     <SendIcon size={12} className="text-white" />
                 </button>
             </div>
        </div>
      </div>
    </motion.div>
  );
};