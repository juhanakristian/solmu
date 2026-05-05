import React from 'react';
import type { SolmuNode, Edge, Connector, SolmuSelection, ViewportConfig } from '../types';
import { SolmuViewport } from '../viewport';

export function createNode(
  id: string,
  x: number,
  y: number,
  type: string = 'test',
  connectors?: Connector[],
  data?: any
): SolmuNode {
  return { id, x, y, type, connectors, data };
}

export function createEdge(
  sourceNode: string,
  sourceConnector: string,
  targetNode: string,
  targetConnector: string,
  type: Edge['type'] = 'bezier',
  style?: Edge['style'],
  waypoints?: Edge['waypoints']
): Edge {
  return {
    source: { node: sourceNode, connector: sourceConnector },
    target: { node: targetNode, connector: targetConnector },
    type,
    style,
    waypoints,
  };
}

export function createSelection(nodeIds: string[] = [], edgeIds: string[] = []): SolmuSelection {
  return { nodeIds, edgeIds };
}

export function createViewportConfig(overrides: Partial<ViewportConfig> = {}): ViewportConfig {
  return {
    width: 800,
    height: 600,
    worldBounds: { x: 0, y: 0, width: 800, height: 600 },
    zoom: 1,
    pan: { x: 0, y: 0 },
    origin: 'top-left',
    units: 'px',
    ...overrides,
  };
}

export function createViewport(overrides: Partial<ViewportConfig> = {}): SolmuViewport {
  return new SolmuViewport(createViewportConfig(overrides));
}

export const DummyNodeRenderer: React.FC<{ node: SolmuNode }> = ({ node }) => (
  <div data-testid={`node-${node.id}`}>Node {node.id}</div>
);

export function createMouseEvent(
  type: string,
  options: Partial<MouseEventInit> & { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; button?: number } = {}
): MouseEvent {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: 400,
    clientY: 300,
    ...options,
  });
}

export function createReactMouseEvent(
  type: string,
  options: Partial<React.MouseEvent> & { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; button?: number } = {}
): React.MouseEvent {
  const nativeEvent = createMouseEvent(type, options);
  return {
    ...nativeEvent,
    nativeEvent,
    isDefaultPrevented: () => false,
    isPropagationStopped: () => false,
    persist: () => {},
    stopPropagation: vi.fn(),
    preventDefault: vi.fn(),
  } as unknown as React.MouseEvent;
}
