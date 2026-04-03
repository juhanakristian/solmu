# solmu Fix Tasks

---

## Critical / Performance

### TASK-16: Replace A* open-set array sort with a min-heap
**Issue:** PERFORMANCE_REVIEW.md #1, #2, #15
The A* pathfinder calls `openSet.sort()` every iteration (`routing.ts:282`) — O(n log n) per step — and uses a linear `.findIndex()` scan to detect duplicates (`routing.ts:336`). A broken `PriorityQueue` exists in `routing/router.ts` but is never used.

**Done when:** A correct min-heap priority queue replaces the sort. Duplicate detection uses a `Map<string, node>` keyed by `"x,y"`. Each open-set pop is O(log n) and duplicate checks are O(1).

---

### TASK-17: Add spatial index for A* obstacle checking
**Issue:** PERFORMANCE_REVIEW.md #3
For every neighbor cell explored during A*, `isBlocked` and `isPathBlocked` iterate all obstacle nodes (`routing.ts:319, 322-327`). With 200 nodes and A* exploring thousands of cells per edge, and 500 edges, this produces millions of rectangle checks per render.

**Done when:** Obstacle bounds are inserted into a spatial grid or quadtree once before routing begins. Each A* step queries only nearby cells instead of all N obstacles, reducing per-step obstacle work from O(n) to O(1) amortized.

---

### TASK-18: Cache `getBoundingClientRect` and `getScreenCTM` in refs
**Issue:** PERFORMANCE_REVIEW.md #4
Both `getBoundingClientRect()` and `getScreenCTM()` are called on every `mousemove` event (`solmu.tsx:67-84, 98-132`). These are layout-triggering DOM operations that stall the browser rendering pipeline at 60 fps during drag.

**Done when:** Both values are stored in refs. The bounding rect is updated via a `ResizeObserver`; the CTM is updated only when the viewBox changes (pan/zoom). The `mousemove` handler reads from refs without touching the DOM.

---

### TASK-19: Memoize edge path calculations
**Issue:** PERFORMANCE_REVIEW.md #5
Every edge's full routing calculation runs on every render (`solmu.tsx:272-276`), including A* pathfinding, regardless of whether the edge's endpoints or nearby obstacles changed. With 500 edges this re-routes the entire graph on every state update.

**Done when:** Edge paths are memoized per edge, keyed on source position, target position, and a hash of nearby obstacle bounds. Only edges whose relevant inputs changed are re-routed on a given render.

---

### TASK-21: Quick-win memoization pass
**Issue:** PERFORMANCE_REVIEW.md #7, #9, #11, #12
Several expensive calculations run unconditionally on every render despite having stable inputs. These are all one-line `useMemo` fixes with no architectural risk:

- **`getNodeBounds`** (`solmu.tsx:189`) — iterates all nodes and their connectors every render; wrap in `useMemo` keyed on `data.nodes`
- **Renderer Map** (`solmu.tsx:258`) — `config.renderers.find()` called per node per render; build `new Map(config.renderers.map(r => [r.type, r.component]))` once with `useMemo` keyed on `config.renderers`
- **Grid dots** (`viewport.ts` / `solmu.tsx`) — `viewport.generateGridDots()` called every render; memoize keyed on zoom, pan, and viewport dimensions
- **`SolmuMarkerDefs`** (`components.tsx:17`) — iterates all edges every render to find needed marker types; `useMemo` keyed on the edges array

**Done when:** All four are wrapped in `useMemo` with correct dependency arrays, and a render profile with 200 nodes confirms none of them fire on unrelated state changes (e.g. moving a single node should not recompute the renderer map or grid dots).

---

### TASK-20: Replace O(n) node lookups with a Map
**Issue:** PERFORMANCE_REVIEW.md #6, #13
`data.nodes.find()` is called for every edge during path calculation (`solmu.tsx:195-196`) and during drag (`solmu.tsx:63, 88`). With 200 nodes and 500 edges this is 100,000+ linear scans per render. Connector lookups add another nested `find()` on top.

