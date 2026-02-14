import React from "react";
import type { SolmuCanvas as SolmuCanvasData, SolmuElements } from "./types";

export interface SolmuCanvasProps extends React.SVGProps<SVGSVGElement> {
  canvas: SolmuCanvasData;
  elements: SolmuElements;
  children?: React.ReactNode;
}

export function SolmuCanvas({ 
  canvas, 
  elements, 
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
        <path
          key={edge.id}
          d={edge.path}
          fill="none"
          stroke="#00e676"
          strokeWidth={0.4}
        />
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
            {node.connectorProps.map((connectorProps) => {
              const { key, ...rectProps } = connectorProps;
              return <rect key={key} {...rectProps} />;
            })}
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
