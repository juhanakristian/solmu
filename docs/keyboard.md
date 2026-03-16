# Keyboard Shortcuts

The `useSolmuKeyboard` hook provides declarative keyboard shortcut handling for diagram interactions. It handles platform detection (Ctrl vs Cmd), input focus suppression, and provides both built-in actions and custom bindings.

## Quick start

```tsx
import { useSolmu, useSolmuKeyboard } from "solmu";

function App() {
  const { canvas, elements, selection, actions } = useSolmu({ data, config, onNodeMove });

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

  useSolmuKeyboard({
    actions: {
      deleteSelected,
      selectAll: actions.selectAll,
      deselect: actions.deselectAll,
      undo: () => history.undo(),
      redo: () => history.redo(),
      nudge: (dx, dy) => { /* move selected nodes */ },
      nudgeStep: 5,
    },
  });

  return <SolmuCanvas canvas={canvas} elements={elements} />;
}
```

## Built-in shortcuts

Provide the corresponding action callback to enable each shortcut. Omit a callback to disable it.

| Shortcut | macOS | Action callback | Description |
|----------|-------|----------------|-------------|
| Delete / Backspace | Delete / Backspace | `deleteSelected` | Remove selected nodes and edges |
| Ctrl+A | Cmd+A | `selectAll` | Select all nodes and edges |
| Escape | Escape | `deselect` | Clear selection |
| Ctrl+Z | Cmd+Z | `undo` | Undo last action |
| Ctrl+Shift+Z | Cmd+Shift+Z | `redo` | Redo last action |
| Arrow keys | Arrow keys | `nudge(dx, dy)` | Move selected nodes by `nudgeStep` (default: 1) |
| Shift+Arrow keys | Shift+Arrow keys | `nudge(dx, dy)` | Move selected nodes by `nudgeStep × 10` |

## Custom bindings

Add custom shortcuts via the `bindings` array. Custom bindings are checked before built-in ones and take precedence:

```tsx
useSolmuKeyboard({
  bindings: [
    {
      key: "d",
      mod: true,           // Ctrl on Windows/Linux, Cmd on Mac
      action: () => duplicateSelected(),
    },
    {
      key: "g",
      action: () => toggleGrid(),
    },
    {
      key: "f",
      action: () => fitToView(),
    },
    {
      key: "r",
      action: () => rotateSelected(),
    },
  ],
  actions: {
    deleteSelected,
    selectAll: actions.selectAll,
  },
});
```

### `KeyBinding`

```ts
type KeyBinding = {
  key: string;          // KeyboardEvent.key value (e.g. "a", "Delete", "z", "ArrowUp")
  mod?: boolean;        // Ctrl (Windows/Linux) / Cmd (Mac) required
  shift?: boolean;      // Shift required
  alt?: boolean;        // Alt / Option required
  action: () => void;   // Function to call
  passthrough?: boolean; // If true, don't call preventDefault (default: false)
};
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `bindings` | `KeyBinding[]` | `[]` | Custom key bindings (checked first) |
| `actions` | `object` | `{}` | Built-in action callbacks |
| `enabled` | `boolean` | `true` | Set to `false` to temporarily disable all shortcuts |

## Input focus

All shortcuts are automatically suppressed when focus is in an `<input>`, `<textarea>`, `<select>`, or `contenteditable` element. This prevents shortcuts from interfering with text editing.

## `useSolmu` actions

`useSolmu` returns an `actions` object with imperative functions designed for use with `useSolmuKeyboard`:

```tsx
const { actions } = useSolmu({ ... });

actions.selectAll();    // Select all nodes and edges
actions.deselectAll();  // Clear selection
```

## Platform detection

`mod` in key bindings maps to:
- **macOS:** Cmd (⌘)
- **Windows/Linux:** Ctrl

This is detected automatically from `navigator.platform`.
