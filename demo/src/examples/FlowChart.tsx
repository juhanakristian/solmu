import React from "react";
import { useSolmu, useSolmuKeyboard, useSolmuViewport, SolmuCanvas } from "../../../src";
import type { Edge } from "../../../src/types";

// --- Flowchart shape renderers ---

const COLORS = {
  fill: "#e3f2fd",
  stroke: "#1565c0",
  text: "#1a237e",
  decision: "#fff3e0",
  decisionStroke: "#e65100",
  terminal: "#e8f5e9",
  terminalStroke: "#2e7d32",
  io: "#f3e5f5",
  ioStroke: "#6a1b9a",
};

const NODE_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "grab",
  userSelect: "none",
  fontSize: 9,
  fontFamily: "sans-serif",
  textAlign: "center",
  lineHeight: 1.3,
};

// Start / End (rounded rectangle)
function Terminal({ node, onMouseDown, onMouseUp }: any) {
  const label = NODE_LABELS[node.id] || node.id;
  return (
    <div
      onMouseDown={onMouseDown} onMouseUp={onMouseUp}
      style={{ ...NODE_STYLE, width: 56, height: 20, background: COLORS.terminal, border: `0.5px solid ${COLORS.terminalStroke}`, borderRadius: 10, color: COLORS.text }}
    >
      {label}
    </div>
  );
}

// Process (rectangle)
function Process({ node, onMouseDown, onMouseUp }: any) {
  const label = NODE_LABELS[node.id] || node.id;
  return (
    <div
      onMouseDown={onMouseDown} onMouseUp={onMouseUp}
      style={{ ...NODE_STYLE, width: 64, height: 24, background: COLORS.fill, border: `0.5px solid ${COLORS.stroke}`, borderRadius: 2, color: COLORS.text, whiteSpace: "pre-line" }}
    >
      {label}
    </div>
  );
}

// Decision (diamond) — inline SVG with label overlay
function Decision({ node, onMouseDown, onMouseUp }: any) {
  const s = 20; // pixels (= 10 world units at default zoom)
  const label = NODE_LABELS[node.id] || node.id;
  return (
    <div onMouseDown={onMouseDown} onMouseUp={onMouseUp} style={{ position: "relative", width: s * 2, height: s * 2, cursor: "grab" }}>
      <svg width={s * 2} height={s * 2} style={{ position: "absolute", top: 0, left: 0 }}>
        <path
          d={`M ${s} 0 L ${s * 2} ${s} L ${s} ${s * 2} L 0 ${s} Z`}
          fill={COLORS.decision}
          stroke={COLORS.decisionStroke}
          strokeWidth={0.5}
          strokeLinejoin="round"
        />
      </svg>
      <div style={{ ...NODE_STYLE, position: "absolute", inset: 0, fontSize: 8, color: COLORS.text }}>
        {label}
      </div>
    </div>
  );
}

// I/O (parallelogram) — inline SVG with label overlay
function IOBlock({ node, onMouseDown, onMouseUp }: any) {
  const w = 60; const h = 20; const skew = 8;
  const label = NODE_LABELS[node.id] || node.id;
  return (
    <div onMouseDown={onMouseDown} onMouseUp={onMouseUp} style={{ position: "relative", width: w, height: h, cursor: "grab" }}>
      <svg width={w} height={h} style={{ position: "absolute", top: 0, left: 0 }}>
        <path
          d={`M ${skew} 0 L ${w} 0 L ${w - skew} ${h} L 0 ${h} Z`}
          fill={COLORS.io}
          stroke={COLORS.ioStroke}
          strokeWidth={0.5}
          strokeLinejoin="round"
        />
      </svg>
      <div style={{ ...NODE_STYLE, position: "absolute", inset: 0, color: COLORS.text }}>
        {label}
      </div>
    </div>
  );
}

// Label data
const NODE_LABELS: Record<string, string> = {
  start: "Start",
  input: "Read input",
  validate: "Validate\ndata",
  isValid: "Valid?",
  process: "Process\nrequest",
  error: "Show error",
  retry: "Retry?",
  save: "Save result",
  output: "Display\nresult",
  end: "End",
};

