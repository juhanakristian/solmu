import React from "react";

export type ViewportState = {
  zoom: number;
  pan: { x: number; y: number };
  width: number;
  height: number;
  worldBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  origin?: "top-left" | "bottom-left" | "center";
  units?: "px" | "mm" | "in" | "mil" | "units";
  grid?: {
    size: number;
    snapSize?: number;
    visible: boolean;
    snap: boolean;
  };
};

export type UseSolmuViewportOptions = {
  /** Minimum zoom level (default: 0.1) */
  minZoom?: number;
  /** Maximum zoom level (default: 10) */
  maxZoom?: number;
  /** Zoom speed multiplier for wheel/pinch events (default: 1) */
  zoomSpeed?: number;
  /** Pan speed multiplier for trackpad scroll events (default: 1) */
  panSpeed?: number;
  /** Whether to enable middle-click/ctrl+click drag panning (default: true) */
  enableMousePan?: boolean;
  /** Whether to enable two-finger scroll panning on trackpad (default: true) */
  enableScrollPan?: boolean;
  /** Whether to enable zoom (default: true) */
  enableZoom?: boolean;
};

/**
 * Hook that encapsulates viewport zoom and pan behavior, including
 * proper macOS trackpad support.
 *
 * Gesture handling:
 * - Two-finger scroll on trackpad → pan (regular wheel events)
 * - Pinch-to-zoom on trackpad → zoom centered on cursor (ctrlKey + wheel on macOS)
 * - Mouse wheel scroll (no modifier) → pan vertically; hold Ctrl/Cmd to zoom
 * - Middle-click drag or Ctrl+left-click drag → pan
 *
 * Returns viewport state and a container ref + props to attach to a wrapper div.
 */
