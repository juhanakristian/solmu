# Autoresearch Ideas

## Tried and working (implemented)
- Binary heap for A* open set
- Spatial hash grid for obstacle lookups
- Node Map for O(1) lookups
- Generation counter for dedup in isSegmentBlocked
- Numeric hash keys (spatial grid + A*)
- Inline 2-point fast path in calculateRoute
- getNodeBounds loop optimization

## Tried and didn't work
- Zero-allocation lineIntersectsRectXY (too many params, V8 can't inline)

## Not yet tried (promising)
- **Incremental routing**: Only re-route edges whose source/target nodes changed position. Track node positions with a dirty set. Would skip 99% of routing work during node drag (only edges connected to dragged node need update). Biggest potential win for interactive performance.
- **Virtualization**: Only compute routes for edges visible in the current viewport. Would make performance independent of total graph size — only matters how many edges are visible.
- **Web Worker offloading**: Move routing computation to worker thread for large graphs. Keeps main thread responsive. Needs double-buffering pattern.
- **React.memo for edge/node components**: Prevent re-renders when edge/node data hasn't changed. React-level optimization.

## Not yet tried (diminishing returns likely)
- **Typed array for A* nodes**: Use flat arrays instead of objects for AStarNode to reduce GC pressure. But A* rarely runs (most paths are direct).
- **Quadtree for obstacles**: May be slightly faster than spatial hash but construction cost may negate benefits.
- **Batch SVG path generation**: Cache-friendly iteration but benchmark shows per-edge cost is already ~0.83µs.
- **Sorted obstacle array + binary search**: For direct-path checks only, pre-sort by x and binary search. Might save 0.1ms.

## Tried and didn't work
- Zero-allocation coordinate-passing (V8 can't inline many-param functions)
- Skip A* segment check (causes invalid paths, longer A* searches)
- Connector pre-index map (construction cost > savings for 4 connectors/node)
- Single-cell fast path in isSegmentBlocked (within noise)
- Move direct-path check before grid snapping (V8 JIT sensitivity)
- isLineBlocked wrapper (extra dispatch overhead)
- String concat vs array.join for SVG paths (array.join wins)
- Avoid sqrt in simplifyPath (function shape change caused V8 deopt)
