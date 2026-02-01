import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';

export interface MenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
  submenu?: MenuItem[];
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [openSubmenuIndex, setOpenSubmenuIndex] = useState<number | null>(null);
  const [submenuPosition, setSubmenuPosition] = useState<{ x: number; y: number } | null>(null);

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

  const handleSubmenuHover = (index: number, event: React.MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setOpenSubmenuIndex(index);
    // Position submenu to the right of the parent item
    const subX = rect.right + 4;
    const subY = rect.top;
    setSubmenuPosition({ x: subX, y: subY });
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[200px] bg-white rounded-lg shadow-sm border border-gray-100/80 py-1 flex flex-col animate-in fade-in zoom-in-95 duration-75 text-sm"
      style={style}
    >
      {items.map((item, index) => {
        if (item.separator) {
          return <div key={index} className="h-px bg-gray-100 my-1" />;
        }

        const hasSubmenu = item.submenu && item.submenu.length > 0;

        return (
          <div
            key={index}
            className="relative"
            onMouseEnter={(e) => hasSubmenu && handleSubmenuHover(index, e)}
            onMouseLeave={() => hasSubmenu && setOpenSubmenuIndex(null)}
          >
            <button
              disabled={item.disabled}
              onClick={(e) => {
                e.stopPropagation();
                if (!item.disabled && !hasSubmenu) {
                  item.onClick();
                  onClose();
                }
              }}
              className={`w-full px-4 py-2 text-left transition-colors flex items-center justify-between
                ${item.disabled
                  ? 'text-gray-300 cursor-not-allowed'
                  : item.danger
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-[#111111] hover:bg-gray-50'
                }
              `}
            >
              <span>{item.label}</span>
              {hasSubmenu && <ChevronRight size={14} className="text-gray-400" />}
            </button>

            {/* Submenu */}
            {hasSubmenu && openSubmenuIndex === index && submenuPosition && (
              <div
                className="fixed z-[10000] min-w-[180px] max-h-[300px] overflow-y-auto bg-white rounded-lg shadow-sm border border-gray-100/80 py-1 flex flex-col text-sm"
                style={{
                  top: submenuPosition.y,
                  left: submenuPosition.x + 200 > window.innerWidth ? submenuPosition.x - 380 : submenuPosition.x,
                }}
              >
                {item.submenu!.map((subItem, subIndex) => (
                  <button
                    key={subIndex}
                    onClick={(e) => {
                      e.stopPropagation();
                      subItem.onClick();
                      onClose();
                    }}
                    className={`px-4 py-2 text-left transition-colors hover:bg-gray-50 text-[#111111]`}
                  >
                    {subItem.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};