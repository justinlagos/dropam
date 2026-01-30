import React from 'react';
import { Folder as FolderIconSvg } from 'lucide-react';
import { motion } from 'framer-motion';
import { Folder, COLORS } from '../types';

interface FolderIconProps {
  folder: Folder;
  itemCount: number;
  selected?: boolean;
  isTarget?: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDragEnd?: (e: any, info: any) => void;
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
  style
}) => {
  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      onDragEnd={onDragEnd}
      style={style}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      whileHover={{ scale: 1.02 }}
      whileDrag={{ scale: 1.02, zIndex: 100, cursor: 'grabbing' }}
      animate={isTarget ? { scale: 1.1 } : { scale: 1 }}
      className={`draggable-item absolute w-[120px] h-[120px] flex flex-col items-center justify-start pt-2 cursor-pointer select-none rounded-xl transition-all duration-150 ease-out
         ${selected ? 'bg-gray-100/80 ring-1 ring-gray-200' : 'hover:bg-gray-50/80'}
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
          className={`drop-shadow-sm`}
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