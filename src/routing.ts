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

export interface RouteResult {
  path: string;
  labelPoint: Point;
  labelAngle: number; // degrees, tangent direction at label point
  resolvedPoints: Point[]; // full path including start and end
  sourceLabelPoint: Point; // position near source endpoint for labels
  targetLabelPoint: Point; // position near target endpoint for labels
}

export interface InternalRoutingConfig {
  mode: RoutingMode;
  margin: number;         // Margin around obstacles
  gridSize: number;       // Grid cell size for pathfinding
  cornerRadius?: number;  // For bezier mode - radius of corner curves
  stubLength?: number;    // Min distance from node before first turn (default: 0)
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
  nodes: SolmuNode<any>[],
  excludeNodes?: string[],
  defaultDimensions?: { width?: number; height?: number }
): NodeBounds[] {
  const excluded = new Set(excludeNodes || []);
  const defW = defaultDimensions?.width ?? DEFAULT_NODE_WIDTH;
  const defH = defaultDimensions?.height ?? DEFAULT_NODE_HEIGHT;

  return nodes
    .filter(node => !excluded.has(node.id))
    .map(node => {
      // Infer dimensions from connector spread, falling back to defaults
      let width = defW;
      let height = defH;
      if (node.connectors && node.connectors.length > 1) {
        const xs = node.connectors.map(c => c.x);
        const ys = node.connectors.map(c => c.y);
        const spanX = Math.max(...xs) - Math.min(...xs);
        const spanY = Math.max(...ys) - Math.min(...ys);
        width = Math.max(defW, spanX + 4);
        height = Math.max(defH, spanY + 4);
      }

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
 * Binary min-heap for A* open set, ordered by f score.
 */
class MinHeap {
  private heap: AStarNode[] = [];

  get size(): number {
    return this.heap.length;
  }

  push(node: AStarNode): void {
    this.heap.push(node);
    this._bubbleUp(this.heap.length - 1);
  }

  pop(): AStarNode | undefined {
    const heap = this.heap;
    if (heap.length === 0) return undefined;
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  private _bubbleUp(i: number): void {
    const heap = this.heap;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[i].f >= heap[parent].f) break;
      const tmp = heap[i];
      heap[i] = heap[parent];
      heap[parent] = tmp;
      i = parent;
    }
  }

  private _sinkDown(i: number): void {
    const heap = this.heap;
    const len = heap.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < len && heap[left].f < heap[smallest].f) smallest = left;
      if (right < len && heap[right].f < heap[smallest].f) smallest = right;
      if (smallest === i) break;
      const tmp = heap[i];
      heap[i] = heap[smallest];
      heap[smallest] = tmp;
      i = smallest;
    }
  }
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
 * A* pathfinding algorithm with orthogonal movement.
 * Uses a binary min-heap for the open set and numeric keys for the closed set.
 */
function findPathAStar(
  start: Point,
  end: Point,
  obstacles: NodeBounds[],
  config: InternalRoutingConfig
): Point[] | null {
  const { gridSize, margin } = config;
  const invGridSize = 1 / gridSize;

  // Snap start and end to grid
  const gridStart = {
    x: Math.round(start.x * invGridSize) * gridSize,
    y: Math.round(start.y * invGridSize) * gridSize,
  };
  const gridEnd = {
    x: Math.round(end.x * invGridSize) * gridSize,
    y: Math.round(end.y * invGridSize) * gridSize,
  };

  // If direct path is clear, return it
  if (!isPathBlocked(start, end, obstacles, margin)) {
    return [start, end];
  }

  // Use numeric grid indices for fast hashing
  // Map grid coordinates to integer indices
  const toKey = (x: number, y: number): string => {
    // Use rounded grid indices to avoid floating point issues
    const gx = Math.round(x * invGridSize);
    const gy = Math.round(y * invGridSize);
    return `${gx},${gy}`;
  };

  const openHeap = new MinHeap();
  const closedSet = new Set<string>();
  // Track best g-score for each position to avoid duplicates in heap
  const gScores = new Map<string, number>();

  const h0 = heuristic(gridStart, gridEnd);
  const startNode: AStarNode = {
    x: gridStart.x,
    y: gridStart.y,
    g: 0,
    h: h0,
    f: h0,
    parent: null,
  };

  const startKey = toKey(gridStart.x, gridStart.y);
  openHeap.push(startNode);
  gScores.set(startKey, 0);

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

  while (openHeap.size > 0 && iterations < maxIterations) {
    iterations++;

    const current = openHeap.pop()!;

    const key = toKey(current.x, current.y);
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
    for (let d = 0; d < 4; d++) {
      const dir = directions[d];
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;

      const neighborKey = toKey(nx, ny);

      if (closedSet.has(neighborKey)) continue;
      if (isBlocked({ x: nx, y: ny }, obstacles, margin)) continue;

      // Check if path to neighbor is clear
      if (isPathBlocked(
        { x: current.x, y: current.y },
        { x: nx, y: ny },
        obstacles,
        margin
      )) {
        continue;
      }

      const g = current.g + gridSize;

      // Skip if we already found a cheaper path to this position
      const existingG = gScores.get(neighborKey);
      if (existingG !== undefined && existingG <= g) continue;
      gScores.set(neighborKey, g);

      const h = heuristic({ x: nx, y: ny }, gridEnd);

      openHeap.push({
        x: nx,
        y: ny,
        g,
        h,
        f: g + h,
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
/**
 * Snap nearly-axis-aligned segments to be exactly axis-aligned.
 * If two consecutive points differ by less than `epsilon` on one axis,
 * the later point is snapped to match the earlier point on that axis.
 * This prevents tiny offsets from creating false bends.
 */
function snapToAxis(path: Point[], epsilon: number = 0.5): Point[] {
  if (path.length < 2) return path;
  const result = path.map(p => ({ ...p }));
  for (let i = 1; i < result.length; i++) {
    const prev = result[i - 1];
    const curr = result[i];
    if (Math.abs(curr.x - prev.x) < epsilon && Math.abs(curr.y - prev.y) >= epsilon) {
      curr.x = prev.x; // nearly vertical → make exactly vertical
    } else if (Math.abs(curr.y - prev.y) < epsilon && Math.abs(curr.x - prev.x) >= epsilon) {
      curr.y = prev.y; // nearly horizontal → make exactly horizontal
    }
  }
  return result;
}

/**
 * Simplify path by removing redundant collinear points.
 * Also removes zero-length segments and merges segments that are
 * collinear (same axis, regardless of direction).
 */
function simplifyPath(path: Point[]): Point[] {
  if (path.length <= 2) return path;

  // First snap near-axis-aligned segments
  const snapped = snapToAxis(path);

  const simplified: Point[] = [snapped[0]];

  for (let i = 1; i < snapped.length - 1; i++) {
    const prev = simplified[simplified.length - 1];
    const curr = snapped[i];
    const next = snapped[i + 1];

    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;

    // Zero-length segment — skip
    if (Math.abs(dx1) < 0.01 && Math.abs(dy1) < 0.01) continue;

    // Both segments on same vertical line (regardless of direction)
    const bothVertical = Math.abs(dx1) < 0.01 && Math.abs(dx2) < 0.01;
    // Both segments on same horizontal line (regardless of direction)
    const bothHorizontal = Math.abs(dy1) < 0.01 && Math.abs(dy2) < 0.01;

    // General collinearity via cross product
    const crossProduct = Math.abs(dx1 * dy2 - dx2 * dy1);
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    // Normalize cross product by segment lengths to get a scale-independent measure
    const normalizedCross = (len1 > 0 && len2 > 0)
      ? crossProduct / (len1 * len2)
      : 0;
    const generalCollinear = normalizedCross < 0.01;

    const isCollinear = bothVertical || bothHorizontal || generalCollinear;

    if (!isCollinear) {
      simplified.push(curr);
    }
  }

  simplified.push(snapped[snapped.length - 1]);

  return simplified;
}

/**
 * Ensure all segments in a path are axis-aligned by inserting mid-points
 * for any diagonal segments (horizontal first, then vertical).
 * This makes resolvedPoints match what pathToOrthogonalSVG renders.
 */
function orthogonalizePoints(path: Point[]): Point[] {
  if (path.length < 2) return path;
  const result: Point[] = [path[0]];
  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    if (prev.x !== curr.x && prev.y !== curr.y) {
      result.push({ x: curr.x, y: prev.y });
    }
    result.push(curr);
  }
  return result;
}

/**
 * Convert path waypoints to SVG path string - orthogonal mode
 */
function pathToOrthogonalSVG(path: Point[]): string {
  if (path.length === 0) return '';
  if (path.length === 1) return `M${path[0].x},${path[0].y}`;

  let d = `M${path[0].x},${path[0].y}`;

  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const curr = path[i];

    // If the segment is already axis-aligned, draw directly
    if (prev.x === curr.x || prev.y === curr.y) {
      d += ` L${curr.x},${curr.y}`;
    } else {
      // Insert a mid-point to make it orthogonal (horizontal first, then vertical)
      d += ` L${curr.x},${prev.y} L${curr.x},${curr.y}`;
    }
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
function directBezierResult(start: Point, end: Point): RouteResult {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const isHorizontal = Math.abs(dx) > Math.abs(dy);

  let cx1, cy1, cx2, cy2;
  if (isHorizontal) {
    cx1 = start.x + dx * 0.4; cy1 = start.y;
    cx2 = end.x - dx * 0.4;   cy2 = end.y;
  } else {
    cx1 = start.x; cy1 = start.y + dy * 0.4;
    cx2 = end.x;   cy2 = end.y - dy * 0.4;
  }

  const path = `M${start.x},${start.y} C${cx1},${cy1} ${cx2},${cy2} ${end.x},${end.y}`;
  const { point: labelPoint, angle: labelAngle } = cubicBezierMidpoint(
    start, { x: cx1, y: cy1 }, { x: cx2, y: cy2 }, end
  );
  const resolvedPoints = [start, end];
  const { source: sourceLabelPoint, target: targetLabelPoint } = endpointLabelPoints(resolvedPoints);
  return { path, labelPoint, labelAngle, resolvedPoints, sourceLabelPoint, targetLabelPoint };
}

/**
 * Walk a polyline and return the point and tangent angle at its midpoint by arc length.
 */
function midpointOfPolyline(points: Point[]): { point: Point; angle: number } {
  if (points.length === 1) return { point: points[0], angle: 0 };

  const lengths: number[] = [];
  let totalLength = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    lengths.push(len);
    totalLength += len;
  }

  const half = totalLength / 2;
  let walked = 0;
  for (let i = 0; i < lengths.length; i++) {
    if (walked + lengths[i] >= half) {
      const t = lengths[i] === 0 ? 0 : (half - walked) / lengths[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      return {
        point: { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) },
        angle: Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI),
      };
    }
    walked += lengths[i];
  }

  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  return {
    point: last,
    angle: Math.atan2(last.y - prev.y, last.x - prev.x) * (180 / Math.PI),
  };
}

/**
 * Compute label positions near the source and target endpoints of a polyline.
 * The label point is offset `distance` along the first/last segment from the endpoint,
 * plus a perpendicular offset to sit beside the edge rather than on it.
 */
function endpointLabelPoints(
  points: Point[],
  distance: number = 8,
  perpOffset: number = 4
): { source: Point; target: Point } {
  if (points.length < 2) {
    const p = points[0] || { x: 0, y: 0 };
    return { source: p, target: p };
  }

  function offsetAlongSegment(from: Point, to: Point): Point {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.01) return from;
    const t = Math.min(distance / len, 0.5); // don't go past midpoint
    const px = from.x + dx * t;
    const py = from.y + dy * t;
    // Perpendicular offset (rotate direction 90° CCW)
    const nx = -dy / len;
    const ny = dx / len;
    return { x: px + nx * perpOffset, y: py + ny * perpOffset };
  }

  const source = offsetAlongSegment(points[0], points[1]);
  const target = offsetAlongSegment(points[points.length - 1], points[points.length - 2]);

  return { source, target };
}

/**
 * Point and tangent angle on a cubic bezier at parameter t (0–1).
 */
function cubicBezierMidpoint(
  p1: Point, c1: Point, c2: Point, p2: Point, t = 0.5
): { point: Point; angle: number } {
  const mt = 1 - t;
  const point = {
    x: mt * mt * mt * p1.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t * t * t * p2.x,
    y: mt * mt * mt * p1.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t * t * t * p2.y,
  };
  // Tangent = derivative of cubic bezier
  const tx = 3 * mt * mt * (c1.x - p1.x) + 6 * mt * t * (c2.x - c1.x) + 3 * t * t * (p2.x - c2.x);
  const ty = 3 * mt * mt * (c1.y - p1.y) + 6 * mt * t * (c2.y - c1.y) + 3 * t * t * (p2.y - c2.y);
  return { point, angle: Math.atan2(ty, tx) * (180 / Math.PI) };
}

/**
 * Infer departure direction from a connector offset relative to its node center.
 * Returns a unit vector pointing outward from the node.
 */
function inferDirection(connectorOffset: Point): Point {
  const { x, y } = connectorOffset;
  // Pick the dominant axis
  if (Math.abs(x) > Math.abs(y)) {
    return { x: x > 0 ? 1 : -1, y: 0 };
  } else if (Math.abs(y) > Math.abs(x)) {
    return { x: 0, y: y > 0 ? 1 : -1 };
  }
  // Diagonal or zero — default to rightward
  return { x: x >= 0 ? 1 : -1, y: 0 };
}

/**
 * Main routing function - calculates path avoiding obstacles
 *
 * sourceOffset / targetOffset are the connector positions relative to their
 * node centers. When provided together with a non-zero stubLength, a straight
 * stub segment is emitted from each endpoint before routing begins.
 */
export function calculateRoute(
  start: Point,
  end: Point,
  obstacles: NodeBounds[],
  config: InternalRoutingConfig,
  sourceOffset?: Point,
  targetOffset?: Point,
): RouteResult {
  const { mode, cornerRadius = 5, stubLength = 0 } = config;

  // Direct mode - no obstacle avoidance
  if (mode === 'direct') {
    return directBezierResult(start, end);
  }

  // Compute stub endpoints if stubLength is set
  let routeStart = start;
  let routeEnd = end;
  let startStub: Point | null = null;
  let endStub: Point | null = null;

  if (stubLength > 0 && sourceOffset) {
    const dir = inferDirection(sourceOffset);
    startStub = { x: start.x + dir.x * stubLength, y: start.y + dir.y * stubLength };
    routeStart = startStub;
  }
  if (stubLength > 0 && targetOffset) {
    const dir = inferDirection(targetOffset);
    endStub = { x: end.x + dir.x * stubLength, y: end.y + dir.y * stubLength };
    routeEnd = endStub;
  }

  // Find path using A*
  const astarPath = findPathAStar(routeStart, routeEnd, obstacles, config);

  if (!astarPath || astarPath.length === 0) {
    // Fallback: still include stubs even on direct fallback
    if (startStub || endStub) {
      const pts: Point[] = [start];
      if (startStub) pts.push(startStub);
      if (endStub) pts.push(endStub);
      pts.push(end);
      if (mode === 'orthogonal') {
        const { point: labelPoint, angle: labelAngle } = midpointOfPolyline(pts);
        const { source: sourceLabelPoint, target: targetLabelPoint } = endpointLabelPoints(pts);
        return { path: pathToOrthogonalSVG(pts), labelPoint, labelAngle, resolvedPoints: pts, sourceLabelPoint, targetLabelPoint };
      }
    }
    return directBezierResult(start, end);
  }

  // Simplify the path
  let simplified = simplifyPath(astarPath);

  // Prepend / append stub segments
  if (startStub) {
    simplified = [start, ...simplified];
  } else {
    simplified[0] = start;
  }
  if (endStub) {
    simplified = [...simplified, end];
  } else {
    simplified[simplified.length - 1] = end;
  }

  // Re-simplify after adding stubs to collapse collinear points
  // (e.g. a straight vertical line with stubs would have 4 collinear points)
  simplified = simplifyPath(simplified);

  // For orthogonal mode, ensure all segments are axis-aligned by inserting
  // mid-points for any diagonal segments, then re-simplify to clean up.
  // This keeps resolvedPoints in sync with the rendered SVG path.
  if (mode === 'orthogonal') {
    simplified = simplifyPath(orthogonalizePoints(simplified));
  }

  const { point: labelPoint, angle: labelAngle } = midpointOfPolyline(simplified);
  const { source: sourceLabelPoint, target: targetLabelPoint } = endpointLabelPoints(simplified);

  // Convert to SVG based on mode
  if (mode === 'orthogonal') {
    return { path: pathToOrthogonalSVG(simplified), labelPoint, labelAngle, resolvedPoints: simplified, sourceLabelPoint, targetLabelPoint };
  } else {
    return { path: pathToBezierSVG(simplified, cornerRadius), labelPoint, labelAngle, resolvedPoints: simplified, sourceLabelPoint, targetLabelPoint };
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

/**
 * Build a route from user-provided waypoints (no auto-routing).
 * Used when an edge has manually-edited waypoints.
 */
export function buildPathFromWaypoints(
  start: Point,
  waypoints: Point[],
  end: Point,
  mode: RoutingMode = 'orthogonal',
  cornerRadius: number = 5
): RouteResult {
  let points = [start, ...waypoints, end];

  // For orthogonal mode, ensure all segments are axis-aligned
  if (mode === 'orthogonal') {
    points = simplifyPath(orthogonalizePoints(points));
  }

  const { point: labelPoint, angle: labelAngle } = midpointOfPolyline(points);

  let path: string;
  if (mode === 'orthogonal') {
    path = pathToOrthogonalSVG(points);
  } else {
    path = pathToBezierSVG(points, cornerRadius);
  }

  const { source: sourceLabelPoint, target: targetLabelPoint } = endpointLabelPoints(points);
  return { path, labelPoint, labelAngle, resolvedPoints: points, sourceLabelPoint, targetLabelPoint };
}
