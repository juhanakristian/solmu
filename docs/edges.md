# Edges & Routing

## Defining edges

An edge connects two connectors on two nodes:

```ts
import type { Edge } from "solmu";

const edges: Edge[] = [
  {
    source: { node: "a", connector: "out" },
    target: { node: "b", connector: "in" },
    type: "orthogonal",
    style: {
      stroke: "#546e7a",
      strokeWidth: 0.3,
      markerEnd: "arrow",
    },
  },
];
```

### `Edge` fields

| Field | Type | Description |
|-------|------|-------------|
| `source` | `{ node, connector }` | Source node ID and connector ID |
| `target` | `{ node, connector }` | Target node ID and connector ID |
| `type` | `EdgeType` | Routing mode: `"orthogonal"`, `"bezier"`, `"direct"`, or `"line"` |
| `style` | `EdgeStyle?` | Visual styling |
| `waypoints` | `{ x, y }[]?` | User-defined bend points that override auto-routing |

### Edge types

| Type | Description |
|------|-------------|
| `"orthogonal"` | Right-angle routes with A* pathfinding around obstacles |
| `"bezier"` | Smooth curves with rounded corners, A* pathfinding |
| `"direct"` | Simple bezier curve directly between endpoints (no obstacle avoidance) |
| `"line"` | Straight line between endpoints |

### Edge style

```ts
type EdgeStyle = {
  stroke?: string;           // CSS color (default: "#00e676")
  strokeWidth?: number;      // line width (default: 0.4)
  strokeDasharray?: string;  // e.g. "4 2" for dashed lines
  opacity?: number;
  markerStart?: EdgeMarker;  // "arrow", "arrow-open", or custom marker ID
  markerEnd?: EdgeMarker;
};
```

Built-in markers are `"arrow"` (filled) and `"arrow-open"` (outline). For custom markers, pass the ID of a `<marker>` element you define in your SVG `<defs>`.

## Routing

### A* pathfinding

For `"orthogonal"` and `"bezier"` edges, Solmu uses A* pathfinding to route edges around nodes. The algorithm:

1. Snaps start/end to a pathfinding grid
2. Searches for a path using orthogonal (4-directional) movement
3. Avoids node bounding boxes with configurable margin
4. Simplifies the path by removing collinear points
5. Converts to SVG path string (right-angle segments or smooth curves)

### Routing configuration

```tsx
const { canvas, elements } = useSolmu({
  data,
  config: {
    routing: {
      mode: "orthogonal",     // default mode for edges
      avoidNodes: true,       // route around node bounding boxes (default: true)
      margin: 5,              // clearance around obstacles in world units
      gridSize: 5,            // pathfinding grid cell size
      cornerRadius: 0,        // corner rounding for bezier mode
      stubLength: 5,          // straight segment before first turn
      nodeDimensions: {       // default node size for obstacle detection
        width: 15,
        height: 5,
      },
    },
    renderers: [...],
  },
});
```

| Option | Default | Description |
|--------|---------|-------------|
| `mode` | `"bezier"` | Default routing mode (overridden by individual `edge.type`) |
| `avoidNodes` | `true` | Whether to detect and route around node bounding boxes |
| `margin` | `3` | Clearance around obstacles in world units |
| `gridSize` | `2.54` | A* grid cell size (smaller = finer paths, slower) |
| `cornerRadius` | `3` | Curve radius at corners in bezier mode |
| `stubLength` | `0` | Straight segment from connector before routing begins |
| `nodeDimensions` | `{ width: 15, height: 5 }` | Fallback node size when connectors don't span the full node |

### Stub length

`stubLength` adds a straight segment from each connector before the router takes over. This creates cleaner departures from nodes:

```
stubLength: 0          stubLength: 5

  ┌───┐                  ┌───┐
  │ A ├──┐               │ A ├────┐
  └───┘  │               └───┘    │
         │                        │
      ┌──┤                     ┌──┤
      │ B │                    │ B │
      └───┘                    └───┘
```

The departure direction is inferred from the connector's offset relative to the node origin.

### Node bounds detection

Solmu infers node bounding boxes for obstacle avoidance from connector positions. If a node has multiple connectors, the bounding box spans their positions (plus padding). If connectors don't represent the full node size, set `nodeDimensions` in the routing config.