**Done when:** `useSolmu` builds `nodeMap = new Map(nodes.map(n => [n.id, n]))` and `connectorMap` (nested Map by node id then connector id) once per `data` change, and all `.find()` calls are replaced with O(1) map lookups.

---

### TASK-6: Make `SolmuCanvas` themeable
**Issue #6**
Background (`#0d1117`), grid dots (`#2a3a5c`), edges (`#00e676`), and drag line (`#64ffda`) are all hardcoded. Both UML and flowchart demos rewrote the entire SVG render loop (60+ lines) just to change colors.

**Done when:** `SolmuCanvas` accepts a `theme` or style-override prop covering at minimum: background color, grid color, default edge color, drag-line color.

---

### TASK-7: Provide built-in zoom/pan utilities
**Issue #14**
Every demo reimplements ~60 lines of wheel handler, middle-click panning, and resize listener.

**Done when:** A `useSolmuViewport` hook (or equivalent) encapsulates wheel-zoom and middle-click pan, with the same viewport state shape that `useSolmu` already accepts.

---

### TASK-8: Fix edge ID stability
**Issue #12**
Edge IDs are generated as `${source.node}-${target.node}-${index}`. IDs change when edges are reordered, causing React reconciliation bugs.

**Done when:** Edge IDs are stable regardless of order — either derived from a content hash of (source, target, connectors) or user-supplied, and the generation logic no longer uses `index`.

---

### TASK-9: Add edge click / selection
**Issue #13**
`isSelected` exists on both nodes and edges in the types but there is no mechanism to select either. Real editors need click-to-select on edges for deletion and property inspection.

**Done when:** Clicking an edge calls an `onEdgeClick(edgeId)` callback and the edge's `isSelected` state can be toggled and reflected in rendering.

---

## Low Priority

### TASK-10: Remove `console.log` debug statements
**Issue #15**
`solmu.tsx:138` and `:143` have `console.log(connector)` left in.

**Done when:** All `console.log` calls are removed from production code paths.

---

### TASK-11: Remove or implement `connections.customRules`
**Issue #10**
`validateOnCreate`, `customRules`, etc. are defined in `UseSolmuParams` but no code reads or applies them.

**Done when:** Either the validation system is implemented, or the dead config fields are removed from the type and docs.

---

### TASK-12: Remove redundant `interactions` return value
**Issue #11**
`useSolmu` returns `interactions: { onMouseDown, onMouseMove, onMouseUp }` but `onMouseDown` is a no-op and the other two are already on `canvas.props`.

**Done when:** `interactions` is removed from the return value (breaking change — coordinate with semver bump) or clearly documented as intentional.

---

### TASK-13: Clean up dead code and legacy types
**Issue #16**
- `SolmuNodeConnector` (types.ts:3-6) has a different shape than `Connector` with a "Legacy" comment but is still used internally
- Comment references non-existent `ports.ts`
- `routing/astar.ts` has a broken statement (`open;` on line 10)
- `routing/router.ts` contains an unused `PriorityQueue`
- `EdgeType` includes `"line"` handled as a special case outside the routing system

**Done when:** Dead code is deleted, legacy types are consolidated or removed, broken statements are fixed.

---

### TASK-14: Expose edge label positions that update with routing
**Issue:** New feature
Currently edge labels must be positioned manually. When nodes move and edges are rerouted, any label positioned at a hardcoded point no longer aligns with the edge. The UML demo works around this by rendering labels as separate `children` with manually computed coordinates.

**Done when:** `SolmuRenderEdge` exposes a `labelPoint` (midpoint along the routed path) so consumers can position labels without manual math. Optionally also expose `labelAngle` (tangent direction at that point) for rotated labels.

```ts
// SolmuRenderEdge gains:
labelPoint: { x: number; y: number };
labelAngle?: number; // degrees, tangent at midpoint
```

