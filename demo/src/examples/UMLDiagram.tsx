import React from "react";
import { useSolmu, useSolmuKeyboard, useSolmuViewport, SolmuCanvas } from "../../../src";
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

// Layout constants in world units (CSS px inside the matrix layer = world units).
const UML_FONT = 5;
const UML_LINE = 7;       // line-height per row
const UML_PAD_V = 3;      // top+bottom padding per section
const UML_PAD_H = 4;      // left+right padding

// Height of a section with n rows (min 1 to avoid zero-height sections)
const sectionH = (n: number) => 2 * UML_PAD_V + Math.max(n, 1) * UML_LINE;
const headerH = (hasStereotype: boolean) => 2 * UML_PAD_V + (hasStereotype ? 2 : 1) * UML_LINE;

function UMLClassBox({ node, onMouseDown, onMouseUp }: any) {
  const info = CLASS_DATA[node.id];
  if (!info) {
    return (
      <div
        onMouseDown={onMouseDown} onMouseUp={onMouseUp}
        style={{ width: 60, fontSize: UML_FONT, border: "0.3px solid #5d4037", background: "#fffde7", cursor: "grab", padding: `${UML_PAD_V}px ${UML_PAD_H}px` }}
      >
        {node.id}
      </div>
    );
  }

  return (
    <div onMouseDown={onMouseDown} onMouseUp={onMouseUp} style={{
      background: "#fffde7",
      border: "0.3px solid #5d4037",
      borderRadius: 1,
      fontFamily: "sans-serif",
      fontSize: UML_FONT,
      color: "#4e342e",
      cursor: "grab",
      userSelect: "none",
      whiteSpace: "nowrap",
      boxSizing: "border-box",
    }}>
      {/* Header */}
      <div style={{
        height: headerH(!!info.stereotype),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        paddingLeft: UML_PAD_H,
        paddingRight: UML_PAD_H,
        borderBottom: "0.3px solid #5d4037",
        boxSizing: "border-box",
      }}>
        {info.stereotype && (
          <div style={{ lineHeight: `${UML_LINE}px`, fontSize: UML_FONT * 0.9, color: "#8d6e63", fontStyle: "italic" }}>
            {`\u00AB${info.stereotype}\u00BB`}
          </div>
        )}
        <div style={{ lineHeight: `${UML_LINE}px`, fontWeight: "bold", color: "#3e2723" }}>{info.name}</div>
      </div>
      {/* Attributes */}
      <div style={{
        height: sectionH(info.attributes.length),
        paddingTop: UML_PAD_V,
        paddingBottom: UML_PAD_V,
        paddingLeft: UML_PAD_H,
        paddingRight: UML_PAD_H,
        borderBottom: "0.3px solid #5d4037",
        boxSizing: "border-box",
      }}>
        {info.attributes.length > 0
          ? info.attributes.map((attr, i) => (
              <div key={i} style={{ lineHeight: `${UML_LINE}px`, fontFamily: "monospace" }}>{attr}</div>
            ))
          : <div style={{ height: UML_LINE }} />
        }
      </div>
      {/* Methods */}
      <div style={{
        height: sectionH(info.methods.length),
        paddingTop: UML_PAD_V,
        paddingBottom: UML_PAD_V,
        paddingLeft: UML_PAD_H,
        paddingRight: UML_PAD_H,
        boxSizing: "border-box",
      }}>
        {info.methods.length > 0
          ? info.methods.map((method, i) => (
              <div key={i} style={{ lineHeight: `${UML_LINE}px`, fontFamily: "monospace" }}>{method}</div>
            ))
          : <div style={{ height: UML_LINE }} />
        }
      </div>
    </div>
  );
}

// --- Edge decorations (UML relationship markers) ---

type RelationshipLabel = {
  id: string;
  x?: number;
  y?: number;
  text: string;
  sourceLabel?: string;
  targetLabel?: string;
};

// --- Main App ---

// Class box connector positions — computed from the same constants used in UMLClassBox
// so connectors sit exactly on the visual border at any zoom.
// halfH = (headerH + attrsH + methodsH) / 2, halfW fixed wide enough for longest text.
const CLASS_BOX_DIMS: Record<string, { halfW: number; halfH: number }> = {
  // User: header=13, attrs(4)=34, methods(2)=20 → total=67
  User:          { halfW: 46, halfH: 34 },
  // Order: header=13, attrs(3)=27, methods(3)=27 → total=67
  Order:         { halfW: 46, halfH: 34 },
  // OrderItem: header=13, attrs(2)=20, methods(1)=13 → total=46
  OrderItem:     { halfW: 46, halfH: 23 },
  // Product: header=13, attrs(4)=34, methods(1)=13 → total=60
  Product:       { halfW: 40, halfH: 30 },
  // PaymentMethod (stereotype): header=20, attrs(0)=13, methods(2)=20 → total=53
  PaymentMethod: { halfW: 46, halfH: 27 },
  // CreditCard: header=13, attrs(2)=20, methods(2)=20 → total=53
  CreditCard:    { halfW: 40, halfH: 27 },
};

function computeConnectors(id: string) {
  const dims = CLASS_BOX_DIMS[id] ?? { halfW: 18, halfH: 14 };
  return [
    { id: `${id}-top`,    x: 0,          y: -dims.halfH },
    { id: `${id}-bottom`, x: 0,          y:  dims.halfH },
    { id: `${id}-left`,   x: -dims.halfW, y: 0 },
    { id: `${id}-right`,  x:  dims.halfW, y: 0 },
  ];
}

