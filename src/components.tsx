import React from "react";
import type { SolmuCanvas as SolmuCanvasData, SolmuElements, SolmuInteractions, ConnectorRendererProps, EdgeRendererProps, SolmuRenderEdge } from "./types";

const BUILTIN_MARKER_IDS = {
  "arrow": "solmu-arrow",
  "arrow-open": "solmu-arrow-open",
} as const;

function markerUrl(name: string | undefined): string | undefined {
  if (!name) return undefined;
  const id = BUILTIN_MARKER_IDS[name as keyof typeof BUILTIN_MARKER_IDS] ?? name;
  return `url(#${id})`;
}

/** Renders SVG <defs> containing the built-in arrowhead markers needed by the given edges.
 *  Export this and render it in custom canvases that use edge markers. */
export function SolmuMarkerDefs({ edges }: { edges: SolmuRenderEdge[] }) {
  const needed = new Set<string>();
  for (const edge of edges) {
    if (edge.style?.markerEnd) needed.add(edge.style.markerEnd);
    if (edge.style?.markerStart) needed.add(edge.style.markerStart);
  }

  const needArrow = needed.has("arrow");
  const needArrowOpen = needed.has("arrow-open");
  if (!needArrow && !needArrowOpen) return null;

  return (
    <defs>
      {needArrow && (
        <marker
          id={BUILTIN_MARKER_IDS["arrow"]}
          markerWidth="6"
          markerHeight="7"
          refX="5"
          refY="3.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M 0 0 L 6 3.5 L 0 7 Z" fill="context-stroke" stroke="none" />
        </marker>
      )}
      {needArrowOpen && (
        <marker
          id={BUILTIN_MARKER_IDS["arrow-open"]}
          markerWidth="10"
          markerHeight="8"
          refX="6"
          refY="4"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polyline
            points="0,0 6,4 0,8"
            stroke="context-stroke"
            strokeWidth="1.2"
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </marker>
      )}
    </defs>
  );
}

export function DefaultEdgeRenderer({ edge }: EdgeRendererProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (edge.onClick) {
      edge.onClick(e);
    }
  };

  const hitAreaWidth = Math.max((edge.style?.strokeWidth ?? 0.4) * 10, 3);

  return (
    <g>
      <path
        d={edge.path}
        fill="none"
        stroke={edge.isSelected ? "#64ffda" : (edge.style?.stroke ?? "#00e676")}
        strokeWidth={edge.isSelected ? (edge.style?.strokeWidth ?? 0.4) * 2 : (edge.style?.strokeWidth ?? 0.4)}
        strokeDasharray={edge.style?.strokeDasharray}
        opacity={edge.style?.opacity}
        markerStart={markerUrl(edge.style?.markerStart)}
        markerEnd={markerUrl(edge.style?.markerEnd)}
        onClick={handleClick}
        style={{ cursor: "pointer" }}
      />
      {/* Invisible hit areas for draggable segments */}
      {edge.segments?.filter(s => s.draggable).map(segment => (
        <line
          key={`seg-${segment.index}`}
          x1={segment.p1.x}
          y1={segment.p1.y}
          x2={segment.p2.x}
          y2={segment.p2.y}
          stroke="transparent"
          strokeWidth={hitAreaWidth}
          style={{
            cursor: segment.orientation === "horizontal" ? "ns-resize" : "ew-resize",
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            edge.onSegmentDragStart?.(segment.index, e);
          }}
        />
      ))}
    </g>
  );
}

/** Default connector renderer — SVG rect at the connector's absolute world position */
export function DefaultConnectorRenderer({ worldX, worldY, isHovered, onMouseDown, onMouseOver, onMouseUp, onMouseOut }: ConnectorRendererProps) {
  const size = 2;
  return (
    <rect
      x={worldX - size / 2}
      y={worldY - size / 2}
      width={size}
      height={size}
      rx={3}
      ry={3}
      fill="#64ffda"
      style={{
        transformBox: "fill-box",
        transformOrigin: "50% 50%",
        transform: isHovered ? "scale(1.5)" : undefined,
      }}
      onMouseDown={onMouseDown}
      onMouseOver={onMouseOver}
      onMouseUp={onMouseUp}
      onMouseOut={onMouseOut}
    />
  );
}

