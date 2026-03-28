# Autoresearch: Solmu Graph Performance

## Objective
Optimize the core computation in Solmu's graph library so it remains performant with high node/edge counts. Focus on the hot path in `useSolmu`: edge routing (A* pathfinding), node lookups, obstacle filtering, grid dot generation, and per-render data processing.

## Metrics
- **Primary**: `total_ms` (ms, lower is better) — sum of full render cycle times for small (100 nodes), medium (400 nodes), and large (900 nodes) graphs
- **Secondary**: `cycle_large_ms`, `cycle_medium_ms`, `cycle_small_ms`, `route_large_ms`, `lookup_large_ms`, `grid_dots_ms`, `bounds_large_ms`

## How to Run
`./autoresearch.sh` — outputs `METRIC name=number` lines.

## Files in Scope
- `src/routing.ts` — A* pathfinding, path simplification, SVG path generation. Main bottleneck.
- `src/solmu.tsx` — `useSolmu` hook: node lookups, edge route computation, segment computation.
- `src/viewport.ts` — `SolmuViewport` class: grid dot generation, coordinate transforms.
- `src/types.ts` — Type definitions (modify sparingly).
- `bench/bench.ts` — Benchmark script.

## Off Limits
- `src/components.tsx` — React rendering components (not in hot path for this benchmark)
- `src/keyboard.ts`, `src/clipboard.ts` — Not performance-critical
- `demo/` — Demo app
- Do NOT change the public API signatures

## Constraints
- TypeScript must compile (`npx tsc --noEmit --skipLibCheck`)
- No new dependencies
- Do not cheat on benchmarks (no caching benchmark inputs, no short-circuiting based on known inputs)
- All optimizations must be general-purpose, not benchmark-specific
- Public API must remain unchanged

## Known Bottlenecks (from code review)
1. **A* open set uses array sort** — O(n log n) per iteration. Should use binary heap.
2. **Linear node lookups** — `nodes.find()` is O(n) per call, called per edge. Should use Map.
3. **Obstacle filtering per edge** — `nodeBoundsCache.filter()` creates new array per edge. Could use exclude set.
4. **A* closed set key generation** — string concatenation `${x},${y}` for Set keys. Could use numeric keys.
5. **Path simplification** — Multiple passes (snapToAxis → simplifyPath). Could be single pass.
6. **Grid dot generation** — Creates large arrays of objects. Could be optimized.
7. **`isBlocked`/`isPathBlocked`** — Linear scan of all obstacles for every grid cell check.

## What's Been Tried
(nothing yet — baseline run pending)
