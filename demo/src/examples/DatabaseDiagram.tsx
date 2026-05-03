import React from "react";
import { useSolmu, useSolmuKeyboard, useSolmuViewport, SolmuCanvas, duplicateSelection, copyToSystemClipboard, pasteFromSystemClipboard } from "../../../src";

import type { Edge } from "../../../src/types";

// --- Database Table Renderer ---
// Each table node renders a header with table name and rows for columns.
// Primary keys are marked, foreign keys show references.

type ColumnInfo = {
  name: string;
  type: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  nullable?: boolean;
};

type TableInfo = {
  name: string;
  columns: ColumnInfo[];
};

const TABLE_DATA: Record<string, TableInfo> = {
  users: {
    name: "users",
    columns: [
      { name: "id", type: "UUID", isPrimaryKey: true },
      { name: "email", type: "VARCHAR(255)", nullable: false },
      { name: "username", type: "VARCHAR(50)", nullable: false },
      { name: "created_at", type: "TIMESTAMP", nullable: false },
      { name: "updated_at", type: "TIMESTAMP", nullable: true },
    ],
  },
  posts: {
    name: "posts",
    columns: [
      { name: "id", type: "UUID", isPrimaryKey: true },
      { name: "user_id", type: "UUID", isForeignKey: true, nullable: false },
      { name: "title", type: "VARCHAR(255)", nullable: false },
      { name: "content", type: "TEXT", nullable: true },
      { name: "published", type: "BOOLEAN", nullable: false },
      { name: "created_at", type: "TIMESTAMP", nullable: false },
    ],
  },
  comments: {
    name: "comments",
    columns: [
      { name: "id", type: "UUID", isPrimaryKey: true },
      { name: "post_id", type: "UUID", isForeignKey: true, nullable: false },
      { name: "user_id", type: "UUID", isForeignKey: true, nullable: false },
      { name: "content", type: "TEXT", nullable: false },
      { name: "created_at", type: "TIMESTAMP", nullable: false },
    ],
  },
  categories: {
    name: "categories",
    columns: [
      { name: "id", type: "UUID", isPrimaryKey: true },
      { name: "name", type: "VARCHAR(100)", nullable: false },
      { name: "description", type: "TEXT", nullable: true },
    ],
  },
  post_categories: {
    name: "post_categories",
    columns: [
      { name: "post_id", type: "UUID", isPrimaryKey: true, isForeignKey: true, nullable: false },
      { name: "category_id", type: "UUID", isPrimaryKey: true, isForeignKey: true, nullable: false },
    ],
  },
  tags: {
    name: "tags",
    columns: [
      { name: "id", type: "UUID", isPrimaryKey: true },
      { name: "name", type: "VARCHAR(50)", nullable: false },
    ],
  },
  post_tags: {
    name: "post_tags",
    columns: [
      { name: "post_id", type: "UUID", isPrimaryKey: true, isForeignKey: true, nullable: false },
      { name: "tag_id", type: "UUID", isPrimaryKey: true, isForeignKey: true, nullable: false },
    ],
  },
};

// Layout constants in world units. CSS px inside the matrix-transformed layer = world units,
// so these constants drive both connector positions and HTML sizing identically.
const LINE_HEIGHT = 7;
const CHAR_WIDTH = 2.6;
const PADDING_X = 4;
const PADDING_Y = 4;
const MIN_WIDTH = 70;
const HEADER_HEIGHT = 12;

function measureTable(info: TableInfo) {
  const allLines = [info.name, ...info.columns.map(c => `${c.name} ${c.type}`)];
  const maxChars = Math.max(...allLines.map((l) => l.length));
  const width = Math.max(MIN_WIDTH, maxChars * CHAR_WIDTH + PADDING_X * 2);
  const height = HEADER_HEIGHT + info.columns.length * LINE_HEIGHT + PADDING_Y * 2;
  return { width, height };
}

