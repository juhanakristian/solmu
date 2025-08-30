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
        background: "white",
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
          fill="#000"
          opacity={dot.opacity}
        />
      ))}
      
      {/* Render edges */}
      {elements.edges.map((edge) => (
        <path
          key={edge.id}
          d={edge.path}
          fill="none"
          stroke="#efefef"
          strokeWidth={2}
        />
      ))}
      
      {/* Render nodes */}
      {elements.nodes.map((node) => {
        const NodeComponent = node.renderer;
        return (
          <g key={node.id} transform={node.transform}>
            <NodeComponent {...node.nodeProps} />
            {/* Render connectors */}
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
          stroke="black"
          strokeWidth="2"
          fill="none"
        />
      )}
      
      {/* Custom children */}
      {children}
    </svg>
  );
}
