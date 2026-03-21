import type { SolmuNode, Edge, SolmuSelection } from "./types";

/**
 * Serializable clipboard data for copy/paste of graph elements.
 */
export type ClipboardData = {
  nodes: SolmuNode<any>[];
  edges: Edge[];
};

export type PasteResult = {
  nodes: SolmuNode<any>[];
  edges: Edge[];
  /** Mapping from original node ID to new node ID */
  idMap: Record<string, string>;
};

export type DuplicateOptions = {
  /** Offset applied to duplicated node positions. Default: { x: 20, y: 20 } */
  offset?: { x: number; y: number };
  /** Custom ID generator. Default: `${originalId}-copy-${counter}` */
  generateId?: (originalId: string) => string;
};

let pasteCounter = 0;

function defaultGenerateId(originalId: string): string {
  pasteCounter++;
  return `${originalId}-copy-${pasteCounter}`;
}

/**
 * Extract the selected nodes and their internal edges into a serializable object.
 * Only edges where both source and target are in the selection are included.
 */
export function copySelection(
  nodes: SolmuNode<any>[],
  edges: Edge[],
  selection: SolmuSelection
): ClipboardData {
  const nodeSet = new Set(selection.nodeIds);
  const selectedNodes = nodes.filter((n) => nodeSet.has(n.id));
  // Include edges where both endpoints are selected
  const selectedEdges = edges.filter(
    (e) => nodeSet.has(e.source.node) && nodeSet.has(e.target.node)
  );
  return {
    nodes: selectedNodes.map((n) => ({ ...n })),
    edges: selectedEdges.map((e) => ({ ...e, waypoints: undefined })),
  };
}

/**
 * Serialize clipboard data to a JSON string for cross-tab clipboard.
 */
export function serializeClipboard(data: ClipboardData): string {
  return JSON.stringify(data);
}

/**
 * Deserialize clipboard data from a JSON string.
 * Returns null if the string is not valid clipboard data.
 */
export function deserializeClipboard(json: string): ClipboardData | null {
  try {
    const parsed = JSON.parse(json);
    if (parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
      return parsed as ClipboardData;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Create new nodes and edges from clipboard data with new IDs and offset positions.
 * Edges are remapped to reference the new node IDs.
 */
export function pasteClipboard(
  clipboard: ClipboardData,
  options: DuplicateOptions = {}
): PasteResult {
  const { offset = { x: 20, y: 20 }, generateId = defaultGenerateId } = options;

  // Build ID mapping
  const idMap: Record<string, string> = {};
  for (const node of clipboard.nodes) {
    idMap[node.id] = generateId(node.id);
  }

  // Create new nodes with new IDs and offset positions
  const newNodes: SolmuNode<any>[] = clipboard.nodes.map((node) => ({
    ...node,
    id: idMap[node.id],
    x: node.x + offset.x,
    y: node.y + offset.y,
    connectors: node.connectors?.map((c) => ({ ...c })),
    data: node.data != null ? JSON.parse(JSON.stringify(node.data)) : undefined,
  }));

  // Remap edges to new node IDs
  const newEdges: Edge[] = clipboard.edges
    .filter((e) => idMap[e.source.node] && idMap[e.target.node])
    .map((edge) => ({
      ...edge,
      source: { node: idMap[edge.source.node], connector: edge.source.connector },
      target: { node: idMap[edge.target.node], connector: edge.target.connector },
      waypoints: undefined,
    }));

  return { nodes: newNodes, edges: newEdges, idMap };
}

/**
 * Duplicate selected nodes and their internal edges in one step.
 * Returns new nodes/edges ready to be added to your data.
 *
 * ```ts
 * const result = duplicateSelection(data.nodes, data.edges, selection);
 * setData(prev => ({
 *   nodes: [...prev.nodes, ...result.nodes],
 *   edges: [...prev.edges, ...result.edges],
 * }));
 * ```
 */
export function duplicateSelection(
  nodes: SolmuNode<any>[],
  edges: Edge[],
  selection: SolmuSelection,
  options: DuplicateOptions = {}
): PasteResult {
  const clipboard = copySelection(nodes, edges, selection);
  return pasteClipboard(clipboard, options);
}

/**
 * Copy selection to the system clipboard as JSON.
 * Falls back silently if the Clipboard API is unavailable.
 */
export async function copyToSystemClipboard(
  nodes: SolmuNode<any>[],
  edges: Edge[],
  selection: SolmuSelection
): Promise<void> {
  const data = copySelection(nodes, edges, selection);
  const json = serializeClipboard(data);
  try {
    await navigator.clipboard.writeText(json);
  } catch {
    // Clipboard API not available or permission denied — silent fail
  }
}

/**
 * Paste from the system clipboard. Returns null if clipboard doesn't contain valid data.
 */
export async function pasteFromSystemClipboard(
  options: DuplicateOptions = {}
): Promise<PasteResult | null> {
  try {
    const json = await navigator.clipboard.readText();
    const data = deserializeClipboard(json);
    if (!data || data.nodes.length === 0) return null;
    return pasteClipboard(data, options);
  } catch {
    return null;
  }
}
