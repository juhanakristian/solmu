import React from "react";
import { useSolmu, SolmuCanvas, DefaultConnectorRenderer } from "../../../src";
import type { Edge } from "../../../src/types";

// --- UML Class Box Renderer ---
// Each class node renders a 3-compartment box: name, attributes, methods.
// The data for each class is looked up from a static map keyed by node ID.

type ClassInfo = {
  name: string;
  stereotype?: string;
  attributes: string[];
  methods: string[];
};

const CLASS_DATA: Record<string, ClassInfo> = {
  User: {
    name: "User",
    attributes: [
      "+ id: number",
      "+ name: string",
      "+ email: string",
      "- passwordHash: string",
    ],
    methods: [
      "+ getOrders(): Order[]",
      "+ verifyPassword(pw): boolean",
    ],
  },
  Order: {
    name: "Order",
    attributes: [
      "+ id: number",
      "+ createdAt: Date",
      "+ status: OrderStatus",
    ],
    methods: [
      "+ getTotal(): number",
      "+ addItem(p, qty): void",
      "+ cancel(): void",
    ],
  },
  Product: {
    name: "Product",
    attributes: [
      "+ id: number",
      "+ name: string",
      "+ price: number",
      "+ stock: number",
    ],
    methods: [
      "+ isInStock(): boolean",
    ],
  },
  OrderItem: {
    name: "OrderItem",
    attributes: [
      "+ quantity: number",
      "+ unitPrice: number",
    ],
    methods: [
      "+ getSubtotal(): number",
    ],
  },
  PaymentMethod: {
    name: "PaymentMethod",
    stereotype: "interface",
    attributes: [],
    methods: [
      "+ charge(amount): boolean",
      "+ refund(amount): boolean",
    ],
  },
  CreditCard: {
    name: "CreditCard",
    attributes: [
      "- cardNumber: string",
      "- expiry: string",
    ],
    methods: [
      "+ charge(amount): boolean",
      "+ refund(amount): boolean",
    ],
  },
};

// Layout constants (in mm, world coords)
const LINE_HEIGHT = 3.2;
const CHAR_WIDTH = 1.4;
const PADDING_X = 2;
const PADDING_Y = 1.5;
const MIN_WIDTH = 30;

function measureClass(info: ClassInfo) {
  const allLines = [info.name, ...info.attributes, ...info.methods];
  if (info.stereotype) allLines.push(`«${info.stereotype}»`);
  const maxChars = Math.max(...allLines.map((l) => l.length));
  const width = Math.max(MIN_WIDTH, maxChars * CHAR_WIDTH + PADDING_X * 2);

  const headerLines = info.stereotype ? 2 : 1;
  const headerH = headerLines * LINE_HEIGHT + PADDING_Y * 2;
  const attrH = info.attributes.length > 0
    ? info.attributes.length * LINE_HEIGHT + PADDING_Y * 2
    : PADDING_Y * 2;
  const methodH = info.methods.length > 0
    ? info.methods.length * LINE_HEIGHT + PADDING_Y * 2
    : PADDING_Y * 2;
  const height = headerH + attrH + methodH;

  return { width, height, headerH, attrH, methodH };
}

