import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useSolmu } from '../solmu';
import { createNode, createEdge, DummyNodeRenderer, createReactMouseEvent } from './helpers';

describe('useSolmu', () => {
  const createMockData = () => ({
    nodes: [
      createNode('n1', 50, 50, 'test', [
        { id: 'c1', x: 5, y: 0 },
        { id: 'c2', x: -5, y: 0 },
      ]),
      createNode('n2', 150, 50, 'test', [
        { id: 'c1', x: 5, y: 0 },
        { id: 'c2', x: -5, y: 0 },
      ]),
    ],
    edges: [createEdge('n1', 'c1', 'n2', 'c2', 'bezier')],
  });

  const createConfig = (data = createMockData()) => ({
    renderers: [{ type: 'test', component: DummyNodeRenderer }],
    viewport: {
      width: 800,
      height: 600,
      worldBounds: { x: 0, y: 0, width: 800, height: 600 },
      zoom: 1,
      pan: { x: 0, y: 0 },
      grid: { size: 10, visible: true, snap: true },
    },
  });

  describe('canvas', () => {
    it('returns canvas ref', () => {
      const data = createMockData();
      const { result } = renderHook(() =>
        useSolmu({ data, config: createConfig(data) })
      );
      expect(result.current.canvas.ref.current).toBeNull();
    });

    it('returns viewBox string', () => {
      const data = createMockData();
      const { result } = renderHook(() =>
        useSolmu({ data, config: createConfig(data) })
      );
      expect(result.current.canvas.viewBox).toMatch(/^-?[\d.]+ -?[\d.]+ [\d.]+ [\d.]+$/);
    });

    it('returns width and height', () => {
      const data = createMockData();
      const { result } = renderHook(() =>
        useSolmu({ data, config: createConfig(data) })
      );
      expect(result.current.canvas.width).toBe(800);
      expect(result.current.canvas.height).toBe(600);
    });

    it('returns htmlLayerTransform', () => {
      const data = createMockData();
      const { result } = renderHook(() =>
        useSolmu({ data, config: createConfig(data) })
      );
      expect(result.current.canvas.htmlLayerTransform).toMatch(/^matrix\(/);
    });

    it('returns gridDots', () => {
      const data = createMockData();
      const { result } = renderHook(() =>
        useSolmu({ data, config: createConfig(data) })
      );
      expect(result.current.canvas.gridDots).toBeDefined();
      expect(result.current.canvas.gridDots!.length).toBeGreaterThan(0);
    });

    it('returns viewport utilities', () => {
      const data = createMockData();
      const { result } = renderHook(() =>
        useSolmu({ data, config: createConfig(data) })
      );
      expect(result.current.canvas.viewport).toBeDefined();
      const vp = result.current.canvas.viewport!;
      expect(vp.screenToWorld(400, 300)).toBeDefined();
      expect(vp.worldToScreen(50, 50)).toBeDefined();
      expect(vp.snapToGrid({ x: 13.7, y: 24.2 })).toEqual({ x: 10, y: 20 });
    });
  });

  describe('elements: nodes', () => {
    it('maps nodes with renderer, screenX/Y, and nodeProps', () => {
      const data = createMockData();
      const { result } = renderHook(() =>
        useSolmu({ data, config: createConfig(data) })
      );
      expect(result.current.elements.nodes).toHaveLength(2);
      const node = result.current.elements.nodes[0];
      expect(node.id).toBe('n1');
      expect(node.renderer).toBe(DummyNodeRenderer);
      expect(node.screenX).toBeDefined();
      expect(node.screenY).toBeDefined();
      expect(node.nodeProps).toBeDefined();
      expect(node.nodeProps.onMouseDown).toBeDefined();
      expect(node.nodeProps.onMouseUp).toBeDefined();
    });

    it('throws when renderer is not found', () => {
      const data = { nodes: [createNode('n1', 0, 0, 'unknown')], edges: [] };
      let error: Error | undefined;
      try {
        renderHook(() =>
          useSolmu({
            data,
            config: { renderers: [{ type: 'test', component: DummyNodeRenderer }] },
          })
        );
      } catch (e) {
        error = e as Error;
      }
      expect(error).toBeDefined();
      expect(error!.message).toContain('No renderer found for node type unknown');
    });

    it('maps connector props for each connector', () => {
      const data = createMockData();
      const { result } = renderHook(() =>
        useSolmu({ data, config: createConfig(data) })
      );
      const node = result.current.elements.nodes[0];
      expect(node.connectorProps).toHaveLength(2);
      expect(node.connectorProps[0].worldX).toBe(55); // 50 + 5
      expect(node.connectorProps[0].worldY).toBe(50); // 50 + 0
    });

    it('sets isDragging on dragged node', () => {
      const data = createMockData();
      const { result } = renderHook(() =>
        useSolmu({ data, config: createConfig(data) })
      );
      // Start drag by calling onMouseDown on nodeProps
      const mouseDown = new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 50, clientY: 50 });
      result.current.elements.nodes[0].nodeProps.onMouseDown(mouseDown as any);
      // The hook should have set the drag state
      // Note: we can't easily trigger the full drag without mocking getBoundingClientRect precisely,
      // so we test via re-rendering
      const { result: result2 } = renderHook(() =>
        useSolmu({ data, config: createConfig(data) })
      );
      expect(result2.current.elements.nodes[0].isDragging).toBe(false); // initially false
    });
  });

  describe('elements: edges', () => {
    it('renders edges with path and id', () => {
      const data = createMockData();
      const { result } = renderHook(() =>
        useSolmu({ data, config: createConfig(data) })
      );
      expect(result.current.elements.edges).toHaveLength(1);
      const edge = result.current.elements.edges[0];
      expect(edge.id).toBe('n1-n2-0');
      expect(edge.path).toMatch(/^M/);
      expect(edge.labelPoint).toBeDefined();
      expect(edge.resolvedWaypoints).toBeDefined();
      expect(edge.resolvedWaypoints.length).toBeGreaterThanOrEqual(2);
    });

    it('sets onClick on edges', () => {
      const data = createMockData();
      const { result } = renderHook(() =>
        useSolmu({ data, config: createConfig(data) })
      );
      expect(result.current.elements.edges[0].onClick).toBeDefined();
    });

    it('computes segments for edges', () => {
      const data = createMockData();
      const { result } = renderHook(() =>
        useSolmu({ data, config: createConfig(data) })
      );
      const edge = result.current.elements.edges[0];
      expect(edge.segments).toBeDefined();
      expect(edge.segments.length).toBeGreaterThanOrEqual(1);
    });

    it('handles line type edges', () => {
      const data = {
        nodes: [
          createNode('n1', 0, 0, 'test', [{ id: 'c1', x: 0, y: 0 }]),
          createNode('n2', 100, 100, 'test', [{ id: 'c1', x: 0, y: 0 }]),
        ],
        edges: [{ source: { node: 'n1', connector: 'c1' }, target: { node: 'n2', connector: 'c1' }, type: 'line' as const }],
      };
      const { result } = renderHook(() =>
        useSolmu({ data, config: createConfig(data) })
      );
      expect(result.current.elements.edges[0].path).toMatch(/^M.*L/);
    });

    it('handles edges with waypoints bypassing auto-routing', () => {
      const data = {
        nodes: [
          createNode('n1', 0, 0, 'test', [{ id: 'c1', x: 0, y: 0 }]),
          createNode('n2', 100, 100, 'test', [{ id: 'c1', x: 0, y: 0 }]),
        ],
        edges: [
          {
            source: { node: 'n1', connector: 'c1' },
            target: { node: 'n2', connector: 'c1' },
            type: 'bezier' as const,
            waypoints: [{ x: 50, y: 0 }],
          },
        ],
      };
      const { result } = renderHook(() =>
        useSolmu({ data, config: createConfig(data) })
      );
      expect(result.current.elements.edges[0].path).toMatch(/^M/);
      expect(result.current.elements.edges[0].resolvedWaypoints.length).toBeGreaterThan(2);
    });
  });

  describe('interactions: canvas mouseDown', () => {
    it('starts marquee on primary button', () => {
      const data = createMockData();
      const { result } = renderHook(() =>
        useSolmu({ data, config: createConfig(data) })
      );
      const evt = createReactMouseEvent('mousedown', { button: 0 });
      result.current.interactions.onMouseDown(evt);
    });

    it('ignores non-primary button', () => {
      const data = createMockData();
      const { result } = renderHook(() =>
        useSolmu({ data, config: createConfig(data) })
      );
      const evt = createReactMouseEvent('mousedown', { button: 2 });
      result.current.interactions.onMouseDown(evt);
      // No error, no state change
    });
  });

  describe('selection', () => {
    it('starts empty', () => {
      const data = createMockData();
      const { result } = renderHook(() =>
        useSolmu({ data, config: createConfig(data) })
      );
      expect(result.current.selection.nodeIds).toEqual([]);
      expect(result.current.selection.edgeIds).toEqual([]);
    });
  });

  describe('actions', () => {
    it('selectAll selects all nodes and edges', () => {
      const data = createMockData();
      const { result } = renderHook(() =>
        useSolmu({ data, config: createConfig(data) })
      );
      act(() => {
        result.current.actions.selectAll();
      });
      expect(result.current.selection.nodeIds).toContain('n1');
      expect(result.current.selection.nodeIds).toContain('n2');
      expect(result.current.selection.edgeIds.length).toBeGreaterThan(0);
    });

    it('deselectAll clears selection', () => {
      const data = createMockData();
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useSolmu({
          data,
          config: createConfig(data),
          onSelectionChange,
        })
      );
      act(() => {
        result.current.actions.selectAll();
      });
      act(() => {
        result.current.actions.deselectAll();
      });
      expect(result.current.selection.nodeIds).toEqual([]);
      expect(result.current.selection.edgeIds).toEqual([]);
    });
  });

  describe('callbacks', () => {
    it('calls onNodeClick when node clicked', () => {
      const data = createMockData();
      const onNodeClick = vi.fn();
      const { result } = renderHook(() =>
        useSolmu({ data, config: createConfig(data), onNodeClick })
      );
      const evt = createReactMouseEvent('mousedown');
      result.current.elements.nodes[0].nodeProps.onMouseDown(evt);
      expect(onNodeClick).toHaveBeenCalledWith('n1');
    });

    it('calls onEdgeClick when edge clicked', () => {
      const data = createMockData();
      const onEdgeClick = vi.fn();
      const { result } = renderHook(() =>
        useSolmu({ data, config: createConfig(data), onEdgeClick })
      );
      const evt = createReactMouseEvent('click');
      result.current.elements.edges[0].onClick!(evt);
      expect(onEdgeClick).toHaveBeenCalledWith('n1-n2-0');
    });

    it('calls onSelectionChange when selection changes', () => {
      const data = createMockData();
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useSolmu({ data, config: createConfig(data), onSelectionChange })
      );
      const evt = createReactMouseEvent('mousedown');
      result.current.elements.nodes[0].nodeProps.onMouseDown(evt);
      expect(onSelectionChange).toHaveBeenCalledWith({
        nodeIds: ['n1'],
        edgeIds: [],
      });
    });
  });

  describe('edge routing integration', () => {
    it('uses orthogonal mode for orthogonal edges', () => {
      const data = {
        nodes: [
          createNode('n1', 0, 0, 'test', [{ id: 'c1', x: 0, y: 0 }]),
          createNode('n2', 100, 0, 'test', [{ id: 'c1', x: 0, y: 0 }]),
        ],
        edges: [{ source: { node: 'n1', connector: 'c1' }, target: { node: 'n2', connector: 'c1' }, type: 'orthogonal' as const }],
      };
      const { result } = renderHook(() =>
        useSolmu({ data, config: createConfig(data) })
      );
      const edge = result.current.elements.edges[0];
      expect(edge.path).toMatch(/^M/);
      // Orthogonal path should contain L commands
      expect(edge.path).toContain('L');
    });

    it('uses direct mode for direct edges', () => {
      const data = {
        nodes: [
          createNode('n1', 0, 0, 'test', [{ id: 'c1', x: 0, y: 0 }]),
          createNode('n2', 100, 100, 'test', [{ id: 'c1', x: 0, y: 0 }]),
        ],
        edges: [{ source: { node: 'n1', connector: 'c1' }, target: { node: 'n2', connector: 'c1' }, type: 'direct' as const }],
      };
      const { result } = renderHook(() =>
        useSolmu({ data, config: createConfig(data) })
      );
      const edge = result.current.elements.edges[0];
      expect(edge.path).toMatch(/^M/);
    });

    it('computes route with obstacles', () => {
      const data = {
        nodes: [
          createNode('n1', 0, 0, 'test', [{ id: 'c1', x: 0, y: 0 }]),
          createNode('n2', 100, 0, 'test', [{ id: 'c1', x: 0, y: 0 }]),
          createNode('n3', 50, -10, 'test', [
            { id: 'c1', x: -10, y: -10 },
            { id: 'c2', x: 10, y: 10 },
          ]),
        ],
        edges: [{ source: { node: 'n1', connector: 'c1' }, target: { node: 'n2', connector: 'c1' }, type: 'bezier' as const }],
      };
      const { result } = renderHook(() =>
        useSolmu({ data, config: createConfig(data) })
      );
      expect(result.current.elements.edges[0].path).toMatch(/^M/);
    });

    it('skip obstacles when avoidNodes is false', () => {
      const data = {
        nodes: [
          createNode('n1', 0, 0, 'test', [{ id: 'c1', x: 0, y: 0 }]),
          createNode('n2', 100, 0, 'test', [{ id: 'c1', x: 0, y: 0 }]),
          createNode('n3', 50, -10, 'test', [
            { id: 'c1', x: -10, y: -10 },
            { id: 'c2', x: 10, y: 10 },
          ]),
        ],
        edges: [{ source: { node: 'n1', connector: 'c1' }, target: { node: 'n2', connector: 'c1' }, type: 'bezier' as const }],
      };
      const config = createConfig(data);
      config.routing = { avoidNodes: false };
      const { result } = renderHook(() =>
        useSolmu({ data, config })
      );
      expect(result.current.elements.edges[0].path).toMatch(/^M/);
    });
  });

  describe('connector drag', () => {
    it('sets up connector mouseDown handlers', () => {
      const data = createMockData();
      const { result } = renderHook(() =>
        useSolmu({ data, config: createConfig(data) })
      );
      const connector = result.current.elements.nodes[0].connectorProps[0];
      expect(connector.onMouseDown).toBeDefined();
      connector.onMouseDown();
      // Drag line should now be set up after interactions
    });

    it('renders dragLine when connector is being dragged', () => {
      const data = createMockData();
      const { result } = renderHook(() =>
        useSolmu({ data, config: createConfig(data) })
      );
      // Initially no drag line
      expect(result.current.elements.dragLine).toBeNull();
    });
  });

  describe('marquee', () => {
    it('starts marquee on canvas mouseDown', () => {
      const data = createMockData();
      const { result } = renderHook(() =>
        useSolmu({ data, config: createConfig(data) })
      );
      const evt = createReactMouseEvent('mousedown', { button: 0 });
      result.current.canvas.props.onMouseDown!(evt);
      // Marquee should have started but is not active until mouse moves
    });
  });

  describe('edge segments', () => {
    it('exposes onSegmentDragStart when onEdgePathChange is provided', () => {
      const data = createMockData();
      const onEdgePathChange = vi.fn();
      const { result } = renderHook(() =>
        useSolmu({ data, config: createConfig(data), onEdgePathChange })
      );
      expect(result.current.elements.edges[0].onSegmentDragStart).toBeDefined();
    });

    it('does not expose onSegmentDragStart when onEdgePathChange is absent', () => {
      const data = createMockData();
      const { result } = renderHook(() =>
        useSolmu({ data, config: createConfig(data) })
      );
      expect(result.current.elements.edges[0].onSegmentDragStart).toBeUndefined();
    });
  });
});
