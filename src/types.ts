type Connector = {
  id: string;
  x: number;
  y: number;
};

type SolmuNode = {
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

type UseSolmuParams = {
  data: {
    nodes: SolmuNode[];
    edges: Edge[];
  };
  renderers: Renderer[];
  onNodeMove?: NodeMoveFunc;
};

type NodeMoveFunc = (node: string, x: number, y: number) => void;
