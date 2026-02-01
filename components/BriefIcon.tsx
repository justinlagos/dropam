import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { Brief, COLORS } from '../types';
import { FileIcon } from './icons/FileIcons';
import { getFileKind, FileKind } from '../utils/fileType';
import { useCanvasTransform } from './SpatialCanvas';
import { useDesktopDrag } from './hooks/useDesktopDrag';

interface BriefIconProps {
  brief: Brief;
  brandName?: string;
  podName?: string;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  showMeta?: boolean;
  selected?: boolean;
  isTarget?: boolean;
  /** Legacy: used when not using onCommitPosition (e.g. AdminCanvasPage). */
  onDragEnd?: (e: any, info: any) => void;
  /** Preferred: commit world position on drag end (canvas). When set, canvas pointer-drag is used. */
  onCommitPosition?: (position: { x: number; y: number }) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
  draggableForFolder?: boolean;
}

export const BRIEF_DROP_TYPE = 'application/x-dropam-brief-id';

/** Shared icon capsule: square, soft rounding, subtle border, minimal constant shadow. Used by BriefIcon, FolderIcon, ClientFolderIcon. */
export const ICON_CAPSULE_CLASS =
  'w-[68px] h-[68px] rounded-2xl bg-white border border-black/5 shadow-sm';

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
  onCommitPosition,
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

  const getWorldFromClient = useCanvasTransform();
  const initialPosition = { x: brief.position?.x ?? 0, y: brief.position?.y ?? 0 };
  const canvasDrag = useDesktopDrag({
    initialPosition,
    getWorldFromClient,
    onCommitPosition: onCommitPosition ?? (() => {}),
    enabled: Boolean(onCommitPosition),
  });
  const isDraggingCanvas = canvasDrag.isDragging;

  // Framer-motion drag (legacy) when onCommitPosition not used
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const [isDraggingMotion, setIsDraggingMotion] = useState(false);
  useEffect(() => {
    x.set(0);
    y.set(0);
  }, [brief.position?.x, brief.position?.y]);

  const getStatusColor = () => {
    switch (brief.status) {
      case 'in_progress': return COLORS.status.inProgress;
      case 'review': return COLORS.status.review;
      case 'delivered': return COLORS.status.delivered;
      default: return COLORS.status.new;
    }
  };

  const timestampRaw = brief.createdAt ?? brief.submittedAt;
  const tileTimestamp = timestampRaw
    ? new Date(timestampRaw).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
    : '';
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
  const canDragMotion = onDragEnd && !onCommitPosition && !draggableForFolder;
  const canDragCanvas = Boolean(onCommitPosition);
  const isDragging = isDraggingCanvas || isDraggingMotion;

  // Determine file kind from primary attachment (first brief/attachment file)
  const primaryFileKind: FileKind = useMemo(() => {
    const primaryFile = brief.files?.find(f => f.type === 'brief' || f.type === 'attachment');
    if (primaryFile) {
      return getFileKind(primaryFile.name);
    }
    return 'doc'; // Default to document icon for briefs without files
  }, [brief.files]);

  const handleDragStartMotion = () => {
    setIsDraggingMotion(true);
    dragStartPos.current = { x: x.get(), y: y.get() };
  };

  const handleDragEndMotion = (event: any, info: any) => {
    setIsDraggingMotion(false);
    if (onDragEnd) {
      const offsetX = x.get();
      const offsetY = y.get();
      onDragEnd(event, { offset: { x: offsetX, y: offsetY }, point: info.point, velocity: info.velocity });
      x.set(0);
      y.set(0);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (canDragCanvas && canvasDrag.dragConsumedRef.current) {
      canvasDrag.dragConsumedRef.current = false;
      e.stopPropagation();
      return;
    }
    onClick(e);
  };

  const sharedProps = {
    draggable: draggableForFolder,
    onDragStartCapture: handleDragStart,
    onClick: handleClick,
    onDoubleClick,
    onContextMenu,
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
    animate: (isTarget ? { scale: 1.2 } : isDragging ? { zIndex: 100 } : { scale: 1 }) as const,
    className: `${canDragCanvas || canDragMotion ? 'draggable-item' : ''} w-[120px] h-[140px] flex flex-col items-center justify-start pt-2 pb-4 cursor-pointer select-none rounded-2xl transition-colors duration-150 ease-out
             ${selected ? 'bg-gray-100/80 ring-1 ring-gray-200' : 'hover:bg-gray-50/80'}
             ${isDragging ? 'cursor-grabbing' : ''}`,
  };

  if (canDragCanvas) {
    return (
      <>
        <motion.div
          {...sharedProps}
          style={{ ...style, ...canvasDrag.style }}
          transition={{ duration: 0 }}
          layout={false}
          onPointerDown={canvasDrag.handlers.onPointerDown}
          onPointerMove={canvasDrag.handlers.onPointerMove}
          onPointerUp={canvasDrag.handlers.onPointerUp}
          onPointerLeave={canvasDrag.handlers.onPointerUp}
        >
        <div className={`relative mb-4 flex items-center justify-center ${ICON_CAPSULE_CLASS} transition-all duration-150 ease-out
            ${selected ? 'ring-1 ring-gray-300' : ''}
            ${isTarget ? 'ring-4 ring-green-400 bg-green-50' : ''}
        `}>
          <FileIcon kind={primaryFileKind} size={30} className="text-[#111111]" />

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

          <span className="text-[9px] text-gray-400 mt-2 font-medium">
            {showMeta && brief.ownerName ? brief.ownerName : (tileTimestamp || formattedTime)}
          </span>
          {showMeta && tileTimestamp && brief.ownerName && (
            <span className="text-[8px] text-gray-400 mt-0.5 font-medium">{tileTimestamp}</span>
          )}

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
                  <FileIcon kind={primaryFileKind} size={100} className="text-gray-200" />
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
  }

  return (
    <>
      <motion.div
        drag={canDragMotion}
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={{ top: -Infinity, left: -Infinity, right: Infinity, bottom: Infinity }}
        onDragStart={handleDragStartMotion}
        onDragEnd={handleDragEndMotion}
        style={{
          ...style,
          x: canDragMotion ? x : undefined,
          y: canDragMotion ? y : undefined,
        }}
        {...sharedProps}
      >
        <div className={`relative mb-4 flex items-center justify-center ${ICON_CAPSULE_CLASS} transition-all duration-150 ease-out
            ${selected ? 'ring-1 ring-gray-300' : ''}
            ${isTarget ? 'ring-4 ring-green-400 bg-green-50' : ''}
        `}>
          <FileIcon kind={primaryFileKind} size={30} className="text-[#111111]" />
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
          <span className="text-[9px] text-gray-400 mt-2 font-medium">
            {showMeta && brief.ownerName ? brief.ownerName : (tileTimestamp || formattedTime)}
          </span>
          {showMeta && tileTimestamp && brief.ownerName && (
            <span className="text-[8px] text-gray-400 mt-0.5 font-medium">{tileTimestamp}</span>
          )}
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
                  <FileIcon kind={primaryFileKind} size={100} className="text-gray-200" />
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
