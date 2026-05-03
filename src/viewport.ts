export type Point2D = {
  x: number;
  y: number;
};

export type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CoordinateOrigin = "top-left" | "bottom-left" | "center";
export type Units = "px" | "mm" | "in" | "mil" | "units";

export type ViewportConfig = {
  // Coordinate system
  origin?: CoordinateOrigin;
  units?: Units;

  // Viewport dimensions (in screen pixels)
  width: number;
  height: number;

  // World bounds (in world units)
  worldBounds: Bounds;

  // Transform state
  zoom: number;
  pan: Point2D;

  // Grid settings
  grid?: {
    size: number;      // visual grid spacing in world units
    snapSize?: number; // snap resolution in world units (defaults to size)
    visible: boolean;
    snap: boolean;
  };
};
// Define grid levels with multipliers - more aggressive spacing when zoomed out
const gridLevels = [
  { threshold: 0.05, multiplier: 200, size: 0.4, opacity: 0.8 },
  { threshold: 0.1, multiplier: 100, size: 0.35, opacity: 0.7 },
  { threshold: 0.2, multiplier: 50, size: 0.3, opacity: 0.6 },
  { threshold: 0.5, multiplier: 20, size: 0.25, opacity: 0.5 },
  { threshold: 1.0, multiplier: 15, size: 0.225, opacity: 0.4 },
  { threshold: 1.0, multiplier: 10, size: 0.2, opacity: 0.4 },
  { threshold: 2.0, multiplier: 5, size: 0.15, opacity: 0.4 },
  { threshold: 3.0, multiplier: 2, size: 0.125, opacity: 0.4 },
  { threshold: 5.0, multiplier: 1, size: 0.1, opacity: 0.4 },
  { threshold: 10.0, multiplier: 0.5, size: 0.1, opacity: 0.3 },
  { threshold: 20.0, multiplier: 0.2, size: 0.1, opacity: 0.3 },
];

export class SolmuViewport {
  #config: ViewportConfig;

  constructor(config: ViewportConfig) {
    this.#config = { ...config };
  }

  // Update viewport configuration
  updateConfig(updates: Partial<ViewportConfig>) {
    this.#config = { ...this.#config, ...updates };
  }

  // Compute the uniform-scale view transform that matches SVG's xMidYMid meet behavior.
  // Returns the viewBox origin (viewX, viewY), uniform scale, and screen offsets.
  #viewTransform() {
    const { width, height, worldBounds, zoom, pan } = this.#config;
    const viewWidth = worldBounds.width / zoom;
    const viewHeight = worldBounds.height / zoom;
    const centerX = worldBounds.x + worldBounds.width / 2 + pan.x * worldBounds.width;
    const centerY = worldBounds.y + worldBounds.height / 2 + pan.y * worldBounds.height;
    const viewX = centerX - viewWidth / 2;
    const viewY = centerY - viewHeight / 2;
    const scale = Math.min(width / viewWidth, height / viewHeight);
    const offsetX = (width - viewWidth * scale) / 2;
    const offsetY = (height - viewHeight * scale) / 2;

