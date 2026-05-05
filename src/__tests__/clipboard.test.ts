import { describe, it, expect, vi } from 'vitest';
import {
  copySelection,
  serializeClipboard,
  deserializeClipboard,
  pasteClipboard,
  duplicateSelection,
  copyToSystemClipboard,
  pasteFromSystemClipboard,
} from '../clipboard';
import { createNode, createEdge, createSelection } from './helpers';

describe('copySelection', () => {
  it('returns empty result for empty selection', () => {
    const nodes = [createNode('n1', 10, 20)];
    const edges = [createEdge('n1', 'c1', 'n1', 'c2')];
    const result = copySelection(nodes, edges, createSelection());
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });

  it('filters nodes by selection nodeIds', () => {
    const nodes = [createNode('n1', 10, 20), createNode('n2', 30, 40)];
    const result = copySelection(nodes, [], createSelection(['n1']));
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe('n1');
    expect(result.nodes[0].x).toBe(10);
    expect(result.nodes[0].y).toBe(20);
  });

  it('copies all selected nodes when all are selected', () => {
    const nodes = [createNode('n1', 10, 20), createNode('n2', 30, 40)];
    const result = copySelection(nodes, [], createSelection(['n1', 'n2']));
    expect(result.nodes).toHaveLength(2);
  });

  it('includes only edges with both endpoints selected', () => {
    const nodes = [createNode('n1', 10, 20), createNode('n2', 30, 40), createNode('n3', 50, 60)];
    const edges = [
      createEdge('n1', 'c1', 'n2', 'c2'),
      createEdge('n1', 'c1', 'n3', 'c2'),
      createEdge('n2', 'c1', 'n3', 'c2'),
    ];
    const result = copySelection(nodes, edges, createSelection(['n1', 'n2']));
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].source.node).toBe('n1');
    expect(result.edges[0].target.node).toBe('n2');
  });

  it('strips waypoints from copied edges', () => {
    const nodes = [createNode('n1', 10, 20), createNode('n2', 30, 40)];
    const edges = [createEdge('n1', 'c1', 'n2', 'c2', 'bezier', undefined, [{ x: 15, y: 25 }])];
    const result = copySelection(nodes, edges, createSelection(['n1', 'n2']));
    expect(result.edges[0].waypoints).toBeUndefined();
  });

  it('creates deep copies of nodes', () => {
    const nodes = [createNode('n1', 10, 20, 'test', undefined, { key: 'value' })];
    const result = copySelection(nodes, [], createSelection(['n1']));
    expect(result.nodes[0]).not.toBe(nodes[0]);
    expect(result.nodes[0].data).toEqual(nodes[0].data);
  });

  it('creates deep copies of edges', () => {
    const nodes = [createNode('n1', 10, 20), createNode('n2', 30, 40)];
    const edges = [createEdge('n1', 'c1', 'n2', 'c2', 'bezier', { stroke: 'red' })];
    const result = copySelection(nodes, edges, createSelection(['n1', 'n2']));
    expect(result.edges[0]).not.toBe(edges[0]);
    expect(result.edges[0].style).toEqual(edges[0].style);
  });
});

describe('serializeClipboard / deserializeClipboard', () => {
  it('roundtrips clipboard data', () => {
    const data = {
      nodes: [createNode('n1', 10, 20)],
      edges: [createEdge('n1', 'c1', 'n1', 'c2')],
    };
    const json = serializeClipboard(data);
    const parsed = deserializeClipboard(json);
    expect(parsed).toEqual(data);
  });

  it('returns null for invalid JSON', () => {
    expect(deserializeClipboard('not json')).toBeNull();
  });

  it('returns null for JSON missing nodes array', () => {
    expect(deserializeClipboard('{"edges":[]}')).toBeNull();
  });

  it('returns null for JSON missing edges array', () => {
    expect(deserializeClipboard('{"nodes":[]}')).toBeNull();
  });

  it('returns null for null input', () => {
    expect(deserializeClipboard('null')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(deserializeClipboard('')).toBeNull();
  });
});

describe('pasteClipboard', () => {
  it('remaps all node IDs', () => {
    const clipboard = {
      nodes: [createNode('n1', 10, 20), createNode('n2', 30, 40)],
      edges: [createEdge('n1', 'c1', 'n2', 'c2')],
    };
    const result = pasteClipboard(clipboard);
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes[0].id).not.toBe('n1');
    expect(result.nodes[1].id).not.toBe('n2');
    expect(result.idMap['n1']).toBe(result.nodes[0].id);
    expect(result.idMap['n2']).toBe(result.nodes[1].id);
  });

  it('applies offset to node positions', () => {
    const clipboard = {
      nodes: [createNode('n1', 10, 20)],
      edges: [],
    };
    const result = pasteClipboard(clipboard, { offset: { x: 5, y: 7 } });
    expect(result.nodes[0].x).toBe(15);
    expect(result.nodes[0].y).toBe(27);
  });

  it('remaps edges to new node IDs', () => {
    const clipboard = {
      nodes: [createNode('n1', 10, 20), createNode('n2', 30, 40)],
      edges: [createEdge('n1', 'c1', 'n2', 'c2')],
    };
    const result = pasteClipboard(clipboard);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].source.node).toBe(result.idMap['n1']);
    expect(result.edges[0].target.node).toBe(result.idMap['n2']);
    expect(result.edges[0].source.connector).toBe('c1');
    expect(result.edges[0].target.connector).toBe('c2');
  });

  it('filters edges referencing unmapped nodes', () => {
    const clipboard = {
      nodes: [createNode('n1', 10, 20)],
      edges: [createEdge('n1', 'c1', 'n2', 'c2')],
    };
    const result = pasteClipboard(clipboard);
    expect(result.edges).toHaveLength(0);
  });

  it('uses custom generateId', () => {
    const clipboard = {
      nodes: [createNode('n1', 10, 20)],
      edges: [],
    };
    const result = pasteClipboard(clipboard, { generateId: (id) => `prefix-${id}` });
    expect(result.nodes[0].id).toBe('prefix-n1');
  });

  it('deep-copies node data', () => {
    const clipboard = {
      nodes: [createNode('n1', 10, 20, 'test', undefined, { nested: { key: 'val' } })],
      edges: [],
    };
    const result = pasteClipboard(clipboard);
    expect(result.nodes[0].data).toEqual(clipboard.nodes[0].data);
    expect(result.nodes[0].data).not.toBe(clipboard.nodes[0].data);
  });

  it('copies connectors', () => {
    const clipboard = {
      nodes: [createNode('n1', 10, 20, 'test', [{ id: 'c1', x: 0, y: 0 }])],
      edges: [],
    };
    const result = pasteClipboard(clipboard);
    expect(result.nodes[0].connectors).toEqual([{ id: 'c1', x: 0, y: 0 }]);
  });

  it('strips waypoints from pasted edges', () => {
    const clipboard = {
      nodes: [createNode('n1', 10, 20), createNode('n2', 30, 40)],
      edges: [createEdge('n1', 'c1', 'n2', 'c2', 'bezier', undefined, [{ x: 15, y: 25 }])],
    };
    const result = pasteClipboard(clipboard);
    expect(result.edges[0].waypoints).toBeUndefined();
  });
});