// Connector definitions per node
function connectors(id: string, type: string) {
  switch (type) {
    case "terminal":
      return [
        { id: `${id}-top`, x: 0, y: -5 },
        { id: `${id}-bottom`, x: 0, y: 5 },
        { id: `${id}-left`, x: -14, y: 0 },
        { id: `${id}-right`, x: 14, y: 0 },
      ];
    case "process":
      return [
        { id: `${id}-top`, x: 0, y: -6 },
        { id: `${id}-bottom`, x: 0, y: 6 },
        { id: `${id}-left`, x: -16, y: 0 },
        { id: `${id}-right`, x: 16, y: 0 },
      ];
    case "decision":
      return [
        { id: `${id}-top`, x: 0, y: -10 },
        { id: `${id}-bottom`, x: 0, y: 10 },
        { id: `${id}-left`, x: -10, y: 0 },
        { id: `${id}-right`, x: 10, y: 0 },
      ];
    case "io":
      return [
        { id: `${id}-top`, x: 0, y: -5 },
        { id: `${id}-bottom`, x: 0, y: 5 },
        { id: `${id}-left`, x: -15, y: 0 },
        { id: `${id}-right`, x: 15, y: 0 },
      ];
    default:
      return [];
  }
}

// Edge labels rendered as SVG children inside SolmuCanvas
function FlowEdgeLabels({ edges, edgeLabels }: { edges: any[]; edgeLabels: (string | null)[] }) {
  return (
    <>
      {edges.map((edge: any, i: number) => {
        const label = edgeLabels[i];
        if (!label) return null;
        return (
          <g key={`elabel-${edge.id}`}>
            <rect
              x={edge.labelPoint.x - 4} y={edge.labelPoint.y - 2}
              width={8} height={4} rx={1} ry={1}
              fill="#fff" opacity={0.85}
            />
            <text
              x={edge.labelPoint.x} y={edge.labelPoint.y + 0.5}
              textAnchor="middle" dominantBaseline="middle"
              fill="#546e7a" fontSize={2.2} fontFamily="sans-serif" fontStyle="italic"
            >
              {label}
            </text>
          </g>
        );
      })}
    </>
  );
}

// --- Main App ---

