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

## Not yet tried
- **Connector pre-indexing**: Build a Map<connectorId, Connector> per node to avoid linear connector.find()
- **Skip A* segment check**: For single-gridSize orthogonal steps, isPointBlocked alone may suffice
- **React memoization**: useMemo for edge route calculations, only recompute when edge data changes
- **Batch SVG path generation**: Build all edge paths in a single loop to improve CPU cache locality
- **Typed array for A* nodes**: Use flat arrays instead of objects for AStarNode to reduce GC pressure
- **Quadtree for obstacles**: May be faster than spatial hash for non-uniform distributions
- **Web Worker offloading**: Move routing computation to worker thread for large graphs
- **Incremental routing**: Only re-route edges whose source/target nodes changed position
- **Virtualization**: Only compute routes for edges visible in the current viewport
- **Edge grouping**: Group edges by source/target node pair, share obstacle lookups
