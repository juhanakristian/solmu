import React from "react";
import { useSolmu, DefaultConnectorRenderer, DefaultEdgeRenderer, SolmuMarkerDefs } from "../../../src";
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

// Layout constants (in mm, world coords)
const LINE_HEIGHT = 3.5;
const CHAR_WIDTH = 1.3;
const PADDING_X = 2;
const PADDING_Y = 2;
const MIN_WIDTH = 35;
const HEADER_HEIGHT = 6;

function measureTable(info: TableInfo) {
  const allLines = [info.name, ...info.columns.map(c => `${c.name} ${c.type}`)];
  const maxChars = Math.max(...allLines.map((l) => l.length));
  const width = Math.max(MIN_WIDTH, maxChars * CHAR_WIDTH + PADDING_X * 2);
  const height = HEADER_HEIGHT + info.columns.length * LINE_HEIGHT + PADDING_Y * 2;
  return { width, height };
}

function DatabaseTable({ node, ...props }: any) {
  const info = TABLE_DATA[node.id];
  if (!info) {
    return <rect {...props} width={30} height={20} fill="#fff" stroke="#333" />;
  }

  const { width, height } = measureTable(info);
  const halfW = width / 2;
  const halfH = height / 2;

  return (
    <g {...props}>
      {/* Hit area */}
      <rect x={-halfW} y={-halfH} width={width} height={height} fill="transparent" />

      {/* Background */}
      <rect
        x={-halfW}
        y={-halfH}
        width={width}
        height={height}
        fill="#ffffff"
        stroke="#4a5568"
        strokeWidth={0.3}
        rx={0.5}
        ry={0.5}
      />

      {/* Header background */}
      <rect
        x={-halfW}
        y={-halfH}
        width={width}
        height={HEADER_HEIGHT}
        fill="#e2e8f0"
        stroke="#4a5568"
        strokeWidth={0.3}
      />

      {/* Table name */}
      <text
        x={0}
        y={-halfH + HEADER_HEIGHT / 2 + 0.8}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#2d3748"
        fontSize={2.4}
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        {info.name}
      </text>

      {/* Divider after header */}
      <line
        x1={-halfW} y1={-halfH + HEADER_HEIGHT}
        x2={halfW} y2={-halfH + HEADER_HEIGHT}
        stroke="#4a5568" strokeWidth={0.3}
      />

      {/* Columns */}
      {info.columns.map((col, i) => (
        <g key={`col-${i}`}>
          {/* Primary key indicator */}
          {col.isPrimaryKey && (
            <text
              x={-halfW + PADDING_X}
              y={-halfH + HEADER_HEIGHT + PADDING_Y + (i + 0.6) * LINE_HEIGHT}
              fill="#d69e2e"
              fontSize={2}
              fontFamily="sans-serif"
              fontWeight="bold"
            >
              🔑
            </text>
          )}
          {/* Foreign key indicator */}
          {col.isForeignKey && !col.isPrimaryKey && (
            <text
              x={-halfW + PADDING_X}
              y={-halfH + HEADER_HEIGHT + PADDING_Y + (i + 0.6) * LINE_HEIGHT}
              fill="#3182ce"
              fontSize={2}
              fontFamily="sans-serif"
            >
              🔗
            </text>
          )}
          {/* Column name */}
          <text
            x={-halfW + PADDING_X + (col.isPrimaryKey || col.isForeignKey ? 3 : 0)}
            y={-halfH + HEADER_HEIGHT + PADDING_Y + (i + 0.6) * LINE_HEIGHT}
            fill={col.isPrimaryKey ? "#744210" : col.isForeignKey ? "#2c5282" : "#4a5568"}
            fontSize={2}
            fontFamily="monospace"
            fontWeight={col.isPrimaryKey ? "bold" : "normal"}
          >
            {col.name}
          </text>
          {/* Column type */}
          <text
            x={halfW - PADDING_X}
            y={-halfH + HEADER_HEIGHT + PADDING_Y + (i + 0.6) * LINE_HEIGHT}
            textAnchor="end"
            fill="#718096"
            fontSize={1.8}
            fontFamily="monospace"
            fontStyle="italic"
          >
            {col.type}{col.nullable === false ? "" : "?"}
          </text>
        </g>
      ))}
    </g>
  );
}

