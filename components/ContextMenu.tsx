import React, { useEffect, useRef } from 'react';

export interface MenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Adjust position if it flows off screen
  const adjustedX = x + 200 > window.innerWidth ? x - 200 : x;
  const adjustedY = y + (items.length * 36) > window.innerHeight ? y - (items.length * 36) : y;

  const style: React.CSSProperties = {
    top: adjustedY,
    left: adjustedX,
  };

  return (
    <div 
      ref={menuRef}
      className="fixed z-[9999] min-w-[200px] bg-white rounded-lg shadow-xl border border-gray-100 py-1 flex flex-col animate-in fade-in zoom-in-95 duration-75 text-sm"
      style={style}
    >
      {items.map((item, index) => {
        if (item.separator) {
            return <div key={index} className="h-px bg-gray-100 my-1" />;
        }
        return (
            <button
            key={index}
            disabled={item.disabled}
            onClick={(e) => { 
                e.stopPropagation(); 
                if (!item.disabled) {
                    item.onClick(); 
                    onClose(); 
                }
            }}
            className={`px-4 py-2 text-left transition-colors flex items-center justify-between
                ${item.disabled 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : item.danger 
                        ? 'text-red-600 hover:bg-red-50' 
                        : 'text-[#111111] hover:bg-gray-50'
                }
            `}
            >
            {item.label}
            </button>
        );
      })}
    </div>
  );
};