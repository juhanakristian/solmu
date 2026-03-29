# Autoresearch Ideas — 200 Table Performance

## Implemented this session
- **measureTable WeakMap cache** — avoids redundant computations (9x faster)
- **React.memo on TableNode, EdgeRenderer, ConnectorDot** — with custom comparators
- **Memoized NodeWrapper** in Canvas.tsx — skips re-render for unchanged nodes
- **useMemo for edge routes** — routes don't recompute on selection/hover changes
- **Incremental edge routing** — only reroute edges connected to moved nodes during drag
- **Canvas React.memo** — prevents unnecessary re-renders

## Still promising
- **Virtualization** — only render nodes/edges visible in viewport. SVG DOM with 200 tables has ~5000 elements; showing only visible ~50 would be 4x fewer. Biggest remaining win for very large graphs (500+ tables).
- **Separate drag state from data** — keep node positions in a ref during drag, only commit to state on mouseUp. Avoids the React setState cascade entirely during drag.
- **SVG element reduction in TableNode** — currently ~15 SVG elements per table. Could merge some (e.g., combine all text into one `<text>` with `<tspan>`s).
- **requestAnimationFrame throttling for drag** — batch multiple mouse moves into one frame update.
- **Stable callback refs in useSolmu** — use useCallback + node ID dispatch pattern so React.memo default comparison works without custom comparators.

## Not worth pursuing
- **Pure JS computation optimizations** — already at 0.13ms for 200 tables, well under 1ms budget.
- **measureTable optimization beyond caching** — already fast enough with WeakMap.
- **computeConnectors optimization** — only called on schema changes, not during drag/pan.
