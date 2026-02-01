/**
 * Pointer-based desktop drag. No snap, no momentum, no elastic.
 * Uses world coordinates via getWorldFromClient. Persists exact world coords on drag end only.
 * Updates position directly from pointer so movement is 1:1 with the mouse.
 */
import React, { useCallback, useState, useRef, useEffect } from 'react';

const DRAG_THRESHOLD_WORLD = 5;

export type GetWorldFromClient = (clientX: number, clientY: number) => { x: number; y: number };

export interface UseDesktopDragOptions {
  initialPosition: { x: number; y: number };
  getWorldFromClient: GetWorldFromClient | null;
  onPositionChange?: (position: { x: number; y: number }) => void;
  onCommitPosition: (position: { x: number; y: number }) => void;
  enabled?: boolean;
}

export function useDesktopDrag({
  initialPosition,
  getWorldFromClient,
  onPositionChange,
  onCommitPosition,
  enabled = true,
}: UseDesktopDragOptions) {
  const [current, setCurrent] = useState<{ x: number; y: number }>(initialPosition);
  const [dragging, setDragging] = useState(false);
  const pointerOffsetInWorld = useRef({ x: 0, y: 0 });
  const elementRef = useRef<HTMLElement | null>(null);
  const pointerDownWorld = useRef({ x: 0, y: 0 });
  /** Set true when movement exceeded threshold this gesture; consumer uses to suppress click. */
  const dragConsumedRef = useRef(false);

  useEffect(() => {
    if (!dragging) setCurrent(initialPosition);
  }, [initialPosition.x, initialPosition.y, dragging]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || e.button !== 0 || !getWorldFromClient) return;
      e.preventDefault();
      e.stopPropagation();
      elementRef.current = e.currentTarget as HTMLElement;
      e.currentTarget.setPointerCapture(e.pointerId);
      const world = getWorldFromClient(e.clientX, e.clientY);
      pointerDownWorld.current = world;
      pointerOffsetInWorld.current = {
        x: world.x - initialPosition.x,
        y: world.y - initialPosition.y,
      };
      dragConsumedRef.current = false;
      setDragging(true);
    },
    [enabled, getWorldFromClient, initialPosition.x, initialPosition.y]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !enabled || !getWorldFromClient) return;
      e.preventDefault();
      const world = getWorldFromClient(e.clientX, e.clientY);
      const dx = world.x - pointerDownWorld.current.x;
      const dy = world.y - pointerDownWorld.current.y;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD_WORLD) dragConsumedRef.current = true;
      const next = {
        x: world.x - pointerOffsetInWorld.current.x,
        y: world.y - pointerOffsetInWorld.current.y,
      };
      setCurrent(next);
      onPositionChange?.(next);
      // Update DOM directly so position tracks mouse 1:1 without waiting for React
      const el = elementRef.current;
      if (el) {
        el.style.left = `${next.x}px`;
        el.style.top = `${next.y}px`;
      }
    },
    [dragging, enabled, getWorldFromClient, onPositionChange]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.currentTarget.releasePointerCapture(e.pointerId);
      if (dragging && enabled && getWorldFromClient) {
        const world = getWorldFromClient(e.clientX, e.clientY);
        const final = {
          x: world.x - pointerOffsetInWorld.current.x,
          y: world.y - pointerOffsetInWorld.current.y,
        };
        onCommitPosition(final);
      }
      elementRef.current = null;
      setDragging(false);
    },
    [dragging, enabled, getWorldFromClient, onCommitPosition]
  );

  const style: React.CSSProperties = {
    position: 'absolute',
    left: current.x,
    top: current.y,
    cursor: enabled ? (dragging ? 'grabbing' : 'grab') : undefined,
    transition: 'none', // no animation on position – movement follows pointer exactly
    touchAction: 'none', // prevent scroll/zoom from stealing pointer during drag
  };

  return {
    style,
    handlers: { onPointerDown: handlePointerDown, onPointerMove: handlePointerMove, onPointerUp: handlePointerUp },
    isDragging: dragging,
    /** True when this gesture moved beyond threshold; use in onClick to avoid opening on drag-release. */
    dragConsumedRef,
  };
}
