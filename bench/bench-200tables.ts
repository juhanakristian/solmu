/**
 * Performance benchmark simulating 200-table database diagram.
 * Tests NODE RENDERING overhead only (no routing).
 * 
 * Measures what happens per frame:
 * - measureTable() calls (called multiple times per node per render)
 * - computeConnectors() calls
 * - useSolmu node data preparation (createNodeProps, connectorProps, transform strings)
 * - Simulated "did anything change" checks
 */

// --- Inline types & constants from kanren/src ---

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
  length?: number;
}

interface TableData {
  name: string;
  columns: Column[];
}

interface Connector {
  id: string;
  x: number;
  y: number;
}

// --- Functions copied from kanren/src/utils/graph.ts ---

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

function formatColumnType(col: Column): string {
  if (col.length) return `${col.type}(${col.length})`;
  return col.type;
}

// --- Generate 200 tables ---

function generateTable(index: number): TableData {
  const colCount = 3 + (index % 5); // 3–7 columns
  const columns: Column[] = [
    { name: "id", type: "UUID", isPrimaryKey: true, nullable: false },
  ];
  for (let c = 1; c < colCount; c++) {
    columns.push({
      name: `col_${c}`,
      type: c % 3 === 0 ? "VARCHAR" : c % 3 === 1 ? "INTEGER" : "TIMESTAMP",
      nullable: c % 2 === 0,
      length: c % 3 === 0 ? 255 : undefined,
    });
  }
  return { name: `table_${index}`, columns };
}

interface NodeLike {
  id: string;
  x: number;
  y: number;
  data: TableData;
  connectors: Connector[];
}

function generate200(): NodeLike[] {
  const cols = 15;
  const spacingX = 60;
  const spacingY = 50;
  const nodes: NodeLike[] = [];
  for (let i = 0; i < 200; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const data = generateTable(i);
    const id = data.name;
    nodes.push({
      id,
      x: col * spacingX,
      y: row * spacingY,
      data,
      connectors: computeConnectors(id, data),
    });
  }
  return nodes;
}

// --- Benchmark utilities ---

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function bench(fn: () => void, iters = 11): number {
  for (let i = 0; i < 3; i++) fn();
  const t: number[] = [];
  for (let i = 0; i < iters; i++) {
    const s = performance.now();
    fn();
    t.push(performance.now() - s);
  }
  return median(t);
}

// --- Data ---
const nodes = generate200();
console.log(`Generated: ${nodes.length} tables, avg ${(nodes.reduce((s, n) => s + n.data.columns.length, 0) / nodes.length).toFixed(1)} cols/table`);

// ============================================================
// Benchmark 1: measureTable called once per node (Canvas.tsx)
// ============================================================
const bMeasure1x = bench(() => {
  for (const n of nodes) measureTable(n.data);
});

// ============================================================
// Benchmark 2: measureTable called 3x per node
//   (Canvas.tsx + TableNode + computeConnectors/rowY inside render)
// ============================================================
const bMeasure3x = bench(() => {
  for (const n of nodes) {
    measureTable(n.data);           // Canvas.tsx  – selection outline
    measureTable(n.data);           // TableNode   – layout
    // computeConnectors path calls measureTable + rowY (which calls measureTable again)
    computeConnectors(n.id, n.data);
  }
});

// ============================================================
// Benchmark 3: Per-node render data preparation
//   (what useSolmu does for each node every frame)
// ============================================================
const selectedNodeIds = new Set<string>(["table_42"]);
const dragItem: string | null = null;

const bNodePrep = bench(() => {
  for (const node of nodes) {
    // --- transform string (useSolmu) ---
    const _transform = `translate(${node.x}, ${node.y})`;
    const _isDragging = dragItem === node.id;
    const _isSelected = selectedNodeIds.has(node.id);

    // --- connectorProps array (useSolmu: createConnectorProps) ---
    const _cpArr = node.connectors?.map((connector) => ({
      connector,
      node,
      isHovered: false,
    })) || [];

    // --- Canvas.tsx: measureTable for selection outline ---
    const dim = measureTable(node.data);

    // --- TableNode: measureTable + formatColumnType per column ---
    const { width, height } = measureTable(node.data);
    for (const col of node.data.columns) {
      formatColumnType(col);
    }
  }
});

// ============================================================
// Benchmark 4: Full per-frame node work (measure + prep + spread)
// ============================================================
const bFullNodeFrame = bench(() => {
  // Simulate useSolmu elements.nodes
  const renderNodes = nodes.map((node) => {
    const connectorProps = node.connectors?.map((connector) => ({
      connector,
      node,
      isHovered: false,
    })) || [];

    return {
      ...node,
      transform: `translate(${node.x}, ${node.y})`,
      isDragging: dragItem === node.id,
      isSelected: selectedNodeIds.has(node.id),
      connectorProps,
    };
  });

  // Simulate Canvas.tsx rendering
  for (const rn of renderNodes) {
    // Canvas.tsx: measureTable for selection outline
    const dim = measureTable(rn.data);
    // TableNode: measureTable for layout
    const { width, height } = measureTable(rn.data);
    // TableNode: formatColumnType per column
    for (const col of rn.data.columns) {
      formatColumnType(col);
    }
  }
});

// ============================================================
// Benchmark 5: computeConnectors for all nodes
//   (happens when table schema changes)
// ============================================================
const bConnectors = bench(() => {
  for (const n of nodes) computeConnectors(n.id, n.data);
});

const totalMs = bFullNodeFrame;

console.log(`METRIC total_ms=${totalMs.toFixed(2)}`);
console.log(`METRIC measure_1x_ms=${bMeasure1x.toFixed(2)}`);
console.log(`METRIC measure_3x_ms=${bMeasure3x.toFixed(2)}`);
console.log(`METRIC node_prep_ms=${bNodePrep.toFixed(2)}`);
console.log(`METRIC full_node_frame_ms=${bFullNodeFrame.toFixed(2)}`);
console.log(`METRIC connectors_ms=${bConnectors.toFixed(2)}`);
