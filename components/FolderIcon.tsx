import React, { useState, useEffect } from 'react';
import { Folder as FolderIconSvg } from 'lucide-react';
import { motion, useMotionValue } from 'framer-motion';
import { Folder, COLORS } from '../types';
import { BRIEF_DROP_TYPE } from './BriefIcon';

interface FolderIconProps {
  folder: Folder;
  itemCount: number;
  selected?: boolean;
  isTarget?: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDragEnd?: (e: any, info: any) => void;
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
  onDragEnd,
  onBriefDrop,
  style
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isDropTarget, setIsDropTarget] = useState(false);

  // Use motion values for smooth, snap-free dragging
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Reset motion values when folder position changes externally
  useEffect(() => {
    x.set(0);
    y.set(0);
  }, [folder.position?.x, folder.position?.y]);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (event: any, info: any) => {
    setIsDragging(false);
    if (onDragEnd) {
      // Calculate the total offset from original position
      const offsetX = x.get();
      const offsetY = y.get();

      // Call onDragEnd with the offset info
      onDragEnd(event, {
        offset: { x: offsetX, y: offsetY },
        point: info.point,
        velocity: info.velocity
      });

      // Reset motion values since the parent will update the actual position
      x.set(0);
      y.set(0);
    }
  };

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
      drag
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={{ top: -Infinity, left: -Infinity, right: Infinity, bottom: Infinity }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        ...style,
        x,
        y,
      }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      whileHover={{ scale: 1.02 }}
      animate={isTarget || isDropTarget ? { scale: 1.1 } : isDragging ? { scale: 1.05, zIndex: 100 } : { scale: 1 }}
      className={`draggable-item absolute w-[120px] h-[120px] flex flex-col items-center justify-start pt-2 cursor-pointer select-none rounded-xl transition-colors duration-150 ease-out
         ${selected ? 'bg-gray-100/80 ring-1 ring-gray-200' : 'hover:bg-gray-50/80'}
         ${isDragging ? 'cursor-grabbing shadow-2xl' : ''}
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
