# Core Concepts

## Headless architecture

Solmu is a **headless** library — it manages graph state and logic but does not render anything itself. The core is the `useSolmu` hook, which takes your graph data and configuration and returns everything you need to render: pre-computed SVG paths, node transforms, interaction handlers, and viewport state.

This means you have full control over how nodes, edges, and the canvas look. Solmu handles the hard parts:

- **Edge routing** — A* pathfinding with obstacle avoidance
- **Viewport math** — zoom, pan, coordinate conversion, grid snapping
- **Interactions** — node dragging, connector linking, edge selection, edge segment editing
- **Path generation** — SVG path strings for orthogonal, bezier, and direct edges

## Data flow

```
┌─────────────────────────────────────────────────┐
│  Your component                                 │
│                                                 │
│  ┌──────────┐    ┌──────────┐    ┌───────────┐  │
│  │  State   │───▶│ useSolmu │───▶│  Render   │  │
│  │  (nodes, │    │          │    │  (SVG)    │  │
│  │   edges) │◀───│ callbacks│    │           │  │
│  └──────────┘    └──────────┘    └───────────┘  │
└─────────────────────────────────────────────────┘
```

1. **You own the state.** Nodes, edges, viewport config — all live in your React state.
2. **`useSolmu` computes render data.** It takes your state and returns `canvas` (viewport props), `elements` (nodes with transforms, edges with SVG paths), and `interactions` (mouse handlers).
3. **You render.** Use the built-in `SolmuCanvas` component, or build your own SVG by iterating over `elements.nodes` and `elements.edges`.
4. **Callbacks update your state.** When the user drags a node, `onNodeMove` is called with the new position. You update your state, React re-renders, and `useSolmu` recomputes.

## The `useSolmu` hook

```tsx
const { canvas, elements, interactions } = useSolmu({
  data,       // { nodes, edges }
  config,     // { renderers, viewport?, routing? }
  onNodeMove, // (nodeId, x, y) => void
  onConnect,  // (source, target) => void
  onEdgeClick,       // (edgeId) => void
  onEdgePathChange,  // (edgeId, waypoints) => void
});
```

### Return value

| Property | Type | Description |
|----------|------|-------------|
| `canvas` | `SolmuCanvas` | SVG props (`viewBox`, event handlers), grid dots, viewport utilities |
| `elements.nodes` | `SolmuRenderNode[]` | Nodes enriched with `transform`, `renderer`, interaction props |
| `elements.edges` | `SolmuRenderEdge[]` | Edges enriched with `path` (SVG), `labelPoint`, `segments` |
| `elements.dragLine` | `SolmuDragLine \| null` | Active connection drag line (bezier path) |
| `interactions` | `SolmuInteractions` | Mouse handlers for the canvas |

## Two rendering approaches

### 1. Use `SolmuCanvas` (quick start)

```tsx
import { SolmuCanvas } from "solmu";

<SolmuCanvas canvas={canvas} elements={elements} />
```

This renders everything with sensible defaults: grid dots, edges with hit areas, nodes with connectors, drag lines. Override the edge or connector renderer via props.

### 2. Custom SVG (full control)

```tsx
<svg {...canvas.props} viewBox={canvas.viewBox}>
  {elements.edges.map((edge) => (
    <path key={edge.id} d={edge.path} stroke="#333" fill="none" />
  ))}
  {elements.nodes.map((node) => {
    const NodeComponent = node.renderer;
    return (
      <g key={node.id} transform={node.transform}>
        <NodeComponent {...node.nodeProps} />
      </g>
    );
  })}
</svg>
```

Spread `canvas.props` on your `<svg>` to wire up mouse handlers. Then render edges and nodes however you like using the pre-computed data.

See [Components](components.md) for details on built-in renderers.
