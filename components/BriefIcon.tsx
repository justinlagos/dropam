import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brief, COLORS } from '../types';

interface BriefIconProps {
  brief: Brief;
  brandName?: string;
  podName?: string; // For admin view - shows which POD the brief belongs to
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  showMeta?: boolean;
  selected?: boolean;
  isTarget?: boolean;
  onDragEnd?: (e: any, info: any) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
  /** When true, brief is draggable for moving into folders (client canvas). Sets drag data as brief id. */
  draggableForFolder?: boolean;
}

export const BRIEF_DROP_TYPE = 'application/x-dropam-brief-id';

export const BriefIcon: React.FC<BriefIconProps> = ({
  brief,
  brandName,
  podName,
  onClick,
  onDoubleClick,
  showMeta = false,
  selected = false,
  isTarget = false,
  onDragEnd,
  onContextMenu,
  style,
  draggableForFolder = false,
}) => {
  const handleDragStart = (e: React.DragEvent) => {
    if (!draggableForFolder) return;
    e.dataTransfer.setData(BRIEF_DROP_TYPE, brief.id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const [isHovered, setIsHovered] = useState(false);
  const [showQuickLook, setShowQuickLook] = useState(false);

  const getStatusColor = () => {
    switch(brief.status) {
      case 'in_progress': return COLORS.status.inProgress;
      case 'review': return COLORS.status.review; 
      case 'delivered': return COLORS.status.delivered;
      default: return COLORS.status.new; 
    }
  };

  const formattedTime = new Date(brief.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  useEffect(() => {
    if (!isHovered) return;
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
            e.preventDefault();
            setShowQuickLook(true);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHovered]);

  const isNew = brief.status === 'new';

  return (
    <>
        <motion.div 
            drag={onDragEnd && !draggableForFolder ? true : false}
            dragMomentum={false}
            dragElastic={0}
            onDragEnd={onDragEnd}
            draggable={draggableForFolder}
            onDragStart={handleDragStart}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onContextMenu={onContextMenu}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={style}
            whileHover={{ scale: 1.02 }}
            whileDrag={draggableForFolder ? undefined : { scale: 1.02, zIndex: 100, cursor: 'grabbing' }}
            animate={isTarget ? { scale: 1.2 } : { scale: 1 }}
            className={`${onDragEnd && !draggableForFolder ? 'draggable-item' : ''} w-[120px] h-[140px] flex flex-col items-center justify-start pt-2 cursor-pointer select-none rounded-2xl transition-all duration-150 ease-out
                 ${selected ? 'bg-gray-100/80 ring-1 ring-gray-200' : 'hover:bg-gray-50/80'}
            `}
        >
            <div className={`relative w-[68px] h-[68px] mb-4 flex items-center justify-center bg-white rounded-2xl transition-all duration-150 ease-out
                ${selected ? 'ring-1 ring-gray-300 shadow-sm' : 'shadow-sm border border-black/5'}
                ${isTarget ? 'ring-4 ring-green-400 shadow-2xl bg-green-50' : ''}
            `}>
                <FileText size={30} className="text-[#111111]" strokeWidth={1.5} />
                
                {/* Status Indicator */}
                <div 
                  className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm
                    ${isNew ? 'animate-pulse' : ''}
                  `}
                  style={{ backgroundColor: getStatusColor() }}
                />
            </div>

            <div className="flex flex-col items-center text-center w-full px-2">
                {showMeta && brandName && (
                <span className="text-[8px] uppercase tracking-[0.2em] text-gray-400 mb-1 font-bold">
                    {brandName}
                </span>
                )}
                <div className={`text-[11px] font-semibold leading-tight line-clamp-2 break-words max-w-full ${selected ? 'text-[#111111]' : 'text-[#111111]'}`}>
                {brief.title}
                </div>

                <span className="text-[9px] text-gray-400 mt-1.5 font-medium">
                    {showMeta && brief.ownerName ? brief.ownerName : formattedTime}
                </span>

                {/* POD tag for admin view */}
                {podName && (
                  <span className="mt-1 px-1.5 py-0.5 text-[7px] uppercase tracking-wider font-bold text-gray-400 bg-gray-100 rounded">
                    {podName}
                  </span>
                )}
            </div>
        </motion.div>

        {createPortal(
            <AnimatePresence>
                {showQuickLook && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#111111]/40 backdrop-blur-xl"
                        onClick={() => setShowQuickLook(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white/95 backdrop-blur-2xl rounded-[2.5rem] overflow-hidden shadow-2xl max-w-xl w-full flex flex-col border border-white/20"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="h-64 bg-gray-50 flex items-center justify-center border-b border-black/5 relative">
                                <FileText size={100} className="text-gray-200" strokeWidth={0.5} />
                                <div className="absolute top-8 right-8 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-white shadow-sm border border-black/5" style={{ color: getStatusColor() }}>
                                    {brief.status.replace('_', ' ')}
                                </div>
                            </div>
                            <div className="p-10">
                                <h2 className="text-2xl font-bold text-[#111111] mb-4 tracking-tight">{brief.title}</h2>
                                <div className="flex gap-4">
                                    <button onClick={() => { setShowQuickLook(false); onClick({} as any); }} className="flex-1 py-4 bg-[#111111] text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:scale-[1.02] transition-transform active:scale-95 shadow-xl shadow-black/10">
                                        Open Brief Details
                                    </button>
                                    <button onClick={() => setShowQuickLook(false)} className="px-8 py-4 bg-gray-100 text-gray-500 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors">
                                        Close
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>,
            document.body
        )}
    </>
  );
};