export function useSolmuViewport(
  initial: Omit<ViewportState, "width" | "height"> & { width?: number; height?: number },
  options: UseSolmuViewportOptions = {}
) {
  const {
    minZoom = 0.1,
    maxZoom = 10,
    zoomSpeed = 1,
    panSpeed = 1,
    enableMousePan = true,
    enableScrollPan = true,
    enableZoom = true,
  } = options;

  const [viewportConfig, setViewportConfig] = React.useState<ViewportState>(() => ({
    width: initial.width ?? 800,
    height: initial.height ?? 600,
    zoom: initial.zoom,
    pan: initial.pan,
    worldBounds: initial.worldBounds,
    origin: initial.origin,
    units: initial.units,
    grid: initial.grid,
  }));

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const isPanningRef = React.useRef(false);
  const lastPanPosRef = React.useRef({ x: 0, y: 0 });
  // Track isPanning in state too so consumers can set cursor style
  const [isPanning, setIsPanning] = React.useState(false);

  // Clamp zoom to bounds
  const clampZoom = React.useCallback(
    (z: number) => Math.max(minZoom, Math.min(maxZoom, z)),
    [minZoom, maxZoom]
  );

  // Handle wheel events — differentiate trackpad pan vs zoom.
  // Uses native addEventListener with { passive: false } to allow preventDefault.
  const handleWheel = React.useCallback(
    (e: WheelEvent) => {
      e.preventDefault();

      // On macOS, pinch-to-zoom fires wheel events with ctrlKey: true and
      // small deltaY values. Two-finger scroll fires regular wheel events
      // (no ctrlKey) with deltaX and deltaY.
      const isPinchOrCtrl = e.ctrlKey || e.metaKey;

      if (isPinchOrCtrl && enableZoom) {
        // Zoom centered on cursor position.
        // Use exponential scaling so that equal deltaY increments produce
        // equal proportional zoom changes. The 0.005 constant gives a
        // comfortable speed for both trackpad pinch (small deltas) and
        // Ctrl+mouse wheel (larger deltas).
        const delta = -e.deltaY;
        const factor = Math.exp(delta * 0.005 * zoomSpeed);

        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        // Cursor position as fraction of container (0..1)
        const fx = (e.clientX - rect.left) / rect.width;
        const fy = (e.clientY - rect.top) / rect.height;

        setViewportConfig((prev) => {
          const newZoom = clampZoom(prev.zoom * factor);
          if (newZoom === prev.zoom) return prev;

          // The normalized world coordinate under the cursor before zoom:
          //   normX = (fx - 0.5) / prevZoom + 0.5 + pan.x
          // After zoom, we want the same world point under the cursor:
          //   normX = (fx - 0.5) / newZoom + 0.5 + newPan.x
          // Solving for newPan:
          const worldNormX = (fx - 0.5) / prev.zoom + 0.5 + prev.pan.x;
          const worldNormY = (fy - 0.5) / prev.zoom + 0.5 + prev.pan.y;
          const newPanX = worldNormX - 0.5 - (fx - 0.5) / newZoom;
          const newPanY = worldNormY - 0.5 - (fy - 0.5) / newZoom;

          return {
            ...prev,
            zoom: newZoom,
            pan: { x: newPanX, y: newPanY },
          };
        });
      } else if (!isPinchOrCtrl && enableScrollPan) {
        // Pan: two-finger scroll on trackpad, or regular mouse wheel scroll.
        setViewportConfig((prev) => {
          const dx = e.deltaX * panSpeed;
          const dy = e.deltaY * panSpeed;

          // Convert pixel deltas to normalized pan units.
          // Pan is in normalized coordinates where 1.0 = full world bounds width.
          const normalizedDx = dx / prev.width / prev.zoom;
          const normalizedDy = dy / prev.height / prev.zoom;

          return {
            ...prev,
            pan: {
              x: prev.pan.x + normalizedDx,
              y: prev.pan.y + normalizedDy,
            },
          };
        });
      } else if (!isPinchOrCtrl && !enableScrollPan && enableZoom) {
        // Fallback: if scroll-pan is disabled, plain wheel zooms at cursor.
        const delta = -e.deltaY;
        const factor = Math.exp(delta * 0.005 * zoomSpeed);

        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const fx = (e.clientX - rect.left) / rect.width;
        const fy = (e.clientY - rect.top) / rect.height;

        setViewportConfig((prev) => {
          const newZoom = clampZoom(prev.zoom * factor);
          if (newZoom === prev.zoom) return prev;

          const worldNormX = (fx - 0.5) / prev.zoom + 0.5 + prev.pan.x;
          const worldNormY = (fy - 0.5) / prev.zoom + 0.5 + prev.pan.y;
          const newPanX = worldNormX - 0.5 - (fx - 0.5) / newZoom;
          const newPanY = worldNormY - 0.5 - (fy - 0.5) / newZoom;

          return {
            ...prev,
            zoom: newZoom,
            pan: { x: newPanX, y: newPanY },
          };
        });
      }
    },
    [enableZoom, enableScrollPan, zoomSpeed, panSpeed, clampZoom]
  );

  // Mouse pan: middle-click or ctrl+left-click drag
  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      if (!enableMousePan) return;
      if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
        e.preventDefault();
        isPanningRef.current = true;
        lastPanPosRef.current = { x: e.clientX, y: e.clientY };
        setIsPanning(true);
      }
    },
    [enableMousePan]
  );

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent) => {
      if (!isPanningRef.current) return;
      e.preventDefault();

      const deltaX = e.clientX - lastPanPosRef.current.x;
      const deltaY = e.clientY - lastPanPosRef.current.y;
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };

      setViewportConfig((prev) => {
        const normalizedDx = deltaX / prev.width / prev.zoom;
        const normalizedDy = deltaY / prev.height / prev.zoom;
        return {
          ...prev,
          pan: {
            x: prev.pan.x - normalizedDx,
            y: prev.pan.y - normalizedDy,
          },
        };
      });
    },
    []
  );

  const handleMouseUp = React.useCallback(() => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      setIsPanning(false);
    }
  }, []);

  // Global mouseup to catch mouse leaving container during drag
  React.useEffect(() => {
    const handler = () => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        setIsPanning(false);
      }
    };
    document.addEventListener("mouseup", handler);
    document.addEventListener("mouseleave", handler);
    return () => {
      document.removeEventListener("mouseup", handler);
      document.removeEventListener("mouseleave", handler);
    };
  }, []);

  // Attach wheel listener with { passive: false } to allow preventDefault.
  // React's onWheel is passive by default since React 17 and cannot preventDefault.
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [handleWheel]);

  // ResizeObserver for container dimensions
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setViewportConfig((prev) => {
            if (prev.width === width && prev.height === height) return prev;
            return { ...prev, width, height };
          });
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return {
    /** Current viewport config — pass this to useSolmu's config.viewport */
    viewportConfig,
    /** Update viewport config directly (e.g. for programmatic zoom, fit-to-view) */
    setViewportConfig,
    /** Ref to attach to the container div wrapping the canvas */
    containerRef,
    /** Whether the user is currently panning via mouse drag */
    isPanning,
    /** Event handlers and ref to spread on the container div */
    containerProps: {
      ref: containerRef,
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
    },
  };
}
