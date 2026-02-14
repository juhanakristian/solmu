import React from "react";
import { useSolmu, SolmuCanvas } from "../../src";
import type { Edge } from "../../src/types";

// --- Electronic Component Symbols ---

function Resistor(props: any) {
  return (
    <g {...props}>
      <rect x={-6} y={-2} width={12} height={4} fill="transparent" />
      <path
        d="M -6 0 L -4.5 0 L -3.75 1.5 L -2.25 -1.5 L -0.75 1.5 L 0.75 -1.5 L 2.25 1.5 L 3.75 -1.5 L 4.5 0 L 6 0"
        fill="none"
        stroke="#00e676"
        strokeWidth={0.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

function Capacitor(props: any) {
  return (
    <g {...props}>
      <rect x={-6} y={-3} width={12} height={6} fill="transparent" />
      <line x1={-6} y1={0} x2={-0.8} y2={0} stroke="#00e676" strokeWidth={0.4} />
      <line x1={0.8} y1={0} x2={6} y2={0} stroke="#00e676" strokeWidth={0.4} />
      <line x1={-0.8} y1={-2.5} x2={-0.8} y2={2.5} stroke="#00e676" strokeWidth={0.5} />
      <line x1={0.8} y1={-2.5} x2={0.8} y2={2.5} stroke="#00e676" strokeWidth={0.5} />
    </g>
  );
}

function OpAmp(props: any) {
  return (
    <g {...props}>
      <rect x={-8} y={-5.5} width={16} height={11} fill="transparent" />
      <path
        d="M -5 -5 L 5 0 L -5 5 Z"
        fill="none"
        stroke="#00e676"
        strokeWidth={0.4}
        strokeLinejoin="round"
      />
      <text x={-3.5} y={-2} fill="#00e676" fontSize={2.5} textAnchor="middle" dominantBaseline="middle">+</text>
      <text x={-3.5} y={2} fill="#00e676" fontSize={2.5} textAnchor="middle" dominantBaseline="middle">&minus;</text>
      <line x1={-8} y1={-2.5} x2={-5} y2={-2.5} stroke="#00e676" strokeWidth={0.4} />
      <line x1={-8} y1={2.5} x2={-5} y2={2.5} stroke="#00e676" strokeWidth={0.4} />
      <line x1={5} y1={0} x2={8} y2={0} stroke="#00e676" strokeWidth={0.4} />
    </g>
  );
}

function Ground(props: any) {
  return (
    <g {...props}>
      <rect x={-3.5} y={-2.5} width={7} height={5.5} fill="transparent" />
      <line x1={0} y1={2.5} x2={0} y2={0} stroke="#00e676" strokeWidth={0.4} />
      <line x1={-3} y1={0} x2={3} y2={0} stroke="#00e676" strokeWidth={0.4} />
      <line x1={-2} y1={-1} x2={2} y2={-1} stroke="#00e676" strokeWidth={0.4} />
      <line x1={-1} y1={-2} x2={1} y2={-2} stroke="#00e676" strokeWidth={0.4} />
    </g>
  );
}

function VoltageSource(props: any) {
  return (
    <g {...props}>
      <rect x={-3.5} y={-5.5} width={7} height={11} fill="transparent" />
      <line x1={0} y1={5} x2={0} y2={3} stroke="#00e676" strokeWidth={0.4} />
      <line x1={0} y1={-3} x2={0} y2={-5} stroke="#00e676" strokeWidth={0.4} />
      <circle cx={0} cy={0} r={3} fill="none" stroke="#00e676" strokeWidth={0.4} />
      <text x={0} y={-1} fill="#00e676" fontSize={2.5} textAnchor="middle" dominantBaseline="middle">+</text>
      <text x={0} y={1.5} fill="#00e676" fontSize={2.5} textAnchor="middle" dominantBaseline="middle">&minus;</text>
    </g>
  );
}

// --- Rotation helpers ---

function rotatePoint(x: number, y: number, degrees: number) {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.round(Math.cos(rad));
  const sin = Math.round(Math.sin(rad));
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

type BaseNode = {
  id: string;
  x: number;
  y: number;
  type: string;
  baseConnectors: { id: string; x: number; y: number }[];
};

// Base node definitions (unrotated connector positions)
const BASE_NODES: BaseNode[] = [
  {
    id: "V1", x: -50, y: 30, type: "vsource",
    baseConnectors: [
      { id: "V1-p", x: 0, y: 5 },
      { id: "V1-n", x: 0, y: -5 },
    ],
  },
  {
    id: "R1", x: -25, y: 30, type: "resistor",
    baseConnectors: [
      { id: "R1-1", x: -6, y: 0 },
      { id: "R1-2", x: 6, y: 0 },
    ],
  },
  {
    id: "R2", x: 0, y: 15, type: "resistor",
    baseConnectors: [
      { id: "R2-1", x: -6, y: 0 },
      { id: "R2-2", x: 6, y: 0 },
    ],
  },
  {
    id: "U1", x: 20, y: 30, type: "opamp",
    baseConnectors: [
      { id: "U1-inp", x: -8, y: -2.5 },
      { id: "U1-inn", x: -8, y: 2.5 },
      { id: "U1-out", x: 8, y: 0 },
    ],
  },
  {
    id: "C1", x: 50, y: 30, type: "capacitor",
    baseConnectors: [
      { id: "C1-1", x: -6, y: 0 },
      { id: "C1-2", x: 6, y: 0 },
    ],
  },
  {
    id: "GND1", x: -50, y: 5, type: "ground",
    baseConnectors: [
      { id: "GND1-1", x: 0, y: 2.5 },
    ],
  },
  {
    id: "GND2", x: 0, y: 5, type: "ground",
    baseConnectors: [
      { id: "GND2-1", x: 0, y: 2.5 },
    ],
  },
];

const INITIAL_EDGES: Edge[] = [
  { source: { node: "V1", connector: "V1-p" }, target: { node: "R1", connector: "R1-1" }, type: "orthogonal" },
  { source: { node: "R1", connector: "R1-2" }, target: { node: "U1", connector: "U1-inp" }, type: "orthogonal" },
  { source: { node: "U1", connector: "U1-inn" }, target: { node: "R2", connector: "R2-2" }, type: "orthogonal" },
  { source: { node: "U1", connector: "U1-out" }, target: { node: "C1", connector: "C1-1" }, type: "orthogonal" },
  { source: { node: "V1", connector: "V1-n" }, target: { node: "GND1", connector: "GND1-1" }, type: "orthogonal" },
  { source: { node: "R2", connector: "R2-1" }, target: { node: "GND2", connector: "GND2-1" }, type: "orthogonal" },
];

function buildNodeData(baseNodes: BaseNode[], rotations: Record<string, number>) {
  return baseNodes.map((bn) => {
    const rot = rotations[bn.id] || 0;
    return {
      id: bn.id,
      x: bn.x,
      y: bn.y,
      type: bn.type,
      rotation: rot,
      connectors: bn.baseConnectors.map((c) => {
        const rp = rotatePoint(c.x, c.y, rot);
        return { id: c.id, x: rp.x, y: rp.y };
      }),
    };
  });
}

// --- Main App ---

export default function App() {
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });
  // SVG-space mouse position (Y down) for hit-testing against node positions
  const svgMousePos = React.useRef({ x: 0, y: 0 });

  const [viewportConfig, setViewportConfig] = React.useState({
    origin: 'bottom-left' as const,
    units: 'mm' as const,
    width: window.innerWidth,
    height: window.innerHeight,
    worldBounds: { x: -200, y: -200, width: 400, height: 400 },
    zoom: 1,
    pan: { x: 0, y: 0 },
    grid: {
      size: 2.54,
      visible: true,
      snap: true,
    },
  });

  const [baseNodes, setBaseNodes] = React.useState<BaseNode[]>(BASE_NODES);
  const [rotations, setRotations] = React.useState<Record<string, number>>({});
  const [edges, setEdges] = React.useState<Edge[]>(INITIAL_EDGES);

  const baseNodesRef = React.useRef(baseNodes);
  baseNodesRef.current = baseNodes;
  const rotationsRef = React.useRef(rotations);
  rotationsRef.current = rotations;

  // Build the data with rotated connectors
  const data = React.useMemo(() => ({
    nodes: buildNodeData(baseNodes, rotations),
    edges,
  }), [baseNodes, rotations, edges]);

  const routingMode = 'orthogonal' as const;

  function onConnect(
    start: { node: string; connector: string },
    end: { node: string; connector: string }
  ) {
    setEdges((prev) => [
      ...prev,
      { source: start, target: end, type: routingMode },
    ]);
  }

  function onNodeMove(nodeId: string, x: number, y: number) {
    setBaseNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, x, y } : n))
    );
  }

  // Keyboard handler — "r" rotates nearest node to cursor
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'r' && e.key !== 'R') return;
      // Don't rotate if typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      const mp = svgMousePos.current;
      const nodes = baseNodesRef.current;

      let nearest: string | null = null;
      let minDist = Infinity;

      for (const n of nodes) {
        const dx = n.x - mp.x;
        const dy = n.y - mp.y;
        const dist = dx * dx + dy * dy;
        if (dist < minDist) {
          minDist = dist;
          nearest = n.id;
        }
      }

      // Only rotate if cursor is reasonably close (within 20mm)
      if (nearest && minDist < 20 * 20) {
        setRotations((prev) => ({
          ...prev,
          [nearest!]: ((prev[nearest!] || 0) + 90) % 360,
        }));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const config = {
    renderers: [
      { type: "resistor", component: Resistor },
      { type: "capacitor", component: Capacitor },
      { type: "opamp", component: OpAmp },
      { type: "ground", component: Ground },
      { type: "vsource", component: VoltageSource },
    ],
    viewport: viewportConfig,
    routing: {
      mode: routingMode,
      avoidNodes: true,
      margin: 3,
      gridSize: 2.54,
      cornerRadius: 0,
    },
  };

  const { canvas, elements } = useSolmu({
    data,
    config,
    onNodeMove,
    onConnect,
  });

  // Zoom and pan
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setViewportConfig(prev => ({
      ...prev,
      zoom: Math.max(0.1, Math.min(10, prev.zoom * zoomFactor))
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
    if (canvas.viewport) {
      const svg = e.currentTarget.querySelector('svg');
      if (svg) {
        const rect = svg.getBoundingClientRect();
        const worldPos = canvas.viewport.screenToWorld(
          e.clientX - rect.left,
          e.clientY - rect.top
        );
        setMousePos(worldPos);

        // Also compute SVG-space position for hit-testing
        const ctm = (svg as SVGSVGElement).getScreenCTM();
        if (ctm) {
          const pt = (svg as SVGSVGElement).createSVGPoint();
          pt.x = e.clientX;
          pt.y = e.clientY;
          const svgPt = pt.matrixTransform(ctm.inverse());
          svgMousePos.current = { x: svgPt.x, y: svgPt.y };
        }
      }
    }

    if (isPanning) {
      e.preventDefault();
      const deltaX = e.clientX - lastPanPos.x;
      const deltaY = e.clientY - lastPanPos.y;

      const normalizedDeltaX = deltaX / viewportConfig.width / viewportConfig.zoom;
      const normalizedDeltaY = deltaY / viewportConfig.height / viewportConfig.zoom;

      setViewportConfig(prev => ({
        ...prev,
        pan: {
          x: prev.pan.x - normalizedDeltaX,
          y: prev.pan.y - normalizedDeltaY,
        }
      }));

      setLastPanPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  React.useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsPanning(false);
    };

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
      setViewportConfig(prev => ({
        ...prev,
        width: window.innerWidth,
        height: window.innerHeight,
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Label positions
  const labels = data.nodes.map((n) => {
    const isVertical = n.type === 'vsource' || n.type === 'ground';
    return {
      id: n.id,
      x: n.x,
      y: n.y - (isVertical ? 0 : 4.5),
      offsetX: isVertical ? 5 : 0,
    };
  });

  return (
    <div
      style={{ width: "100%", height: "100%", position: "relative", background: "#1a1a2e" }}
    >
      {/* HUD */}
      <div style={{
        position: 'absolute',
        top: 16,
        left: 16,
        background: 'rgba(22, 33, 62, 0.95)',
        padding: '12px 16px',
        borderRadius: '6px',
        fontSize: '12px',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        zIndex: 1000,
        border: '1px solid #2a3a5c',
        color: '#8892b0',
        minWidth: 180,
      }}>
        <div style={{ color: '#64ffda', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Solmu Circuit Editor</div>
        <div>Zoom: {viewportConfig.zoom.toFixed(1)}x</div>
        <div>Cursor: {canvas.viewport?.formatCoordinate(mousePos.x)}, {canvas.viewport?.formatCoordinate(mousePos.y)}</div>
        <hr style={{ margin: '8px 0', borderColor: '#2a3a5c', borderStyle: 'solid' }} />
        <div style={{ fontSize: 11, color: '#5a6785' }}>Scroll: Zoom</div>
        <div style={{ fontSize: 11, color: '#5a6785' }}>Middle/Ctrl+Drag: Pan</div>
        <div style={{ fontSize: 11, color: '#5a6785' }}>Drag components to move</div>
        <div style={{ fontSize: 11, color: '#5a6785' }}>Drag between pins to connect</div>
        <div style={{ fontSize: 11, color: '#5a6785' }}>R: Rotate nearest component</div>
      </div>

      {/* Canvas */}
      <div
        style={{
          width: "100%",
          height: "100%",
          overflow: "hidden",
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <SolmuCanvas
          canvas={canvas}
          elements={elements}
          style={{
            cursor: isPanning ? 'grabbing' : 'default',
            width: "100%",
            height: "100%",
          }}
        >
          {/* Component reference designator labels */}
          {labels.map((l) => (
            <text
              key={`label-${l.id}`}
              x={l.x + l.offsetX}
              y={l.y}
              fill="#80cbc4"
              fontSize={2}
              textAnchor="middle"
              dominantBaseline="auto"
              fontFamily="monospace"
            >
              {l.id}
            </text>
          ))}
        </SolmuCanvas>
      </div>
    </div>
  );
}
