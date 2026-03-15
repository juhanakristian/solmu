# API Reference

## Exports

```ts
// Hook
export { useSolmu } from "solmu";

// Components
export { SolmuCanvas, DefaultEdgeRenderer, DefaultConnectorRenderer, SolmuMarkerDefs } from "solmu";

// Viewport
export { SolmuViewport } from "solmu";

// Routing utilities
export { calculateRoute, getNodeBounds, calculateSimpleOrthogonalRoute, buildPathFromWaypoints } from "solmu";

// Types (all re-exported from top level)
export type {
  SolmuNode, Connector, Edge, EdgeNode, EdgeType, EdgeStyle, EdgeMarker,
  NodeRendererProps, NodeRenderer, ConnectorRendererProps,
  EdgeSegment, SolmuRenderEdge, SolmuRenderNode, EdgeRendererProps,
  SolmuCanvas, SolmuElements, SolmuDragLine, SolmuInteractions,
  UseSolmuParams, UseSolmuResult, RoutingConfig,
  ConnectFunc, NodeMoveFunc,
  Point, Rectangle, NodeBounds, RoutingMode, RouteResult,
  ViewportConfig, CoordinateOrigin, Units,
} from "solmu";
```

---

## `useSolmu(params): UseSolmuResult`

The core hook. Takes graph data and configuration, returns render-ready data.

### Parameters: `UseSolmuParams`

```ts
type UseSolmuParams = {
  data: {
    nodes: SolmuNode<any>[];
    edges: Edge[];
  };
  config: {
    renderers: NodeRenderer[];
    viewport?: ViewportOptions;
    routing?: RoutingConfig;
    connectorRenderer?: React.FC<ConnectorRendererProps>;
  };
  onNodeMove?: (nodeId: string, x: number, y: number) => void;
  onConnect?: (source: EdgeNode, target: EdgeNode) => void;
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
  onEdgePathChange?: (edgeId: string, waypoints: { x: number; y: number }[]) => void;
};
```

### Return: `UseSolmuResult`

```ts
type UseSolmuResult = {
  canvas: SolmuCanvas;
  elements: SolmuElements;
  interactions: SolmuInteractions;
};
```

---

## Data types

### `SolmuNode<TData>`

```ts
type SolmuNode<TData = unknown> = {
  id: string;
  x: number;
  y: number;
  rotation?: number;
  connectors?: Connector[];
  type: string;
  data?: TData;
};
```

### `Connector`

```ts
type Connector = {
  id: string;
  x: number;   // offset from node origin
  y: number;   // offset from node origin
};
```

### `Edge`

```ts
type Edge = {
  source: EdgeNode;
  target: EdgeNode;
  type: EdgeType;
  style?: EdgeStyle;
  waypoints?: { x: number; y: number }[];
};
```

### `EdgeNode`

```ts
type EdgeNode = {
  node: string;       // node ID
  connector: string;  // connector ID
};
```

### `EdgeType`

```ts
type EdgeType = "bezier" | "orthogonal" | "line" | "direct";
```

### `EdgeStyle`

```ts
type EdgeStyle = {
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  opacity?: number;
  markerStart?: EdgeMarker;
  markerEnd?: EdgeMarker;
};
```

### `EdgeMarker`

```ts
type EdgeMarker = "arrow" | "arrow-open" | (string & {});
```

---

## Render types

### `SolmuCanvas`

```ts
type SolmuCanvas = {
  props: React.SVGProps<SVGSVGElement>;  // mouse handlers for the <svg>
  width: number;
  height: number;
  viewBox: string;
  gridDots?: Array<{ x: number; y: number; size: number; opacity: number }>;
  viewport?: {
    screenToWorld: (x: number, y: number) => { x: number; y: number };
    worldToScreen: (x: number, y: number) => { x: number; y: number };
    snapToGrid: (point: { x: number; y: number }) => { x: number; y: number };
    formatCoordinate: (value: number) => string;
    getEffectiveGridSize: () => number;
  };
};
```

### `SolmuRenderNode<TData>`

```ts
type SolmuRenderNode<TData = unknown> = SolmuNode<TData> & {
  transform: string;               // "translate(x, y)"
  isSelected?: boolean;
  isDragging?: boolean;
  renderer: React.FC<NodeRendererProps<any>>;
  nodeProps: NodeRendererProps<TData>;
  connectorProps: ConnectorRendererProps[];
};
```

### `SolmuRenderEdge`

```ts
type SolmuRenderEdge = Edge & {
  id: string;
  path: string;                           // SVG path d attribute
  labelPoint: { x: number; y: number };   // midpoint for label placement
  labelAngle: number;                     // tangent angle at midpoint (degrees)
  sourceLabelPoint: { x: number; y: number }; // near source endpoint for labels
  targetLabelPoint: { x: number; y: number }; // near target endpoint for labels
  isSelected?: boolean;
  onClick?: () => void;
  resolvedWaypoints: { x: number; y: number }[];  // full path as points
  segments: EdgeSegment[];
  onSegmentDragStart?: (segmentIndex: number, event: React.MouseEvent) => void;
};
```

