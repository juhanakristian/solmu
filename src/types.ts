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
  type: string;
  connectors?: Connector[];
};

export type EdgeNode = {
  node: string;
  connector: string;
};

export type Edge = {
  source: EdgeNode;
  target: EdgeNode;
};

export type Renderer = {
  type: string;
  render: any;
};

export type UseSolmuParams = {
  data: {
    nodes: SolmuNode[];
    edges: Edge[];
  };
  renderers: Renderer[];
  onNodeMove?: NodeMoveFunc;
};

export type NodeMoveFunc = (node: string, x: number, y: number) => void;
