import React from "react";
import { SolmuNodeConnector, UseSolmuParams } from "./types";

export function useSolmu({
  data,
  onNodeMove,
  onConnect,
  config,
}: UseSolmuParams) {
  const [dragItem, setDragItem] = React.useState<string | null>(null);
  const [dragOffset, setDragOffset] = React.useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

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

  function onMouseDown(event: React.MouseEvent, id: string) {
    setDragItem(id);

    const nx = event.clientX;
    const ny = event.clientY;
    setDragOffset({ x: nx, y: ny });
  }

  function onMouseUp(event: React.MouseEvent) {
    if (dragItem) setDragItem(null);
    if (dragConnector) {
      if (hoverConnector) {
        console.log("CONNECT");
      }

      setDragConnector(null);
    }
  }

  function onMouseMove(event: React.MouseEvent) {
    if (dragItem && onNodeMove) {
      // TODO: optimize this
      const node = data.nodes.find((n) => n.id === dragItem);
      if (!node) return;

      const nx = event.clientX - dragOffset.x;
      const ny = event.clientY - dragOffset.y;
      onNodeMove(dragItem, node.x + nx, node.y + ny);
      setDragOffset({ x: event.clientX, y: event.clientY });
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
          const endX = event.clientX;
          const endY = event.clientY;

          // Calculate control points for the bezier curve
          const dx = endX - startX;
          const dy = endY - startY;
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

  return {
    containerProps: {
      onMouseMove,
      onMouseUp,
    },
    edges: data.edges.map((edge) => ({
      ...edge,
      getEdgeProps: () => {
        const source = data.nodes.find((n) => n.id === edge.source.node);
        const target = data.nodes.find((n) => n.id === edge.target.node);
        if (!source || !target) return null;

        const sc = source.connectors?.find(
          (c) => c.id === edge.source.connector
        );
        const tc = target.connectors?.find(
          (c) => c.id === edge.target.connector
        );
        if (!sc || !tc) return;

        const x1 = source.x + sc.x;
        const y1 = source.y + sc.y;
        const x2 = target.x + tc.x;
        const y2 = target.y + tc.y;

        if (edge.type === "bezier") {
          // TODO: calculate bezier curve based on node positions
          return {
            d: `M${x1},${y1} C ${x1 + 50},${y1} ${x2 + 50},${y2} ${x2},${y2}`,
          };
        }

        return {
          d: `M${x1},${y1} L ${x2},${y2}`,
        };
      },
    })),
    nodes: data.nodes.map((node) => ({
      id: node.id,
      getNodeProps: () => {
        return {
          id: node.id,
          onMouseDown: (e: any) => onMouseDown(e, node.id),
          onMouseUp,
        };
      },
      getGroupProps: () => {
        return {
          transform: `translate(${node.x}, ${node.y})`,
        };
      },
      render: (props: any) => {
        const Node = config.renderers.find(
          (r) => r.type === node.type
        )?.component;
        if (!Node)
          throw new Error(`No renderer found for node type ${node.type}`);
        return <Node {...props} />;
      },
      renderConnectors: (config?: any) => {
        return node.connectors?.map((connector) => {
          const isHovered =
            hoverConnector && hoverConnector.id === connector.id;
          return (
            <rect
              onMouseDown={() => onConnectorMouseDown(connector.id, node.id)}
              onMouseOver={() =>
                setHoverConnector({ id: connector.id, node: node.id })
              }
              onMouseUp={() => onConnectorMouseUp(connector.id, node.id)}
              style={{
                transformBox: "fill-box",
                transformOrigin: "50% 50%",
                transform: isHovered ? "scale(1.5)" : undefined,
              }}
              onMouseOut={() => setHoverConnector(null)}
              key={connector.id}
              x={connector.x - 5}
              y={connector.y - 5}
              rx={3}
              ry={3}
              width={10}
              height={10}
              r={5}
              fill="#dedede"
            />
          );
        });
      },
    })),
    dragLine: dragConnector
      ? {
          ...dragLine,
          d: dragLine
            ? `M${dragLine.x1},${dragLine.y1} C ${dragLine.cx1},${dragLine.cy1} ${dragLine.cx2},${dragLine.cy2} ${dragLine.x2},${dragLine.y2}`
            : undefined,
        }
      : null,
  };
}
