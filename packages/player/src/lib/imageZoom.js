// Shared pan/zoom transform engine for a single static image: CSS
// transform: scale()/translate() driven by pointer/wheel listeners, no
// canvas or tile-loading. Built for the image lightbox (ARCHITECTURE.md
// 5.3) -- this is the seed of the "shared zoom engine" ARCHITECTURE.md
// 5.4 describes. Phase 5's side-by-side compare block (P1-12) and Phase
// 7's deep-zoom viewer (P2-8) are meant to extend this abstraction, not
// replace it. See DECISIONS.md.

import { useCallback, useRef, useState } from 'react';

export const MIN_ZOOM = 1;
export const DEFAULT_MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;
const WHEEL_ZOOM_SENSITIVITY = 0.0025;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Caps zoom at roughly the point where the source image has no more real
// pixel detail to reveal (1 image pixel == 1 screen pixel), floored so
// small images still allow a modest amount of zoom, and capped at
// DEFAULT_MAX_ZOOM since this is a static image, not a tiled deep-zoom
// viewer with a real resolution ceiling to chase past 400%.
export function computeMaxZoom(naturalWidth, displayedWidth) {
  if (!naturalWidth || !displayedWidth) return DEFAULT_MAX_ZOOM;
  const nativeLimit = naturalWidth / displayedWidth;
  return clamp(nativeLimit, 1.5, DEFAULT_MAX_ZOOM);
}

// Keeps the pan offset from letting the image drift past its own edge at
// the given scale -- at scale 1 there is no valid offset but (0,0).
function clampPan(x, y, scale, containerSize) {
  if (scale <= MIN_ZOOM || !containerSize) return { x: 0, y: 0 };
  const maxOffsetX = (containerSize.width * (scale - 1)) / 2;
  const maxOffsetY = (containerSize.height * (scale - 1)) / 2;
  return { x: clamp(x, -maxOffsetX, maxOffsetX), y: clamp(y, -maxOffsetY, maxOffsetY) };
}

export function useImageZoom({ maxZoom = DEFAULT_MAX_ZOOM } = {}) {
  const [scale, setScaleState] = useState(MIN_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const containerRef = useRef(null);
  const dragRef = useRef(null);
  const pointersRef = useRef(new Map());
  const pinchRef = useRef(null);

  // focal is the pointer/gesture position in container-local coordinates,
  // so zooming feels like it zooms "into" what the user is pointing at
  // rather than always toward the image center.
  const setScale = useCallback(
    (next, focal) => {
      const rect = containerRef.current?.getBoundingClientRect();
      setScaleState((prevScale) => {
        const clamped = clamp(next, MIN_ZOOM, maxZoom);
        if (clamped === prevScale) return prevScale;
        setPan((prevPan) => {
          if (clamped <= MIN_ZOOM) return { x: 0, y: 0 };
          if (!focal || !rect) return clampPan(prevPan.x, prevPan.y, clamped, rect);
          const ratio = clamped / prevScale;
          const dx = (focal.x - rect.width / 2 - prevPan.x) * (ratio - 1);
          const dy = (focal.y - rect.height / 2 - prevPan.y) * (ratio - 1);
          return clampPan(prevPan.x - dx, prevPan.y - dy, clamped, rect);
        });
        return clamped;
      });
    },
    [maxZoom]
  );

  const zoomIn = useCallback(() => setScale(scale + ZOOM_STEP), [scale, setScale]);
  const zoomOut = useCallback(() => setScale(scale - ZOOM_STEP), [scale, setScale]);
  const reset = useCallback(() => {
    setScaleState(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback(
    (e) => {
      e.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();
      const focal = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      // Trackpad pinch is delivered by the browser as a wheel event with
      // ctrlKey set; a plain mouse wheel has no ctrlKey. Both drive zoom
      // the same way here, just at different natural sensitivities.
      const delta = -e.deltaY * WHEEL_ZOOM_SENSITIVITY * Math.max(scale, MIN_ZOOM) * (e.ctrlKey ? 2 : 1);
      setScale(scale + delta, focal);
    },
    [scale, setScale]
  );

  const handlePointerDown = useCallback((e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2) {
      // Second finger down: switch from pan to pinch-zoom.
      dragRef.current = null;
      setIsPanning(false);
      const pts = Array.from(pointersRef.current.values());
      const rect = containerRef.current.getBoundingClientRect();
      pinchRef.current = {
        startDist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
        startScale: scale,
        center: {
          x: (pts[0].x + pts[1].x) / 2 - rect.left,
          y: (pts[0].y + pts[1].y) / 2 - rect.top,
        },
      };
    } else if (pointersRef.current.size === 1 && scale > MIN_ZOOM) {
      dragRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, originX: pan.x, originY: pan.y };
      setIsPanning(true);
    }
  }, [scale, pan]);

  const handlePointerMove = useCallback(
    (e) => {
      if (!pointersRef.current.has(e.pointerId)) return;
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pinchRef.current && pointersRef.current.size === 2) {
        const pts = Array.from(pointersRef.current.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (pinchRef.current.startDist > 0) {
          const ratio = dist / pinchRef.current.startDist;
          setScale(pinchRef.current.startScale * ratio, pinchRef.current.center);
        }
        return;
      }

      if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPan(clampPan(dragRef.current.originX + dx, dragRef.current.originY + dy, scale, rect));
    },
    [scale, setScale]
  );

  const endPointer = useCallback((e) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
      setIsPanning(false);
    }
  }, []);

  return {
    containerRef,
    scale,
    pan,
    isPanning,
    zoomIn,
    zoomOut,
    reset,
    setScale,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp: endPointer,
    handlePointerCancel: endPointer,
  };
}
