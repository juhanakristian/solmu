import React from "react";

type Connector = {
  id: string;
  x: number;
  y: number;
};

type Node = {
  id: string;
  x: number;
  y: number;
  type: string;
  connectors?: Connector[];
};

type EdgeNode = {
  node: string;
  connector: string;
};

type Edge = {
  source: EdgeNode;
  target: EdgeNode;
};

type Renderer = {
  type: string;
  render: any;
};

type useFlowParams = {
  data: {
    nodes: Node[];
    edges: Edge[];
  };
  renderers: Renderer[];
  onNodeMove?: NodeMoveFunc;
};

type NodeMoveFunc = (node: string, x: number, y: number) => void;

function useSolmu({ data, renderers, onNodeMove }: useFlowParams) {
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
            d={`M${x1},${y1} L${x2},${y2}`}
            stroke="black"
            strokeWidth={2}
          />
        );
      },
      getEdgeProps: () => ({}),
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
              stroke="#eee"
              width={12}
              height={10}
              r={5}
              fill="#cecece"
            />
          );
        });
      },
    })),
  };
}

function Box(props: any) {
  return (
    <rect
      fill="#efefef"
      stroke="#bbb"
      rx={10}
      ry={10}
      strokeWidth={1}
      strokeDasharray="5,5"
      width={150}
      height={50}
    />
  );
}

export default function App() {
  const [data, setData] = React.useState({
    nodes: [
      {
        id: "node1",
        x: 100,
        y: 100,
        type: "box",
        connectors: [
          {
            id: "node1-input-1",
            x: 0,
            y: 25,
          },
          {
            id: "node1-output-2",
            x: 148,
            y: 25,
          },
        ],
      },
      {
        id: "node2",
        x: 200,
        y: 200,
        type: "box",
        connectors: [
          {
            id: "node2-input-1",
            x: 0,
            y: 25,
          },
        ],
      },
    ],
    edges: [
      {
        source: {
          node: "node1",
          connector: "node1-output-2",
        },
        target: {
          node: "node2",
          connector: "node2-input-1",
        },
        type: "line",
      },
    ],
  });

  const renderers = [{ type: "box", render: Box }];

  function onNodeMove(node: string, x: number, y: number) {
    setData((data) => {
      const nodes = data.nodes.map((d) => {
        if (d.id !== node) return d;

        return {
          ...d,
          x,
          y,
        };
      });
      return {
        ...data,
        nodes,
      };
    });
  }

  const { containerProps, nodes, edges } = useSolmu({
    data,
    renderers,
    onNodeMove,
  });

  return (
    <div className="App">
      <svg
        {...containerProps}
        style={{ background: "white", width: 500, height: 500 }}
      >
        {nodes.map((node) => {
          return (
            <svg key={node.id} {...node.getNodeProps()} width={150}>
              {node.render(node.getNodeProps())}
              {node.renderConnectors()}
            </svg>
          );
        })}
        {edges.map((edge) => (
          <g>{edge.render()}</g>
        ))}
      </svg>
    </div>
  );
}