## Edge render data

Each edge in `elements.edges` includes:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Generated edge ID |
| `path` | `string` | SVG path string (`d` attribute) |
| `labelPoint` | `{ x, y }` | Midpoint along the path for label positioning |
| `labelAngle` | `number` | Tangent angle in degrees at the label point |
| `isSelected` | `boolean` | Whether this edge is currently selected |
| `onClick` | `() => void` | Click handler for selection |
| `resolvedWaypoints` | `{ x, y }[]` | Full path as point array (including start/end) |
| `segments` | `EdgeSegment[]` | Individual segments with drag metadata |
| `onSegmentDragStart` | `function?` | Segment drag handler (present when `onEdgePathChange` is provided) |

### Rendering edges

```tsx
{elements.edges.map((edge) => (
  <path key={edge.id} d={edge.path} fill="none" stroke="#333" strokeWidth={0.3} />
))}
```

### Edge labels

Use `labelPoint` and `labelAngle` to position labels at the midpoint of any edge:

```tsx
{elements.edges.map((edge) => (
  <text
    key={`label-${edge.id}`}
    x={edge.labelPoint.x}
    y={edge.labelPoint.y}
    textAnchor="middle"
    dominantBaseline="middle"
    fontSize={2.5}
  >
    {edgeLabels[edge.id]}
  </text>
))}
```

## Manual edge editing

Users can drag segments of orthogonal edges to reshape them. This is enabled by providing the `onEdgePathChange` callback.

### How it works

1. Auto-routed edges produce intermediate waypoints internally
2. Hovering over a draggable segment shows a resize cursor (`ns-resize` or `ew-resize`)
3. Dragging a horizontal segment moves it vertically; dragging a vertical segment moves it horizontally
4. Adjacent segments extend or shrink automatically to maintain connectivity
5. When a connected node is dragged, the edge's waypoints are cleared and the edge is re-routed automatically

### Enabling edge editing

```tsx
const [data, setData] = useState({ nodes, edges });

function onEdgePathChange(edgeId: string, waypoints: { x: number; y: number }[]) {
  setData((prev) => ({
    ...prev,
    edges: prev.edges.map((edge, index) => {
      const id = `${edge.source.node}-${edge.target.node}-${index}`;
      return id === edgeId ? { ...edge, waypoints } : edge;
    }),
  }));
}

const { canvas, elements } = useSolmu({
  data,
  config: { renderers: [...] },
  onNodeMove: (id, x, y) => { /* update node position */ },
  onEdgePathChange,
});
```

When `onEdgePathChange` is provided:
- `DefaultEdgeRenderer` automatically renders invisible hit areas over draggable segments
- Dragging a segment calls `onEdgePathChange` with the new waypoints on every mouse move
- Moving a connected node calls `onEdgePathChange` with empty waypoints to trigger re-routing
- The edge is automatically selected when a segment drag begins
- Clicking empty canvas deselects

### Edge segments

Each edge exposes its `segments` array for custom renderers that want to handle segment interaction:

```ts
type EdgeSegment = {
  index: number;
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  orientation: "horizontal" | "vertical" | "diagonal";
  draggable: boolean;  // true when segment has at least one waypoint endpoint
};
```

In a custom renderer, render hit areas for draggable segments:

```tsx
{edge.segments.filter(s => s.draggable).map(segment => (
  <line
    key={segment.index}
    x1={segment.p1.x} y1={segment.p1.y}
    x2={segment.p2.x} y2={segment.p2.y}
    stroke="transparent"
    strokeWidth={5}
    style={{ cursor: segment.orientation === "horizontal" ? "ns-resize" : "ew-resize" }}
    onMouseDown={(e) => {
      e.stopPropagation();
      edge.onSegmentDragStart?.(segment.index, e);
    }}
  />
))}
```

### Pre-set waypoints

You can also set waypoints programmatically:

```ts
const edges: Edge[] = [
  {
    source: { node: "a", connector: "out" },
    target: { node: "b", connector: "in" },
    type: "orthogonal",
    waypoints: [
      { x: 150, y: 50 },
      { x: 150, y: 150 },
    ],
  },
];
```

When `waypoints` is set, auto-routing is skipped and the path is built from `[start, ...waypoints, end]`.
