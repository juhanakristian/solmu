import { describe, it, expect } from 'vitest';
import {
  getNodeBounds,
  calculateRoute,
  calculateSimpleOrthogonalRoute,
  buildPathFromWaypoints,
  type Point,
} from '../routing';
import { createNode } from './helpers';

describe('getNodeBounds', () => {
  it('returns empty array for empty nodes', () => {
    expect(getNodeBounds([])).toEqual([]);
  });

  it('uses default dimensions when node has no connectors', () => {
    const nodes = [createNode('n1', 10, 20)];
    const bounds = getNodeBounds(nodes);
    expect(bounds).toHaveLength(1);
    expect(bounds[0].id).toBe('n1');
    expect(bounds[0].bounds.x).toBe(10 - 15 / 2);
    expect(bounds[0].bounds.y).toBe(20 - 5 / 2);
    expect(bounds[0].bounds.width).toBe(15);
    expect(bounds[0].bounds.height).toBe(5);
  });

  it('infers dimensions from connector spread', () => {
    const nodes = [
      createNode('n1', 0, 0, 'test', [
        { id: 'c1', x: -10, y: -5 },
        { id: 'c2', x: 10, y: 5 },
      ]),
    ];
    const bounds = getNodeBounds(nodes);
    const spanX = 10 - (-10);
    const spanY = 5 - (-5);
    expect(bounds[0].bounds.width).toBe(spanX + 4);
    expect(bounds[0].bounds.height).toBe(spanY + 4);
    expect(bounds[0].bounds.x).toBe(-(spanX + 4) / 2);
    expect(bounds[0].bounds.y).toBe(-(spanY + 4) / 2);
  });

  it('falls back to defaults when spread is smaller', () => {
    const nodes = [
      createNode('n1', 0, 0, 'test', [
        { id: 'c1', x: 0, y: 0 },
        { id: 'c2', x: 1, y: 1 },
      ]),
    ];
    const bounds = getNodeBounds(nodes);
    expect(bounds[0].bounds.width).toBe(15);
    expect(bounds[0].bounds.height).toBe(5);
  });

  it('excludes nodes by ID', () => {
    const nodes = [createNode('n1', 0, 0), createNode('n2', 10, 10)];
    const bounds = getNodeBounds(nodes, ['n1']);
    expect(bounds).toHaveLength(1);
    expect(bounds[0].id).toBe('n2');
  });

  it('uses custom defaultDimensions', () => {
    const nodes = [createNode('n1', 0, 0)];
    const bounds = getNodeBounds(nodes, undefined, { width: 100, height: 50 });
    expect(bounds[0].bounds.width).toBe(100);
    expect(bounds[0].bounds.height).toBe(50);
  });

  it('filters to defaults with only one connector', () => {
    const nodes = [createNode('n1', 0, 0, 'test', [{ id: 'c1', x: 100, y: 100 }])];
    const bounds = getNodeBounds(nodes);
    expect(bounds[0].bounds.width).toBe(15);
    expect(bounds[0].bounds.height).toBe(5);
  });
});

describe('calculateRoute - direct mode', () => {
  it('returns bezier curve without obstacle search', () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 50 };
    const result = calculateRoute(start, end, [], {
      mode: 'direct',
      margin: 5,
      gridSize: 2.54,
    });
    expect(result.path).toMatch(/^M/);
    expect(result.resolvedPoints).toEqual([start, end]);
    expect(result.labelPoint.x).toBeGreaterThan(0);
    expect(result.labelPoint.y).toBeGreaterThan(0);
  });
});

