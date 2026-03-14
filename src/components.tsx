import React from "react";
import type { SolmuCanvas as SolmuCanvasData, SolmuElements, ConnectorRendererProps, EdgeRendererProps, SolmuRenderEdge } from "./types";

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
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M 0 0 L 10 3.5 L 0 7 Z" fill="context-stroke" stroke="none" />
        </marker>
      )}
      {needArrowOpen && (
        <marker
          id={BUILTIN_MARKER_IDS["arrow-open"]}
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polyline
            points="0,0 9,3.5 0,7"
            stroke="context-stroke"
            strokeWidth="1.5"
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
      edge.onClick();
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

export function DefaultConnectorRenderer({ connector, node, isHovered, onMouseDown, onMouseOver, onMouseUp, onMouseOut }: ConnectorRendererProps) {
  const size = 2;
  return (
    <rect
      x={connector.x - size / 2}
      y={connector.y - size / 2}
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

export interface SolmuCanvasProps extends React.SVGProps<SVGSVGElement> {
  canvas: SolmuCanvasData;
  elements: SolmuElements;
  connectorRenderer?: React.FC<ConnectorRendererProps>;
  edgeRenderer?: React.FC<EdgeRendererProps>;
  children?: React.ReactNode;
}

export function SolmuCanvas({
  canvas,
  elements,
  connectorRenderer: ConnectorRenderer = DefaultConnectorRenderer,
  edgeRenderer: EdgeRenderer = DefaultEdgeRenderer,
  children,
  style,
  ...svgProps
}: SolmuCanvasProps) {
  return (
    <svg
      {...canvas.props}
      {...svgProps}
      viewBox={canvas.viewBox}
      style={{
        background: "#0d1117",
        width: "100%",
        height: "100%",
        userSelect: "none",
        ...style,
      }}
    >
      <SolmuMarkerDefs edges={elements.edges} />

      {/* Render grid dots */}
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

      {/* Render edges */}
      {elements.edges.map((edge) => (
        <EdgeRenderer key={edge.id} edge={edge} />
      ))}

      {/* Render nodes */}
      {elements.nodes.map((node) => {
        const NodeComponent = node.renderer;
        return (
          <g key={node.id} transform={node.transform}>
            <g transform={node.rotation ? `rotate(${node.rotation})` : undefined}>
              <NodeComponent {...node.nodeProps} />
            </g>
            {/* Connectors stay unrotated — their positions are pre-rotated in data */}
            {node.connectorProps.map((cp) => (
              <ConnectorRenderer key={cp.connector.id} {...cp} />
            ))}
          </g>
        );
      })}

      {/* Render drag line */}
      {elements.dragLine?.isVisible && (
        <path
          d={elements.dragLine.path}
          stroke="#64ffda"
          strokeWidth="0.4"
          fill="none"
        />
      )}

      {/* Custom children */}
      {children}
    </svg>
  );
}
