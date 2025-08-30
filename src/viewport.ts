export interface Point2D {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type CoordinateOrigin = 'top-left' | 'bottom-left' | 'center';
export type Units = 'px' | 'mm' | 'in' | 'mil' | 'units';

export interface ViewportConfig {
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
    size: number; // in world units
    visible: boolean;
    snap: boolean;
  };
}

export class SolmuViewport {
  private config: ViewportConfig;
  
  constructor(config: ViewportConfig) {
    this.config = { ...config };
  }
  
  // Update viewport configuration
  updateConfig(updates: Partial<ViewportConfig>) {
    this.config = { ...this.config, ...updates };
  }
  
  // Convert screen coordinates to world coordinates
  screenToWorld(screenX: number, screenY: number): Point2D {
    const { width, height, worldBounds, zoom, pan, origin } = this.config;
    
    // Normalize screen coordinates (0-1)
    const normalizedX = screenX / width;
    const normalizedY = screenY / height;
    
    // Apply zoom and pan
    const zoomedX = (normalizedX - 0.5) / zoom + 0.5 + pan.x;
    const zoomedY = (normalizedY - 0.5) / zoom + 0.5 + pan.y;
    
    // Convert to world coordinates
    let worldX = worldBounds.x + zoomedX * worldBounds.width;
    let worldY = worldBounds.y + zoomedY * worldBounds.height;
    
    // Handle different coordinate origins
    if (origin === 'bottom-left') {
      worldY = worldBounds.y + worldBounds.height - zoomedY * worldBounds.height;
    } else if (origin === 'center') {
      worldX = worldBounds.x + (zoomedX - 0.5) * worldBounds.width;
      worldY = worldBounds.y + (0.5 - zoomedY) * worldBounds.height;
    }
    
    return { x: worldX, y: worldY };
  }
  
  // Convert world coordinates to screen coordinates
  worldToScreen(worldX: number, worldY: number): Point2D {
    const { width, height, worldBounds, zoom, pan, origin } = this.config;
    
    let normalizedX = (worldX - worldBounds.x) / worldBounds.width;
    let normalizedY = (worldY - worldBounds.y) / worldBounds.height;
    
    // Handle different coordinate origins
    if (origin === 'bottom-left') {
      normalizedY = 1 - normalizedY;
    } else if (origin === 'center') {
      normalizedX = normalizedX + 0.5;
      normalizedY = 0.5 - normalizedY;
    }
    
    // Apply zoom and pan (inverse)
    const zoomedX = (normalizedX - 0.5 - pan.x) * zoom + 0.5;
    const zoomedY = (normalizedY - 0.5 - pan.y) * zoom + 0.5;
    
    // Convert to screen coordinates
    const screenX = zoomedX * width;
    const screenY = zoomedY * height;
    
    return { x: screenX, y: screenY };
  }
  
  // Snap point to grid if enabled
  snapToGrid(worldPoint: Point2D): Point2D {
    const { grid } = this.config;
    
    if (!grid?.snap) {
      return worldPoint;
    }
    
    const snappedX = Math.round(worldPoint.x / grid.size) * grid.size;
    const snappedY = Math.round(worldPoint.y / grid.size) * grid.size;
    
    return { x: snappedX, y: snappedY };
  }
  
  // Convert units (for display)
  formatCoordinate(value: number): string {
    const { units } = this.config;
    
    switch (units) {
      case 'mm':
        return `${value.toFixed(2)}mm`;
      case 'in':
        return `${value.toFixed(3)}"`;
      case 'mil':
        return `${(value * 1000).toFixed(0)}mil`;
      case 'px':
        return `${Math.round(value)}px`;
      default:
        return value.toFixed(2);
    }
  }
  
  // Zoom operations
  zoomIn(factor: number = 1.2) {
    this.config.zoom *= factor;
  }
  
  zoomOut(factor: number = 1.2) {
    this.config.zoom /= factor;
  }
  
  // Pan operations
  panBy(deltaX: number, deltaY: number) {
    this.config.pan.x += deltaX / this.config.zoom;
    this.config.pan.y += deltaY / this.config.zoom;
  }
  
  // Fit content to view
  fitToView(contentBounds: Bounds, margin: number = 0.1) {
    const zoomX = this.config.width / (contentBounds.width * (1 + margin));
    const zoomY = this.config.height / (contentBounds.height * (1 + margin));
    
    this.config.zoom = Math.min(zoomX, zoomY);
    
    // Center the content
    this.config.pan.x = (contentBounds.x + contentBounds.width / 2 - this.config.worldBounds.x) / this.config.worldBounds.width - 0.5;
    this.config.pan.y = (contentBounds.y + contentBounds.height / 2 - this.config.worldBounds.y) / this.config.worldBounds.height - 0.5;
  }
  
  // Get current viewport configuration
  getConfig(): Readonly<ViewportConfig> {
    return { ...this.config };
  }
  
  // Generate SVG viewBox string with zoom and pan applied
  getViewBox(): string {
    const { worldBounds, zoom, pan } = this.config;
    
    // Calculate visible world area based on zoom and pan
    const viewWidth = worldBounds.width / zoom;
    const viewHeight = worldBounds.height / zoom;
    
    // Calculate center point with pan offset
    const centerX = worldBounds.x + worldBounds.width / 2 + pan.x * worldBounds.width;
    const centerY = worldBounds.y + worldBounds.height / 2 + pan.y * worldBounds.height;
    
    // Calculate viewBox bounds
    const viewX = centerX - viewWidth / 2;
    const viewY = centerY - viewHeight / 2;
    
    return `${viewX} ${viewY} ${viewWidth} ${viewHeight}`;
  }
  
  // Generate grid lines for rendering
  generateGridLines(): Array<{ x1: number; y1: number; x2: number; y2: number }> {
    const { grid, worldBounds } = this.config;
    
    if (!grid?.visible) {
      return [];
    }
    
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    const { x, y, width, height } = worldBounds;
    
    // Vertical lines
    const startX = Math.floor(x / grid.size) * grid.size;
    for (let lineX = startX; lineX <= x + width; lineX += grid.size) {
      if (lineX >= x && lineX <= x + width) {
        lines.push({
          x1: lineX,
          y1: y,
          x2: lineX,
          y2: y + height
        });
      }
    }
    
    // Horizontal lines
    const startY = Math.floor(y / grid.size) * grid.size;
    for (let lineY = startY; lineY <= y + height; lineY += grid.size) {
      if (lineY >= y && lineY <= y + height) {
        lines.push({
          x1: x,
          y1: lineY,
          x2: x + width,
          y2: lineY
        });
      }
    }
    
    return lines;
  }
}