# Nodes & Connectors

## Defining nodes

A node is a positioned element in the graph with a type and optional connectors:

```ts
import type { SolmuNode } from "solmu";

const nodes: SolmuNode[] = [
  {
    id: "process-1",
    x: 100,
    y: 50,
    type: "process",         // matches a renderer
    rotation: 0,             // optional, degrees
    connectors: [
      { id: "in",  x: -16, y: 0 },   // left side
      { id: "out", x: 16,  y: 0 },   // right side
    ],
    data: { label: "Step 1" },  // optional custom data
  },
];
```

### `SolmuNode<TData>` fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier |
| `x`, `y` | `number` | Position in world coordinates |
| `type` | `string` | Must match a registered renderer |
| `rotation` | `number?` | Rotation in degrees (applied to the renderer, not connectors) |
| `connectors` | `Connector[]?` | Connection points relative to node origin |
| `data` | `TData?` | Arbitrary data passed to the renderer |

## Connectors

Connectors are the points where edges attach to a node. Their `x` and `y` are **relative to the node's position**.

```ts
type Connector = {
  id: string;    // unique within the node
  x: number;     // offset from node origin
  y: number;     // offset from node origin
};
```

Connector positions also influence edge routing — the routing engine infers departure direction from the connector's offset. A connector at `{ x: 16, y: 0 }` (right side) tells the router the edge leaves rightward.

> **Note:** When a node has `rotation`, the renderer is rotated but connectors are **not** — their positions should be pre-rotated in data if you want them to rotate with the node. This allows connectors to stay at fixed screen positions even when the visual component rotates.

## Node renderers

Each node type needs a renderer — a React component that draws the node:

```tsx
import type { NodeRendererProps } from "solmu";

function ProcessNode({ node, onMouseDown, onMouseUp }: NodeRendererProps<{ label: string }>) {
  const w = 32, h = 12;
  return (
    <g onMouseDown={onMouseDown} onMouseUp={onMouseUp}>
      <rect x={-w/2} y={-h/2} width={w} height={h} rx={2}
            fill="#e3f2fd" stroke="#1565c0" strokeWidth={0.3} />
      <text textAnchor="middle" dominantBaseline="middle"
            fontSize={3} fill="#1a237e">
        {node.data?.label}
      </text>
    </g>
  );
}
```

### Key points

- **Coordinate origin is `(0, 0)`.** The node is wrapped in a `<g transform="translate(x, y)">`, so draw relative to the origin.
- **Spread `onMouseDown` and `onMouseUp`** on an interactive element to enable dragging.
- **Include a transparent hit area** if your visual shape has gaps (e.g., a diamond):
  ```tsx
  <rect x={-s} y={-s} width={s*2} height={s*2} fill="transparent" />
  ```

### Registering renderers

Pass renderers in the `config`:

```tsx
const { canvas, elements } = useSolmu({
  data: { nodes, edges },
  config: {
    renderers: [
      { type: "process", component: ProcessNode },
      { type: "decision", component: DecisionNode },
      { type: "terminal", component: TerminalNode },
    ],
  },
});
```

If a node's `type` doesn't match any renderer, `useSolmu` throws an error.

## Render data

Each node in `elements.nodes` is enriched with:

| Field | Type | Description |
|-------|------|-------------|
| `transform` | `string` | SVG transform string: `translate(x, y)` |
| `isDragging` | `boolean` | Whether this node is currently being dragged |
| `renderer` | `React.FC` | The matched renderer component |
| `nodeProps` | `NodeRendererProps` | Props to spread on the renderer (includes mouse handlers) |
| `connectorProps` | `ConnectorRendererProps[]` | Props for each connector |

### Rendering nodes

```tsx
{elements.nodes.map((node) => {
  const NodeComponent = node.renderer;
  return (
    <g key={node.id} transform={node.transform}>
      <g transform={node.rotation ? `rotate(${node.rotation})` : undefined}>
        <NodeComponent {...node.nodeProps} />
      </g>
      {/* Render connectors (unrotated) */}
      {node.connectorProps.map((cp) => (
        <DefaultConnectorRenderer key={cp.connector.id} {...cp} />
      ))}
    </g>
  );
})}
```

## Custom connector renderer

The default connector renders as a small teal square. Override it globally:

```tsx
<SolmuCanvas
  canvas={canvas}
  elements={elements}
  connectorRenderer={MyConnectorRenderer}
/>
```

Or render connectors manually in custom SVG:

```tsx
function MyConnector({ connector, isHovered, onMouseDown, onMouseOver, onMouseUp, onMouseOut }: ConnectorRendererProps) {
  return (
    <circle
      cx={connector.x} cy={connector.y} r={isHovered ? 4 : 3}
      fill={isHovered ? "#ff0" : "#0f0"}
      onMouseDown={onMouseDown}
      onMouseOver={onMouseOver}
      onMouseUp={onMouseUp}
      onMouseOut={onMouseOut}
    />
  );
}
```

See [Interactions](interactions.md) for how connector dragging creates connections.
