import React from "react";
import { useSolmu } from "solmu";
import { Edge } from "../../dist/cjs/types";

function Box(props: any) {
  return (
    <rect
      {...props}
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

function Diamond(props: any) {
  return (
    <rect
      {...props}
      transform="rotate(45) translate(-50, -50)"
      fill="#efefef"
      stroke="#dedede"
      rx={3}
      ry={3}
      strokeWidth={2}
      width={100}
      height={100}
    >
      <title>Test</title>
    </rect>
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
      {
        id: "node3",
        x: 200,
        y: 200,
        type: "diamond",
        connectors: [
          {
            id: "node3-input-1",
            x: -70,
            y: 0,
          },
          {
            id: "node3-input-2",
            x: 70,
            y: 0,
          },
        ],
      },
    ],
    edges: [
      {
        source: {
          node: "node1",
          connector: "node1-input-1",
        },
        target: {
          node: "node2",
          connector: "node2-input-1",
        },
        type: "bezier",
      } as Edge,
      {
        source: {
          node: "node1",
          connector: "node1-output-2",
        },
        target: {
          node: "node3",
          connector: "node3-input-1",
        },
        type: "bezier",
      } as Edge,
    ],
  });

  function onConnect(
    start: { node: string; connector: string },
    end: { node: string; connector: string }
  ) {
    setData((data) => {
      const edges = [
        ...data.edges,
        {
          source: start,
          target: end,
          type: "bezier",
        } as Edge,
      ];

      return { ...data, edges };
    });
  }

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

  const config = {
    renderers: [
      {
        type: "box",
        component: Box,
      },
      {
        type: "diamond",
        component: Diamond,
      },
    ],
  };

  const { containerProps, nodes, edges } = useSolmu({
    data,
    config,
    onNodeMove,
    onConnect,
  });

  return (
    <div style={{ width: "100%", height: "100%", padding: 50 }}>
      <svg
        {...containerProps}
        style={{ background: "white", width: "100%", height: "100%" }}
      >
        {edges.map((edge) => (
          <path
            key={`${edge.source.node}-${edge.target.node}`}
            fill="none"
            stroke="#efefef"
            strokeWidth={2}
            {...edge.getEdgeProps()}
          />
        ))}
        {nodes.map((node) => {
          return (
            <g key={node.id} {...node.getGroupProps()}>
              {node.render(node.getNodeProps())}
              {node.renderConnectors()}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
