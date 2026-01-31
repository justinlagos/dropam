/**
 * Pointer-based desktop drag. No snap, no momentum, no elastic.
 * Persists exact world coordinates. Must comply with docs/DROPAM_CORE.md.
 */
import React, { useCallback, useState, useRef, useEffect } from 'react';

export interface UseDesktopDragOptions {
  initialPosition: { x: number; y: number };
  scale?: number;
  onPositionChange?: (position: { x: number; y: number }) => void;
  onCommitPosition: (position: { x: number; y: number }) => void;
  enabled?: boolean;
}

export function useDesktopDrag({
  initialPosition,
  scale = 1,
  onPositionChange,
  onCommitPosition,
  enabled = true,
}: UseDesktopDragOptions) {
  const [current, setCurrent] = useState<{ x: number; y: number }>(initialPosition);
  const [dragging, setDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startWorld = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!dragging) setCurrent(initialPosition);
  }, [initialPosition.x, initialPosition.y, dragging]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      startPos.current = { x: e.clientX, y: e.clientY };
      startWorld.current = { x: initialPosition.x, y: initialPosition.y };
      setDragging(true);
    },
    [enabled, initialPosition.x, initialPosition.y]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !enabled) return;
      const dx = (e.clientX - startPos.current.x) / scale;
      const dy = (e.clientY - startPos.current.y) / scale;
      const next = { x: startWorld.current.x + dx, y: startWorld.current.y + dy };
      setCurrent(next);
      onPositionChange?.(next);
    },
    [dragging, enabled, scale, onPositionChange]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.currentTarget.releasePointerCapture(e.pointerId);
      if (dragging && enabled) {
        const dx = (e.clientX - startPos.current.x) / scale;
        const dy = (e.clientY - startPos.current.y) / scale;
        const final = { x: startWorld.current.x + dx, y: startWorld.current.y + dy };
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) onCommitPosition(final);
      }
      setDragging(false);
    },
    [dragging, enabled, scale, onCommitPosition]
  );

  const style: React.CSSProperties = {
    position: 'absolute',
    left: current.x,
    top: current.y,
    cursor: enabled ? (dragging ? 'grabbing' : 'grab') : undefined,
  };

  return {
    style,
    handlers: { onPointerDown: handlePointerDown, onPointerMove: handlePointerMove, onPointerUp: handlePointerUp },
  };
}
