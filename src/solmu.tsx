import React from "react";
import { SolmuNodeConnector, UseSolmuParams, UseSolmuResult } from "./types";
import { SolmuViewport } from "./viewport";

export function useSolmu({
  data,
  onNodeMove,
  onConnect,
  config,
}: UseSolmuParams): UseSolmuResult {
  // Create viewport instance with default or provided config
  const viewport = React.useMemo(() => {
    const viewportConfig = config.viewport || {};
    return new SolmuViewport({
      origin: viewportConfig.origin || 'top-left',
      units: viewportConfig.units || 'px',
      width: viewportConfig.width || 800,
      height: viewportConfig.height || 600,
      worldBounds: viewportConfig.worldBounds || { x: 0, y: 0, width: 800, height: 600 },
      zoom: viewportConfig.zoom || 1,
      pan: viewportConfig.pan || { x: 0, y: 0 },
      grid: viewportConfig.grid,
    });
  }, [config.viewport]);
  const [dragItem, setDragItem] = React.useState<string | null>(null);


  const [dragConnector, setDragConnector] =
    React.useState<null | SolmuNodeConnector>(null);
  const [hoverConnector, setHoverConnector] =
    React.useState<null | SolmuNodeConnector>(null);
  const [dragLine, setDragLine] = React.useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    cx1: number;
    cy1: number;
    cx2: number;
    cy2: number;
  } | null>(null);

  function onMouseDown(_event: React.MouseEvent, id: string) {
    setDragItem(id);
  }

  function onMouseUp(_event: React.MouseEvent) {
    if (dragItem) setDragItem(null);
    if (dragConnector) {
      if (hoverConnector && onConnect) {
        onConnect(
          { node: dragConnector.node, connector: dragConnector.id },
          { node: hoverConnector.node, connector: hoverConnector.id }
        );
      }
      setDragConnector(null);
    }
  }

  function onMouseMove(event: React.MouseEvent) {
    if (dragItem && onNodeMove) {
      const node = data.nodes.find((n) => n.id === dragItem);
      if (!node) return;

      // With viewBox handling zoom/pan, we can use SVG coordinate conversion
      const svg = (event.target as Element).closest('svg');
      if (svg) {
        const rect = svg.getBoundingClientRect();
        const svgPoint = svg.createSVGPoint();
        svgPoint.x = event.clientX - rect.left;
        svgPoint.y = event.clientY - rect.top;
        
        // Convert screen coordinates to SVG world coordinates
        const ctm = svg.getScreenCTM();
        if (ctm) {
          const worldPoint = svgPoint.matrixTransform(ctm.inverse());
          
          // Apply grid snapping if enabled
          const snapped = viewport.snapToGrid({ x: worldPoint.x, y: worldPoint.y });
          
          onNodeMove(dragItem, snapped.x, snapped.y);
        }
      }
    }

    if (dragConnector) {
      const sourceNode = data.nodes.find((n) => n.id === dragConnector.node);
      if (sourceNode) {
        const sourceConnector = sourceNode.connectors?.find(
          (c) => c.id === dragConnector.id
        );
        if (sourceConnector) {
          const startX = sourceNode.x + sourceConnector.x;
          const startY = sourceNode.y + sourceConnector.y;
          
          // Use SVG coordinate conversion for drag line endpoint
          const svg = (event.target as Element).closest('svg');
          if (svg) {
            const rect = svg.getBoundingClientRect();
            const svgPoint = svg.createSVGPoint();
            svgPoint.x = event.clientX - rect.left;
            svgPoint.y = event.clientY - rect.top;
            
            const ctm = svg.getScreenCTM();
            if (ctm) {
              // Convert point to world coordinates
              const worldPoint = svgPoint.matrixTransform(ctm.inverse());
              const endX = worldPoint.x;
              const endY = worldPoint.y;

              // Calculate control points for the bezier curve
              const dx = endX - startX;
              const controlX1 = startX + dx / 3;
              const controlY1 = startY;
              const controlX2 = startX + (dx * 2) / 3;
              const controlY2 = endY;

              // Update the drag line with bezier curve
              setDragLine({
                x1: startX,
                y1: startY,
                x2: endX,
                y2: endY,
                cx1: controlX1,
                cy1: controlY1,
                cx2: controlX2,
                cy2: controlY2,
              });
            }
          }
        }
      }
    }
  }

  function onConnectorMouseDown(connector: string, node: string) {
    console.log(connector);
    setDragConnector({ id: connector, node });
  }

  function onConnectorMouseUp(connector: string, node: string) {
    console.log(connector);
    if (dragConnector) {
      if (onConnect)
        onConnect(
          { node: dragConnector.node, connector: dragConnector.id },
          { node, connector }
        );
      setDragConnector(null);
    }
  }

  // Helper functions for rendering
  const createNodeProps = (node: typeof data.nodes[0]) => ({
    onMouseDown: (e: React.MouseEvent) => onMouseDown(e, node.id),
    onMouseUp,
  });

  const createConnectorProps = (node: typeof data.nodes[0]) => {
    return node.connectors?.map((connector) => {
      const isHovered =
        hoverConnector && hoverConnector.id === connector.id && hoverConnector.node === node.id;
      
      return {
        key: connector.id,
        onMouseDown: () => onConnectorMouseDown(connector.id, node.id),
        onMouseOver: () => setHoverConnector({ id: connector.id, node: node.id }),
        onMouseUp: () => onConnectorMouseUp(connector.id, node.id),
        onMouseOut: () => setHoverConnector(null),
        style: {
          transformBox: "fill-box" as const,
          transformOrigin: "50% 50%",
          transform: isHovered ? "scale(1.5)" : undefined,
        },
        x: connector.x - 1,
        y: connector.y - 1,
        rx: 3,
        ry: 3,
        width: 2,
        height: 2,
        fill: "#dedede",
      };
    }) || [];
  };

  const createEdgePath = (edge: typeof data.edges[0]) => {
    const source = data.nodes.find((n) => n.id === edge.source.node);
    const target = data.nodes.find((n) => n.id === edge.target.node);
    if (!source || !target) return "";

    const sc = source.connectors?.find((c) => c.id === edge.source.connector);
    const tc = target.connectors?.find((c) => c.id === edge.target.connector);
    if (!sc || !tc) return "";

    const x1 = source.x + sc.x;
    const y1 = source.y + sc.y;
    const x2 = target.x + tc.x;
    const y2 = target.y + tc.y;

    if (edge.type === "bezier") {
      return `M${x1},${y1} C ${x1 + 50},${y1} ${x2 + 50},${y2} ${x2},${y2}`;
    }

    return `M${x1},${y1} L ${x2},${y2}`;
  };

  return {
    canvas: {
      props: {
        onMouseMove,
        onMouseUp,
      },
      width: viewport.getConfig().width,
      height: viewport.getConfig().height,
      viewBox: viewport.getViewBox(),
      gridDots: viewport.generateGridDots(),
      viewport: {
        screenToWorld: (x: number, y: number) => viewport.screenToWorld(x, y),
        worldToScreen: (x: number, y: number) => viewport.worldToScreen(x, y),
        snapToGrid: (point: { x: number; y: number }) => viewport.snapToGrid(point),
        formatCoordinate: (value: number) => viewport.formatCoordinate(value),
        getEffectiveGridSize: () => viewport.getEffectiveGridSize(),
      },
    },
    elements: {
      nodes: data.nodes.map((node) => {
        const renderer = config.renderers.find((r) => r.type === node.type)?.component;
        if (!renderer) {
          throw new Error(`No renderer found for node type ${node.type}`);
        }
        
        return {
          ...node,
          renderer,
          nodeProps: createNodeProps(node),
          connectorProps: createConnectorProps(node),
          transform: `translate(${node.x}, ${node.y})`,
          isDragging: dragItem === node.id,
        };
      }),
      edges: data.edges.map((edge, index) => ({
        ...edge,
        id: `${edge.source.node}-${edge.target.node}-${index}`,
        path: createEdgePath(edge),
      })),
      dragLine: dragConnector && dragLine
        ? {
            path: `M${dragLine.x1},${dragLine.y1} C ${dragLine.cx1},${dragLine.cy1} ${dragLine.cx2},${dragLine.cy2} ${dragLine.x2},${dragLine.y2}`,
            isVisible: true,
          }
        : null,
    },
    interactions: {
      onMouseDown: (_event: React.MouseEvent) => {
        // Handle canvas-level interactions here if needed
      },
      onMouseMove,
      onMouseUp,
    },
  };
}