Consumers render labels declaratively:
```tsx
{elements.edges.map((edge) => (
  <text key={edge.id} x={edge.labelPoint.x} y={edge.labelPoint.y}>
    {edge.label}
  </text>
))}
```

Labels automatically reposition whenever nodes move or routing changes — no manual coordinate tracking needed.

---

### TASK-15: Fix grid snapping to use fixed world-space resolution
**Issue:** New feature / bug
`snapToGrid` multiplies `grid.size` by a zoom-dependent multiplier (`gridLevels` in `viewport.ts:40-52`). This means the snap target in world coordinates changes as the user zooms — at zoom 1 a node snaps to `grid.size × 10`, at zoom 5 it snaps to `grid.size × 1`. Components that were aligned at one zoom level are misaligned at another.

In the electronics demo (2.54 mm grid) this makes it impossible to keep connectors consistently aligned: dragging a component at a different zoom level places it on a different world-space grid than the one used when it was first placed.

**Done when:**
- `snapToGrid` always snaps to `grid.size` in world coordinates, independent of zoom level
- The visual grid dots may still adapt density at different zoom levels (showing multiples of `grid.size` when zoomed out is fine), but the *snap resolution* never changes
- Optionally allow `grid.snapSize` separate from `grid.size` for cases where visual grid and snap resolution should differ (e.g. display every 1 mm but snap every 0.5 mm)

---

## Database Design Tool — Missing Features

The following tasks are needed to build a production-quality database design / ER diagramming tool with Solmu.

---

---

### TASK-26: Dynamic node dimensions for accurate obstacle routing
**Issue:** New feature
The routing engine infers node bounding boxes from connector spread or falls back to `nodeDimensions` defaults. For variable-height nodes like database tables (which can have 3 columns or 30), this often produces wrong obstacle bounds — edges route through or too far from the actual table.

**Done when:**
- Nodes can declare their actual dimensions: `width` and `height` fields on `SolmuNode`
- The routing engine uses declared dimensions when available, falling back to connector inference
- Alternatively, a callback `onNodeMeasured(nodeId, { width, height })` lets renderers report their size after mount (via `ResizeObserver` or `getBBox`)
- The database table renderer reports its computed dimensions so routing correctly avoids the full table area

```ts
type SolmuNode<TData = unknown> = {
  // ...existing fields
  width?: number;   // declared width in world units
  height?: number;  // declared height in world units
};
```

---

### TASK-27: Crow's foot and ER notation markers
**Issue:** New feature
Database ER diagrams use standard cardinality markers at edge endpoints: crow's foot (many), single line (one), circle (zero/optional), double line (mandatory). The current built-in markers are `"arrow"` and `"arrow-open"` only.

The database demo hacks cardinality labels as `<text>` elements with hardcoded offsets from `labelPoint`, which doesn't place them at the endpoints and breaks when edges are rerouted.