export interface SolmuCanvasProps extends React.HTMLProps<HTMLDivElement> {
  canvas: SolmuCanvasData;
  elements: SolmuElements;
  interactions: SolmuInteractions;
  connectorRenderer?: React.FC<ConnectorRendererProps>;
  edgeRenderer?: React.FC<EdgeRendererProps>;
  /** Children are rendered inside the SVG layer (for custom SVG overlays, text labels, etc.) */
  children?: React.ReactNode;
}

export function SolmuCanvas({
  canvas,
  elements,
  interactions,
  connectorRenderer: ConnectorRenderer = DefaultConnectorRenderer,
  edgeRenderer: EdgeRenderer = DefaultEdgeRenderer,
  children,
  style,
  onMouseMove: externalOnMouseMove,
  onMouseUp: externalOnMouseUp,
  onMouseDown: externalOnMouseDown,
  ...divProps
}: SolmuCanvasProps) {
  return (
    <div
      ref={canvas.ref}
      {...divProps}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#0d1117",
        userSelect: "none",
        overflow: "hidden",
        ...style,
      }}
      onMouseMove={(e) => { interactions.onMouseMove(e); externalOnMouseMove?.(e as any); }}
      onMouseUp={(e) => { interactions.onMouseUp(e); externalOnMouseUp?.(e as any); }}
    >
      {/* SVG layer: grid, edges, connectors, drag line, marquee */}
      <svg
        viewBox={canvas.viewBox}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        onMouseDown={(e) => { interactions.onMouseDown(e); externalOnMouseDown?.(e as any); }}
      >
        <SolmuMarkerDefs edges={elements.edges} />

        {/* Grid dots */}
        {canvas.gridDots && canvas.gridDots.map((dot, index) => (
          <circle
            key={`grid-dot-${index}`}
            cx={dot.x}
            cy={dot.y}
            r={dot.size}
            fill="#2a3a5c"
            opacity={dot.opacity}
          />
        ))}

        {/* Edges */}
        {elements.edges.map((edge) => (
          <EdgeRenderer key={edge.id} edge={edge} />
        ))}

        {/* Connectors at absolute world positions */}
        {elements.nodes.map((node) =>
          node.connectorProps.map((cp) => (
            <ConnectorRenderer key={`${node.id}-${cp.connector.id}`} {...cp} />
          ))
        )}

        {/* Drag line */}
        {elements.dragLine?.isVisible && (
          <path
            d={elements.dragLine.path}
            stroke="#64ffda"
            strokeWidth="0.4"
            fill="none"
          />
        )}

        {/* Marquee selection rectangle */}
        {elements.marquee && (
          <rect
            x={elements.marquee.x}
            y={elements.marquee.y}
            width={elements.marquee.width}
            height={elements.marquee.height}
            fill="rgba(100, 149, 237, 0.15)"
            stroke="#6495ed"
            strokeWidth={0.3}
            strokeDasharray="2 1"
            pointerEvents="none"
          />
        )}

        {/* Custom SVG children (text labels, overlays, etc.) */}
        {children}
      </svg>

      {/* HTML node layer — matrix maps world units to screen pixels so CSS px = world units inside */}
      <div style={{
        position: "absolute",
        left: 0,
        top: 0,
        transformOrigin: "0 0",
        transform: canvas.htmlLayerTransform,
        pointerEvents: "none",
        overflow: "visible",
      }}>
        {elements.nodes.map((node) => {
          const NodeComponent = node.renderer;
          return (
            <div
              key={node.id}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                transform: `translate(${node.x}px, ${node.y}px) translate(-50%, -50%)${node.rotation ? ` rotate(${node.rotation}deg)` : ""}`,
                pointerEvents: "auto",
              }}
            >
              <NodeComponent {...node.nodeProps} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
