/**
 * Folder icon for client canvas. Accepts brief drop to add brief to folder.
 */
import React, { useState } from 'react';
import { Folder as FolderIconSvg } from 'lucide-react';
import { COLORS } from '../types';
import { BRIEF_DROP_TYPE } from './BriefIcon';

interface ClientFolderIconProps {
  folderId: string;
  name: string;
  count: number;
  selected?: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onBriefDrop: (briefId: string) => void;
}

export const ClientFolderIcon: React.FC<ClientFolderIconProps> = ({
  folderId,
  name,
  count,
  selected = false,
  onClick,
  onDoubleClick,
  onContextMenu,
  onBriefDrop,
}) => {
  const [isDropTarget, setIsDropTarget] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes(BRIEF_DROP_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDropTarget(true);
  };

  const handleDragLeave = () => setIsDropTarget(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropTarget(false);
    const briefId = e.dataTransfer.getData(BRIEF_DROP_TYPE);
    if (briefId) onBriefDrop(briefId);
  };

  return (
    <div
      className={`w-[120px] h-[120px] flex flex-col items-center justify-start pt-2 cursor-pointer select-none rounded-xl transition-all duration-150 ease-out shrink-0
        ${selected ? 'bg-gray-100/80 ring-1 ring-gray-200' : 'hover:bg-gray-50/80'}
        ${isDropTarget ? 'ring-2 ring-blue-400 bg-blue-50/80' : ''}
      `}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="relative w-16 h-14 flex items-center justify-center mb-1 rounded-xl pointer-events-none">
        <FolderIconSvg size={56} fill={COLORS.folder} stroke={COLORS.folder} className="drop-shadow-sm" />
        {count > 0 && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-2 text-[10px] font-bold text-black/40">
            {count}
          </div>
        )}
      </div>
      <span className="text-[12px] font-medium text-center w-full truncate px-2 text-[#111111]">
        {name}
      </span>
    </div>
  );
};

