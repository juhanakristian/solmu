export type SolmuNodeConnector = {
  id: string;
  node: string;
};
export type Connector = {
  id: string;
  x: number;
  y: number;
};

export type SolmuNode = {
  id: string;
  x: number;
  y: number;
  connectors?: Connector[];
  Node: any;
};

export type EdgeNode = {
  node: string;
  connector: string;
};

export type Edge = {
  source: EdgeNode;
  target: EdgeNode;
  type: "bezier" | "line";
};

export type UseSolmuParams = {
  data: {
    nodes: SolmuNode[];
    edges: Edge[];
  };
  onNodeMove?: NodeMoveFunc;
};

export type NodeMoveFunc = (node: string, x: number, y: number) => void;
