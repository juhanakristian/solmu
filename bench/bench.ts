/**
 * Performance benchmark for Solmu graph library.
 * Tests core computational bottlenecks with realistic graph data.
 * 
 * Scenarios:
 * 1. Edge route calculation (A* pathfinding + SVG path generation)
 * 2. Node/connector lookups during edge processing
 * 3. Grid dot generation at various zoom levels
 * 4. Full "render cycle" simulation (what useSolmu does per frame)
 */

import { calculateRoute, getNodeBounds, buildPathFromWaypoints } from "../src/routing";
import type { Point, NodeBounds, InternalRoutingConfig } from "../src/routing";
import type { SolmuNode, Edge, Connector } from "../src/types";
import { SolmuViewport } from "../src/viewport";

// --- Graph generation ---

function generateGrid(rows: number, cols: number): { nodes: SolmuNode<any>[]; edges: Edge[] } {
  const nodes: SolmuNode<any>[] = [];
  const edges: Edge[] = [];
  const spacing = 20;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = `n-${r}-${c}`;
      const x = c * spacing;
      const y = r * spacing;
      const connectors: Connector[] = [
        { id: "left", x: -5, y: 0 },
        { id: "right", x: 5, y: 0 },
        { id: "top", x: 0, y: -3 },
        { id: "bottom", x: 0, y: 3 },
      ];
      nodes.push({ id, x, y, type: "default", connectors });

      // Connect to right neighbor
      if (c < cols - 1) {
        edges.push({
          source: { node: id, connector: "right" },
          target: { node: `n-${r}-${c + 1}`, connector: "left" },
          type: "orthogonal",
        });
      }
      // Connect to bottom neighbor
      if (r < rows - 1) {
        edges.push({
          source: { node: id, connector: "bottom" },
          target: { node: `n-${r + 1}-${c}`, connector: "top" },
          type: "orthogonal",
        });
      }
    }
  }
  return { nodes, edges };
}

// --- Benchmark utilities ---

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function benchmarkFn(fn: () => void, iterations: number = 5): number {
  // Warmup
  for (let i = 0; i < 2; i++) fn();

  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }
  return median(times);
}

// --- Benchmarks ---

// Small graph: 10x10 = 100 nodes, ~180 edges  
const small = generateGrid(10, 10);
// Medium graph: 20x20 = 400 nodes, ~760 edges
const medium = generateGrid(20, 20);
// Large graph: 30x30 = 900 nodes, ~1740 edges
const large = generateGrid(30, 30);

function benchEdgeRouting(nodes: SolmuNode<any>[], edges: Edge[], label: string) {
  const nodeBounds = getNodeBounds(nodes, undefined, { width: 15, height: 5 });
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const routingConfig: InternalRoutingConfig = {
    mode: "orthogonal",
    margin: 3,
    gridSize: 2.54,
    cornerRadius: 3,
    stubLength: 0,
  };

  const ms = benchmarkFn(() => {
    for (const edge of edges) {
      const source = nodeMap.get(edge.source.node)!;
      const target = nodeMap.get(edge.target.node)!;
      const sc = source.connectors!.find(c => c.id === edge.source.connector)!;
      const tc = target.connectors!.find(c => c.id === edge.target.connector)!;

      const start: Point = { x: source.x + sc.x, y: source.y + sc.y };
      const end: Point = { x: target.x + tc.x, y: target.y + tc.y };

      const obstacles = nodeBounds.filter(ob => ob.id !== source.id && ob.id !== target.id);
      calculateRoute(start, end, obstacles, routingConfig, sc, tc);
    }
  });

  return ms;
}

function benchNodeLookups(nodes: SolmuNode<any>[], edges: Edge[], label: string) {
  // Simulate what useSolmu does: find() for each edge's source and target
  const ms = benchmarkFn(() => {
    for (const edge of edges) {
      const source = nodes.find(n => n.id === edge.source.node);
      const target = nodes.find(n => n.id === edge.target.node);
      if (source && target) {
        const sc = source.connectors?.find(c => c.id === edge.source.connector);
        const tc = target.connectors?.find(c => c.id === edge.target.connector);
      }
    }
  });
  return ms;
}

function benchGetNodeBounds(nodes: SolmuNode<any>[], label: string) {
  const ms = benchmarkFn(() => {
    getNodeBounds(nodes, undefined, { width: 15, height: 5 });
  }, 10);
  return ms;
}

