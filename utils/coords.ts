/**
 * Canvas coordinate conversion. No rounding or snapping.
 * World coords = canvas content space (same as tile left/top).
 */

export interface CanvasTransform {
  /** Viewport rect of the canvas container (e.g. getBoundingClientRect()). */
  rect: DOMRect;
  /** Pan in viewport pixels. */
  panX: number;
  panY: number;
  /** Zoom scale (1 = 100%). */
  zoom: number;
}

/**
 * Convert client (viewport) coordinates to world (canvas content) coordinates.
 * worldX = (clientX - rect.left - panX) / zoom
 * worldY = (clientY - rect.top - panY) / zoom
 */
export function clientToWorld(
  clientX: number,
  clientY: number,
  t: CanvasTransform
): { x: number; y: number } {
  return {
    x: (clientX - t.rect.left - t.panX) / t.zoom,
    y: (clientY - t.rect.top - t.panY) / t.zoom,
  };
}
