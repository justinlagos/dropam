import React, { useState } from 'react';
import { Folder as FolderIconSvg } from 'lucide-react';
import { motion } from 'framer-motion';
import { Folder, COLORS } from '../types';
import { BRIEF_DROP_TYPE } from './BriefIcon';
import { useCanvasTransform } from './SpatialCanvas';
import { useDesktopDrag } from './hooks/useDesktopDrag';

interface FolderIconProps {
  folder: Folder;
  itemCount: number;
  selected?: boolean;
  isTarget?: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  /** Commit world position on drag end. When set, canvas pointer-drag is used. */
  onCommitPosition?: (position: { x: number; y: number }) => void;
  onBriefDrop?: (briefId: string) => void;
  style?: React.CSSProperties;
}

export const FolderIcon: React.FC<FolderIconProps> = ({
  folder,
  itemCount,
  selected = false,
  isTarget = false,
  onClick,
  onDoubleClick,
  onContextMenu,
  onCommitPosition,
  onBriefDrop,
  style
}) => {
  const [isDropTarget, setIsDropTarget] = useState(false);
  const getWorldFromClient = useCanvasTransform();
  const initialPosition = { x: folder.position?.x ?? 0, y: folder.position?.y ?? 0 };
  const canvasDrag = useDesktopDrag({
    initialPosition,
    getWorldFromClient,
    onCommitPosition: onCommitPosition ?? (() => {}),
    enabled: Boolean(onCommitPosition),
  });
  const isDragging = canvasDrag.isDragging;

  // HTML5 Drag & Drop handlers for accepting brief drops
  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(BRIEF_DROP_TYPE)) {
      e.preventDefault();
      e.stopPropagation();
      setIsDropTarget(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropTarget(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropTarget(false);
    const briefId = e.dataTransfer.getData(BRIEF_DROP_TYPE);
    if (briefId && onBriefDrop) {
      onBriefDrop(briefId);
    }
  };

  return (
    <motion.div
      style={{ ...style, ...canvasDrag.style }}
      transition={{ duration: 0 }}
      layout={false}
      onPointerDown={canvasDrag.handlers.onPointerDown}
      onPointerMove={canvasDrag.handlers.onPointerMove}
      onPointerUp={canvasDrag.handlers.onPointerUp}
      onPointerLeave={canvasDrag.handlers.onPointerUp}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      whileHover={{ scale: 1.02 }}
      animate={isTarget || isDropTarget ? { scale: 1.1 } : isDragging ? { zIndex: 100 } : { scale: 1 }}
      className={`draggable-item absolute w-[120px] h-[120px] flex flex-col items-center justify-start pt-2 cursor-pointer select-none rounded-xl transition-colors duration-150 ease-out
         ${selected ? 'bg-gray-100/80 ring-1 ring-gray-200' : 'hover:bg-gray-50/80'}
         ${isDragging ? 'cursor-grabbing' : ''}
         ${isDropTarget ? 'bg-blue-50 ring-2 ring-blue-400' : ''}
      `}
    >
      <div className={`relative w-16 h-14 flex items-center justify-center mb-1 rounded-xl transition-all duration-150 ease-out pointer-events-none
        ${selected ? 'ring-1 ring-gray-300' : ''}
        ${isTarget ? 'ring-4 ring-blue-300 bg-blue-50' : ''}
      `}>
        <FolderIconSvg
          size={56}
          fill={COLORS.folder}
          stroke={COLORS.folder}
          className="drop-shadow-sm"
        />
        {itemCount > 0 && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-2 text-[10px] font-bold text-black/40">
            {itemCount}
          </div>
        )}
      </div>
      <span className="text-[12px] font-medium text-center w-full truncate px-2 rounded transition-colors pointer-events-none text-[#111111]">
        {folder.name}
      </span>
    </motion.div>
  );
};
