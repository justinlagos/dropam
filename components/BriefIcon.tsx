import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brief, COLORS } from '../types';

interface BriefIconProps {
  brief: Brief;
  brandName?: string;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  showMeta?: boolean;
  selected?: boolean;
  isTarget?: boolean;
  onDragEnd?: (e: any, info: any) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

export const BriefIcon: React.FC<BriefIconProps> = ({ 
  brief, 
  brandName, 
  onClick,
  onDoubleClick,
  showMeta = false,
  selected = false,
  isTarget = false,
  onDragEnd,
  onContextMenu,
  style,
}) => {
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
            drag={onDragEnd ? true : false}
            dragMomentum={false}
            onDragEnd={onDragEnd}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onContextMenu={onContextMenu}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={style}
            whileHover={{ scale: 1.05 }}
            whileDrag={{ scale: 1.1, zIndex: 100, cursor: 'grabbing' }}
            animate={isTarget ? { scale: 1.2 } : { scale: 1 }}
            className={`draggable-item w-[120px] h-[140px] flex flex-col items-center justify-start pt-2 cursor-pointer select-none rounded-2xl transition-all
                 ${selected ? 'bg-indigo-50/50' : 'hover:bg-white/40'}
            `}
        >
            <div className={`relative w-[68px] h-[68px] mb-4 flex items-center justify-center bg-white rounded-2xl transition-all duration-300 pointer-events-none
                ${selected ? 'ring-2 ring-indigo-500 shadow-xl scale-105' : 'shadow-sm border border-black/5'}
                ${isTarget ? 'ring-4 ring-green-400 shadow-2xl bg-green-50' : ''}
            `}>
                <FileText size={30} className={selected ? 'text-indigo-600' : 'text-[#111111]'} strokeWidth={1.5} />
                
                {/* Status Indicator */}
                <div 
                  className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm
                    ${isNew ? 'animate-pulse' : ''}
                  `}
                  style={{ backgroundColor: getStatusColor() }}
                />
            </div>

            <div className="flex flex-col items-center text-center w-full px-2 pointer-events-none">
                {showMeta && brandName && (
                <span className="text-[8px] uppercase tracking-[0.2em] text-gray-400 mb-1 font-bold">
                    {brandName}
                </span>
                )}
                <div className={`text-[11px] font-semibold leading-tight line-clamp-2 break-words max-w-full ${selected ? 'text-indigo-600' : 'text-[#111111]'}`}>
                {brief.title}
                </div>
                
                <span className="text-[9px] text-gray-400 mt-1.5 font-medium">
                    {showMeta && brief.ownerName ? brief.ownerName : formattedTime}
                </span>
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