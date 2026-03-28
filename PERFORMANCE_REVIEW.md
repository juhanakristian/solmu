# Performance Review

Target scenario: 200+ nodes, 500+ edges, 60 fps interaction.

---

## Critical Issues

### 1. A* open set sorted on every iteration — `routing.ts:282`

```ts
openSet.sort((a, b) => a.f - b.f); // O(n log n) per iteration
const current = openSet.shift();
```

Every step of the pathfinder sorts the entire open set. With a large open set this degrades to O(n² log n) per edge route. With 500 edges this is the single worst bottleneck in the library.

**Fix:** Replace the array + sort with a min-heap priority queue. `router.ts` has a broken `PriorityQueue` that should be fixed and wired in here — reduces each pop to O(log n).

---

### 2. Linear scan for duplicate in A* open set — `routing.ts:336-342`

```ts
const existingIndex = openSet.findIndex(
  n => n.x === neighborPos.x && n.y === neighborPos.y
);
```

Called for every neighbor of every explored node. O(n) per check, turning the inner loop quadratic.

**Fix:** Maintain a `Map<string, node>` keyed by `"x,y"` alongside the priority queue for O(1) lookups.

---

### 3. All obstacle rectangles checked per pathfinding step — `routing.ts:319, 322-327`

For every neighbor during A*, both `isBlocked` and `isPathBlocked` iterate the full obstacles array (one entry per node):

```ts
if (isBlocked(neighborPos, obstacles, margin)) continue;
if (isPathBlocked(current, neighborPos, obstacles, margin)) ...
```

With 200 obstacle nodes and A* exploring thousands of grid cells per edge, this is O(cells × nodes) per edge × 500 edges — millions of rectangle intersection tests per render.

**Fix:** Build a spatial grid or quadtree from obstacle bounds once per render. Each pathfinding step queries only the nearby cells instead of all 200 obstacles.

---

### 4. `getBoundingClientRect()` and `getScreenCTM()` called on every `mousemove` — `solmu.tsx:67-84, 98-132`

```ts
const rect = svg.getBoundingClientRect(); // forces layout recalc
const ctm = svg.getScreenCTM();           // another layout operation
```

These are layout-triggering DOM calls that run at 60 fps during drag. They stall the browser's rendering pipeline on every frame.

**Fix:** Cache both in refs. Update the rect cache only in a `ResizeObserver` callback; update CTM only when the viewBox changes (pan/zoom events).

---

### 5. All edge paths recalculated on every render — `solmu.tsx:272-276`

```ts
edges: data.edges.map((edge, index) => ({
  path: createEdgePath(edge), // full routing on every call
}))
```

`createEdgePath` runs node lookups + the full A*/orthogonal routing algorithm. With 500 edges at 60 fps during a drag, this recalculates every path on every frame regardless of which nodes moved.

**Fix:** Memoize per edge keyed on `(sourceX, sourceY, targetX, targetY, obstacleHash)`. Only edges whose endpoints or nearby obstacles changed need recalculating.

---

### 6. Node map rebuilt as array lookup on every render — `solmu.tsx:63, 88, 195-196`

```ts
const node = data.nodes.find(n => n.id === dragItem);      // O(n)
const source = data.nodes.find(n => n.id === edge.source.node); // O(n) × edges
```

With 200 nodes and 500 edges the edge rendering alone does 100,000+ linear scans per render.

**Fix:** Build `const nodeMap = new Map(data.nodes.map(n => [n.id, n]))` once and use `nodeMap.get(id)` everywhere. Same for connectors within nodes.

---

## High Priority Issues

### 7. Node bounds recalculated on every render — `solmu.tsx:189-192`

```ts
const nodeBoundsCache = getNodeBounds(data.nodes, ...);
```

Called unconditionally on every render. With 200 nodes it iterates all nodes and their connectors every time.

**Fix:** `useMemo` with `data.nodes` as dependency. The name `nodeBoundsCache` implies this was intended to be cached but never was.

---

### 8. New function closures created for every node on every render — `solmu.tsx:155-178`

`createNodeProps` and `createConnectorProps` produce new arrow functions (`onMouseDown`, `onMouseOver`, etc.) for all nodes every render. With 200 nodes and ~4 connectors each, ~1,600 new closures are created per render, applying constant GC pressure and invalidating React's prop equality checks.

**Fix:** Use `useCallback` for the stable handlers (e.g. `onMouseUp`). For per-node handlers, consider a single delegated handler on the SVG element rather than per-node closures.

---

### 9. Renderer lookup is O(renderers) per node — `solmu.tsx:258-260`

```ts
const renderer = config.renderers.find(r => r.type === node.type)?.component;
```

Called for every node on every render.

