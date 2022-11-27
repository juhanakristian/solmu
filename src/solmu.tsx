import React from "react";

export function useSolmu({ data, renderers, onNodeMove }: UseSolmuParams) {
  const [dragItem, setDragItem] = React.useState<string | null>(null);
  const [dragOffset, setDragOffset] = React.useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  function onMouseDown(event: React.MouseEvent, id: string) {
    setDragItem(id);

    const nx = event.clientX;
    const ny = event.clientY;
    setDragOffset({ x: nx, y: ny });
  }

  function onMouseUp(event: React.MouseEvent) {
    if (dragItem) setDragItem(null);
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
  }

  return {
    containerProps: {
      onMouseMove,
      onMouseUp,
    },
    edges: data.edges.map((edge) => ({
      ...edge,
      render: (props?: any) => {
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

        return (
          <path
            d={`M${x1},${y1} C ${x1 + 50},${y1} ${x2 - 50},${y2} ${x2},${y2}`}
            fill="none"
            stroke="#eee"
            strokeWidth={2}
          />
        );
      },
    })),
    nodes: data.nodes.map((node) => ({
      id: node.id,
      getNodeProps: () => {
        return {
          id: node.id,
          x: node.x,
          y: node.y,
          onMouseDown: (e: any) => onMouseDown(e, node.id),
          onMouseUp,
          connectors: node.connectors,
        };
      },
      render: (props: any) => {
        const { render: Component } = renderers.find(
          (r) => r.type === node.type
        ) as any;
        return <Component {...props} />;
      },
      renderConnectors: (config?: any) => {
        return node.connectors?.map((connector) => {
          return (
            <rect
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
  };
}