function UMLClassBox({ node, ...props }: any) {
  const info = CLASS_DATA[node.id];
  if (!info) {
    return <rect {...props} width={20} height={10} fill="#fff" stroke="#333" />;
  }

  const { width, height, headerH, attrH } = measureClass(info);
  const halfW = width / 2;
  const halfH = height / 2;

  const headerLines = info.stereotype ? 2 : 1;

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
        fill="#fffde7"
        stroke="#5d4037"
        strokeWidth={0.3}
        rx={0.5}
        ry={0.5}
      />

      {/* Header section */}
      {info.stereotype && (
        <text
          x={0}
          y={-halfH + PADDING_Y + LINE_HEIGHT * 0.75}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#8d6e63"
          fontSize={2}
          fontFamily="sans-serif"
          fontStyle="italic"
        >
          {`\u00AB${info.stereotype}\u00BB`}
        </text>
      )}
      <text
        x={0}
        y={-halfH + PADDING_Y + (headerLines - 0.25) * LINE_HEIGHT}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#3e2723"
        fontSize={2.5}
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        {info.name}
      </text>

      {/* Divider after header */}
      <line
        x1={-halfW} y1={-halfH + headerH}
        x2={halfW} y2={-halfH + headerH}
        stroke="#5d4037" strokeWidth={0.3}
      />

      {/* Attributes */}
      {info.attributes.map((attr, i) => (
        <text
          key={`attr-${i}`}
          x={-halfW + PADDING_X}
          y={-halfH + headerH + PADDING_Y + (i + 0.6) * LINE_HEIGHT}
          fill="#4e342e"
          fontSize={2}
          fontFamily="monospace"
        >
          {attr}
        </text>
      ))}

      {/* Divider after attributes */}
      <line
        x1={-halfW} y1={-halfH + headerH + attrH}
        x2={halfW} y2={-halfH + headerH + attrH}
        stroke="#5d4037" strokeWidth={0.3}
      />

      {/* Methods */}
      {info.methods.map((method, i) => (
        <text
          key={`method-${i}`}
          x={-halfW + PADDING_X}
          y={-halfH + headerH + attrH + PADDING_Y + (i + 0.6) * LINE_HEIGHT}
          fill="#4e342e"
          fontSize={2}
          fontFamily="monospace"
        >
          {method}
        </text>
      ))}
    </g>
  );
}

function UMLCanvas({
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
        background: "#fafafa",
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
          fill="#ccc" opacity={dot.opacity}
        />
      ))}

      {/* Edges */}
      {elements.edges.map((edge: any) => (
        <path
          key={edge.id}
          d={edge.path}
          fill="none"
          stroke="#5d4037"
          strokeWidth={0.3}
        />
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
          stroke="#5d4037"
          strokeWidth="0.3"
          strokeDasharray="1 1"
          fill="none"
        />
      )}

      {/* Relationship labels rendered as children */}
      {children}
    </svg>
  );
}

// --- Edge decorations (UML relationship markers) ---

type RelationshipLabel = {
  id: string;
  x: number;
  y: number;
  text: string;
  sourceLabel?: string;
  targetLabel?: string;
};

// --- Main App ---

function computeConnectors(id: string) {
  const info = CLASS_DATA[id];
  if (!info) return [];
  const { width, height } = measureClass(info);
  const halfW = width / 2;
  const halfH = height / 2;
  return [
    { id: `${id}-top`, x: 0, y: -halfH },
    { id: `${id}-bottom`, x: 0, y: halfH },
    { id: `${id}-left`, x: -halfW, y: 0 },
    { id: `${id}-right`, x: halfW, y: 0 },
  ];
}

