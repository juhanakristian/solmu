# Components

Solmu exports several React components for common rendering needs. All are optional — you can render everything yourself using the data from `useSolmu`.

## `SolmuCanvas`

An all-in-one SVG canvas that renders grid, edges, nodes, connectors, and drag lines:

```tsx
import { SolmuCanvas } from "solmu";

<SolmuCanvas
  canvas={canvas}
  elements={elements}
  connectorRenderer={MyConnectorRenderer}  // optional
  edgeRenderer={MyEdgeRenderer}            // optional
  style={{ background: "#1a1a2e" }}        // optional SVG style overrides
>
  {/* optional children rendered inside the SVG */}
  <text x={0} y={-10} fill="#fff">My Diagram</text>
</SolmuCanvas>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `canvas` | `SolmuCanvas` | required | Canvas data from `useSolmu` |
| `elements` | `SolmuElements` | required | Elements data from `useSolmu` |
| `connectorRenderer` | `React.FC<ConnectorRendererProps>` | `DefaultConnectorRenderer` | Custom connector component |
| `edgeRenderer` | `React.FC<EdgeRendererProps>` | `DefaultEdgeRenderer` | Custom edge component |
| `children` | `React.ReactNode` | — | Additional SVG content |
| `style` | `React.CSSProperties` | — | Style overrides (merged with defaults) |
| `...svgProps` | `React.SVGProps` | — | Any additional SVG attributes |

### Default styling

The canvas defaults to dark theme:
- Background: `#0d1117`
- Grid dots: `#2a3a5c`
- Edges: `#00e676`
- Drag line: `#64ffda`

Override via `style` prop or use a fully custom SVG.

### Render order

1. Marker definitions (`<defs>`)
2. Grid dots
3. Edges
4. Nodes (with connectors)
5. Drag line
6. Children

## `DefaultEdgeRenderer`

Renders an edge as an SVG path with click handling and draggable segment hit areas:

```tsx
import { DefaultEdgeRenderer } from "solmu";

<DefaultEdgeRenderer edge={edge} />
```

Features:
- Renders `edge.path` as a `<path>` element
- Selected edges are highlighted (doubled stroke width, teal color)
- Click handler with `stopPropagation` for selection
- Invisible hit areas over draggable segments with resize cursors
- Hit area width scales with stroke width (minimum 3 world units)
- Supports `markerStart` and `markerEnd` from edge style

### Custom edge renderer

Replace the edge renderer when you need different visuals:

```tsx
function MyEdgeRenderer({ edge }: EdgeRendererProps) {
  return (
    <g>
      <path
        d={edge.path}
        fill="none"
        stroke={edge.isSelected ? "#ff0" : "#888"}
        strokeWidth={0.5}
        onClick={(e) => { e.stopPropagation(); edge.onClick?.(); }}
        style={{ cursor: "pointer" }}
      />
      {/* Render draggable segment hit areas */}
      {edge.segments?.filter(s => s.draggable).map(segment => (
        <line
          key={segment.index}
          x1={segment.p1.x} y1={segment.p1.y}
          x2={segment.p2.x} y2={segment.p2.y}
          stroke="transparent"
          strokeWidth={5}
          style={{
            cursor: segment.orientation === "horizontal" ? "ns-resize" : "ew-resize",
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            edge.onSegmentDragStart?.(segment.index, e);
          }}
        />
      ))}
    </g>
  );
}

<SolmuCanvas canvas={canvas} elements={elements} edgeRenderer={MyEdgeRenderer} />
```

> **Important:** Call `e.stopPropagation()` on edge click and segment mousedown to prevent the canvas `onMouseDown` from deselecting the edge.

## `DefaultConnectorRenderer`

Renders a connector as a small teal square that scales up on hover:

```tsx
import { DefaultConnectorRenderer } from "solmu";

<DefaultConnectorRenderer {...connectorProps} />
```

The default connector is a 2×2 rounded rect in `#64ffda` that scales to 1.5× when hovered during a connection drag.

## `SolmuMarkerDefs`

Renders SVG `<defs>` containing the built-in arrowhead markers used by edges. This is included automatically by `SolmuCanvas`, but you need to add it manually in custom SVGs:

```tsx
import { SolmuMarkerDefs } from "solmu";

<svg {...canvas.props} viewBox={canvas.viewBox}>
  <SolmuMarkerDefs edges={elements.edges} />
  {/* ... */}
</svg>
```

Only markers actually used by the edges are rendered. Built-in markers:

| Name | ID | Shape |
|------|-----|-------|
| `"arrow"` | `solmu-arrow` | Filled arrowhead |
| `"arrow-open"` | `solmu-arrow-open` | Open arrowhead (outline) |

For custom markers, define them in your own `<defs>` and reference them by ID in `edge.style.markerEnd`.