    return { viewX, viewY, scale, offsetX, offsetY };
  }

  // Compute the view transform with proper aspect ratio handling
  #computeViewTransform(): {
    viewX: number;
    viewY: number;
    scale: number;
    offsetX: number;
    offsetY: number;
  } {
    const { width, height, worldBounds, zoom, pan } = this.#config;
    const screenAspectRatio = width / height;
    const worldAspectRatio = worldBounds.width / worldBounds.height;

    let viewWidth, viewHeight;

    if (screenAspectRatio > worldAspectRatio) {
      // Screen is wider - fit to height
      viewHeight = worldBounds.height / zoom;
      viewWidth = viewHeight * screenAspectRatio;
    } else {
      // Screen is taller - fit to width
      viewWidth = worldBounds.width / zoom;
      viewHeight = viewWidth / screenAspectRatio;
    }

    const centerX = worldBounds.x + worldBounds.width / 2 + pan.x * worldBounds.width;
    const centerY = worldBounds.y + worldBounds.height / 2 + pan.y * worldBounds.height;
    const viewX = centerX - viewWidth / 2;
    const viewY = centerY - viewHeight / 2;

    const scale = Math.min(width / viewWidth, height / viewHeight);
    const offsetX = (width - viewWidth * scale) / 2;
    const offsetY = (height - viewHeight * scale) / 2;

    return { viewX, viewY, scale, offsetX, offsetY };
  }

  // Convert screen coordinates to world coordinates
  screenToWorld(screenX: number, screenY: number): Point2D {
    const { viewX, viewY, scale, offsetX, offsetY } = this.#computeViewTransform();
    return {
      x: (screenX - offsetX) / scale + viewX,
      y: (screenY - offsetY) / scale + viewY,
    };
  }

  // Convert world coordinates to screen coordinates
  worldToScreen(worldX: number, worldY: number): Point2D {
    const { viewX, viewY, scale, offsetX, offsetY } = this.#computeViewTransform();
    return {
      x: (worldX - viewX) * scale + offsetX,
      y: (worldY - viewY) * scale + offsetY,
    };
  }

  // Get current effective grid size based on zoom
  getEffectiveGridSize(): number {
    const { grid, zoom } = this.#config;

    if (!grid) return 1;

    const baseGridSize = grid.size;
    // const gridLevels = [
    //   { threshold: 0.1, multiplier: 50 },
    //   { threshold: 0.2, multiplier: 20 },
    //   { threshold: 0.5, multiplier: 10 },
    //   { threshold: 1.0, multiplier: 5 },
    //   { threshold: 2.0, multiplier: 1 },
    //   { threshold: 5.0, multiplier: 0.5 },
    //   { threshold: 10.0, multiplier: 0.2 },
    // ];

    let multiplier = 0.2; // Default to finest grid
    for (const level of gridLevels) {
      if (zoom <= level.threshold) {
        multiplier = level.multiplier;
        break;
      }
    }

    return baseGridSize * multiplier;
  }

  // Snap point to grid if enabled.
  // Always snaps to a fixed world-space resolution (grid.snapSize ?? grid.size),
  // independent of zoom level. The visual grid density (generateGridDots) may
  // differ from the snap resolution.
  snapToGrid(worldPoint: Point2D): Point2D {
    const { grid } = this.#config;

    if (!grid?.snap) {
      return worldPoint;
    }

    const snapSize = grid.snapSize ?? grid.size;
    return {
      x: Math.round(worldPoint.x / snapSize) * snapSize,
      y: Math.round(worldPoint.y / snapSize) * snapSize,
    };
  }

  // Convert units (for display)
  formatCoordinate(value: number): string {
    const { units } = this.#config;

    switch (units) {
      case "mm":
        return `${value.toFixed(2)}mm`;
      case "in":
        return `${value.toFixed(3)}"`;
      case "mil":
        return `${(value * 1000).toFixed(0)}mil`;
      case "px":
        return `${Math.round(value)}px`;
      default:
        return value.toFixed(2);
    }
  }

  // Zoom operations
  zoomIn(factor: number = 1.2) {
    this.#config.zoom *= factor;
  }

  zoomOut(factor: number = 1.2) {
    this.#config.zoom /= factor;
  }

  // Pan operations
  panBy(deltaX: number, deltaY: number) {
    this.#config.pan.x += deltaX / this.#config.zoom;
    this.#config.pan.y += deltaY / this.#config.zoom;
  }

  // Fit content to view
  fitToView(contentBounds: Bounds, margin: number = 0.1) {
    const zoomX = this.#config.width / (contentBounds.width * (1 + margin));
    const zoomY = this.#config.height / (contentBounds.height * (1 + margin));

    this.#config.zoom = Math.min(zoomX, zoomY);

    // Center the content
    this.#config.pan.x =
      (contentBounds.x + contentBounds.width / 2 - this.#config.worldBounds.x) /
        this.#config.worldBounds.width -
      0.5;
    this.#config.pan.y =
      (contentBounds.y +
        contentBounds.height / 2 -
        this.#config.worldBounds.y) /
        this.#config.worldBounds.height -
      0.5;
  }

  // Get current viewport configuration
  getConfig(): Readonly<ViewportConfig> {
    return { ...this.#config };
  }

  // CSS matrix transform that maps world coordinates to screen pixels.
  // Apply this to the HTML node layer wrapper so that CSS px inside the
  // layer equals world units — connectors and HTML nodes then share a
  // coordinate system and stay aligned at any zoom/pan.
  getHTMLLayerTransform(): string {
    const { width, height, worldBounds, zoom, pan } = this.#config;

    // Calculate visible world area matching getViewBox() logic
    const screenAspectRatio = width / height;
    const worldAspectRatio = worldBounds.width / worldBounds.height;

    let viewWidth, viewHeight;

    if (screenAspectRatio > worldAspectRatio) {
      // Screen is wider - fit to height
      viewHeight = worldBounds.height / zoom;
      viewWidth = viewHeight * screenAspectRatio;
    } else {
      // Screen is taller - fit to width
      viewWidth = worldBounds.width / zoom;
      viewHeight = viewWidth / screenAspectRatio;
    }

    const centerX = worldBounds.x + worldBounds.width / 2 + pan.x * worldBounds.width;
    const centerY = worldBounds.y + worldBounds.height / 2 + pan.y * worldBounds.height;
    const viewX = centerX - viewWidth / 2;
    const viewY = centerY - viewHeight / 2;

    const scale = Math.min(width / viewWidth, height / viewHeight);
    const offsetX = (width - viewWidth * scale) / 2;
    const offsetY = (height - viewHeight * scale) / 2;

    const e = -viewX * scale + offsetX;
    const f = -viewY * scale + offsetY;
    return `matrix(${scale}, 0, 0, ${scale}, ${e}, ${f})`;
  }

  // Generate SVG viewBox string with zoom and pan applied
  // Uses same aspect ratio logic as HTML layer transform for alignment
  getViewBox(): string {
    const { width, height, worldBounds, zoom, pan } = this.#config;

    const screenAspectRatio = width / height;
    const worldAspectRatio = worldBounds.width / worldBounds.height;

    let viewWidth, viewHeight;

    if (screenAspectRatio > worldAspectRatio) {
      // Screen is wider - fit to height
      viewHeight = worldBounds.height / zoom;
      viewWidth = viewHeight * screenAspectRatio;
    } else {
      // Screen is taller - fit to width
      viewWidth = worldBounds.width / zoom;
      viewHeight = viewWidth / screenAspectRatio;
    }

    const centerX =
      worldBounds.x + worldBounds.width / 2 + pan.x * worldBounds.width;
    const centerY =
      worldBounds.y + worldBounds.height / 2 + pan.y * worldBounds.height;

    const viewX = centerX - viewWidth / 2;
    const viewY = centerY - viewHeight / 2;

    return `${viewX} ${viewY} ${viewWidth} ${viewHeight}`;
  }

  // Generate grid dots for rendering with adaptive density
  generateGridDots(): Array<{
    x: number;
    y: number;
    size: number;
    opacity: number;
  }> {
    const { grid, worldBounds, zoom, pan, width, height } = this.#config;

    if (!grid?.visible) {
      return [];
    }

    const dots: Array<{ x: number; y: number; size: number; opacity: number }> =
      [];

    // Calculate the actual visible area based on screen dimensions and zoom/pan
    // Use screen aspect ratio to determine how much world space is visible
    const screenAspectRatio = width / height;
    const worldAspectRatio = worldBounds.width / worldBounds.height;

    let viewWidth, viewHeight;

    if (screenAspectRatio > worldAspectRatio) {
      // Screen is wider than world bounds - fit to height, extend width
      viewHeight = worldBounds.height / zoom;
      viewWidth = viewHeight * screenAspectRatio;
    } else {
      // Screen is taller than world bounds - fit to width, extend height
      viewWidth = worldBounds.width / zoom;
      viewHeight = viewWidth / screenAspectRatio;
    }

    const centerX =
      worldBounds.x + worldBounds.width / 2 + pan.x * worldBounds.width;
    const centerY =
      worldBounds.y + worldBounds.height / 2 + pan.y * worldBounds.height;

    const visibleArea = {
      x: centerX - viewWidth / 2,
      y: centerY - viewHeight / 2,
      width: viewWidth,
      height: viewHeight,
    };

    // Calculate adaptive grid size based on zoom level
    // Base grid size (e.g., 2.54mm = 0.1")
    const baseGridSize = grid.size;

    // Define grid levels with multipliers - more aggressive spacing when zoomed out
    // const gridLevels = [
    //   { threshold: 0.05, multiplier: 200, size: 0.4, opacity: 0.8 }, // Ultra zoomed out: 200x grid (508mm)
    //   { threshold: 0.1, multiplier: 100, size: 0.35, opacity: 0.7 }, // Very zoomed out: 100x grid (254mm)
    //   { threshold: 0.2, multiplier: 50, size: 0.3, opacity: 0.6 }, // Zoomed out: 50x grid (127mm)
    //   { threshold: 0.5, multiplier: 20, size: 0.25, opacity: 0.5 }, // Medium-out: 20x grid (50.8mm)
    //   { threshold: 1.0, multiplier: 10, size: 0.2, opacity: 0.4 }, // Medium: 10x grid (25.4mm)
    //   { threshold: 2.0, multiplier: 5, size: 0.15, opacity: 0.4 }, // Normal: 5x grid (12.7mm)
    //   { threshold: 5.0, multiplier: 1, size: 0.1, opacity: 0.4 }, // Zoomed in: 1x grid (2.54mm)
    //   { threshold: 10.0, multiplier: 0.5, size: 0.08, opacity: 0.3 }, // Very zoomed in: 0.5x grid (1.27mm)
    //   { threshold: 20.0, multiplier: 0.2, size: 0.06, opacity: 0.3 }, // Ultra zoomed: 0.2x grid (0.508mm)
    // ];

    // Find appropriate grid level based on zoom
    let currentLevel = gridLevels[gridLevels.length - 1]; // Default to finest grid
    for (const level of gridLevels) {
      if (zoom <= level.threshold) {
        currentLevel = level;
        break;
      }
    }

    const effectiveGridSize = baseGridSize * currentLevel.multiplier;

    // Generate dots at adaptive grid intersections across the visible area
    const startX =
      Math.floor(visibleArea.x / effectiveGridSize) * effectiveGridSize;
    const startY =
      Math.floor(visibleArea.y / effectiveGridSize) * effectiveGridSize;
    const endX = visibleArea.x + visibleArea.width;
    const endY = visibleArea.y + visibleArea.height;

    // Calculate estimated number of dots to avoid performance issues
    const dotsX = Math.ceil((endX - startX) / effectiveGridSize);
    const dotsY = Math.ceil((endY - startY) / effectiveGridSize);
    const estimatedDots = dotsX * dotsY;

    for (let dotX = startX; dotX <= endX; dotX += effectiveGridSize) {
      for (let dotY = startY; dotY <= endY; dotY += effectiveGridSize) {
        dots.push({
          x: dotX,
          y: dotY,
          size: currentLevel.size,
          opacity: currentLevel.opacity,
        });
      }
    }

    return dots;
  }
}