function benchGridDots() {
  const viewport = new SolmuViewport({
    origin: "top-left",
    units: "mm",
    width: 1920,
    height: 1080,
    worldBounds: { x: -500, y: -500, width: 1000, height: 1000 },
    zoom: 1,
    pan: { x: 0, y: 0 },
    grid: { size: 2.54, visible: true, snap: true },
  });

  const ms = benchmarkFn(() => {
    viewport.generateGridDots();
  }, 10);
  return ms;
}

function benchFullCycle(nodes: SolmuNode<any>[], edges: Edge[], label: string) {
  // Simulates the full computation useSolmu does per render:
  // 1. getNodeBounds
  // 2. For each edge: find nodes, find connectors, filter obstacles, calculate route, compute segments
  const routingConfig: InternalRoutingConfig = {
    mode: "orthogonal",
    margin: 3,
    gridSize: 2.54,
    cornerRadius: 3,
    stubLength: 0,
  };

  const ms = benchmarkFn(() => {
    const nodeBoundsCache = getNodeBounds(nodes, undefined, { width: 15, height: 5 });

    for (const edge of edges) {
      const source = nodes.find(n => n.id === edge.source.node);
      const target = nodes.find(n => n.id === edge.target.node);
      if (!source || !target) continue;

      const sc = source.connectors?.find(c => c.id === edge.source.connector);
      const tc = target.connectors?.find(c => c.id === edge.target.connector);
      if (!sc || !tc) continue;

      const start: Point = { x: source.x + sc.x, y: source.y + sc.y };
      const end: Point = { x: target.x + tc.x, y: target.y + tc.y };

      const obstacles = nodeBoundsCache.filter(ob => ob.id !== source.id && ob.id !== target.id);
      const result = calculateRoute(start, end, obstacles, routingConfig, sc, tc);

      // Compute segments (inline version of computeSegments)
      const resolvedPoints = result.resolvedPoints;
      if (resolvedPoints.length >= 2) {
        for (let i = 0; i < resolvedPoints.length - 1; i++) {
          const p1 = resolvedPoints[i];
          const p2 = resolvedPoints[i + 1];
          const dx = Math.abs(p2.x - p1.x);
          const dy = Math.abs(p2.y - p1.y);
        }
      }
    }
  });

  return ms;
}

// Run all benchmarks
const routeSmall = benchEdgeRouting(small.nodes, small.edges, "small");
const routeMedium = benchEdgeRouting(medium.nodes, medium.edges, "medium");
const routeLarge = benchEdgeRouting(large.nodes, large.edges, "large");

const lookupSmall = benchNodeLookups(small.nodes, small.edges, "small");
const lookupMedium = benchNodeLookups(medium.nodes, medium.edges, "medium");
const lookupLarge = benchNodeLookups(large.nodes, large.edges, "large");

const boundsSmall = benchGetNodeBounds(small.nodes, "small");
const boundsMedium = benchGetNodeBounds(medium.nodes, "medium");
const boundsLarge = benchGetNodeBounds(large.nodes, "large");

const gridDots = benchGridDots();

const cycleSmall = benchFullCycle(small.nodes, small.edges, "small");
const cycleMedium = benchFullCycle(medium.nodes, medium.edges, "medium");
const cycleLarge = benchFullCycle(large.nodes, large.edges, "large");

// Total = weighted sum focusing on the large graph (most important for perf)
const totalMs = cycleLarge + cycleMedium + cycleSmall;

// Output metrics
console.log(`METRIC total_ms=${totalMs.toFixed(2)}`);
console.log(`METRIC cycle_large_ms=${cycleLarge.toFixed(2)}`);
console.log(`METRIC cycle_medium_ms=${cycleMedium.toFixed(2)}`);
console.log(`METRIC cycle_small_ms=${cycleSmall.toFixed(2)}`);
console.log(`METRIC route_large_ms=${routeLarge.toFixed(2)}`);
console.log(`METRIC route_medium_ms=${routeMedium.toFixed(2)}`);
console.log(`METRIC lookup_large_ms=${lookupLarge.toFixed(2)}`);
console.log(`METRIC grid_dots_ms=${gridDots.toFixed(2)}`);
console.log(`METRIC bounds_large_ms=${boundsLarge.toFixed(2)}`);
