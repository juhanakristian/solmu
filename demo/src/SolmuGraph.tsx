import React from "react";
import { useSolmu } from "solmu";

function Box(props: any) {
  return (
    <rect
      fill="#efefef"
      stroke="#dedede"
      rx={10}
      ry={10}
      strokeWidth={2}
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
            x: 150,
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
    <div style={{ width: "100%", height: "100%", padding: 50 }}>
      <svg
        {...containerProps}
        style={{ background: "white", width: "100%", height: "100%" }}
      >
        {edges.map((edge) => (
          <g transform="translate(10,10)">{edge.render()}</g>
        ))}
        {nodes.map((node) => {
          return (
            <svg key={node.id} {...node.getNodeProps()}>
              <g transform="translate(10, 10)">
                {node.render(node.getNodeProps())}
                {node.renderConnectors()}
              </g>
            </svg>
          );
        })}
      </svg>
    </div>
  );
}
