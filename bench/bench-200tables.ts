/**
 * Performance benchmark simulating 200-table database diagram.
 * Tests the full useSolmu computation pipeline including:
 * - measureTable calls per node
 * - Edge route calculation with obstacle avoidance
 * - Connector computation
 * - Full render-cycle data preparation
 *
 * This simulates what happens every frame in the kanren app.
 */

import { calculateRoute, getNodeBounds, createSpatialGrid } from "../src/routing";
import type { Point, NodeBounds, InternalRoutingConfig } from "../src/routing";
import type { SolmuNode, Edge, Connector } from "../src/types";

// --- Table generation (mimics kanren/src/utils/graph.ts) ---

const LINE_HEIGHT = 3.5;
const CHAR_WIDTH = 1.3;
const PADDING_X = 2;
const PADDING_Y = 2;
const MIN_WIDTH = 35;
const HEADER_HEIGHT = 6;

interface Column {
  name: string;
  type: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  nullable?: boolean;
}

interface TableData {
  name: string;
  columns: Column[];
}

function measureTable(info: TableData): { width: number; height: number } {
  const allLines = [info.name, ...info.columns.map((c) => `${c.name} ${c.type}`)];
  const maxChars = Math.max(...allLines.map((l) => l.length));
  const width = Math.max(MIN_WIDTH, maxChars * CHAR_WIDTH + PADDING_X * 2);
  const height = HEADER_HEIGHT + info.columns.length * LINE_HEIGHT + PADDING_Y * 2;
  return { width, height };
}

function rowY(info: TableData, rowIndex: number): number {
  const { height } = measureTable(info);
  const halfH = height / 2;
  return -halfH + HEADER_HEIGHT + PADDING_Y + (rowIndex + 0.5) * LINE_HEIGHT;
}

function computeConnectors(id: string, info: TableData): Connector[] {
  const { width } = measureTable(info);
  const halfW = width / 2;
  return info.columns.flatMap((col, i) => [
    { id: `${id}-${col.name}-left`, x: -halfW, y: rowY(info, i) },
    { id: `${id}-${col.name}-right`, x: halfW, y: rowY(info, i) },
  ]);
}

function generateTable(index: number): TableData {
  const colCount = 3 + (index % 5); // 3-7 columns per table
  const columns: Column[] = [
    { name: "id", type: "UUID", isPrimaryKey: true, nullable: false },
  ];
  for (let c = 1; c < colCount; c++) {
    columns.push({
      name: `col_${c}`,
      type: c % 3 === 0 ? "VARCHAR" : c % 3 === 1 ? "INTEGER" : "TIMESTAMP",
      nullable: c % 2 === 0,
    });
  }
  return { name: `table_${index}`, columns };
}

