import type { SolmuNode } from './types';

export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type RoutingMode = 'orthogonal' | 'bezier' | 'direct';

export interface InternalRoutingConfig {
  mode: RoutingMode;
  margin: number;         // Margin around obstacles
  gridSize: number;       // Grid cell size for pathfinding
  cornerRadius?: number;  // For bezier mode - radius of corner curves
}

export interface NodeBounds {
  id: string;
  bounds: Rectangle;
}

// Default node dimensions when not specified
const DEFAULT_NODE_WIDTH = 15;
const DEFAULT_NODE_HEIGHT = 5;

/**
 * Extract bounding boxes from nodes for obstacle detection
 */
export function getNodeBounds(
  nodes: SolmuNode[],
  excludeNodes?: string[]
): NodeBounds[] {
  const excluded = new Set(excludeNodes || []);

  return nodes
    .filter(node => !excluded.has(node.id))
    .map(node => {
      // For now, use default dimensions - could be extended to read from node type config
      const width = DEFAULT_NODE_WIDTH;
      const height = DEFAULT_NODE_HEIGHT;

      return {
        id: node.id,
        bounds: {
          x: node.x - width / 2,
          y: node.y - height / 2,
          width,
          height,
        },
      };
    });
}

/**
 * Check if a point is inside a rectangle (with margin)
 */
function pointInRect(point: Point, rect: Rectangle, margin: number = 0): boolean {
  return (
    point.x >= rect.x - margin &&
    point.x <= rect.x + rect.width + margin &&
    point.y >= rect.y - margin &&
    point.y <= rect.y + rect.height + margin
  );
}

/**
 * Check if a line segment intersects a rectangle
 */