### `EdgeSegment`

```ts
type EdgeSegment = {
  index: number;
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  orientation: "horizontal" | "vertical" | "diagonal";
  draggable: boolean;
};
```

### `SolmuDragLine`

```ts
type SolmuDragLine = {
  path: string;       // SVG bezier path
  isVisible: boolean;
};
```

### `SolmuElements`

```ts
type SolmuElements = {
  nodes: SolmuRenderNode<any>[];
  edges: SolmuRenderEdge[];
  dragLine: SolmuDragLine | null;
};
```

---

## Renderer props

### `NodeRendererProps<TData>`

```ts
type NodeRendererProps<TData = unknown> = {
  node: SolmuNode<TData>;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
};
```

### `ConnectorRendererProps`

```ts
type ConnectorRendererProps = {
  connector: Connector;
  node: SolmuNode<any>;
  isHovered: boolean;
  onMouseDown: () => void;
  onMouseOver: () => void;
  onMouseUp: () => void;
  onMouseOut: () => void;
};
```

### `EdgeRendererProps`

```ts
type EdgeRendererProps = {
  edge: SolmuRenderEdge;
};
```

---

## Routing config

### `RoutingConfig`

```ts
type RoutingConfig = {
  mode?: RoutingMode;         // "orthogonal" | "bezier" | "direct"
  avoidNodes?: boolean;       // default: true
  margin?: number;            // default: 3
  gridSize?: number;          // default: 2.54
  cornerRadius?: number;      // default: 3
  stubLength?: number;        // default: 0
  nodeDimensions?: {
    width?: number;           // default: 15
    height?: number;          // default: 5
  };
};
```

---

## Routing utilities

### `calculateRoute(start, end, obstacles, config, sourceOffset?, targetOffset?)`

Runs A* pathfinding between two points, avoiding obstacles.

```ts
function calculateRoute(
  start: Point,
  end: Point,
  obstacles: NodeBounds[],
  config: InternalRoutingConfig,
  sourceOffset?: Point,
  targetOffset?: Point,
): RouteResult;
```

### `buildPathFromWaypoints(start, waypoints, end, mode?, cornerRadius?)`

Builds a route from explicit waypoints without pathfinding.

```ts
function buildPathFromWaypoints(
  start: Point,
  waypoints: Point[],
  end: Point,
  mode?: RoutingMode,
  cornerRadius?: number,
): RouteResult;
```

### `getNodeBounds(nodes, excludeNodes?, defaultDimensions?)`

Extracts bounding boxes from nodes for obstacle detection.

```ts
function getNodeBounds(
  nodes: SolmuNode<any>[],
  excludeNodes?: string[],
  defaultDimensions?: { width?: number; height?: number },
): NodeBounds[];
```

### `RouteResult`

```ts
type RouteResult = {
  path: string;              // SVG path string
  labelPoint: Point;         // midpoint along the path
  labelAngle: number;        // tangent angle at midpoint (degrees)
  resolvedPoints: Point[];   // full path as point array
  sourceLabelPoint: Point;   // near source endpoint for labels
  targetLabelPoint: Point;   // near target endpoint for labels
};
```

---

## Viewport

### `SolmuViewport`

```ts
class SolmuViewport {
  constructor(config: ViewportConfig);

  screenToWorld(screenX: number, screenY: number): Point2D;
  worldToScreen(worldX: number, worldY: number): Point2D;
  snapToGrid(worldPoint: Point2D): Point2D;
  formatCoordinate(value: number): string;
  getEffectiveGridSize(): number;
  getViewBox(): string;
  generateGridDots(): Array<{ x: number; y: number; size: number; opacity: number }>;

  zoomIn(factor?: number): void;
  zoomOut(factor?: number): void;
  panBy(deltaX: number, deltaY: number): void;
  fitToView(contentBounds: Bounds, margin?: number): void;

  getConfig(): Readonly<ViewportConfig>;
  updateConfig(updates: Partial<ViewportConfig>): void;
}
```

### `ViewportConfig`

```ts
type ViewportConfig = {
  origin?: CoordinateOrigin;
  units?: Units;
  width: number;
  height: number;
  worldBounds: Bounds;
  zoom: number;
  pan: Point2D;
  grid?: {
    size: number;
    snapSize?: number;
    visible: boolean;
    snap: boolean;
  };
};
```

---

## Component props

### `SolmuCanvasProps`

```ts
interface SolmuCanvasProps extends React.SVGProps<SVGSVGElement> {
  canvas: SolmuCanvas;
  elements: SolmuElements;
  connectorRenderer?: React.FC<ConnectorRendererProps>;
  edgeRenderer?: React.FC<EdgeRendererProps>;
  children?: React.ReactNode;
}
```
