import React from "react";
import type { SolmuCanvas as SolmuCanvasData, SolmuElements, ConnectorRendererProps, EdgeRendererProps } from "./types";

export function DefaultEdgeRenderer({ edge }: EdgeRendererProps) {
  return (
    <path
      d={edge.path}
      fill="none"
      stroke={edge.style?.stroke ?? "#00e676"}
      strokeWidth={edge.style?.strokeWidth ?? 0.4}
      strokeDasharray={edge.style?.strokeDasharray}
      opacity={edge.style?.opacity}
    />
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