function lineIntersectsRect(
  p1: Point,
  p2: Point,
  rect: Rectangle,
  margin: number = 0
): boolean {
  const expandedRect = {
    x: rect.x - margin,
    y: rect.y - margin,
    width: rect.width + margin * 2,
    height: rect.height + margin * 2,
  };

  // Check if either endpoint is inside the rectangle
  if (pointInRect(p1, expandedRect, 0) || pointInRect(p2, expandedRect, 0)) {
    return true;
  }

  // Check line segment against each edge of the rectangle
  const corners = [
    { x: expandedRect.x, y: expandedRect.y },
    { x: expandedRect.x + expandedRect.width, y: expandedRect.y },
    { x: expandedRect.x + expandedRect.width, y: expandedRect.y + expandedRect.height },
    { x: expandedRect.x, y: expandedRect.y + expandedRect.height },
  ];

  for (let i = 0; i < 4; i++) {
    const c1 = corners[i];
    const c2 = corners[(i + 1) % 4];
    if (lineSegmentsIntersect(p1, p2, c1, c2)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if two line segments intersect
 */
function lineSegmentsIntersect(
  a1: Point,
  a2: Point,
  b1: Point,
  b2: Point
): boolean {
  const d1 = direction(b1, b2, a1);
  const d2 = direction(b1, b2, a2);
  const d3 = direction(a1, a2, b1);
  const d4 = direction(a1, a2, b2);

  if (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  ) {
    return true;
  }

  if (d1 === 0 && onSegment(b1, b2, a1)) return true;
  if (d2 === 0 && onSegment(b1, b2, a2)) return true;
  if (d3 === 0 && onSegment(a1, a2, b1)) return true;
  if (d4 === 0 && onSegment(a1, a2, b2)) return true;

  return false;
}

function direction(p1: Point, p2: Point, p3: Point): number {
  return (p3.x - p1.x) * (p2.y - p1.y) - (p2.x - p1.x) * (p3.y - p1.y);
}

function onSegment(p1: Point, p2: Point, p: Point): boolean {
  return (
    Math.min(p1.x, p2.x) <= p.x &&
    p.x <= Math.max(p1.x, p2.x) &&
    Math.min(p1.y, p2.y) <= p.y &&
    p.y <= Math.max(p1.y, p2.y)
  );
}

/**
 * A* pathfinding node
 */
interface AStarNode {
  x: number;
  y: number;
  g: number;  // Cost from start
  h: number;  // Heuristic to end
  f: number;  // Total cost (g + h)
  parent: AStarNode | null;
}

/**
 * Manhattan distance heuristic
 */
function heuristic(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Euclidean distance
 */
function distance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * Check if a grid cell is blocked by any obstacle
 */
function isBlocked(
  point: Point,
  obstacles: NodeBounds[],
  margin: number
): boolean {
  for (const obstacle of obstacles) {
    if (pointInRect(point, obstacle.bounds, margin)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a path segment is blocked by any obstacle
 */
function isPathBlocked(
  p1: Point,
  p2: Point,
  obstacles: NodeBounds[],
  margin: number
): boolean {
  for (const obstacle of obstacles) {
    if (lineIntersectsRect(p1, p2, obstacle.bounds, margin)) {
      return true;
    }
  }
  return false;
}

/**
 * A* pathfinding algorithm with orthogonal movement
 */
function findPathAStar(
  start: Point,
  end: Point,
  obstacles: NodeBounds[],
  config: InternalRoutingConfig
): Point[] | null {
  const { gridSize, margin } = config;

  // Snap start and end to grid
  const gridStart = {
    x: Math.round(start.x / gridSize) * gridSize,
    y: Math.round(start.y / gridSize) * gridSize,
  };
  const gridEnd = {
    x: Math.round(end.x / gridSize) * gridSize,
    y: Math.round(end.y / gridSize) * gridSize,
  };

  // If direct path is clear, return it
  if (!isPathBlocked(start, end, obstacles, margin)) {
    return [start, end];
  }

  const openSet: AStarNode[] = [];
  const closedSet = new Set<string>();

  const startNode: AStarNode = {
    x: gridStart.x,
    y: gridStart.y,
    g: 0,
    h: heuristic(gridStart, gridEnd),
    f: heuristic(gridStart, gridEnd),
    parent: null,
  };

  openSet.push(startNode);

  // Orthogonal directions (4-way movement)
  const directions = [
    { x: gridSize, y: 0 },
    { x: -gridSize, y: 0 },
    { x: 0, y: gridSize },
    { x: 0, y: -gridSize },
  ];

  // Limit iterations to prevent infinite loops
  const maxIterations = 10000;
  let iterations = 0;

  while (openSet.length > 0 && iterations < maxIterations) {
    iterations++;

    // Find node with lowest f score
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;

    const key = `${current.x},${current.y}`;
    if (closedSet.has(key)) continue;
    closedSet.add(key);

    // Check if we reached the end
    if (
      Math.abs(current.x - gridEnd.x) < gridSize &&
      Math.abs(current.y - gridEnd.y) < gridSize
    ) {
      // Reconstruct path
      const path: Point[] = [end];
      let node: AStarNode | null = current;

      while (node !== null) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }

      // Replace first point with actual start
      path[0] = start;

      return path;
    }

    // Explore neighbors
    for (const dir of directions) {
      const neighborPos = {
        x: current.x + dir.x,
        y: current.y + dir.y,
      };

      const neighborKey = `${neighborPos.x},${neighborPos.y}`;

      if (closedSet.has(neighborKey)) continue;
      if (isBlocked(neighborPos, obstacles, margin)) continue;

      // Check if path to neighbor is clear
      if (isPathBlocked(
        { x: current.x, y: current.y },
        neighborPos,
        obstacles,
        margin
      )) {
        continue;
      }

      const g = current.g + gridSize;
      const h = heuristic(neighborPos, gridEnd);
      const f = g + h;

      // Check if neighbor is already in open set with lower cost
      const existingIndex = openSet.findIndex(
        n => n.x === neighborPos.x && n.y === neighborPos.y
      );

      if (existingIndex !== -1) {
        if (openSet[existingIndex].g <= g) continue;
        openSet.splice(existingIndex, 1);
      }

      openSet.push({
        x: neighborPos.x,
        y: neighborPos.y,
        g,
        h,
        f,
        parent: current,
      });
    }
  }

  // No path found - return direct line as fallback
  return [start, end];
}

/**
 * Simplify path by removing redundant collinear points
 */
function simplifyPath(path: Point[]): Point[] {
  if (path.length <= 2) return path;

  const simplified: Point[] = [path[0]];

  for (let i = 1; i < path.length - 1; i++) {
    const prev = simplified[simplified.length - 1];
    const curr = path[i];
    const next = path[i + 1];

    // Check if points are collinear
    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;

    // Cross product - if near zero, points are collinear
    const crossProduct = Math.abs(dx1 * dy2 - dx2 * dy1);

    // Points are collinear (same direction) if:
    // - Both segments are vertical (dx1 === 0 && dx2 === 0), OR
    // - Both segments are horizontal going same direction, OR
    // - Zero-length segment, OR
    // - Cross product is near zero (general collinearity check)
    const isCollinear =
      (dx1 === 0 && dx2 === 0) ||
      (dy1 === 0 && dy2 === 0 && Math.sign(dx1) === Math.sign(dx2)) ||
      (dx1 === 0 && dy1 === 0) ||
      (crossProduct < 0.001 && Math.sign(dx1) === Math.sign(dx2) && Math.sign(dy1) === Math.sign(dy2));

    // Keep points where direction changes (not collinear)
    if (!isCollinear) {
      simplified.push(curr);
    }
  }

  simplified.push(path[path.length - 1]);

  return simplified;
}

/**
 * Convert path waypoints to SVG path string - orthogonal mode
 */
function pathToOrthogonalSVG(path: Point[]): string {
  if (path.length === 0) return '';
  if (path.length === 1) return `M${path[0].x},${path[0].y}`;

  let d = `M${path[0].x},${path[0].y}`;

  for (let i = 1; i < path.length; i++) {
    d += ` L${path[i].x},${path[i].y}`;
  }

  return d;
}

/**
 * Convert path waypoints to SVG path with rounded corners (bezier mode)
 */
function pathToBezierSVG(path: Point[], cornerRadius: number = 5): string {
  if (path.length === 0) return '';
  if (path.length === 1) return `M${path[0].x},${path[0].y}`;
  if (path.length === 2) {
    // For two points, create a smooth bezier curve
    const [p1, p2] = path;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    // Control points for smooth curve
    const cx1 = p1.x + dx * 0.3;
    const cy1 = p1.y;
    const cx2 = p2.x - dx * 0.3;
    const cy2 = p2.y;

    return `M${p1.x},${p1.y} C${cx1},${cy1} ${cx2},${cy2} ${p2.x},${p2.y}`;
  }

  let d = `M${path[0].x},${path[0].y}`;

  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    const next = path[i + 1];

    // Calculate direction vectors
    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;

    // Calculate segment lengths
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

    // Limit corner radius to half of shortest segment
    const maxRadius = Math.min(len1 / 2, len2 / 2, cornerRadius);

    if (maxRadius < 0.1) {
      // No room for curve, use sharp corner
      d += ` L${curr.x},${curr.y}`;
    } else {
      // Normalized direction vectors
      const nx1 = dx1 / len1;
      const ny1 = dy1 / len1;
      const nx2 = dx2 / len2;
      const ny2 = dy2 / len2;

      // Points where curve starts and ends
      const startX = curr.x - nx1 * maxRadius;
      const startY = curr.y - ny1 * maxRadius;
      const endX = curr.x + nx2 * maxRadius;
      const endY = curr.y + ny2 * maxRadius;

      // Line to start of curve
      d += ` L${startX},${startY}`;

      // Quadratic bezier through corner
      d += ` Q${curr.x},${curr.y} ${endX},${endY}`;
    }
  }

  // Line to final point
  d += ` L${path[path.length - 1].x},${path[path.length - 1].y}`;

  return d;
}

/**
 * Create a simple direct bezier curve between two points
 */
function directBezierSVG(start: Point, end: Point): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  // Determine control point positioning based on direction
  // For horizontal-ish connections, use horizontal control points
  // For vertical-ish connections, use vertical control points
  const isHorizontal = Math.abs(dx) > Math.abs(dy);

  let cx1, cy1, cx2, cy2;

  if (isHorizontal) {
    cx1 = start.x + dx * 0.4;
    cy1 = start.y;
    cx2 = end.x - dx * 0.4;
    cy2 = end.y;
  } else {
    cx1 = start.x;
    cy1 = start.y + dy * 0.4;
    cx2 = end.x;
    cy2 = end.y - dy * 0.4;
  }

  return `M${start.x},${start.y} C${cx1},${cy1} ${cx2},${cy2} ${end.x},${end.y}`;
}

/**
 * Main routing function - calculates path avoiding obstacles
 */
export function calculateRoute(
  start: Point,
  end: Point,
  obstacles: NodeBounds[],
  config: InternalRoutingConfig
): string {
  const { mode, cornerRadius = 5 } = config;

  // Direct mode - no obstacle avoidance
  if (mode === 'direct') {
    return directBezierSVG(start, end);
  }

  // Find path using A*
  const path = findPathAStar(start, end, obstacles, config);

  if (!path || path.length === 0) {
    return directBezierSVG(start, end);
  }

  // Simplify the path
  const simplified = simplifyPath(path);

  // Convert to SVG based on mode
  if (mode === 'orthogonal') {
    return pathToOrthogonalSVG(simplified);
  } else {
    return pathToBezierSVG(simplified, cornerRadius);
  }
}

/**
 * Calculate orthogonal route with smart corner placement
 * This creates clean right-angle routes without A* overhead for simple cases
 */
export function calculateSimpleOrthogonalRoute(
  start: Point,
  end: Point,
  obstacles: NodeBounds[],
  margin: number
): Point[] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  // Try horizontal-first routing
  const midH = { x: end.x, y: start.y };
  if (!isPathBlocked(start, midH, obstacles, margin) &&
      !isPathBlocked(midH, end, obstacles, margin)) {
    return [start, midH, end];
  }

  // Try vertical-first routing
  const midV = { x: start.x, y: end.y };
  if (!isPathBlocked(start, midV, obstacles, margin) &&
      !isPathBlocked(midV, end, obstacles, margin)) {
    return [start, midV, end];
  }

  // Try center horizontal routing
  const midY = start.y + dy / 2;
  const mid1 = { x: start.x, y: midY };
  const mid2 = { x: end.x, y: midY };
  if (!isPathBlocked(start, mid1, obstacles, margin) &&
      !isPathBlocked(mid1, mid2, obstacles, margin) &&
      !isPathBlocked(mid2, end, obstacles, margin)) {
    return [start, mid1, mid2, end];
  }

  // Try center vertical routing
  const midX = start.x + dx / 2;
  const mid3 = { x: midX, y: start.y };
  const mid4 = { x: midX, y: end.y };
  if (!isPathBlocked(start, mid3, obstacles, margin) &&
      !isPathBlocked(mid3, mid4, obstacles, margin) &&
      !isPathBlocked(mid4, end, obstacles, margin)) {
    return [start, mid3, mid4, end];
  }

  // Fallback to direct path
  return [start, end];
}