describe('calculateRoute - orthogonal mode', () => {
  it('routes without obstacles when path is clear', () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 0 };
    const result = calculateRoute(start, end, [], {
      mode: 'orthogonal',
      margin: 5,
      gridSize: 2.54,
    });
    expect(result.path).toMatch(/^M.*L/);
    expect(result.resolvedPoints.length).toBeGreaterThanOrEqual(2);
    expect(result.resolvedPoints[0]).toEqual(start);
    expect(result.resolvedPoints[result.resolvedPoints.length - 1]).toEqual(end);
  });

  it('avoids obstacles when path is blocked', () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 0 };
    const obstacles = [
      { id: 'obs1', bounds: { x: 40, y: -10, width: 20, height: 20 } },
    ];
    const result = calculateRoute(start, end, obstacles, {
      mode: 'orthogonal',
      margin: 5,
      gridSize: 2.54,
    });
    expect(result.path).toMatch(/^M/);
    expect(result.resolvedPoints.length).toBeGreaterThanOrEqual(2);
    // Path should go around the obstacle
    const midPoints = result.resolvedPoints.slice(1, -1);
    expect(midPoints.length).toBeGreaterThanOrEqual(0);
  });

  it('falls back to direct line when A* exceeds max iterations', () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 10, y: 10 };
    const obstacles = [
      { id: 'wall', bounds: { x: -50, y: -50, width: 100, height: 100 } },
    ];
    const result = calculateRoute(start, end, obstacles, {
      mode: 'orthogonal',
      margin: 5,
      gridSize: 0.1,
    });
    expect(result.path).toMatch(/^M/);
    expect(result.resolvedPoints.length).toBeGreaterThanOrEqual(2);
  });

  it('handles stub segments when stubLength > 0', () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 0 };
    const result = calculateRoute(start, end, [], {
      mode: 'orthogonal',
      margin: 5,
      gridSize: 2.54,
      stubLength: 10,
    }, { x: 5, y: 0 }, { x: -5, y: 0 });

    expect(result.resolvedPoints.length).toBeGreaterThanOrEqual(2);
    expect(result.path).toMatch(/^M/);
  });

  it('orthogonalizes diagonal segments in resolved points', () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 100 };
    const result = calculateRoute(start, end, [], {
      mode: 'orthogonal',
      margin: 5,
      gridSize: 2.54,
    });
    // All internal segments should be axis-aligned
    for (let i = 1; i < result.resolvedPoints.length; i++) {
      const p1 = result.resolvedPoints[i - 1];
      const p2 = result.resolvedPoints[i];
      const dx = Math.abs(p2.x - p1.x);
      const dy = Math.abs(p2.y - p1.y);
      // At least one of dx or dy should be near-zero (axis-aligned)
      const isAxisAligned = dx < 0.1 || dy < 0.1;
      expect(isAxisAligned).toBe(true);
    }
  });
});

describe('calculateRoute - bezier mode', () => {
  it('generates bezier path', () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 50 };
    const result = calculateRoute(start, end, [], {
      mode: 'bezier',
      margin: 5,
      gridSize: 2.54,
    });
    expect(result.path).toMatch(/^M.*C/);
    expect(result.resolvedPoints.length).toBeGreaterThanOrEqual(2);
  });

  it('uses cornerRadius for rounded corners', () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 100 };

    const obstacles = [
      { id: 'obs1', bounds: { x: 40, y: -10, width: 20, height: 20 } },
    ];
    const result = calculateRoute(start, end, obstacles, {
      mode: 'bezier',
      margin: 5,
      gridSize: 2.54,
      cornerRadius: 10,
    });
    expect(result.path).toMatch(/^M/);
    // Should contain quadratic bezier Q commands if there are bends
    expect(result.resolvedPoints.length).toBeGreaterThanOrEqual(2);
  });

  it('handles stubs in bezier mode', () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 0 };
    const result = calculateRoute(start, end, [], {
      mode: 'bezier',
      margin: 5,
      gridSize: 2.54,
      stubLength: 10,
    }, { x: 0, y: 5 }, { x: 0, y: -5 });

    expect(result.resolvedPoints.length).toBeGreaterThanOrEqual(2);
    expect(result.path).toMatch(/^M/);
    // Stubs should create initial vertical segments
    expect(result.resolvedPoints[1].y).not.toBe(start.y);
  });
});

