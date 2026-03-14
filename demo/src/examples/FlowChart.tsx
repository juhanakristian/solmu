import React from "react";
import { useSolmu, DefaultConnectorRenderer } from "../../../src";
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

// Start / End (rounded rectangle)
function Terminal({ node, ...props }: any) {
  const w = 28;
  const h = 10;
  return (
    <g {...props}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="transparent" />
      <rect
        x={-w / 2} y={-h / 2} width={w} height={h}
        rx={5} ry={5}
        fill={COLORS.terminal}
        stroke={COLORS.terminalStroke}
        strokeWidth={0.3}
      />
    </g>
  );
}

// Process (rectangle)
function Process({ node, ...props }: any) {
  const w = 32;
  const h = 12;
  return (
    <g {...props}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="transparent" />
      <rect
        x={-w / 2} y={-h / 2} width={w} height={h}
        rx={1} ry={1}
        fill={COLORS.fill}
        stroke={COLORS.stroke}
        strokeWidth={0.3}
      />
    </g>
  );
}

// Decision (diamond)
function Decision({ node, ...props }: any) {
  const s = 10; // half-size
  return (
    <g {...props}>
      <rect x={-s} y={-s} width={s * 2} height={s * 2} fill="transparent" />
      <path
        d={`M 0 ${-s} L ${s} 0 L 0 ${s} L ${-s} 0 Z`}
        fill={COLORS.decision}
        stroke={COLORS.decisionStroke}
        strokeWidth={0.3}
        strokeLinejoin="round"
      />
    </g>
  );
}

// I/O (parallelogram)
function IOBlock({ node, ...props }: any) {
  const w = 30;
  const h = 10;
  const skew = 4;
  return (
    <g {...props}>
      <rect x={-w / 2 - skew} y={-h / 2} width={w + skew * 2} height={h} fill="transparent" />
      <path
        d={`M ${-w / 2 + skew} ${-h / 2} L ${w / 2 + skew} ${-h / 2} L ${w / 2 - skew} ${h / 2} L ${-w / 2 - skew} ${h / 2} Z`}
        fill={COLORS.io}
        stroke={COLORS.ioStroke}
        strokeWidth={0.3}
        strokeLinejoin="round"
      />
    </g>
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

// --- Flowchart canvas (custom render with labels) ---

function FlowChartCanvas({
  canvas,
  elements,
  style,
  edgeLabels,
}: {
  canvas: any;
  elements: any;
  style?: React.CSSProperties;
  edgeLabels: (string | null)[];
}) {
  return (
    <svg
      {...canvas.props}
      viewBox={canvas.viewBox}
      style={{
        background: "#fafbfc",
        width: "100%",
        height: "100%",
        userSelect: "none",
        ...style,
      }}
    >
      {/* Grid dots */}
      {canvas.gridDots?.map((dot: any, i: number) => (
        <circle
          key={`grid-${i}`}
          cx={dot.x} cy={dot.y} r={dot.size}
          fill="#ddd" opacity={dot.opacity}
        />
      ))}

      {/* Edges with draggable segment hit areas */}
      {elements.edges.map((edge: any) => (
        <g key={edge.id}>
          <path
            d={edge.path}
            fill="none"
            stroke={edge.isSelected ? "#1565c0" : "#546e7a"}
            strokeWidth={edge.isSelected ? 0.5 : 0.3}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              edge.onClick?.();
            }}
            style={{ cursor: "pointer" }}
          />
          {/* Invisible hit areas for draggable segments */}
          {edge.segments?.filter((s: any) => s.draggable).map((segment: any) => (
            <line
              key={`seg-${segment.index}`}
              x1={segment.p1.x}
              y1={segment.p1.y}
              x2={segment.p2.x}
              y2={segment.p2.y}
              stroke="transparent"
              strokeWidth={3}
              style={{
                cursor: segment.orientation === "horizontal" ? "ns-resize" : "ew-resize",
              }}
              onMouseDown={(e: React.MouseEvent) => {
                e.stopPropagation();
                edge.onSegmentDragStart?.(segment.index, e);
              }}
            />
          ))}
        </g>
      ))}

      {/* Edge labels (Yes/No) */}
      {elements.edges.map((edge: any, i: number) => {
        const label = edgeLabels[i];
        if (!label) return null;
        return (
          <g key={`elabel-${edge.id}`}>
            <rect
              x={edge.labelPoint.x - 4} y={edge.labelPoint.y - 2}
              width={8} height={4}
              rx={1} ry={1}
              fill="#fff"
              stroke="none"
              opacity={0.85}
            />
            <text
              x={edge.labelPoint.x} y={edge.labelPoint.y + 0.5}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#546e7a"
              fontSize={2.2}
              fontFamily="sans-serif"
              fontStyle="italic"
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* Nodes with labels */}
      {elements.nodes.map((node: any) => {
        const NodeComponent = node.renderer;
        const label = NODE_LABELS[node.id] || node.id;
        const lines = label.split("\n");
        return (
          <g key={node.id} transform={node.transform}>
            <g transform={node.rotation ? `rotate(${node.rotation})` : undefined}>
              <NodeComponent {...node.nodeProps} />
              {/* Node label */}
              {lines.map((line: string, i: number) => (
                <text
                  key={`label-${i}`}
                  x={0}
                  y={(i - (lines.length - 1) / 2) * 3.2 + 0.5}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={COLORS.text}
                  fontSize={2.4}
                  fontFamily="sans-serif"
                  pointerEvents="none"
                >
                  {line}
                </text>
              ))}
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
          stroke="#546e7a"
          strokeWidth="0.3"
          strokeDasharray="1 1"
          fill="none"
        />
      )}
    </svg>
  );
}

// --- Main App ---

export default function FlowChartApp() {
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

  // Zoom & pan
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

  const handleMouseUp = () => setIsPanning(false);

  React.useEffect(() => {
    const handler = () => setIsPanning(false);
    if (isPanning) {
      document.addEventListener('mouseup', handler);
      document.addEventListener('mouseleave', handler);
      return () => {
        document.removeEventListener('mouseup', handler);
        document.removeEventListener('mouseleave', handler);
      };
    }
  }, [isPanning]);

  React.useEffect(() => {
    const handler = () => {
      setViewportConfig((prev) => ({
        ...prev,
        width: window.innerWidth,
        height: window.innerHeight,
      }));
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);



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
        <div style={{ fontSize: 11, color: '#999' }}>Scroll: Zoom</div>
        <div style={{ fontSize: 11, color: '#999' }}>Middle/Ctrl+Drag: Pan</div>
        <div style={{ fontSize: 11, color: '#999' }}>Drag shapes to move</div>
        <div style={{ fontSize: 11, color: '#999' }}>Drag between connectors to link</div>
        <div style={{ fontSize: 11, color: '#999' }}>Click edge to select, Delete to remove</div>
        <div style={{ fontSize: 11, color: '#999' }}>Drag edge segments to reshape</div>
      </div>

      {/* Canvas */}
      <div
        style={{ width: "100%", height: "100%", overflow: "hidden" }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <FlowChartCanvas
          canvas={canvas}
          elements={elements}
          edgeLabels={edgeLabels}
          style={{
            cursor: isPanning ? 'grabbing' : 'default',
            width: "100%",
            height: "100%",
          }}
        />
      </div>
    </div>
  );
}