export default function UMLDiagramApp() {
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });

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
      { id: "User", x: -60, y: -50, type: "uml-class", connectors: computeConnectors("User") },
      { id: "Order", x: 20, y: -50, type: "uml-class", connectors: computeConnectors("Order") },
      { id: "OrderItem", x: 20, y: 20, type: "uml-class", connectors: computeConnectors("OrderItem") },
      { id: "Product", x: -60, y: 20, type: "uml-class", connectors: computeConnectors("Product") },
      { id: "PaymentMethod", x: 90, y: -50, type: "uml-class", connectors: computeConnectors("PaymentMethod") },
      { id: "CreditCard", x: 90, y: 20, type: "uml-class", connectors: computeConnectors("CreditCard") },
    ],
    edges: [
      // User 1---* Order
      {
        source: { node: "User", connector: "User-right" },
        target: { node: "Order", connector: "Order-left" },
        type: "orthogonal",
      } as Edge,
      // Order 1---* OrderItem
      {
        source: { node: "Order", connector: "Order-bottom" },
        target: { node: "OrderItem", connector: "OrderItem-top" },
        type: "orthogonal",
      } as Edge,
      // OrderItem *---1 Product
      {
        source: { node: "OrderItem", connector: "OrderItem-left" },
        target: { node: "Product", connector: "Product-right" },
        type: "orthogonal",
      } as Edge,
      // Order ----> PaymentMethod (uses)
      {
        source: { node: "Order", connector: "Order-right" },
        target: { node: "PaymentMethod", connector: "PaymentMethod-left" },
        type: "orthogonal",
      } as Edge,
      // CreditCard --|> PaymentMethod (implements)
      {
        source: { node: "CreditCard", connector: "CreditCard-top" },
        target: { node: "PaymentMethod", connector: "PaymentMethod-bottom" },
        type: "orthogonal",
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
        { source: start, target: end, type: routingMode } as Edge,
      ],
    }));
  }

  function onNodeMove(nodeId: string, x: number, y: number) {
    setData((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n)),
    }));
  }

  const config = {
    renderers: [
      { type: "uml-class", component: UMLClassBox },
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
  });

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
    if (canvas.viewport) {
      const svg = e.currentTarget.querySelector('svg');
      if (svg) {
        const rect = svg.getBoundingClientRect();
        const worldPos = canvas.viewport.screenToWorld(
          e.clientX - rect.left,
          e.clientY - rect.top
        );
        setMousePos(worldPos);
      }
    }

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

  // Relationship labels positioned at edge midpoints
  const relationshipLabels: RelationshipLabel[] = [
    { id: "user-order", x: -20, y: -50, text: "", sourceLabel: "1", targetLabel: "*" },
    { id: "order-item", x: 20, y: -15, text: "", sourceLabel: "1", targetLabel: "*" },
    { id: "item-product", x: -20, y: 20, text: "", sourceLabel: "*", targetLabel: "1" },
    { id: "order-payment", x: 55, y: -50, text: "\u00ABuses\u00BB", sourceLabel: "", targetLabel: "" },
  ];

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
        minWidth: 180,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}>
        <div style={{ color: '#5d4037', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>UML Class Diagram</div>
        <div style={{ fontSize: 11, color: '#888' }}>Zoom: {viewportConfig.zoom.toFixed(1)}x</div>
        <hr style={{ margin: '8px 0', borderColor: '#e0e0e0', borderStyle: 'solid' }} />
        <div style={{ fontSize: 11, color: '#999' }}>Scroll: Zoom</div>
        <div style={{ fontSize: 11, color: '#999' }}>Middle/Ctrl+Drag: Pan</div>
        <div style={{ fontSize: 11, color: '#999' }}>Drag classes to move</div>
        <div style={{ fontSize: 11, color: '#999' }}>Drag between connectors to link</div>
      </div>

      {/* Canvas */}
      <div
        style={{ width: "100%", height: "100%", overflow: "hidden" }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <UMLCanvas
          canvas={canvas}
          elements={elements}
          style={{
            cursor: isPanning ? 'grabbing' : 'default',
            width: "100%",
            height: "100%",
          }}
        >
          {/* Relationship multiplicity labels */}
          {relationshipLabels.map((rl) => (
            <g key={rl.id}>
              {rl.text && (
                <text
                  x={rl.x} y={rl.y - 2}
                  textAnchor="middle"
                  fill="#8d6e63"
                  fontSize={2}
                  fontFamily="sans-serif"
                  fontStyle="italic"
                >
                  {rl.text}
                </text>
              )}
              {rl.sourceLabel && (
                <text
                  x={rl.x - 3} y={rl.y + 2}
                  textAnchor="middle"
                  fill="#5d4037"
                  fontSize={2}
                  fontFamily="sans-serif"
                >
                  {rl.sourceLabel}
                </text>
              )}
              {rl.targetLabel && (
                <text
                  x={rl.x + 3} y={rl.y + 2}
                  textAnchor="middle"
                  fill="#5d4037"
                  fontSize={2}
                  fontFamily="sans-serif"
                >
                  {rl.targetLabel}
                </text>
              )}
            </g>
          ))}
        </UMLCanvas>
      </div>
    </div>
  );
}
