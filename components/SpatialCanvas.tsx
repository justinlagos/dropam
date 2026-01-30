import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface SpatialCanvasProps {
  children: React.ReactNode;
  onLassoSelect?: (rect: { x: number, y: number, width: number, height: number }) => void;
  onCanvasClick?: () => void;
  onCanvasContextMenu?: (e: React.MouseEvent) => void;
}

// Mock Cursors for "Live Presence"
const MOCK_CURSORS = [
    { id: 'c1', name: 'Ade', color: '#FF3B30' },
    { id: 'c2', name: 'Sarah', color: '#007AFF' },
    { id: 'c3', name: 'Mike', color: '#34C759' },
];

export const SpatialCanvas: React.FC<SpatialCanvasProps> = ({ 
    children, 
    onLassoSelect, 
    onCanvasClick,
    onCanvasContextMenu
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [cursors, setCursors] = useState<{id: string, x: number, y: number}[]>([]);
  const [selectionBox, setSelectionBox] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null);

  // Live Cursor Simulation
  useEffect(() => {
    const interval = setInterval(() => {
        setCursors(MOCK_CURSORS.map(c => ({
            id: c.id,
            // Random walk around center
            x: (window.innerWidth / 2) + (Math.random() - 0.5) * 800,
            y: (window.innerHeight / 2) + (Math.random() - 0.5) * 600
        })));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard Listeners (Space for Pan)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) setIsSpacePressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpacePressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Zoom Handler (Wheel)
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
       // Zoom
       e.preventDefault();
       const zoomSensitivity = 0.001;
       const newScale = Math.min(Math.max(0.2, transform.scale - e.deltaY * zoomSensitivity), 3);
       setTransform(prev => ({ ...prev, scale: newScale }));
    } else if (isSpacePressed) {
       // Pan via wheel if space is pressed
       setTransform(prev => ({
           ...prev,
           x: prev.x - e.deltaX,
           y: prev.y - e.deltaY
       }));
    }
  };

  // Pointer Events (Pan & Lasso)
  const handlePointerDown = (e: React.PointerEvent) => {
     // Check if clicking on background
     if ((e.target as HTMLElement).closest('.draggable-item')) return;
     if ((e.target as HTMLElement).closest('.stack-item')) return;
     if (e.button === 2) return; // Let Context Menu handle right click

     onCanvasClick?.();

     if (isSpacePressed || e.button === 1) { // Middle click or Space+Left
         setIsPanning(true);
         (e.target as HTMLElement).setPointerCapture(e.pointerId);
     } else {
         // Start Lasso
         const rect = containerRef.current?.getBoundingClientRect();
         if (!rect) return;
         // Calculate start position relative to canvas content
         const startX = (e.clientX - rect.left - transform.x) / transform.scale;
         const startY = (e.clientY - rect.top - transform.y) / transform.scale;
         
         setSelectionBox({
             startX,
             startY,
             currentX: startX,
             currentY: startY,
         });
         (e.target as HTMLElement).setPointerCapture(e.pointerId);
     }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
      if (isPanning) {
          setTransform(prev => ({
              ...prev,
              x: prev.x + e.movementX,
              y: prev.y + e.movementY
          }));
      } else if (selectionBox) {
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;
          const currentX = (e.clientX - rect.left - transform.x) / transform.scale;
          const currentY = (e.clientY - rect.top - transform.y) / transform.scale;

          setSelectionBox(prev => prev ? ({
              ...prev,
              currentX,
              currentY
          }) : null);
      }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
      setIsPanning(false);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      
      if (selectionBox) {
          const x = Math.min(selectionBox.startX, selectionBox.currentX);
          const y = Math.min(selectionBox.startY, selectionBox.currentY);
          const width = Math.abs(selectionBox.currentX - selectionBox.startX);
          const height = Math.abs(selectionBox.currentY - selectionBox.startY);
          
          if (onLassoSelect) {
              // If box is tiny, treat as click/clear/cancel
              if (width < 5 && height < 5) {
                   onLassoSelect({ x: 0, y: 0, width: 0, height: 0 }); 
              } else {
                   onLassoSelect({ x, y, width, height });
              }
          }
          setSelectionBox(null);
      }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
      // If clicking background
      if (!(e.target as HTMLElement).closest('.draggable-item')) {
          e.preventDefault();
          onCanvasContextMenu?.(e);
      }
  };

  return (
    <div 
        className={`w-full h-full overflow-hidden relative bg-[#F5F5F7] ${isSpacePressed ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onContextMenu={handleContextMenu}
    >
        {/* Infinite Canvas Container */}
        <motion.div 
            ref={containerRef}
            className="w-full h-full origin-top-left will-change-transform"
            style={{
                x: transform.x,
                y: transform.y,
                scale: transform.scale
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
            {/* Render Items */}
            {children}

            {/* Lasso Selection Visualization */}
            {selectionBox && (
                <div 
                    className="absolute border border-blue-500 bg-blue-500/10 z-[100] pointer-events-none rounded-md"
                    style={{
                        left: Math.min(selectionBox.startX, selectionBox.currentX),
                        top: Math.min(selectionBox.startY, selectionBox.currentY),
                        width: Math.abs(selectionBox.currentX - selectionBox.startX),
                        height: Math.abs(selectionBox.currentY - selectionBox.startY)
                    }}
                />
            )}
        </motion.div>
        
        {/* Live Cursors Overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
             {cursors.map(c => (
                 <motion.div 
                    key={c.id}
                    className="absolute flex items-center gap-2"
                    initial={{ x: c.x, y: c.y, opacity: 0 }}
                    animate={{ x: c.x, y: c.y, opacity: 1 }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                 >
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19177L11.7841 12.3673H5.65376Z" fill={MOCK_CURSORS.find(mc => mc.id === c.id)?.color} stroke="white"/>
                     </svg>
                     <div 
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm"
                        style={{ backgroundColor: MOCK_CURSORS.find(mc => mc.id === c.id)?.color }}
                     >
                         {MOCK_CURSORS.find(mc => mc.id === c.id)?.name}
                     </div>
                 </motion.div>
             ))}
        </div>
        
        {/* Controls Hint */}
        <div className="absolute bottom-6 left-6 text-xs text-gray-400 font-medium pointer-events-none">
            Space + Drag to Pan • CMD + Scroll to Zoom • Right Click for Menu
        </div>
    </div>
  );
};