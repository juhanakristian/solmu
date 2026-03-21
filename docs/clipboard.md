# Copy, Paste & Duplicate

Solmu provides utility functions for copying, pasting, and duplicating graph elements. These are pure functions — they take data in and return new data out, without mutating state.

## Quick start

```tsx
import { useSolmu, useSolmuKeyboard, duplicateSelection, copyToSystemClipboard, pasteFromSystemClipboard } from "solmu";

function App() {
  const [data, setData] = useState({ nodes, edges });
  const { canvas, elements, selection, actions } = useSolmu({ data, config, onNodeMove });

  function handleDuplicate() {
    if (selection.nodeIds.length === 0) return;
    const result = duplicateSelection(data.nodes, data.edges, selection);
    setData((prev) => ({
      ...prev,
      nodes: [...prev.nodes, ...result.nodes],
      edges: [...prev.edges, ...result.edges],
    }));
  }

  async function handleCopy() {
    await copyToSystemClipboard(data.nodes, data.edges, selection);
  }

  async function handlePaste() {
    const result = await pasteFromSystemClipboard();
    if (!result) return;
    setData((prev) => ({
      ...prev,
      nodes: [...prev.nodes, ...result.nodes],
      edges: [...prev.edges, ...result.edges],
    }));
  }

  useSolmuKeyboard({
    bindings: [
      { key: "d", mod: true, action: handleDuplicate },
      { key: "c", mod: true, action: handleCopy },
      { key: "v", mod: true, action: handlePaste },
    ],
    actions: { deleteSelected, selectAll: actions.selectAll },
  });
}
```

## API

### `duplicateSelection(nodes, edges, selection, options?): PasteResult`

Duplicate selected nodes and their internal edges in one step. Returns new nodes/edges ready to add to your data.

Only edges where **both** source and target are in the selection are duplicated. Edges connecting to non-selected nodes are not included.

```ts
const result = duplicateSelection(data.nodes, data.edges, selection, {
  offset: { x: 20, y: 20 },  // position offset (default)
});
// result.nodes — new nodes with new IDs and offset positions
// result.edges — new edges remapped to the new node IDs
// result.idMap — { originalId: newId } mapping
```

### `copySelection(nodes, edges, selection): ClipboardData`

Extract selected nodes and their internal edges into a serializable object. This is the low-level building block — use `duplicateSelection` or `copyToSystemClipboard` for common workflows.

### `pasteClipboard(clipboard, options?): PasteResult`

Create new nodes and edges from clipboard data with new IDs and offset positions.

### `copyToSystemClipboard(nodes, edges, selection): Promise<void>`

Copy the selection to the system clipboard as JSON. Uses the Clipboard API; fails silently if unavailable.

### `pasteFromSystemClipboard(options?): Promise<PasteResult | null>`

Read from the system clipboard and parse as graph data. Returns `null` if the clipboard doesn't contain valid Solmu data.

### `serializeClipboard(data): string` / `deserializeClipboard(json): ClipboardData | null`

Low-level JSON serialization for custom clipboard implementations.

## Types

### `ClipboardData`

```ts
type ClipboardData = {
  nodes: SolmuNode<any>[];
  edges: Edge[];
};
```

### `PasteResult`

```ts
type PasteResult = {
  nodes: SolmuNode<any>[];
  edges: Edge[];
  idMap: Record<string, string>;  // originalId → newId
};
```

### `DuplicateOptions`

```ts
type DuplicateOptions = {
  offset?: { x: number; y: number };  // default: { x: 20, y: 20 }
  generateId?: (originalId: string) => string;  // custom ID generator
};
```

## How IDs are generated

By default, new node IDs are generated as `${originalId}-copy-${counter}` where the counter increments globally. Provide a custom `generateId` function for different ID schemes:

```ts
duplicateSelection(nodes, edges, selection, {
  generateId: (id) => `${id}-${crypto.randomUUID().slice(0, 8)}`,
});
```

## Cross-tab copy/paste

`copyToSystemClipboard` writes JSON to the system clipboard. `pasteFromSystemClipboard` reads it back. This enables copy/paste between different browser tabs running Solmu diagrams, as long as both use the same data format.

The clipboard data is plain JSON containing the full node and edge objects, so it can also be inspected or modified externally.
