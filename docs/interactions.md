# Interactions

Solmu manages interaction state internally (drag tracking, hover, selection) and notifies your code via callbacks. You update your state; Solmu recomputes on the next render.

## Callbacks

Pass callbacks to `useSolmu`:

```tsx
const { canvas, elements } = useSolmu({
  data,
  config: { renderers: [...] },
  onNodeMove,
  onConnect,
  onEdgeClick,
  onEdgePathChange,
});
```

### `onNodeClick(nodeId)`

Called when a node is clicked (mousedown). The node is internally selected (`node.isSelected = true`), and any selected edge is deselected:

```tsx
function onNodeClick(nodeId: string) {
  setSelectedTable(nodeId);
  // open property panel, show details, etc.
}
```

### `onNodeMove(nodeId, x, y)`

Called on every mouse move while a node is being dragged. Update the node position in your state:

```tsx
function onNodeMove(nodeId: string, x: number, y: number) {
  setData((prev) => ({
    ...prev,
    nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n)),
  }));
}
```

If grid snapping is enabled, `x` and `y` are pre-snapped to the grid.

### `onConnect(source, target)`

Called when the user drags from one connector to another to create a connection:

```tsx
function onConnect(
  source: { node: string; connector: string },
  target: { node: string; connector: string }
) {
  setData((prev) => ({
    ...prev,
    edges: [
      ...prev.edges,
      { source, target, type: "orthogonal" },
    ],
  }));
}
```

### `onEdgeClick(edgeId)`

Called when an edge is clicked. The edge is also internally selected (reflected in `edge.isSelected`):

```tsx
function onEdgeClick(edgeId: string) {
  setSelectedEdge(edgeId);
}
```

### `onEdgePathChange(edgeId, waypoints)`

Called when an edge segment is dragged, or when a connected node moves (with empty waypoints to trigger re-routing). Update the edge's waypoints:

```tsx
function onEdgePathChange(edgeId: string, waypoints: { x: number; y: number }[]) {
  setData((prev) => ({
    ...prev,
    edges: prev.edges.map((edge, index) => {
      const id = `${edge.source.node}-${edge.target.node}-${index}`;
      return id === edgeId ? { ...edge, waypoints } : edge;
    }),
  }));
}
```

Providing this callback enables:
- Draggable edge segments (resize cursor appears on hover)
- Automatic waypoint clearing when a connected node is moved
- Edge auto-selection when a segment drag begins
- Edge deselection when clicking empty canvas

## Node dragging

Node dragging is handled automatically:

1. User `mousedown` on a node renderer → internal drag state is set
2. User `mousemove` on the SVG → world coordinates are computed, grid-snapped, and `onNodeMove` is called
3. User `mouseup` → drag state is cleared

Your node renderer must spread `onMouseDown` on an interactive element:

```tsx
function MyNode({ node, onMouseDown, onMouseUp }: NodeRendererProps) {
  return (
    <g onMouseDown={onMouseDown} onMouseUp={onMouseUp}>
      <rect x={-20} y={-10} width={40} height={20} />
    </g>
  );
}
```

During drag, `node.isDragging` is `true` on the render data, so you can show visual feedback.

## Connector linking

To create edges by dragging between connectors:

1. User `mousedown` on a connector → a drag line appears
2. User drags to another connector → a bezier preview follows the cursor
3. User `mouseup` on a target connector → `onConnect` is called
4. User `mouseup` elsewhere → drag line disappears, no connection

The drag line is available as `elements.dragLine`:

```tsx
{elements.dragLine?.isVisible && (
  <path d={elements.dragLine.path} stroke="#64ffda" strokeWidth={0.4} fill="none" />
)}
```

Connector hover state is tracked automatically — `isHovered` is `true` in `ConnectorRendererProps` when a drag line could connect there.

## Selection

Solmu supports multi-selection of both nodes and edges. The selection state is managed internally and returned from `useSolmu`:

```tsx
const { canvas, elements, selection } = useSolmu({ data, config, ... });

// selection.nodeIds: string[]  — currently selected node IDs
// selection.edgeIds: string[]  — currently selected edge IDs
```

### Selection behavior

| Action | Effect |
|--------|--------|
| Click node | Select only that node, deselect edges |
| Click edge | Select only that edge, deselect nodes |
| Shift+click node | Toggle node in/out of selection |
| Shift+click edge | Toggle edge in/out of selection |
| Click empty canvas | Deselect all |
| Drag on empty canvas | Marquee (rubber-band) select — all nodes within the rectangle are selected |
| Ctrl+A / Cmd+A | Select all nodes and edges |

### Visual feedback

Check `isSelected` on nodes and edges:

```tsx
{elements.nodes.map((node) => (
  <g key={node.id} transform={node.transform}>
    {node.isSelected && (
      <rect x={-22} y={-12} width={44} height={24}
            fill="none" stroke="#3182ce" strokeWidth={0.5}
            strokeDasharray="2 1" />
    )}
    <NodeComponent {...node.nodeProps} />
  </g>
))}
```

### Multi-drag

When multiple nodes are selected and you drag any of them, all selected nodes move together by the same delta.

### Marquee selection

Dragging on empty canvas draws a selection rectangle. On release, all nodes whose positions fall within the rectangle are selected. The marquee rectangle is available in `elements.marquee` for rendering:

```tsx
{elements.marquee && (
  <rect
    x={elements.marquee.x} y={elements.marquee.y}
    width={elements.marquee.width} height={elements.marquee.height}
    fill="rgba(100, 149, 237, 0.15)" stroke="#6495ed"
    strokeWidth={0.3} strokeDasharray="2 1" pointerEvents="none"
  />
)}
```

The built-in `SolmuCanvas` component renders the marquee automatically.

### Selection change callback

```tsx
const { canvas, elements, selection } = useSolmu({
  data,
  config: { ... },
  onSelectionChange: (selection) => {
    console.log("Selected nodes:", selection.nodeIds);
    console.log("Selected edges:", selection.edgeIds);
  },
});
```

### Deletion

Use the `selection` return value to implement deletion:

```tsx
function deleteSelected() {
  const nodeSet = new Set(selection.nodeIds);
  const edgeSet = new Set(selection.edgeIds);
  setData((prev) => ({
    ...prev,
    nodes: prev.nodes.filter((n) => !nodeSet.has(n.id)),
    edges: prev.edges.filter((edge, index) => {
      const id = `${edge.source.node}-${edge.target.node}-${index}`;
      return !edgeSet.has(id) && !nodeSet.has(edge.source.node) && !nodeSet.has(edge.target.node);
    }),
  }));
}

React.useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
  };
  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}, [selection]);
```

## Edge segment dragging

See [Edges & Routing — Manual edge editing](edges.md#manual-edge-editing) for details on draggable edge segments.

## Mouse handler wiring

The SVG element needs mouse handlers for drag and deselection to work. There are two ways:

### With `SolmuCanvas`

Handlers are wired automatically via `canvas.props`:

```tsx
<SolmuCanvas canvas={canvas} elements={elements} />
```

### With custom SVG

Spread `canvas.props` on your `<svg>`:

```tsx
<svg {...canvas.props} viewBox={canvas.viewBox}>
  {/* your content */}
</svg>
```

`canvas.props` includes `onMouseDown` (deselection), `onMouseMove` (drag tracking), and `onMouseUp` (drag end).