export default function FlowChartApp() {
  const { viewportConfig, containerRef, containerProps, isPanning } = useSolmuViewport({
    origin: 'top-left' as const,
    units: 'mm' as const,
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
      { id: "start", x: 0, y: -80, type: "terminal", connectors: connectors("start", "terminal") },
      { id: "input", x: 0, y: -55, type: "io", connectors: connectors("input", "io") },
      { id: "validate", x: 0, y: -30, type: "process", connectors: connectors("validate", "process") },
      { id: "isValid", x: 0, y: -5, type: "decision", connectors: connectors("isValid", "decision") },
      { id: "process", x: 0, y: 25, type: "process", connectors: connectors("process", "process") },
      { id: "error", x: 45, y: -5, type: "process", connectors: connectors("error", "process") },
      { id: "retry", x: 45, y: -30, type: "decision", connectors: connectors("retry", "decision") },
      { id: "save", x: 0, y: 50, type: "process", connectors: connectors("save", "process") },
      { id: "output", x: 0, y: 75, type: "io", connectors: connectors("output", "io") },
      { id: "end", x: 0, y: 100, type: "terminal", connectors: connectors("end", "terminal") },
    ],
    edges: [
      { source: { node: "start", connector: "start-bottom" }, target: { node: "input", connector: "input-top" }, type: "orthogonal" } as Edge,
      { source: { node: "input", connector: "input-bottom" }, target: { node: "validate", connector: "validate-top" }, type: "orthogonal" } as Edge,
      { source: { node: "validate", connector: "validate-bottom" }, target: { node: "isValid", connector: "isValid-top" }, type: "orthogonal" } as Edge,
      // Valid? -> Yes -> Process
      { source: { node: "isValid", connector: "isValid-bottom" }, target: { node: "process", connector: "process-top" }, type: "orthogonal" } as Edge,
      // Valid? -> No -> Error
      { source: { node: "isValid", connector: "isValid-right" }, target: { node: "error", connector: "error-left" }, type: "orthogonal" } as Edge,
      // Error -> Retry?
      { source: { node: "error", connector: "error-top" }, target: { node: "retry", connector: "retry-bottom" }, type: "orthogonal" } as Edge,
      // Retry? -> Yes -> back to Input
      { source: { node: "retry", connector: "retry-left" }, target: { node: "input", connector: "input-right" }, type: "orthogonal" } as Edge,
      // Retry? -> No -> End (route right then down)
      { source: { node: "retry", connector: "retry-top" }, target: { node: "end", connector: "end-right" }, type: "orthogonal" } as Edge,
      // Process -> Save
      { source: { node: "process", connector: "process-bottom" }, target: { node: "save", connector: "save-top" }, type: "orthogonal" } as Edge,
      // Save -> Output
      { source: { node: "save", connector: "save-bottom" }, target: { node: "output", connector: "output-top" }, type: "orthogonal" } as Edge,
      // Output -> End
      { source: { node: "output", connector: "output-bottom" }, target: { node: "end", connector: "end-top" }, type: "orthogonal" } as Edge,
    ],
  });

  // Edge labels mapped by index - these correspond to the edges above
  const edgeLabels = [
    null,   // start -> input (no label)
    null,   // input -> validate (no label)
    null,   // validate -> isValid (no label)
    "Yes",  // isValid -> process
    "No",   // isValid -> error
    null,   // error -> retry (no label)
    "Yes",  // retry -> input
    "No",   // retry -> end
    null,   // process -> save (no label)
    null,   // save -> output (no label)
    null,   // output -> end (no label)
  ];

  const routingMode = 'orthogonal' as const;

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

  function deleteSelected() {
    if (selection.nodeIds.length === 0 && selection.edgeIds.length === 0) return;
    const nodeSet = new Set(selection.nodeIds);
    const edgeSet = new Set(selection.edgeIds);
    setData((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => !nodeSet.has(n.id)),
      edges: prev.edges.filter((edge, index) => {
        const id = `${edge.source.node}-${edge.target.node}-${index}`;
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
      { type: "terminal", component: Terminal },
      { type: "process", component: Process },
      { type: "decision", component: Decision },
      { type: "io", component: IOBlock },
    ],
    viewport: viewportConfig,
    routing: {
      mode: routingMode,
      avoidNodes: true,
      margin: 5,
      gridSize: 5,
      cornerRadius: 0,
      stubLength: 5,
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

  useSolmuKeyboard({
    actions: {
      deleteSelected,
      selectAll: actions.selectAll,
      deselect: actions.deselectAll,
    },
  });

  // Zoom & pan handled by useSolmuViewport (containerProps)



  return (
    <div
      style={{ width: "100%", height: "100%", position: "relative", background: "#f5f5f5" }}
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
        border: '1px solid #e0e0e0',
        color: '#555',
        minWidth: 170,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}>
        <div style={{ color: '#1565c0', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Flow Chart</div>
        <div style={{ fontSize: 11, color: '#888' }}>Zoom: {viewportConfig.zoom.toFixed(1)}x</div>
        <hr style={{ margin: '8px 0', borderColor: '#e0e0e0', borderStyle: 'solid' }} />
        <div style={{ fontSize: 11, color: '#999' }}>Scroll/Two-finger: Pan</div>
        <div style={{ fontSize: 11, color: '#999' }}>Pinch/Ctrl+Scroll: Zoom</div>
        <div style={{ fontSize: 11, color: '#999' }}>Middle/Ctrl+Drag: Pan</div>
        <div style={{ fontSize: 11, color: '#999' }}>Drag shapes to move</div>
        <div style={{ fontSize: 11, color: '#999' }}>Drag between connectors to link</div>
        <div style={{ fontSize: 11, color: '#999' }}>Click edge to select, Delete to remove</div>
        <div style={{ fontSize: 11, color: '#999' }}>Drag edge segments to reshape</div>
      </div>

      {/* Canvas */}
      <SolmuCanvas
        canvas={canvas}
        elements={elements}
        interactions={interactions}
        style={{ background: "#fafbfc", cursor: isPanning ? 'grabbing' : 'default' }}
        onMouseDown={containerProps.onMouseDown}
        onMouseMove={containerProps.onMouseMove}
      >
        <FlowEdgeLabels edges={elements.edges} edgeLabels={edgeLabels} />
      </SolmuCanvas>
    </div>
  );
}
