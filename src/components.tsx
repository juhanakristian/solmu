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
      {/* Render grid lines */}
      {canvas.gridLines && canvas.gridLines.map((line, index) => (
        <line
          key={`grid-${index}`}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="#f6f6f6"
          strokeWidth="0.1"
          opacity="0.5"
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
