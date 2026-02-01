import React, { useRef, useState, useEffect, useCallback, createContext, useContext } from 'react';
import { motion } from 'framer-motion';
import { clientToWorld, worldToClient } from '../utils/coords';

export type GetWorldFromClient = (clientX: number, clientY: number) => { x: number; y: number };
export type GetClientFromWorld = (worldX: number, worldY: number) => { x: number; y: number };

export interface CanvasTransformAPI {
  screenToWorld: (clientX: number, clientY: number) => { x: number; y: number };
  worldToScreen: (worldX: number, worldY: number) => { x: number; y: number };
}

const CanvasTransformContext = createContext<GetWorldFromClient | null>(null);

export function useCanvasTransform(): GetWorldFromClient | null {
  return useContext(CanvasTransformContext);
}

interface SpatialCanvasProps {
  children: React.ReactNode;
  onLassoSelect?: (rect: { x: number, y: number, width: number, height: number }) => void;
  onCanvasClick?: () => void;
  onCanvasContextMenu?: (e: React.MouseEvent) => void;
}

export const SpatialCanvas: React.FC<SpatialCanvasProps> = ({ 
    children, 
    onLassoSelect, 
    onCanvasClick,
    onCanvasContextMenu
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });

  const getWorldFromClient = useCallback<GetWorldFromClient>((clientX, clientY) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return clientToWorld(clientX, clientY, {
      rect,
      panX: transform.x,
      panY: transform.y,
      zoom: transform.scale,
    });
  }, [transform.x, transform.y, transform.scale]);

  const getClientFromWorld = useCallback<GetClientFromWorld>((worldX, worldY) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return worldToClient(worldX, worldY, {
      rect,
      panX: transform.x,
      panY: transform.y,
      zoom: transform.scale,
    });
  }, [transform.x, transform.y, transform.scale]);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null);

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

  // Zoom Handler (Wheel) - zoom centered on cursor
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
       e.preventDefault();
       const zoomSensitivity = 0.002;
       const delta = -e.deltaY * zoomSensitivity;
       const newScale = Math.min(Math.max(0.2, transform.scale + delta), 3);
       const rect = containerRef.current?.getBoundingClientRect();
       if (rect) {
         const mouseX = e.clientX - rect.left;
         const mouseY = e.clientY - rect.top;
         const scaleFactor = newScale / transform.scale;
         setTransform(prev => ({
           ...prev,
           scale: newScale,
           x: prev.x - (mouseX - prev.x) * (scaleFactor - 1),
           y: prev.y - (mouseY - prev.y) * (scaleFactor - 1)
         }));
       } else {
         setTransform(prev => ({ ...prev, scale: newScale }));
       }
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
    <CanvasTransformContext.Provider value={getWorldFromClient}>
    <div
        ref={wrapperRef}
        className={`w-full h-full overflow-hidden relative bg-white ${isSpacePressed ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
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
            transition={{ duration: 0 }}
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
        
        {/* Controls Hint */}
        <div className="absolute bottom-6 left-6 text-xs text-gray-400 font-medium pointer-events-none">
            Space + Drag to Pan • CMD + Scroll to Zoom • Right Click for Menu
        </div>
    </div>
    </CanvasTransformContext.Provider>
  );
};