**Done when:**
- Built-in markers include at minimum: `"one"`, `"many"` (crow's foot), `"one-or-many"`, `"zero-or-one"`, `"zero-or-many"`, `"one-and-only-one"`
- Markers render correctly at both `markerStart` and `markerEnd` positions
- Markers scale appropriately with `strokeWidth`
- The database demo uses proper crow's foot notation instead of text labels

---

### TASK-29: Undo/redo support
**Issue:** New feature
A diagram editor without undo is unusable. Every action (move node, add/remove edge, edit edge path, add/remove table) needs to be reversible.

**Done when:**
- A `useSolmuHistory` hook (or similar) wraps the graph state and provides `undo()`, `redo()`, `canUndo`, `canRedo`
- History captures snapshots on meaningful state changes (not on every mousemove during drag, but on drag end)
- `Ctrl+Z` / `Cmd+Z` triggers undo, `Ctrl+Shift+Z` / `Cmd+Shift+Z` triggers redo
- History stack has a configurable max depth (default: 50)
- The hook is independent of `useSolmu` — it wraps any state, not just graph state

```tsx
const { state, setState, undo, redo, canUndo, canRedo } = useSolmuHistory(initialData);

const { canvas, elements } = useSolmu({
  data: state,
  config: { ... },
  onNodeMove: (id, x, y) => setState(prev => ({ ...prev, nodes: ... })),
});
```

---

### TASK-30: Auto-layout algorithms
**Issue:** New feature
When importing a schema or adding many tables, manual layout is tedious. A database tool needs automatic layout:
- Initial layout when importing a schema
- "Clean up" button to re-layout after edits
- Layout should respect relationships (connected tables near each other)

**Done when:**
- A `layoutGraph(nodes, edges, options)` utility function computes positions for all nodes
- At minimum supports: force-directed layout and layered/hierarchical layout (Sugiyama-style)
- Options include: direction (top-to-bottom, left-to-right), spacing, padding
- The function returns new node positions without mutating input — the consumer applies them
- Works standalone (not tied to `useSolmu`)

```ts
import { layoutGraph } from "solmu";

const positioned = layoutGraph(nodes, edges, {
  algorithm: "hierarchical",
  direction: "top-to-bottom",
  nodeSpacing: 40,
  rankSpacing: 60,
});
// positioned: Array<{ id: string; x: number; y: number }>
```

---

### TASK-31: Minimap / overview panel
**Issue:** New feature
Large database schemas can have 50+ tables spread across a wide area. Navigating by pan/zoom alone is slow. A minimap shows the full graph as a tiny overview with a viewport indicator, and clicking/dragging the minimap pans the main view.

**Done when:**
- A `SolmuMinimap` component (or hook) renders a scaled-down overview of all nodes and edges
- Shows a rectangle indicating the current visible viewport area
- Clicking on the minimap pans the main view to that location
- Dragging on the minimap allows continuous pan
- Node colors/shapes are simplified (rectangles only) for performance
- Works with any diagram type, not just databases

---

### TASK-32: Fit-to-view and fit-to-selection
**Issue:** New feature
The `SolmuViewport` class has `fitToView(contentBounds)` but there's no easy way to get the content bounds, and no integration with `useSolmu`. Every demo handles zoom/pan independently.

**Done when:**
- `useSolmu` (or `canvas.viewport`) exposes a `fitToContent()` utility that computes the bounding box of all nodes and sets zoom/pan to show them all with padding
- A `fitToSelection()` variant zooms to show only the selected nodes
- These return the new viewport config (zoom + pan) rather than mutating state — the consumer applies it
- The database demo has a "Fit" button that calls this

---

### TASK-33: Connection validation rules
**Issue:** Related to TASK-11
The `connections.customRules` config exists in types but is not implemented. For database design, connections must be validated:
- Only FK columns can connect to PK columns
- Self-referential FK is allowed (same table, different columns)
- Duplicate relationships should be prevented
- Invalid connections should show visual feedback (red drag line, tooltip)

**Done when:**
- `connections.customRules` validators are called when a connection drag ends
- If validation fails, `onConnect` is not called
- The drag line changes color (e.g., red) when hovering over an invalid target connector
- An optional `onConnectionValidationFail(source, target, errors)` callback fires with the failure reasons
- The database demo uses rules to enforce FK→PK connections only

---

---

### TASK-35: Export diagram as SVG/PNG
**Issue:** New feature
Database diagrams need to be exported for documentation — embedded in wikis, READMEs, or design docs.

**Done when:**
- An `exportToSVG(elements, options)` utility generates a standalone SVG string from the current diagram state
- An `exportToPNG(svgElement, options)` utility renders the SVG to a PNG blob via canvas
- Options include: background color, padding, scale factor, whether to include grid
- The exported SVG is self-contained (all styles inlined, no external dependencies)
- Works with any diagram type

---