function generate200Tables(): { nodes: SolmuNode<TableData>[]; edges: Edge[] } {
  const nodes: SolmuNode<TableData>[] = [];
  const edges: Edge[] = [];
  const cols = 15; // 15x14 = 210 tables (close to 200)
  const rows = Math.ceil(200 / cols);
  const spacingX = 60;
  const spacingY = 50;

  for (let i = 0; i < 200; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * spacingX;
    const y = row * spacingY;
    const tableData = generateTable(i);
    const id = tableData.name;
    nodes.push({
      id,
      x,
      y,
      type: "db-table",
      connectors: computeConnectors(id, tableData),
      data: tableData,
    });
  }

  // Create ~300 edges (foreign key relationships)
  for (let i = 1; i < 200; i++) {
    // Each table references 1-2 previous tables
    const sourceTable = nodes[i].data!;
    const targetIdx = Math.floor(Math.random() * i);
    const targetTable = nodes[targetIdx].data!;
    
    const sourceCol = sourceTable.columns[1]; // first non-PK column
    const targetCol = targetTable.columns[0]; // PK column

    edges.push({
      source: {
        node: nodes[i].id,
        connector: `${nodes[i].id}-${sourceCol.name}-right`,
      },
      target: {
        node: nodes[targetIdx].id,
        connector: `${nodes[targetIdx].id}-${targetCol.name}-left`,
      },
      type: "orthogonal" as const,
      style: { stroke: "#4a5568", strokeWidth: 0.3, markerEnd: "arrow" },
    });

    // 50% chance of a second relationship
    if (i > 2 && i % 2 === 0) {
      const targetIdx2 = Math.floor(Math.random() * i);
      if (targetIdx2 !== targetIdx) {
        const targetTable2 = nodes[targetIdx2].data!;
        const sourceCol2 = sourceTable.columns[Math.min(2, sourceTable.columns.length - 1)];
        edges.push({
          source: {
            node: nodes[i].id,
            connector: `${nodes[i].id}-${sourceCol2.name}-right`,
          },
          target: {
            node: nodes[targetIdx2].id,
            connector: `${nodes[targetIdx2].id}-${targetTable2.columns[0].name}-left`,
          },
          type: "orthogonal" as const,
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

function benchmarkFn(fn: () => void, iterations: number = 7): number {
  for (let i = 0; i < 3; i++) fn();
  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }
  return median(times);
}

// --- Generate test data ---
// Use fixed seed for reproducibility
let _seed = 42;
function random() {
  _seed = (_seed * 16807) % 2147483647;
  return (_seed - 1) / 2147483646;
}
// Override Math.random for deterministic edge generation
const origRandom = Math.random;
Math.random = random;
const data200 = generate200Tables();
Math.random = origRandom;

console.log(`Generated: ${data200.nodes.length} nodes, ${data200.edges.length} edges`);

// --- Benchmark 1: measureTable for all nodes ---
const measureMs = benchmarkFn(() => {
  for (const node of data200.nodes) {
    measureTable(node.data!);
  }
});

// --- Benchmark 2: Full route computation (simulates useSolmu render) ---
const routingConfig: InternalRoutingConfig = {
  mode: "orthogonal",
  margin: 5,
  gridSize: 5,
  cornerRadius: 0,
  stubLength: 5,
};

const nodeMap200 = new Map(data200.nodes.map(n => [n.id, n]));

const fullCycleMs = benchmarkFn(() => {
  const nodeBoundsCache = getNodeBounds(data200.nodes, undefined, undefined);
  const grid = createSpatialGrid(nodeBoundsCache, routingConfig.margin);
  const nodeMap = new Map(data200.nodes.map(n => [n.id, n]));

  for (const edge of data200.edges) {
    const source = nodeMap.get(edge.source.node);
    const target = nodeMap.get(edge.target.node);
    if (!source || !target) continue;

    const sc = source.connectors?.find(c => c.id === edge.source.connector);
    const tc = target.connectors?.find(c => c.id === edge.target.connector);
    if (!sc || !tc) continue;

    const start: Point = { x: source.x + sc.x, y: source.y + sc.y };
    const end: Point = { x: target.x + tc.x, y: target.y + tc.y };

    calculateRoute(start, end, nodeBoundsCache, routingConfig, sc, tc, grid);
  }
});

// --- Benchmark 3: Single-node drag simulation ---
// Move one node and recompute only affected edges (what SHOULD happen)
// vs recompute ALL edges (what currently happens)
const dragAllMs = benchmarkFn(() => {
  // Currently: recompute ALL edge routes even when only 1 node moved
  const nodeBoundsCache = getNodeBounds(data200.nodes, undefined, undefined);
  const grid = createSpatialGrid(nodeBoundsCache, routingConfig.margin);
  const nodeMap = new Map(data200.nodes.map(n => [n.id, n]));

  for (const edge of data200.edges) {
    const source = nodeMap.get(edge.source.node);
    const target = nodeMap.get(edge.target.node);
    if (!source || !target) continue;

    const sc = source.connectors?.find(c => c.id === edge.source.connector);
    const tc = target.connectors?.find(c => c.id === edge.target.connector);
    if (!sc || !tc) continue;

    const start: Point = { x: source.x + sc.x, y: source.y + sc.y };
    const end: Point = { x: target.x + tc.x, y: target.y + tc.y };

    calculateRoute(start, end, nodeBoundsCache, routingConfig, sc, tc, grid);
  }

  // Plus: measureTable for every node (Canvas.tsx does this)
  for (const node of data200.nodes) {
    measureTable(node.data!);
  }

  // Plus: computeSegments simulation
  // Plus: create render objects for every node/edge
});

// --- Benchmark 4: measureTable is called TWICE per node per render ---
// (once in Canvas.tsx for selection outline, once in TableNode)
const doubleMeasureMs = benchmarkFn(() => {
  for (const node of data200.nodes) {
    measureTable(node.data!); // Canvas.tsx
    measureTable(node.data!); // TableNode.tsx
  }
});

// --- Benchmark 5: computeConnectors ---
const connectorsMs = benchmarkFn(() => {
  for (const node of data200.nodes) {
    computeConnectors(node.id, node.data!);
  }
});

const totalMs = fullCycleMs + doubleMeasureMs;

console.log(`METRIC total_ms=${totalMs.toFixed(2)}`);
console.log(`METRIC full_cycle_ms=${fullCycleMs.toFixed(2)}`);
console.log(`METRIC measure_ms=${measureMs.toFixed(2)}`);
console.log(`METRIC double_measure_ms=${doubleMeasureMs.toFixed(2)}`);
console.log(`METRIC drag_all_ms=${dragAllMs.toFixed(2)}`);
console.log(`METRIC connectors_ms=${connectorsMs.toFixed(2)}`);