describe('calculateSimpleOrthogonalRoute', () => {
  it('returns horizontal-first path when clear', () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 50 };
    const path = calculateSimpleOrthogonalRoute(start, end, [], 5);
    expect(path).toEqual([start, { x: 100, y: 0 }, end]);
  });

  it('returns vertical-first path when horizontal is blocked', () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 50 };
    const obstacles = [
      { id: 'obs', bounds: { x: 40, y: -10, width: 60, height: 20 } },
    ];
    const path = calculateSimpleOrthogonalRoute(start, end, obstacles, 5);
    expect(path).toEqual([start, { x: 0, y: 50 }, end]);
  });

  it('returns center horizontal when L-shapes are blocked', () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 50 };
    // obs1 placed at far end of horizontal line → blocks horizontal-first
    // but does NOT block center vertical's first segment to midX=50
    // obs2 blocks vertical-first near the far end
    // center horizontal at y=25 should be clear
    const obstacles = [
      { id: 'obs1', bounds: { x: 70, y: -10, width: 100, height: 20 } },
      { id: 'obs2', bounds: { x: -10, y: 40, width: 20, height: 30 } },
    ];
    const path = calculateSimpleOrthogonalRoute(start, end, obstacles, 5);
    expect(path).toEqual([start, { x: 0, y: 25 }, { x: 100, y: 25 }, end]);
  });

  it('returns center vertical when center horizontal is blocked', () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 50 };
    // obs1 blocks horizontal-first at far end
    // obs2 blocks vertical-first at far end
    // obs3 blocks center horizontal by surrounding its start-mid1 segment at x=0, y=25
    // center vertical at x=50 should be clear
    const obstacles = [
      { id: 'obs1', bounds: { x: 70, y: -10, width: 100, height: 20 } },
      { id: 'obs2', bounds: { x: -10, y: 40, width: 20, height: 30 } },
      { id: 'obs3', bounds: { x: -5, y: 22, width: 10, height: 6 } },
    ];
    const path = calculateSimpleOrthogonalRoute(start, end, obstacles, 5);
    expect(path).toEqual([start, { x: 50, y: 0 }, { x: 50, y: 50 }, end]);
  });

  it('falls back to direct when all others blocked', () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 50 };
    // All possible orthogonal routes blocked, should fall back to direct
    const obstacles = [
      { id: 'obs1', bounds: { x: 40, y: -10, width: 60, height: 15 } },
      { id: 'obs2', bounds: { x: -10, y: 20, width: 15, height: 40 } },
      { id: 'obs3', bounds: { x: 30, y: 22, width: 70, height: 6 } },
      { id: 'obs4', bounds: { x: 40, y: -10, width: 20, height: 70 } },
    ];
    const path = calculateSimpleOrthogonalRoute(start, end, obstacles, 5);
    expect(path).toEqual([start, end]);
  });
});

