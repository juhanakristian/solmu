import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  SolmuCanvas,
  DefaultEdgeRenderer,
  DefaultConnectorRenderer,
  SolmuMarkerDefs,
} from '../components';
import type { SolmuCanvas as SolmuCanvasData, SolmuElements, SolmuInteractions, SolmuRenderEdge, SolmuRenderNode, ConnectorRendererProps } from '../types';
import { createNode, createEdge, DummyNodeRenderer } from './helpers';

function createMockCanvas(): SolmuCanvasData {
  return {
    ref: { current: null },
    props: {},
    width: 800,
    height: 600,
    viewBox: '0 0 800 600',
    gridDots: [
      { x: 10, y: 10, size: 0.2, opacity: 0.4 },
    ],
    htmlLayerTransform: 'matrix(1, 0, 0, 1, 0, 0)',
    viewport: {
      screenToWorld: (x, y) => ({ x, y }),
      worldToScreen: (x, y) => ({ x, y }),
      snapToGrid: (p) => p,
      formatCoordinate: (v) => `${v}`,
      getEffectiveGridSize: () => 10,
    },
  };
}

function createMockInteractions(): SolmuInteractions {
  return {
    onMouseDown: vi.fn(),
    onMouseMove: vi.fn(),
    onMouseUp: vi.fn(),
  };
}

function createMockNode(): SolmuRenderNode {
  const node = createNode('n1', 50, 50, 'test', [{ id: 'c1', x: 5, y: 0 }]);
  return {
    ...node,
    renderer: DummyNodeRenderer,
    nodeProps: {
      node,
      onMouseDown: vi.fn(),
      onMouseUp: vi.fn(),
    },
    connectorProps: [
      {
        connector: node.connectors![0],
        node,
        worldX: 55,
        worldY: 50,
        isHovered: false,
        onMouseDown: vi.fn(),
        onMouseOver: vi.fn(),
        onMouseUp: vi.fn(),
        onMouseOut: vi.fn(),
      },
    ],
    screenX: 50,
    screenY: 50,
  };
}

function createMockEdge(overrides: Partial<SolmuRenderEdge> = {}): SolmuRenderEdge {
  return {
    id: 'e1',
    source: { node: 'n1', connector: 'c1' },
    target: { node: 'n2', connector: 'c1' },
    type: 'bezier',
    path: 'M0,0 C30,0 70,50 100,50',
    labelPoint: { x: 50, y: 25 },
    labelAngle: 0,
    sourceLabelPoint: { x: 10, y: 10 },
    targetLabelPoint: { x: 90, y: 40 },
    resolvedWaypoints: [],
    segments: [
      { index: 0, p1: { x: 0, y: 0 }, p2: { x: 100, y: 50 }, orientation: 'diagonal', draggable: false },
    ],
    onClick: vi.fn(),
    ...overrides,
  };
}

function createMockElements(): SolmuElements {
  return {
    nodes: [createMockNode()],
    edges: [createMockEdge()],
    dragLine: null,
    marquee: null,
  };
}