function DatabaseTable({ node, onMouseDown, onMouseUp }: any) {
  const info: TableInfo | undefined = node.data;
  if (!info) {
    return (
      <div
        onMouseDown={onMouseDown} onMouseUp={onMouseUp}
        style={{ width: MIN_WIDTH, height: HEADER_HEIGHT + 2 * PADDING_Y, background: "#fff", border: "0.3px solid #333", cursor: "grab", fontSize: 5 }}
      >
        {node.id}
      </div>
    );
  }

  const { width } = measureTable(info);
  return (
    <div
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      style={{
        background: "#ffffff",
        border: "0.3px solid #4a5568",
        borderRadius: 0.5,
        cursor: "grab",
        userSelect: "none",
        width,
        fontFamily: "monospace",
        fontSize: 5,
        boxShadow: "0 0.5px 2px rgba(0,0,0,0.1)",
        whiteSpace: "nowrap",
        boxSizing: "border-box",
      }}
    >
      {/* Header — exact height: HEADER_HEIGHT */}
      <div style={{
        height: HEADER_HEIGHT,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#e2e8f0",
        borderBottom: "0.3px solid #4a5568",
        paddingLeft: PADDING_X,
        paddingRight: PADDING_X,
        fontFamily: "sans-serif",
        fontSize: 5.5,
        fontWeight: "bold",
        color: "#2d3748",
        boxSizing: "border-box",
      }}>
        {info.name}
      </div>
      {/* Columns — each row is exactly LINE_HEIGHT, with PADDING_Y top/bottom */}
      <div style={{ paddingTop: PADDING_Y, paddingBottom: PADDING_Y }}>
        {info.columns.map((col, i) => (
          <div key={i} style={{
            height: LINE_HEIGHT,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingLeft: PADDING_X,
            paddingRight: PADDING_X,
            gap: 3,
            boxSizing: "border-box",
          }}>
            <span style={{ color: col.isPrimaryKey ? "#744210" : col.isForeignKey ? "#2c5282" : "#4a5568", fontWeight: col.isPrimaryKey ? "bold" : "normal" }}>
              {col.isPrimaryKey ? "* " : col.isForeignKey ? "~ " : "  "}{col.name}
            </span>
            <span style={{ color: "#718096", fontStyle: "italic", fontSize: 4.5 }}>
              {col.type}{col.nullable === false ? "" : "?"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}


// --- Main App ---

/** Y position of a column row relative to the node origin (center). */
function rowY(info: TableInfo, rowIndex: number): number {
  const { height } = measureTable(info);
  const halfH = height / 2;
  return -halfH + HEADER_HEIGHT + PADDING_Y + (rowIndex + 0.5) * LINE_HEIGHT;
}

function computeConnectors(id: string, info?: TableInfo) {
  if (!info) info = TABLE_DATA[id];
  if (!info) return [];
  const { width } = measureTable(info);
  const halfW = width / 2;
  return info.columns.flatMap((col, i) => [
    { id: `${id}-${col.name}-left`, x: -halfW, y: rowY(info!, i) },
    { id: `${id}-${col.name}-right`, x: halfW, y: rowY(info!, i) },
  ]);
}

function DbConnectorRenderer({ worldX, worldY, isHovered, onMouseDown, onMouseOver, onMouseUp, onMouseOut }: any) {
  const r = isHovered ? 1.2 : 0.7;
  return (
    <circle
      cx={worldX}
      cy={worldY}
      r={r}
      fill={isHovered ? "#3182ce" : "#a0aec0"}
      opacity={isHovered ? 1 : 0.5}
      onMouseDown={onMouseDown}
      onMouseOver={onMouseOver}
      onMouseUp={onMouseUp}
      onMouseOut={onMouseOut}
      style={{ cursor: "crosshair" }}
    />
  );
}

export default function DatabaseDiagramApp() {
  const { viewportConfig, containerRef, containerProps, isPanning } = useSolmuViewport({
    origin: 'top-left' as const,
    units: 'mm' as const,
    worldBounds: { x: -250, y: -200, width: 600, height: 600 },
    zoom: 1,
    pan: { x: 0, y: 0 },
    grid: {
      size: 5,
      visible: false,
      snap: false,
    },
  });

  const [data, setData] = React.useState({
    nodes: [
      { id: "users", x: -90, y: -80, type: "db-table", connectors: computeConnectors("users"), data: TABLE_DATA["users"] },
      { id: "posts", x: 40, y: -80, type: "db-table", connectors: computeConnectors("posts"), data: TABLE_DATA["posts"] },
      { id: "comments", x: 40, y: 50, type: "db-table", connectors: computeConnectors("comments"), data: TABLE_DATA["comments"] },
      { id: "categories", x: -90, y: 50, type: "db-table", connectors: computeConnectors("categories"), data: TABLE_DATA["categories"] },
      { id: "post_categories", x: -90, y: 160, type: "db-table", connectors: computeConnectors("post_categories"), data: TABLE_DATA["post_categories"] },
      { id: "tags", x: 160, y: -80, type: "db-table", connectors: computeConnectors("tags"), data: TABLE_DATA["tags"] },
      { id: "post_tags", x: 160, y: 50, type: "db-table", connectors: computeConnectors("post_tags"), data: TABLE_DATA["post_tags"] },
    ],
    edges: [
      // users.id 1---* posts.user_id
      {
        source: { node: "users", connector: "users-id-right" },
        target: { node: "posts", connector: "posts-user_id-left" },
        type: "orthogonal",
        style: { stroke: "#4a5568", strokeWidth: 0.3, markerEnd: "arrow-open" },
      } as Edge,
      // posts.id 1---* comments.post_id
      {
        source: { node: "posts", connector: "posts-id-right" },
        target: { node: "comments", connector: "comments-post_id-left" },
        type: "orthogonal",
        style: { stroke: "#4a5568", strokeWidth: 0.3, markerEnd: "arrow-open" },
      } as Edge,
      // users.id 1---* comments.user_id
      {
        source: { node: "users", connector: "users-id-right" },
        target: { node: "comments", connector: "comments-user_id-left" },
        type: "orthogonal",
        style: { stroke: "#4a5568", strokeWidth: 0.3, markerEnd: "arrow-open" },
      } as Edge,
      // posts.id 1---* post_categories.post_id
      {
        source: { node: "posts", connector: "posts-id-right" },
        target: { node: "post_categories", connector: "post_categories-post_id-left" },
        type: "orthogonal",
        style: { stroke: "#4a5568", strokeWidth: 0.3, markerEnd: "arrow-open" },
      } as Edge,
      // categories.id 1---* post_categories.category_id
      {
        source: { node: "categories", connector: "categories-id-right" },
        target: { node: "post_categories", connector: "post_categories-category_id-left" },
        type: "orthogonal",
        style: { stroke: "#4a5568", strokeWidth: 0.3, markerEnd: "arrow-open" },
      } as Edge,
      // posts.id 1---* post_tags.post_id
      {
        source: { node: "posts", connector: "posts-id-right" },
        target: { node: "post_tags", connector: "post_tags-post_id-left" },
        type: "orthogonal",
        style: { stroke: "#4a5568", strokeWidth: 0.3, markerEnd: "arrow-open" },
      } as Edge,
      // tags.id 1---* post_tags.tag_id
      {
        source: { node: "tags", connector: "tags-id-right" },
        target: { node: "post_tags", connector: "post_tags-tag_id-left" },
        type: "orthogonal",
        style: { stroke: "#4a5568", strokeWidth: 0.3, markerEnd: "arrow-open" },
      } as Edge,
    ],
  });

  const routingMode = 'orthogonal' as const;

  function onConnect(
    start: { node: string; connector: string },
    end: { node: string; connector: string }
  ) {
    setData((prev) => ({
      ...prev,
      edges: [
        ...prev.edges,
        { source: start, target: end, type: routingMode, style: { stroke: "#4a5568", strokeWidth: 0.3, markerEnd: "arrow-open" } } as Edge,
      ],
    }));
  }

  function deleteSelected() {
    if (selection.nodeIds.length === 0 && selection.edgeIds.length === 0) return;
    const nodeSet = new Set(selection.nodeIds);
    const edgeSet = new Set(selection.edgeIds);
    setData((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => !nodeSet.has(n.id)),
      edges: prev.edges.filter((edge, index) => {
        const id = `${edge.source.node}-${edge.target.node}-${index}`;
        // Remove selected edges and edges connected to deleted nodes
        return !edgeSet.has(id) && !nodeSet.has(edge.source.node) && !nodeSet.has(edge.target.node);
      }),
    }));
  }

  function onNodeMove(nodeId: string, x: number, y: number) {
    setData((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n)),
    }));
  }

  function onEdgePathChange(edgeId: string, waypoints: { x: number; y: number }[]) {
    setData((prev) => ({
      ...prev,
      edges: prev.edges.map((edge, index) => {
        const id = `${edge.source.node}-${edge.target.node}-${index}`;
        return id === edgeId ? { ...edge, waypoints } : edge;
      }),
    }));
  }

  const config = {
    renderers: [
      { type: "db-table", component: DatabaseTable },
    ],
    viewport: viewportConfig,
    routing: {
      mode: routingMode,
      avoidNodes: true,
      margin: 5,
      gridSize: 5,
      cornerRadius: 0,
      stubLength: 8,
    },
  };

  const { canvas, elements, interactions, selection, actions } = useSolmu({
    data,
    config,
    containerRef,
    onNodeMove,
    onConnect,
    onEdgePathChange,
  });

  // Recompute connectors for duplicated/pasted nodes so connector IDs
  // use the new node ID and dimensions match the table data.
  function fixupNodes(result: { nodes: any[]; edges: any[]; idMap: Record<string, string> }) {
    const fixedNodes = result.nodes.map((node: any) => ({
      ...node,
      connectors: computeConnectors(node.id, node.data),
    }));
    // Remap edge connector references: replace old node ID prefix with new one
    function remapConnector(connectorId: string, oldNodeId: string, newNodeId: string): string {
      if (connectorId.startsWith(oldNodeId + "-")) {
        return newNodeId + connectorId.slice(oldNodeId.length);
      }
      return connectorId;
    }
    // Build reverse map: newId → oldId
    const reverseMap: Record<string, string> = {};
    for (const [oldId, newId] of Object.entries(result.idMap)) {
      reverseMap[newId] = oldId;
    }
    const fixedEdges = result.edges.map((edge: any) => ({
      ...edge,
      source: {
        node: edge.source.node,
        connector: remapConnector(edge.source.connector, reverseMap[edge.source.node] || "", edge.source.node),
      },
      target: {
        node: edge.target.node,
        connector: remapConnector(edge.target.connector, reverseMap[edge.target.node] || "", edge.target.node),
      },
    }));
    return { nodes: fixedNodes, edges: fixedEdges };
  }

  function handleDuplicate() {
    if (selection.nodeIds.length === 0) return;
    const result = duplicateSelection(data.nodes, data.edges, selection);
    const fixed = fixupNodes(result);
    setData((prev) => ({
      ...prev,
      nodes: [...prev.nodes, ...fixed.nodes] as typeof prev.nodes,
      edges: [...prev.edges, ...fixed.edges],
    }));
  }

  async function handleCopy() {
    if (selection.nodeIds.length === 0) return;
    await copyToSystemClipboard(data.nodes, data.edges, selection);
  }

  async function handlePaste() {
    const result = await pasteFromSystemClipboard();
    if (!result) return;
    const fixed = fixupNodes(result);
    setData((prev) => ({
      ...prev,
      nodes: [...prev.nodes, ...fixed.nodes] as typeof prev.nodes,
      edges: [...prev.edges, ...fixed.edges],
    }));
  }

  useSolmuKeyboard({
    bindings: [
      { key: "d", mod: true, action: handleDuplicate },
      { key: "c", mod: true, action: handleCopy },
      { key: "v", mod: true, action: handlePaste },
    ],
    actions: {
      deleteSelected,
      selectAll: actions.selectAll,
      deselect: actions.deselectAll,
    },
  });

  // Zoom & pan handled by useSolmuViewport (containerProps)

  // Relationship cardinality labels
  type CardinalityLabel = {
    edgeIndex: number;
    sourceLabel: string;
    targetLabel: string;
  };

  const cardinalityLabels: CardinalityLabel[] = [
    { edgeIndex: 0, sourceLabel: "1", targetLabel: "*" },    // users -> posts
    { edgeIndex: 1, sourceLabel: "1", targetLabel: "*" },    // posts -> comments
    { edgeIndex: 2, sourceLabel: "1", targetLabel: "*" },    // users -> comments
    { edgeIndex: 3, sourceLabel: "1", targetLabel: "*" },    // posts -> post_categories
    { edgeIndex: 4, sourceLabel: "1", targetLabel: "*" },    // categories -> post_categories
    { edgeIndex: 5, sourceLabel: "1", targetLabel: "*" },    // posts -> post_tags
    { edgeIndex: 6, sourceLabel: "1", targetLabel: "*" },    // tags -> post_tags
  ];

  return (
    <div
      style={{ width: "100%", height: "100%", position: "relative", background: "#edf2f7" }}
    >
      {/* HUD */}
      <div style={{
        position: 'absolute',
        top: 16,
        left: 16,
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '12px 16px',
        borderRadius: '6px',
        fontSize: '12px',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        zIndex: 1000,
        border: '1px solid #e2e8f0',
        color: '#4a5568',
        minWidth: 180,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}>
        <div style={{ color: '#2d3748', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Database Diagram</div>
        <div style={{ fontSize: 11, color: '#718096' }}>Zoom: {viewportConfig.zoom.toFixed(1)}x</div>
        <hr style={{ margin: '8px 0', borderColor: '#e2e8f0', borderStyle: 'solid' }} />
        <div style={{ fontSize: 11, color: '#a0aec0' }}>Scroll/Two-finger: Pan</div>
        <div style={{ fontSize: 11, color: '#a0aec0' }}>Pinch/Ctrl+Scroll: Zoom</div>
        <div style={{ fontSize: 11, color: '#a0aec0' }}>Middle/Ctrl+Drag: Pan</div>
        <div style={{ fontSize: 11, color: '#a0aec0' }}>Drag tables to move</div>
        <div style={{ fontSize: 11, color: '#a0aec0' }}>Drag between connectors to link</div>
        <div style={{ fontSize: 11, color: '#a0aec0' }}>Click to select, Shift+click multi-select</div>
        <div style={{ fontSize: 11, color: '#a0aec0' }}>Drag empty area: marquee select</div>
        <div style={{ fontSize: 11, color: '#a0aec0' }}>Ctrl+A: select all, Delete: remove</div>
        <div style={{ fontSize: 11, color: '#a0aec0' }}>Ctrl+D: duplicate, Ctrl+C/V: copy/paste</div>
        <div style={{ marginTop: 8, fontSize: 10, color: '#718096' }}>
          <span style={{ color: '#d69e2e' }}>🔑</span> Primary Key · <span style={{ color: '#3182ce' }}>🔗</span> Foreign Key
        </div>
      </div>

      {/* Canvas */}
      <SolmuCanvas
        canvas={canvas}
        elements={elements}
        interactions={interactions}
        connectorRenderer={DbConnectorRenderer}
        style={{ background: "#f7fafc", cursor: isPanning ? 'grabbing' : 'default' }}
        onMouseDown={containerProps.onMouseDown}
        onMouseMove={containerProps.onMouseMove}
      >
        {/* Cardinality labels at edge endpoints */}
        {cardinalityLabels.map((cl) => {
          const edge = elements.edges[cl.edgeIndex];
          if (!edge) return null;
          return (
            <g key={`card-${cl.edgeIndex}`}>
              <text x={edge.sourceLabelPoint.x} y={edge.sourceLabelPoint.y} textAnchor="middle" dominantBaseline="middle" fill="#4a5568" fontSize={2.2} fontFamily="sans-serif" fontWeight="bold">{cl.sourceLabel}</text>
              <text x={edge.targetLabelPoint.x} y={edge.targetLabelPoint.y} textAnchor="middle" dominantBaseline="middle" fill="#4a5568" fontSize={2.2} fontFamily="sans-serif" fontWeight="bold">{cl.targetLabel}</text>
            </g>
          );
        })}
      </SolmuCanvas>
    </div>
  );
}