describe('duplicateSelection', () => {
  it('combines copy and paste', () => {
    const nodes = [createNode('n1', 10, 20), createNode('n2', 30, 40)];
    const edges = [createEdge('n1', 'c1', 'n2', 'c2')];
    const selection = createSelection(['n1', 'n2']);
    const result = duplicateSelection(nodes, edges, selection);
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
    expect(result.nodes[0].id).not.toBe('n1');
    expect(result.nodes[1].id).not.toBe('n2');
    // Default offset of 20,20
    expect(result.nodes[0].x).toBe(30);
    expect(result.nodes[0].y).toBe(40);
  });

  it('uses custom options', () => {
    const nodes = [createNode('n1', 10, 20)];
    const edges: ReturnType<typeof createEdge>[] = [];
    const result = duplicateSelection(nodes, edges, createSelection(['n1']), {
      offset: { x: 100, y: 100 },
      generateId: (id) => `dup-${id}`,
    });
    expect(result.nodes[0].id).toBe('dup-n1');
    expect(result.nodes[0].x).toBe(110);
    expect(result.nodes[0].y).toBe(120);
  });
});

describe('copyToSystemClipboard', () => {
  it('writes serialized data to clipboard', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      value: { readText: vi.fn(), writeText },
      configurable: true,
    });

    const nodes = [createNode('n1', 10, 20), createNode('n2', 30, 40)];
    const edges = [createEdge('n1', 'c1', 'n2', 'c2')];
    await copyToSystemClipboard(nodes, edges, createSelection(['n1', 'n2']));

    expect(writeText).toHaveBeenCalledOnce();
    const json = writeText.mock.calls[0][0];
    const parsed = JSON.parse(json);
    expect(parsed.nodes).toHaveLength(2);
    expect(parsed.edges).toHaveLength(1);
  });

  it('silently fails on clipboard error', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        readText: vi.fn(),
        writeText: vi.fn(() => Promise.reject(new Error('denied'))),
      },
      configurable: true,
    });

    const nodes = [createNode('n1', 10, 20)];
    await expect(copyToSystemClipboard(nodes, [], createSelection(['n1']))).resolves.toBeUndefined();
  });
});

describe('pasteFromSystemClipboard', () => {
  it('reads and parses valid clipboard data', async () => {
    const data = {
      nodes: [createNode('n1', 10, 20)],
      edges: [],
    };
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn(),
        readText: vi.fn(() => Promise.resolve(serializeClipboard(data))),
      },
      configurable: true,
    });

    const result = await pasteFromSystemClipboard();
    expect(result).not.toBeNull();
    expect(result!.nodes).toHaveLength(1);
  });

  it('returns null for empty clipboard', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn(),
        readText: vi.fn(() => Promise.resolve('')),
      },
      configurable: true,
    });

    const result = await pasteFromSystemClipboard();
    expect(result).toBeNull();
  });

  it('returns null for invalid clipboard data', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn(),
        readText: vi.fn(() => Promise.resolve('not valid json')),
      },
      configurable: true,
    });

    const result = await pasteFromSystemClipboard();
    expect(result).toBeNull();
  });

  it('returns null on clipboard permission error', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn(),
        readText: vi.fn(() => Promise.reject(new Error('denied'))),
      },
      configurable: true,
    });

    const result = await pasteFromSystemClipboard();
    expect(result).toBeNull();
  });
});