function DatabaseCanvas({
  canvas,
  elements,
  style,
  children,
}: {
  canvas: any;
  elements: any;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  return (
    <svg
      {...canvas.props}
      viewBox={canvas.viewBox}
      style={{
        background: "#f7fafc",
        width: "100%",
        height: "100%",
        userSelect: "none",
        ...style,
      }}
    >
      <SolmuMarkerDefs edges={elements.edges} />

      {/* Grid dots */}
      {canvas.gridDots?.map((dot: any, i: number) => (
        <circle
          key={`grid-${i}`}
          cx={dot.x} cy={dot.y} r={dot.size}
          fill="#e2e8f0" opacity={dot.opacity}
        />
      ))}

      {/* Edges */}
      {elements.edges.map((edge: any) => (
        <DefaultEdgeRenderer key={edge.id} edge={edge} />
      ))}

      {/* Nodes */}
      {elements.nodes.map((node: any) => {
        const NodeComponent = node.renderer;
        return (
          <g key={node.id} transform={node.transform}>
            <g transform={node.rotation ? `rotate(${node.rotation})` : undefined}>
              <NodeComponent {...node.nodeProps} />
            </g>
            {node.connectorProps.map((cp: any) => (
              <DefaultConnectorRenderer key={cp.connector.id} {...cp} />
            ))}
          </g>
        );
      })}

      {/* Drag line */}
      {elements.dragLine?.isVisible && (
        <path
          d={elements.dragLine.path}
          stroke="#3182ce"
          strokeWidth="0.3"
          strokeDasharray="1 1"
          fill="none"
        />
      )}

      {/* Relationship labels */}
      {children}
    </svg>
  );
}

// --- Main App ---

function computeConnectors(id: string) {
  const info = TABLE_DATA[id];
  if (!info) return [];
  const { width, height } = measureTable(info);
  const halfW = width / 2;
  const halfH = height / 2;
  return [
    { id: `${id}-top`, x: 0, y: -halfH },
    { id: `${id}-bottom`, x: 0, y: halfH },
    { id: `${id}-left`, x: -halfW, y: 0 },
    { id: `${id}-right`, x: halfW, y: 0 },
  ];
}

export default function DatabaseDiagramApp() {
  const [viewportConfig, setViewportConfig] = React.useState({
    origin: 'top-left' as const,
    units: 'mm' as const,
    width: window.innerWidth,
    height: window.innerHeight,
    worldBounds: { x: -200, y: -200, width: 400, height: 400 },
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
      { id: "users", x: -60, y: -40, type: "db-table", connectors: computeConnectors("users") },
      { id: "posts", x: 20, y: -40, type: "db-table", connectors: computeConnectors("posts") },
      { id: "comments", x: 20, y: 30, type: "db-table", connectors: computeConnectors("comments") },
      { id: "categories", x: -60, y: 30, type: "db-table", connectors: computeConnectors("categories") },
      { id: "post_categories", x: -60, y: 90, type: "db-table", connectors: computeConnectors("post_categories") },
      { id: "tags", x: 100, y: -40, type: "db-table", connectors: computeConnectors("tags") },
      { id: "post_tags", x: 100, y: 30, type: "db-table", connectors: computeConnectors("post_tags") },
    ],
    edges: [
      // users 1---* posts
      {
        source: { node: "users", connector: "users-right" },
        target: { node: "posts", connector: "posts-left" },
        type: "orthogonal",
        style: { stroke: "#4a5568", strokeWidth: 0.3, markerEnd: "arrow-open" },
      } as Edge,
      // posts 1---* comments
      {
        source: { node: "posts", connector: "posts-bottom" },
        target: { node: "comments", connector: "comments-top" },
        type: "orthogonal",
        style: { stroke: "#4a5568", strokeWidth: 0.3, markerEnd: "arrow-open" },
      } as Edge,
      // users 1---* comments
      {
        source: { node: "users", connector: "users-bottom" },
        target: { node: "comments", connector: "comments-left" },
        type: "orthogonal",
        style: { stroke: "#4a5568", strokeWidth: 0.3, markerEnd: "arrow-open" },
      } as Edge,
      // posts *---* categories (via post_categories)
      {
        source: { node: "posts", connector: "posts-right" },
        target: { node: "post_categories", connector: "post_categories-top" },
        type: "orthogonal",
        style: { stroke: "#4a5568", strokeWidth: 0.3, markerEnd: "arrow-open" },
      } as Edge,
      {
        source: { node: "categories", connector: "categories-bottom" },
        target: { node: "post_categories", connector: "post_categories-left" },
        type: "orthogonal",
        style: { stroke: "#4a5568", strokeWidth: 0.3, markerEnd: "arrow-open" },
      } as Edge,
      // posts *---* tags (via post_tags)
      {
        source: { node: "posts", connector: "posts-right" },
        target: { node: "post_tags", connector: "post_tags-top" },
        type: "orthogonal",
        style: { stroke: "#4a5568", strokeWidth: 0.3, markerEnd: "arrow-open" },
      } as Edge,
      {
        source: { node: "tags", connector: "tags-bottom" },
        target: { node: "post_tags", connector: "post_tags-right" },
        type: "orthogonal",
        style: { stroke: "#4a5568", strokeWidth: 0.3, markerEnd: "arrow-open" },
      } as Edge,
    ],
  });

  const routingMode = 'orthogonal' as const;

  const [selectedEdgeId, setSelectedEdgeId] = React.useState<string | null>(null);

  function onConnect(
    start: { node: string; connector: string },
    end: { node: string; connector: string }
  ) {
    setData((prev) => ({
      ...prev,
      edges: [
        ...prev.edges,
        { source: start, target: end, type: routingMode } as Edge,
      ],
    }));
  }

  function onEdgeClick(edgeId: string) {
    setSelectedEdgeId(edgeId);
  }

  function deleteSelectedEdge() {
    if (selectedEdgeId) {
      setData((prev) => {
        const indexToRemove = prev.edges.findIndex((edge, index) => 
          `${edge.source.node}-${edge.target.node}-${index}` === selectedEdgeId
        );
        if (indexToRemove === -1) return prev;
        
        const newEdges = [...prev.edges];
        newEdges.splice(indexToRemove, 1);
        return { ...prev, edges: newEdges };
      });
      setSelectedEdgeId(null);
    }
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

  const { canvas, elements } = useSolmu({
    data,
    config,
    onNodeMove,
    onConnect,
    onEdgeClick,
    onEdgePathChange,
  });

  // Keyboard handler for edge deletion
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelectedEdge();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedEdgeId]);

  // Zoom and pan
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setViewportConfig((prev) => ({
      ...prev,
      zoom: Math.max(0.1, Math.min(10, prev.zoom * zoomFactor)),
    }));
  };

  const [isPanning, setIsPanning] = React.useState(false);
  const [lastPanPos, setLastPanPos] = React.useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      e.preventDefault();
      setIsPanning(true);
      setLastPanPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      e.preventDefault();
      const deltaX = e.clientX - lastPanPos.x;
      const deltaY = e.clientY - lastPanPos.y;

      const normalizedDeltaX = deltaX / viewportConfig.width / viewportConfig.zoom;
      const normalizedDeltaY = deltaY / viewportConfig.height / viewportConfig.zoom;

      setViewportConfig((prev) => ({
        ...prev,
        pan: {
          x: prev.pan.x - normalizedDeltaX,
          y: prev.pan.y - normalizedDeltaY,
        },
      }));

      setLastPanPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  React.useEffect(() => {
    const handleGlobalMouseUp = () => setIsPanning(false);
    if (isPanning) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('mouseleave', handleGlobalMouseUp);
      return () => {
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        document.removeEventListener('mouseleave', handleGlobalMouseUp);
      };
    }
  }, [isPanning]);

  React.useEffect(() => {
    const handleResize = () => {
      setViewportConfig((prev) => ({
        ...prev,
        width: window.innerWidth,
        height: window.innerHeight,
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        <div style={{ fontSize: 11, color: '#a0aec0' }}>Scroll: Zoom</div>
        <div style={{ fontSize: 11, color: '#a0aec0' }}>Middle/Ctrl+Drag: Pan</div>
        <div style={{ fontSize: 11, color: '#a0aec0' }}>Drag tables to move</div>
        <div style={{ fontSize: 11, color: '#a0aec0' }}>Drag between connectors to link</div>
        <div style={{ fontSize: 11, color: '#a0aec0' }}>Click edge to select, Delete to remove</div>
        <div style={{ marginTop: 8, fontSize: 10, color: '#718096' }}>
          <span style={{ color: '#d69e2e' }}>🔑</span> Primary Key · <span style={{ color: '#3182ce' }}>🔗</span> Foreign Key
        </div>
      </div>

      {/* Canvas */}
      <div
        style={{ width: "100%", height: "100%", overflow: "hidden" }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <DatabaseCanvas
          canvas={canvas}
          elements={elements}
          style={{
            cursor: isPanning ? 'grabbing' : 'default',
            width: "100%",
            height: "100%",
          }}
        >
          {/* Cardinality labels */}
          {cardinalityLabels.map((cl) => {
            const edge = elements.edges[cl.edgeIndex];
            if (!edge) return null;
            const x = edge.labelPoint.x;
            const y = edge.labelPoint.y;
            return (
              <g key={`card-${cl.edgeIndex}`}>
                <text
                  x={x - 3} y={y + 2}
                  textAnchor="middle"
                  fill="#4a5568"
                  fontSize={2}
                  fontFamily="sans-serif"
                  fontWeight="bold"
                >
                  {cl.sourceLabel}
                </text>
                <text
                  x={x + 3} y={y + 2}
                  textAnchor="middle"
                  fill="#4a5568"
                  fontSize={2}
                  fontFamily="sans-serif"
                  fontWeight="bold"
                >
                  {cl.targetLabel}
                </text>
              </g>
            );
          })}
        </DatabaseCanvas>
      </div>
    </div>
  );
}
