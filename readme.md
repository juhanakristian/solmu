# Solmu

A headless graph/diagram library for React. Solmu handles graph state, edge routing, viewport management, and interaction logic — you bring your own rendering.

Designed for flow charts, UML diagrams, database schemas, circuit editors, and any other node-and-edge visualization.

## Why headless?

Solmu follows the [inversion of control](https://kentcdodds.com/blog/inversion-of-control) pattern (like [TanStack Table](https://github.com/TanStack/table/)). The `useSolmu` hook returns pre-computed data — node positions, edge paths, interaction handlers — and you render them however you want. This gives you full control over appearance while the library handles the hard parts: A* edge routing, viewport transforms, drag interactions, and coordinate conversions.

## Install

```bash
npm install solmu
```

## Quick start

```tsx
import React, { useState } from "react";
import { useSolmu, SolmuCanvas } from "solmu";
import type { SolmuNode, Edge, NodeRendererProps } from "solmu";

// 1. Define a node renderer
function MyNode({ node, onMouseDown, onMouseUp }: NodeRendererProps) {
  return (
    <g onMouseDown={onMouseDown} onMouseUp={onMouseUp}>
      <rect x={-30} y={-15} width={60} height={30} rx={4} fill="#e3f2fd" stroke="#1565c0" />
      <text textAnchor="middle" dominantBaseline="middle" fontSize={12}>
        {node.id}
      </text>
    </g>
  );
}

// 2. Define your graph data
const initialNodes: SolmuNode[] = [
  {
    id: "a",
    x: 100,
    y: 100,
    type: "default",
    connectors: [
      { id: "out", x: 30, y: 0 },
    ],
  },
  {
    id: "b",
    x: 300,
    y: 200,
    type: "default",
    connectors: [
      { id: "in", x: -30, y: 0 },
    ],
  },
];

const initialEdges: Edge[] = [
  {
    source: { node: "a", connector: "out" },
    target: { node: "b", connector: "in" },
    type: "orthogonal",
  },
];

// 3. Use the hook and render
function App() {
  const [data, setData] = useState({ nodes: initialNodes, edges: initialEdges });

  const { canvas, elements } = useSolmu({
    data,
    config: {
      renderers: [{ type: "default", component: MyNode }],
    },
    onNodeMove: (nodeId, x, y) => {
      setData((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n)),
      }));
    },
  });

  return <SolmuCanvas canvas={canvas} elements={elements} />;
}
```

## Documentation

| Document | Description |
|----------|-------------|
| [Core Concepts](docs/concepts.md) | Architecture, data flow, and the headless pattern |
| [Nodes & Connectors](docs/nodes.md) | Defining nodes, connectors, and custom renderers |
| [Edges & Routing](docs/edges.md) | Edge types, A* routing, obstacle avoidance, and manual editing |
| [Viewport](docs/viewport.md) | Coordinate systems, zoom/pan, grid, and units |
| [Interactions](docs/interactions.md) | Drag, connect, select, and edge editing callbacks |
| [Components](docs/components.md) | Built-in `SolmuCanvas`, renderers, and markers |
| [Keyboard Shortcuts](docs/keyboard.md) | `useSolmuKeyboard` hook, built-in and custom bindings |
| [Copy, Paste & Duplicate](docs/clipboard.md) | `duplicateSelection`, system clipboard, cross-tab support |
| [API Reference](docs/api.md) | Complete type reference for all exports |

## Demos

The `demo/` folder contains full working examples:

- **Flow Chart** — decision flow with orthogonal routing, edge selection/deletion, edge segment dragging
- **UML Diagram** — class diagrams with inheritance/association markers
- **Database Diagram** — entity-relationship diagrams with foreign key connections
- **Circuit Editor** — electronics schematic with rotation, grid snapping, and real-world units (mm)

```bash
cd demo
npm install
npm run dev
```

## License

ISC