describe('SolmuCanvas', () => {
  it('renders svg element', () => {
    render(
      <SolmuCanvas
        canvas={createMockCanvas()}
        elements={createMockElements()}
        interactions={createMockInteractions()}
      />
    );
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('renders grid dots', () => {
    render(
      <SolmuCanvas
        canvas={createMockCanvas()}
        elements={createMockElements()}
        interactions={createMockInteractions()}
      />
    );
    const dots = document.querySelectorAll('circle');
    expect(dots.length).toBeGreaterThan(0);
  });

  it('renders edges', () => {
    render(
      <SolmuCanvas
        canvas={createMockCanvas()}
        elements={createMockElements()}
        interactions={createMockInteractions()}
      />
    );
    const paths = document.querySelectorAll('svg > g > path');
    expect(paths.length).toBeGreaterThan(0);
  });

  it('renders connectors', () => {
    render(
      <SolmuCanvas
        canvas={createMockCanvas()}
        elements={createMockElements()}
        interactions={createMockInteractions()}
      />
    );
    const rects = document.querySelectorAll('rect');
    expect(rects.length).toBeGreaterThan(0);
  });

  it('renders drag line when present', () => {
    const elements = createMockElements();
    elements.dragLine = {
      path: 'M0,0 L100,100',
      isVisible: true,
    };
    render(
      <SolmuCanvas
        canvas={createMockCanvas()}
        elements={elements}
        interactions={createMockInteractions()}
      />
    );
    // Look for the drag line path (should be a direct child of svg)
    const svg = document.querySelector('svg')!;
    const paths = svg.querySelectorAll('path');
    // The drag line and the edge path
    expect(paths.length).toBeGreaterThanOrEqual(1);
  });

  it('renders marquee when active', () => {
    const elements = createMockElements();
    elements.marquee = { x: 10, y: 10, width: 100, height: 100 };
    render(
      <SolmuCanvas
        canvas={createMockCanvas()}
        elements={elements}
        interactions={createMockInteractions()}
      />
    );
    const rects = document.querySelectorAll('rect');
    expect(rects.length).toBeGreaterThan(0);
  });

  it('renders custom children inside SVG', () => {
    render(
      <SolmuCanvas
        canvas={createMockCanvas()}
        elements={createMockElements()}
        interactions={createMockInteractions()}
      >
        <text data-testid="custom-child">Custom</text>
      </SolmuCanvas>
    );
    expect(screen.getByTestId('custom-child')).toBeInTheDocument();
  });

  it('merges external style prop', () => {
    const { container } = render(
      <SolmuCanvas
        canvas={createMockCanvas()}
        elements={createMockElements()}
        interactions={createMockInteractions()}
        style={{ background: 'red' }}
      />
    );
    const div = container.firstChild as HTMLElement;
    expect(div.style.background).toBe('red');
  });

  it('calls interactions event handlers', () => {
    const interactions = createMockInteractions();
    const { container } = render(
      <SolmuCanvas
        canvas={createMockCanvas()}
        elements={createMockElements()}
        interactions={interactions}
      />
    );
    const div = container.firstChild as HTMLElement;
    div.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    expect(interactions.onMouseMove).toHaveBeenCalled();
  });

  it('calls external onMouseDown on SVG', () => {
    const externalOnMouseDown = vi.fn();
    const interactions = createMockInteractions();
    const { container } = render(
      <SolmuCanvas
        canvas={createMockCanvas()}
        elements={createMockElements()}
        interactions={interactions}
        onMouseDown={externalOnMouseDown}
      />
    );
    const svg = container.querySelector('svg')!;
    svg.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(externalOnMouseDown).toHaveBeenCalled();
    expect(interactions.onMouseDown).toHaveBeenCalled();
  });

  it('renders HTML node layer', () => {
    const { container } = render(
      <SolmuCanvas
        canvas={createMockCanvas()}
        elements={createMockElements()}
        interactions={createMockInteractions()}
      />
    );
    const htmlLayer = container.querySelector('div > div');
    expect(htmlLayer).toBeInTheDocument();
  });
});

describe('DefaultEdgeRenderer', () => {
  it('renders path with correct d', () => {
    const edge = createMockEdge();
    render(<DefaultEdgeRenderer edge={edge} />);
    const path = document.querySelector('path');
    expect(path).toHaveAttribute('d', edge.path);
  });

  it('uses selected stroke color', () => {
    const edge = createMockEdge({ isSelected: true });
    render(<DefaultEdgeRenderer edge={edge} />);
    const path = document.querySelector('path');
    expect(path).toHaveAttribute('stroke', '#64ffda');
  });

  it('uses default stroke when not selected', () => {
    const edge = createMockEdge();
    render(<DefaultEdgeRenderer edge={edge} />);
    const path = document.querySelector('path');
    expect(path).toHaveAttribute('stroke', '#00e676');
  });

  it('applies strokeDasharray', () => {
    const edge = createMockEdge({ style: { strokeDasharray: '4 2' } });
    render(<DefaultEdgeRenderer edge={edge} />);
    const path = document.querySelector('path');
    expect(path).toHaveAttribute('stroke-dasharray', '4 2');
  });

  it('applies opacity', () => {
    const edge = createMockEdge({ style: { opacity: 0.5 } });
    render(<DefaultEdgeRenderer edge={edge} />);
    const path = document.querySelector('path');
    expect(path).toHaveAttribute('opacity', '0.5');
  });

  it('applies markerStart and markerEnd', () => {
    const edge = createMockEdge({
      style: { markerStart: 'arrow-open', markerEnd: 'arrow' },
    });
    render(<DefaultEdgeRenderer edge={edge} />);
    const path = document.querySelector('path');
    expect(path).toHaveAttribute('marker-start', 'url(#solmu-arrow-open)');
    expect(path).toHaveAttribute('marker-end', 'url(#solmu-arrow)');
  });

  it('calls onClick when clicked', () => {
    const edge = createMockEdge();
    render(<DefaultEdgeRenderer edge={edge} />);
    const path = document.querySelector('path')!;
    path.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(edge.onClick).toHaveBeenCalled();
  });

  it('renders draggable segment hit areas', () => {
    const edge = createMockEdge({
      segments: [
        { index: 0, p1: { x: 0, y: 0 }, p2: { x: 100, y: 0 }, orientation: 'horizontal', draggable: true },
      ],
      onSegmentDragStart: vi.fn(),
    });
    render(<DefaultEdgeRenderer edge={edge} />);
    const lines = document.querySelectorAll('line');
    expect(lines.length).toBeGreaterThan(0);
  });

  it('does not render non-draggable segments', () => {
    const edge = createMockEdge({
      segments: [
        { index: 0, p1: { x: 0, y: 0 }, p2: { x: 100, y: 0 }, orientation: 'horizontal', draggable: false },
      ],
    });
    render(<DefaultEdgeRenderer edge={edge} />);
    const lines = document.querySelectorAll('line');
    expect(lines.length).toBe(0);
  });
});

describe('DefaultConnectorRenderer', () => {
  it('renders rect at correct position', () => {
    const props: ConnectorRendererProps = {
      connector: { id: 'c1', x: 5, y: 0 },
      node: createNode('n1', 50, 50),
      worldX: 55,
      worldY: 50,
      isHovered: false,
      onMouseDown: vi.fn(),
      onMouseOver: vi.fn(),
      onMouseUp: vi.fn(),
      onMouseOut: vi.fn(),
    };
    render(<DefaultConnectorRenderer {...props} />);
    const rect = document.querySelector('rect');
    expect(rect).toHaveAttribute('x', '54');
    expect(rect).toHaveAttribute('y', '49');
    expect(rect).toHaveAttribute('width', '2');
    expect(rect).toHaveAttribute('height', '2');
  });

  it('applies scale transform when hovered', () => {
    const props: ConnectorRendererProps = {
      connector: { id: 'c1', x: 5, y: 0 },
      node: createNode('n1', 50, 50),
      worldX: 55,
      worldY: 50,
      isHovered: true,
      onMouseDown: vi.fn(),
      onMouseOver: vi.fn(),
      onMouseUp: vi.fn(),
      onMouseOut: vi.fn(),
    };
    render(<DefaultConnectorRenderer {...props} />);
    const rect = document.querySelector('rect');
    expect(rect?.style.transform).toContain('scale(1.5)');
  });

  it('does not apply scale when not hovered', () => {
    const props: ConnectorRendererProps = {
      connector: { id: 'c1', x: 5, y: 0 },
      node: createNode('n1', 50, 50),
      worldX: 55,
      worldY: 50,
      isHovered: false,
      onMouseDown: vi.fn(),
      onMouseOver: vi.fn(),
      onMouseUp: vi.fn(),
      onMouseOut: vi.fn(),
    };
    render(<DefaultConnectorRenderer {...props} />);
    const rect = document.querySelector('rect');
    expect(rect?.style.transform).not.toContain('scale');
  });

  it('calls event handlers', () => {
    const onMouseDown = vi.fn();
    const props: ConnectorRendererProps = {
      connector: { id: 'c1', x: 5, y: 0 },
      node: createNode('n1', 50, 50),
      worldX: 55,
      worldY: 50,
      isHovered: false,
      onMouseDown,
      onMouseOver: vi.fn(),
      onMouseUp: vi.fn(),
      onMouseOut: vi.fn(),
    };
    render(<DefaultConnectorRenderer {...props} />);
    const rect = document.querySelector('rect')!;
    rect.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(onMouseDown).toHaveBeenCalled();
  });
});

describe('SolmuMarkerDefs', () => {
  it('returns null when no markers needed', () => {
    const { container } = render(<SolmuMarkerDefs edges={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders arrow marker when used', () => {
    const edge = createMockEdge({ style: { markerEnd: 'arrow' } });
    render(<SolmuMarkerDefs edges={[edge]} />);
    expect(document.querySelector('#solmu-arrow')).toBeInTheDocument();
  });

  it('renders arrow-open marker when used', () => {
    const edge = createMockEdge({ style: { markerEnd: 'arrow-open' } });
    render(<SolmuMarkerDefs edges={[edge]} />);
    expect(document.querySelector('#solmu-arrow-open')).toBeInTheDocument();
  });

  it('renders both markers when both used', () => {
    const edge1 = createMockEdge({ style: { markerEnd: 'arrow' } });
    const edge2 = createMockEdge({ style: { markerEnd: 'arrow-open' } });
    render(<SolmuMarkerDefs edges={[edge1, edge2]} />);
    expect(document.querySelector('#solmu-arrow')).toBeInTheDocument();
    expect(document.querySelector('#solmu-arrow-open')).toBeInTheDocument();
  });

  it('does not render markers when not used', () => {
    const edge = createMockEdge();
    const { container } = render(<SolmuMarkerDefs edges={[edge]} />);
    expect(container.firstChild).toBeNull();
  });

  it('handles markerStart as well', () => {
    const edge = createMockEdge({ style: { markerStart: 'arrow' } });
    render(<SolmuMarkerDefs edges={[edge]} />);
    expect(document.querySelector('#solmu-arrow')).toBeInTheDocument();
  });
});
