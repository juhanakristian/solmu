# Autoresearch Ideas — 200 Table Performance

## Implemented this session
- **measureTable WeakMap cache** — avoids redundant computations (9x faster)
- **React.memo on TableNode, EdgeRenderer, ConnectorDot** — with custom comparators
- **Memoized NodeWrapper** in Canvas.tsx — skips re-render for unchanged nodes
- **useMemo for edge routes** — routes don't recompute on selection/hover changes
- **Incremental edge routing** — only reroute edges connected to moved nodes during drag
- **Canvas React.memo** — prevents unnecessary re-renders

## Still promising
- **Stable callback refs in useSolmu** — use useCallback + node ID dispatch pattern so React.memo default comparison works. Currently custom comparators ignore callback changes, which is correct but fragile.
- **Skip obstacle avoidance during drag** — use direct/bezier routing while actively dragging, then recompute with A* on mouseUp. Would make drag always fast regardless of graph complexity.
- **Virtualization** — only render nodes/edges visible in viewport. SVG DOM with 200 tables has ~5000 elements; showing only visible ~50 would be 4x fewer.
- **SVG element reduction in TableNode** — currently ~15 SVG elements per table. Could merge some (e.g., combine all text into one text element with tspans).
- **requestAnimationFrame throttling for drag** — batch multiple mouse moves into one frame update.
- **Separate drag state from data** — keep node positions in a ref during drag, only commit to state on mouseUp. Avoids React re-render cascade during drag entirely.

## Not worth pursuing
- **Pure JS computation optimizations** — already at 0.13ms for 200 tables, well under 1ms budget.
- **measureTable optimization beyond caching** — already fast enough with WeakMap.
- **computeConnectors optimization** — only called on schema changes, not during drag/pan.