export default function UMLDiagramApp() {
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });

  const { viewportConfig, containerRef, containerProps, isPanning } = useSolmuViewport({
    origin: 'top-left' as const,
    units: 'mm' as const,
    worldBounds: { x: -250, y: -200, width: 600, height: 500 },
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
      { id: "User", x: -120, y: -90, type: "uml-class", connectors: computeConnectors("User") },
      { id: "Order", x: 30, y: -90, type: "uml-class", connectors: computeConnectors("Order") },
      { id: "OrderItem", x: 30, y: 50, type: "uml-class", connectors: computeConnectors("OrderItem") },
      { id: "Product", x: -120, y: 50, type: "uml-class", connectors: computeConnectors("Product") },
      { id: "PaymentMethod", x: 180, y: -90, type: "uml-class", connectors: computeConnectors("PaymentMethod") },
      { id: "CreditCard", x: 180, y: 50, type: "uml-class", connectors: computeConnectors("CreditCard") },
    ],
    edges: [
      // User 1---* Order (association)
      {
        source: { node: "User", connector: "User-right" },
        target: { node: "Order", connector: "Order-left" },
        type: "orthogonal",
        style: { stroke: "#5d4037", strokeWidth: 0.3, markerEnd: "arrow-open" },
      } as Edge,
      // Order 1---* OrderItem (association)
      {
        source: { node: "Order", connector: "Order-bottom" },
        target: { node: "OrderItem", connector: "OrderItem-top" },
        type: "orthogonal",
        style: { stroke: "#5d4037", strokeWidth: 0.3, markerEnd: "arrow-open" },
      } as Edge,
      // OrderItem *---1 Product (association)
      {
        source: { node: "OrderItem", connector: "OrderItem-left" },
        target: { node: "Product", connector: "Product-right" },
        type: "orthogonal",
        style: { stroke: "#5d4037", strokeWidth: 0.3, markerEnd: "arrow-open" },
      } as Edge,
      // Order ----> PaymentMethod (uses / dependency)
      {
        source: { node: "Order", connector: "Order-right" },
        target: { node: "PaymentMethod", connector: "PaymentMethod-left" },
        type: "orthogonal",
        style: { stroke: "#5d4037", strokeWidth: 0.3, strokeDasharray: "2 1", markerEnd: "arrow-open" },
      } as Edge,
      // CreditCard --|> PaymentMethod (implements)
      {
        source: { node: "CreditCard", connector: "CreditCard-top" },
        target: { node: "PaymentMethod", connector: "PaymentMethod-bottom" },
        type: "orthogonal",
        style: { stroke: "#5d4037", strokeWidth: 0.3, strokeDasharray: "2 1", markerEnd: "arrow" },
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

  // Relationship labels configuration (positioned using edge.labelPoint)
  const relationshipLabels: RelationshipLabel[] = [
    { id: "user-order", text: "", sourceLabel: "1", targetLabel: "*" },
    { id: "order-item", text: "", sourceLabel: "1", targetLabel: "*" },
    { id: "item-product", text: "", sourceLabel: "*", targetLabel: "1" },
    { id: "order-payment", text: "\u00ABuses\u00BB", sourceLabel: "", targetLabel: "" },
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
        <div style={{ fontSize: 11, color: '#999' }}>Scroll/Two-finger: Pan</div>
        <div style={{ fontSize: 11, color: '#999' }}>Pinch/Ctrl+Scroll: Zoom</div>
        <div style={{ fontSize: 11, color: '#999' }}>Middle/Ctrl+Drag: Pan</div>
        <div style={{ fontSize: 11, color: '#999' }}>Drag classes to move</div>
        <div style={{ fontSize: 11, color: '#999' }}>Drag between connectors to link</div>
        <div style={{ fontSize: 11, color: '#999' }}>Click edge to select, Delete to remove</div>
      </div>

      {/* Canvas */}
      <SolmuCanvas
        canvas={canvas}
        elements={elements}
        interactions={interactions}
        style={{ background: "#fafafa", cursor: isPanning ? 'grabbing' : 'default' }}
        onMouseDown={containerProps.onMouseDown}
        onMouseMove={containerProps.onMouseMove}
      >
        {/* Relationship multiplicity labels */}
        {relationshipLabels.map((rl) => {
          const edgeIndex = ["user-order", "order-item", "item-product", "order-payment"].indexOf(rl.id);
          const edge = elements.edges[edgeIndex];
          if (!edge) return null;
          const x = edge.labelPoint.x;
          const y = edge.labelPoint.y;
          return (
            <g key={rl.id}>
              {rl.text && (
                <text x={x} y={y - 2} textAnchor="middle" fill="#8d6e63" fontSize={2} fontFamily="sans-serif" fontStyle="italic">
                  {rl.text}
                </text>
              )}
              {rl.sourceLabel && (
                <text x={x - 3} y={y + 2} textAnchor="middle" fill="#5d4037" fontSize={2} fontFamily="sans-serif">
                  {rl.sourceLabel}
                </text>
              )}
              {rl.targetLabel && (
                <text x={x + 3} y={y + 2} textAnchor="middle" fill="#5d4037" fontSize={2} fontFamily="sans-serif">
                  {rl.targetLabel}
                </text>
              )}
            </g>
          );
        })}
      </SolmuCanvas>
    </div>
  );
}