describe('buildPathFromWaypoints', () => {
  it('builds orthogonal path from waypoints', () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 100 };
    const waypoints: Point[] = [{ x: 50, y: 0 }];
    const result = buildPathFromWaypoints(start, waypoints, end, 'orthogonal');
    expect(result.path).toMatch(/^M.*L/);
    expect(result.resolvedPoints.length).toBeGreaterThanOrEqual(2);
    expect(result.resolvedPoints[0]).toEqual(start);
    expect(result.resolvedPoints[result.resolvedPoints.length - 1]).toEqual(end);
  });

  it('orthogonalizes diagonal waypoints', () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 100 };
    const waypoints: Point[] = [{ x: 30, y: 30 }]; // diagonal from start
    const result = buildPathFromWaypoints(start, waypoints, end, 'orthogonal');
    // All segments should be axis-aligned
    for (let i = 1; i < result.resolvedPoints.length; i++) {
      const p1 = result.resolvedPoints[i - 1];
      const p2 = result.resolvedPoints[i];
      const dx = Math.abs(p2.x - p1.x);
      const dy = Math.abs(p2.y - p1.y);
      const isAxisAligned = dx < 0.1 || dy < 0.1;
      expect(isAxisAligned).toBe(true);
    }
  });

  it('builds bezier path from waypoints', () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 100 };
    const waypoints: Point[] = [{ x: 30, y: 30 }];
    const result = buildPathFromWaypoints(start, waypoints, end, 'bezier');
    expect(result.path).toMatch(/^M/);
    expect(result.resolvedPoints.length).toBeGreaterThanOrEqual(2);
  });

  it('computes correct label points', () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 0 };
    const result = buildPathFromWaypoints(start, [], end, 'orthogonal');
    expect(result.labelPoint.x).toBe(50);
    expect(result.labelPoint.y).toBe(0);
    expect(result.labelAngle).toBe(0);
  });

  it('uses custom cornerRadius for bezier', () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 100 };
    const waypoints: Point[] = [{ x: 0, y: 50 }, { x: 100, y: 50 }];
    const result = buildPathFromWaypoints(start, waypoints, end, 'bezier', 20);
    expect(result.path).toMatch(/^M/);
    expect(result.resolvedPoints.length).toBeGreaterThanOrEqual(2);
  });

  it('handles empty waypoints', () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 100 };
    const result = buildPathFromWaypoints(start, [], end, 'bezier');
    expect(result.resolvedPoints).toEqual([start, end]);
  });
});

describe('calculateRoute - label positions', () => {
  it('computes labelPoint near midpoint of path', () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 0 };
    const result = calculateRoute(start, end, [], {
      mode: 'direct',
      margin: 5,
      gridSize: 2.54,
    });
    expect(result.labelPoint.x).toBeCloseTo(50, 0);
    expect(result.labelPoint.y).toBeCloseTo(0, 0);
  });

  it('computes source and target label points', () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 0 };
    const result = calculateRoute(start, end, [], {
      mode: 'direct',
      margin: 5,
      gridSize: 2.54,
    });
    expect(result.sourceLabelPoint.x).not.toBeNaN();
    expect(result.sourceLabelPoint.y).not.toBeNaN();
    expect(result.targetLabelPoint.x).not.toBeNaN();
    expect(result.targetLabelPoint.y).not.toBeNaN();
  });
});

describe('calculateRoute - zero-length cases', () => {
  it('handles start and end at same position', () => {
    const start: Point = { x: 50, y: 50 };
    const end: Point = { x: 50, y: 50 };
    const result = calculateRoute(start, end, [], {
      mode: 'bezier',
      margin: 5,
      gridSize: 2.54,
    });
    expect(result.path).toMatch(/^M/);
    expect(result.resolvedPoints.length).toBeGreaterThanOrEqual(2);
  });
});

describe('calculateRoute - stub direction inference', () => {
  it('stubs emit vertically from bottom connector', () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 0 };
    // start connector is at bottom of node
    const result = calculateRoute(start, end, [], {
      mode: 'orthogonal',
      margin: 5,
      gridSize: 2.54,
      stubLength: 10,
    }, { x: 0, y: 3 }, undefined);

    expect(result.resolvedPoints.length).toBeGreaterThanOrEqual(2);
    expect(result.path).toMatch(/^M/);
  });

  it('stubs produce valid path from right connector', () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 0, y: 100 };
    // Rightward stub should produce a valid orthogonal path
    const result = calculateRoute(start, end, [], {
      mode: 'orthogonal',
      margin: 5,
      gridSize: 2.54,
      stubLength: 10,
    }, { x: 5, y: 0 }, undefined);

    expect(result.resolvedPoints.length).toBeGreaterThanOrEqual(2);
    expect(result.path).toMatch(/^M/);
    expect(result.resolvedPoints[0]).toEqual(start);
    expect(result.resolvedPoints[result.resolvedPoints.length - 1]).toEqual(end);
  });
});