**Fix:** `useMemo(() => new Map(config.renderers.map(r => [r.type, r.component])), [config.renderers])` and use `rendererMap.get(node.type)`.

---

### 10. All nodes re-render when any node moves — `components.tsx:156-169`

No React memoization on the per-node `<g>` subtrees. Moving one node triggers a full re-render of all 200 nodes.

**Fix:** Extract node rendering into a `React.memo`'d `NodeItem` component. Because `nodeProps` creates new objects each render (Issue 8), this requires fixing prop stability first to be effective.

---

### 11. Grid dots regenerated without memoization — `viewport.ts:245-342` / `solmu.tsx`

`viewport.generateGridDots()` runs on every render. At high zoom levels it can generate hundreds of dot positions. It's called unconditionally even when nothing viewport-related changed.

**Fix:** Memoize the result — recompute only when `zoom`, `pan`, viewport dimensions, or grid config change.

---

## Medium Priority Issues

### 12. `SolmuMarkerDefs` iterates all edges on every render — `components.tsx:17-65`

Iterates 500 edges every render to find which marker types are needed. The result never changes unless edges are added/removed.

**Fix:** `useMemo` keyed on edges array identity, or compute the needed marker set in `useSolmu` and pass it as part of `SolmuElements`.

---

### 13. Connector lookup is O(n) nested inside O(n) node lookup — `solmu.tsx:90-92, 199-201`

After finding a node with `.find()`, another `.find()` locates the connector within that node. Both should use Maps.

---

### 14. No viewport-level culling of off-screen nodes/edges — `components.tsx`

All 200 nodes and 500 edges are rendered regardless of whether they are within the current viewport. At high zoom levels most of the graph is off-screen.

**Fix:** During the nodes/edges map in `useSolmu`, skip elements whose bounding box doesn't intersect the current viewport frustum. This is the highest leverage optimization for large graphs.

---

### 15. Broken `PriorityQueue` never used — `routing/router.ts:14-55`

The `PriorityQueue` class in `router.ts` has logic errors (`left()`/`right()` return `null` when the child exists; `enqueue` compares objects directly) and is never imported. A* falls back to array sorting as a result (Issue 1).

**Fix:** Fix the heap logic and wire it into `routing.ts` to resolve Issue 1.

---

## Summary Table

| # | File | Severity | Problem | Fix |
|---|------|----------|---------|-----|
| 1 | routing.ts:282 | Critical | A* open set sorted O(n log n)/step | Min-heap priority queue |
| 2 | routing.ts:336 | Critical | Linear duplicate check in A* | Map keyed by coordinate |
| 3 | routing.ts:319 | Critical | All obstacles checked per A* step | Spatial grid / quadtree |
| 4 | solmu.tsx:67 | Critical | `getBoundingClientRect` on every mousemove | Ref + ResizeObserver cache |
| 5 | solmu.tsx:272 | Critical | All edge paths recalculated every render | Per-edge memoization |
| 6 | solmu.tsx:195 | High | O(n) node lookup × edges | Node Map |
| 7 | solmu.tsx:189 | High | `getNodeBounds` every render | `useMemo` |
| 8 | solmu.tsx:155 | High | New closures for all nodes every render | Delegated handlers |
| 9 | solmu.tsx:258 | High | O(renderers) renderer lookup per node | Renderer Map |
| 10 | components.tsx | High | All nodes re-render on any change | `React.memo` + stable props |
| 11 | viewport.ts | Medium | Grid dots regenerated every render | `useMemo` |
| 12 | components.tsx:17 | Medium | Marker defs iterate all edges | `useMemo` |
| 13 | solmu.tsx:90 | Medium | Nested connector `.find()` | Connector Map |
| 14 | components.tsx | Medium | No off-screen culling | Viewport frustum cull |
| 15 | router.ts:14 | Medium | Broken PriorityQueue dead code | Fix and integrate |

---

## Recommended Fix Order

1. **Node Map + Connector Map** (Issue 6, 13) — 30 min, eliminates O(n²) lookup with zero risk
2. **Cache `getBoundingClientRect`/`getScreenCTM`** (Issue 4) — 1 hr, stops layout thrashing at 60 fps
3. **`useMemo` for nodeBounds and rendererMap** (Issue 7, 9) — 30 min, easy wins
4. **Fix PriorityQueue and wire into A*** (Issues 1, 2, 15) — 2 hrs, largest routing speedup
5. **Spatial index for obstacle checking** (Issue 3) — 2 hrs, removes the other routing bottleneck
6. **Per-edge path memoization** (Issue 5) — 2 hrs, eliminates redundant routing on drag
7. **Stable handler refs + `React.memo`** (Issues 8, 10) — 2 hrs, stops all nodes re-rendering
8. **Viewport culling** (Issue 14) — 3 hrs, necessary for 500+ node graphs regardless of other fixes
