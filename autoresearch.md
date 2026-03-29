# Autoresearch: 200-Table React Rendering Performance

## Objective
Optimize Solmu + kanren so that 200 database tables can be displayed and interacted with (dragging nodes, panning) without lag. Focus on both the core computation pipeline AND React rendering overhead.

## Metrics
- **Primary**: `total_ms` (ms, lower is better) — full render cycle + double measureTable (what happens per frame)
- **Secondary**: `full_cycle_ms` (routing+bounds), `measure_ms`, `double_measure_ms`, `drag_all_ms`, `connectors_ms`

## How to Run
`./autoresearch.sh` — outputs `METRIC name=number` lines.

## Files in Scope
- `src/routing.ts` — A* pathfinding, spatial grid, obstacle avoidance
- `src/solmu.tsx` — `useSolmu` hook: edge routing, node processing
- `src/viewport.ts` — grid dot generation
- `src/types.ts` — types
- `src/components.tsx` — default renderers
- `kanren/src/components/Canvas.tsx` — renders all nodes/edges (calls measureTable per node)
- `kanren/src/components/TableNode.tsx` — renders each table (calls measureTable again)
- `kanren/src/components/EdgeRenderer.tsx` — renders edges
- `kanren/src/components/ConnectorDot.tsx` — renders connector dots
- `kanren/src/utils/graph.ts` — measureTable, computeConnectors, layout constants
- `kanren/src/App.tsx` — main app with useSolmu config
- `bench/bench-200tables.ts` — benchmark

## Off Limits
- Do NOT change the public API signatures
- Do NOT add new dependencies
- Do NOT cheat on benchmarks

## Constraints
- TypeScript must compile
- kanren app must build: `cd kanren && npm run build`
- All optimizations must be general-purpose

## Known Bottlenecks (from code review)
1. **measureTable() called twice per node per render** — once in Canvas.tsx for selection outline, once in TableNode. Creates temp arrays each time.
2. **No React.memo on any component** — TableNode, EdgeRenderer, ConnectorDot all re-render on every mouse move
3. **useSolmu recomputes ALL edge routes every render** — even when only 1 node moved
4. **onNodeMove creates new nodes array via .map()** — triggers full re-render
5. **Grid dots regenerated every frame** — thousands of SVG circles
6. **computeConnectors uses measureTable internally** — more redundant computation
7. **useEditing() context in every TableNode** — any edit re-renders all tables

## Previous Session Results
Core routing was optimized from 106ms to ~2.8ms (38x improvement) via:
- Spatial hash grid, binary heap, numeric keys, pre-expanded bounds
- Node Map for O(1) lookups, edge adjacency index
- Inline 2-point fast path, memoized bounds/grid/renderer map

## What's Been Tried This Session
(baseline pending)
