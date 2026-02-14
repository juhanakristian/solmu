import React from "react";

export type SolmuNodeConnector = {
  id: string;
  node: string;
};

export type Connector = {
  id: string;
  x: number;
  y: number;
};

// Legacy connector type for backward compatibility
// New port system is in ports.ts

export type SolmuNode = {
  id: string;
  x: number;
  y: number;
  connectors?: Connector[];
  type: string;
};

export type EdgeNode = {
  node: string;
  connector: string;
};

export type EdgeType = "bezier" | "orthogonal" | "line" | "direct";

export type Edge = {
  source: EdgeNode;
  target: EdgeNode;
  type: EdgeType;
};

export type NodeRenderer = {
  type: string;
  component: React.FC;
};

export type ConnectFunc = (
  start: { node: string; connector: string },
  end: { node: string; connector: string }
) => void;

export type NodeMoveFunc = (node: string, x: number, y: number) => void;

// New simplified API types
export type SolmuCanvas = {
  props: React.SVGProps<SVGSVGElement>;
  width: number;
  height: number;
  viewBox: string;
  gridDots?: Array<{ x: number; y: number; size: number; opacity: number }>;
  viewport?: {
    screenToWorld: (x: number, y: number) => { x: number; y: number };
    worldToScreen: (x: number, y: number) => { x: number; y: number };
    snapToGrid: (point: { x: number; y: number }) => { x: number; y: number };
    formatCoordinate: (value: number) => string;
    getEffectiveGridSize: () => number;
  };
};

export type SolmuRenderNode = SolmuNode & {
  transform: string;
  isSelected?: boolean;
  isDragging?: boolean;
  renderer: React.FC<any>;
  nodeProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseUp: (e: React.MouseEvent) => void;
  };
  connectorProps: Array<{
    key: string;
    onMouseDown: () => void;
    onMouseOver: () => void;
    onMouseUp: () => void;
    onMouseOut: () => void;
    style: React.CSSProperties;
    x: number;
    y: number;
    rx: number;
    ry: number;
    width: number;
    height: number;
    fill: string;
  }>;
};

export type SolmuRenderEdge = Edge & {
  id: string;
  path: string;
  isSelected?: boolean;
};

export type SolmuDragLine = {
  path: string;
  isVisible: boolean;
};

export type SolmuElements = {
  nodes: SolmuRenderNode[];
  edges: SolmuRenderEdge[];
  dragLine: SolmuDragLine | null;
};

export type SolmuInteractions = {
  onMouseDown: (event: React.MouseEvent) => void;
  onMouseMove: (event: React.MouseEvent) => void;
  onMouseUp: (event: React.MouseEvent) => void;
};

export type UseSolmuResult = {
  canvas: SolmuCanvas;
  elements: SolmuElements;
  interactions: SolmuInteractions;
};

import type { RoutingMode } from './routing';

export type RoutingConfig = {
  mode?: RoutingMode;           // Default routing mode for edges
  avoidNodes?: boolean;         // Whether to route around nodes
  margin?: number;              // Margin around obstacles (default: 5)
  gridSize?: number;            // Pathfinding grid size (default: 5)
  cornerRadius?: number;        // Corner radius for bezier mode (default: 5)
  nodeDimensions?: {            // Default node dimensions for obstacle detection
    width?: number;
    height?: number;
  };
};

export type UseSolmuParams = {
  data: {
    nodes: SolmuNode[];
    edges: Edge[];
  };
  config: {
    renderers: NodeRenderer[];
    viewport?: {
      origin?: 'top-left' | 'bottom-left' | 'center';
      units?: 'px' | 'mm' | 'in' | 'mil' | 'units';
      width?: number;
      height?: number;
      worldBounds?: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
      zoom?: number;
      pan?: { x: number; y: number };
      grid?: {
        size: number;
        visible: boolean;
        snap: boolean;
      };
    };
    routing?: RoutingConfig;
    connections?: {
      validateOnCreate?: boolean;
      validateOnMove?: boolean;
      showValidationMessages?: boolean;
      customRules?: Array<{
        name: string;
        description: string;
        validate: (sourcePort: any, targetPort: any) => {
          valid: boolean;
          message?: string;
          severity?: 'error' | 'warning';
        };
      }>;
    };
  };
  onNodeMove?: NodeMoveFunc;
  onConnect?: ConnectFunc;
};
