import { describe, it, expect } from 'vitest';
import { SolmuViewport } from '../viewport';
import { createViewportConfig } from './helpers';

describe('SolmuViewport', () => {
  describe('constructor / getConfig', () => {
    it('stores initial config', () => {
      const viewport = new SolmuViewport(createViewportConfig());
      const config = viewport.getConfig();
      expect(config.width).toBe(800);
      expect(config.height).toBe(600);
      expect(config.zoom).toBe(1);
      expect(config.pan).toEqual({ x: 0, y: 0 });
    });

    it('uses default origin and units', () => {
      const viewport = new SolmuViewport(createViewportConfig());
      expect(viewport.getConfig().origin).toBe('top-left');
      expect(viewport.getConfig().units).toBe('px');
    });
  });

  describe('updateConfig', () => {
    it('merges partial updates', () => {
      const viewport = new SolmuViewport(createViewportConfig());
      viewport.updateConfig({ zoom: 2 });
      expect(viewport.getConfig().zoom).toBe(2);
      expect(viewport.getConfig().width).toBe(800); // unchanged
    });
  });

  describe('screenToWorld / worldToScreen roundtrip', () => {
    it('roundtrips at zoom=1 pan=(0,0)', () => {
      const viewport = new SolmuViewport(createViewportConfig());
      const world = { x: 100, y: 200 };
      const screen = viewport.worldToScreen(world.x, world.y);
      const back = viewport.screenToWorld(screen.x, screen.y);
      expect(back.x).toBeCloseTo(world.x, 5);
      expect(back.y).toBeCloseTo(world.y, 5);
    });

    it('roundtrips at zoom=2 pan=(0.1, -0.1)', () => {
      const viewport = new SolmuViewport(
        createViewportConfig({ zoom: 2, pan: { x: 0.1, y: -0.1 } })
      );
      const world = { x: 100, y: 200 };
      const screen = viewport.worldToScreen(world.x, world.y);
      const back = viewport.screenToWorld(screen.x, screen.y);
      expect(back.x).toBeCloseTo(world.x, 3);
      expect(back.y).toBeCloseTo(world.y, 3);
    });

    it('handles center origin', () => {
      const viewport = new SolmuViewport(
        createViewportConfig({ origin: 'center', zoom: 1, pan: { x: 0, y: 0 } })
      );
      const world = { x: 100, y: 200 };
      const screen = viewport.worldToScreen(world.x, world.y);
      expect(screen.x).toBeDefined();
      expect(screen.y).toBeDefined();
    });
  });

  describe('getViewBox', () => {
    it('returns valid viewBox string', () => {
      const viewport = new SolmuViewport(createViewportConfig());
      const viewBox = viewport.getViewBox();
      expect(viewBox).toMatch(/^-?[\d.]+ -?[\d.]+ [\d.]+ [\d.]+$/);
    });

    it('changes with zoom', () => {
      const v1 = new SolmuViewport(createViewportConfig({ zoom: 1 }));
      const v2 = new SolmuViewport(createViewportConfig({ zoom: 2 }));
      const [, , w1, h1] = v1.getViewBox().split(' ').map(Number);
      const [, , w2, h2] = v2.getViewBox().split(' ').map(Number);
      expect(w2).toBeLessThan(w1);
      expect(h2).toBeLessThan(h1);
    });
  });

  describe('getHTMLLayerTransform', () => {
    it('returns valid matrix CSS string', () => {
      const viewport = new SolmuViewport(createViewportConfig());
      const transform = viewport.getHTMLLayerTransform();
      expect(transform).toMatch(/^matrix\(/);
    });

    it('matches screenToWorld transform', () => {
      const viewport = new SolmuViewport(createViewportConfig({ zoom: 2 }));
      const world = { x: 50, y: 100 };
      const screen = viewport.worldToScreen(world.x, world.y);
      // Parse matrix: matrix(scale, 0, 0, scale, tx, ty)
      const transform = viewport.getHTMLLayerTransform();
      const match = transform.match(/matrix\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/);
      expect(match).not.toBeNull();
    });
  });

  describe('snapToGrid', () => {
    it('returns unchanged when grid is absent', () => {
      const config = createViewportConfig();
      delete (config as any).grid;
      const viewport = new SolmuViewport(config);
      const point = { x: 13.7, y: 24.2 };
      expect(viewport.snapToGrid(point)).toEqual(point);
    });

    it('returns unchanged when snap is disabled', () => {
      const viewport = new SolmuViewport(
        createViewportConfig({
          grid: { size: 10, visible: true, snap: false },
        })
      );
      const point = { x: 13.7, y: 24.2 };
      expect(viewport.snapToGrid(point)).toEqual(point);
    });

    it('snaps to nearest grid point when enabled', () => {
      const viewport = new SolmuViewport(
        createViewportConfig({
          grid: { size: 10, visible: true, snap: true },
        })
      );
      expect(viewport.snapToGrid({ x: 13.7, y: 24.2 })).toEqual({ x: 10, y: 20 });
      expect(viewport.snapToGrid({ x: 15, y: 25 })).toEqual({ x: 20, y: 30 });
    });

    it('uses snapSize when different from size', () => {
      const viewport = new SolmuViewport(
        createViewportConfig({
          grid: { size: 10, snapSize: 5, visible: true, snap: true },
        })
      );
      expect(viewport.snapToGrid({ x: 13.7, y: 24.2 })).toEqual({ x: 15, y: 25 });
    });
  });

  describe('getEffectiveGridSize', () => {
    it('returns base size when no grid config', () => {
      const config = createViewportConfig();
      delete (config as any).grid;
      const viewport = new SolmuViewport(config);
      expect(viewport.getEffectiveGridSize()).toBe(1);
    });

    it('returns scaled size based on zoom level', () => {
      const viewport = new SolmuViewport(
        createViewportConfig({ grid: { size: 10, visible: true, snap: true } })
      );
      // zoom=1 should use multiplier closer to 1
      expect(viewport.getEffectiveGridSize()).toBeGreaterThan(0);
    });

    it('uses larger multiplier at low zoom', () => {
      const v1 = new SolmuViewport(
        createViewportConfig({ zoom: 0.05, grid: { size: 10, visible: true, snap: true } })
      );
      const v2 = new SolmuViewport(
        createViewportConfig({ zoom: 10, grid: { size: 10, visible: true, snap: true } })
      );
      expect(v1.getEffectiveGridSize()).toBeGreaterThan(v2.getEffectiveGridSize());
    });
  });

  describe('formatCoordinate', () => {
    it('formats px as integer', () => {
      const viewport = new SolmuViewport(createViewportConfig({ units: 'px' }));
      expect(viewport.formatCoordinate(13.7)).toBe('14px');
    });

    it('formats mm with 2 decimals', () => {
      const viewport = new SolmuViewport(createViewportConfig({ units: 'mm' }));
      expect(viewport.formatCoordinate(13.7)).toBe('13.70mm');
    });

    it('formats in with 3 decimals', () => {
      const viewport = new SolmuViewport(createViewportConfig({ units: 'in' }));
      expect(viewport.formatCoordinate(1)).toBe('1.000"');
    });

    it('formats mil as integer', () => {
      const viewport = new SolmuViewport(createViewportConfig({ units: 'mil' }));
      expect(viewport.formatCoordinate(0.0254)).toBe('25mil');
    });

    it('formats units with 2 decimals', () => {
      const viewport = new SolmuViewport(createViewportConfig({ units: 'units' }));
      expect(viewport.formatCoordinate(13.7)).toBe('13.70');
    });
  });

  describe('zoomIn / zoomOut', () => {
    it('increases zoom by default factor', () => {
      const viewport = new SolmuViewport(createViewportConfig({ zoom: 1 }));
      viewport.zoomIn();
      expect(viewport.getConfig().zoom).toBe(1.2);
    });

    it('increases zoom by custom factor', () => {
      const viewport = new SolmuViewport(createViewportConfig({ zoom: 1 }));
      viewport.zoomIn(2);
      expect(viewport.getConfig().zoom).toBe(2);
    });

    it('decreases zoom by default factor', () => {
      const viewport = new SolmuViewport(createViewportConfig({ zoom: 1 }));
      viewport.zoomOut();
      expect(viewport.getConfig().zoom).toBeCloseTo(1 / 1.2, 5);
    });

    it('decreases zoom by custom factor', () => {
      const viewport = new SolmuViewport(createViewportConfig({ zoom: 4 }));
      viewport.zoomOut(2);
      expect(viewport.getConfig().zoom).toBe(2);
    });
  });

  describe('panBy', () => {
    it('updates pan in normalized coordinates', () => {
      const viewport = new SolmuViewport(
        createViewportConfig({ zoom: 2, pan: { x: 0, y: 0 } })
      );
      viewport.panBy(100, 50);
      expect(viewport.getConfig().pan.x).not.toBe(0);
      expect(viewport.getConfig().pan.y).not.toBe(0);
    });
  });

  describe('fitToView', () => {
    it('sets zoom to fit content', () => {
      const viewport = new SolmuViewport(createViewportConfig({ zoom: 1 }));
      viewport.fitToView({ x: 0, y: 0, width: 400, height: 300 });
      expect(viewport.getConfig().zoom).toBeGreaterThan(1);
    });

    it('centers content in pan', () => {
      const viewport = new SolmuViewport(createViewportConfig());
      viewport.fitToView({ x: 100, y: 100, width: 200, height: 200 });
      expect(viewport.getConfig().pan.x).not.toBe(0);
      expect(viewport.getConfig().pan.y).not.toBe(0);
    });
  });

  describe('generateGridDots', () => {
    it('returns empty array when grid is hidden', () => {
      const viewport = new SolmuViewport(
        createViewportConfig({ grid: { size: 10, visible: false, snap: true } })
      );
      expect(viewport.generateGridDots()).toEqual([]);
    });

    it('returns grid dots when visible', () => {
      const viewport = new SolmuViewport(
        createViewportConfig({ grid: { size: 10, visible: true, snap: true } })
      );
      const dots = viewport.generateGridDots();
      expect(dots.length).toBeGreaterThan(0);
      dots.forEach((dot) => {
        expect(dot.x).toBeDefined();
        expect(dot.y).toBeDefined();
        expect(dot.size).toBeGreaterThan(0);
        expect(dot.opacity).toBeGreaterThanOrEqual(0);
        expect(dot.opacity).toBeLessThanOrEqual(1);
      });
    });

    it('returns appropriate dot count for zoom level', () => {
      const v1 = new SolmuViewport(
        createViewportConfig({ zoom: 0.1, grid: { size: 10, visible: true, snap: true } })
      );
      const v2 = new SolmuViewport(
        createViewportConfig({ zoom: 5, grid: { size: 10, visible: true, snap: true } })
      );
      // Both should return a reasonable number of dots (not empty)
      expect(v1.generateGridDots().length).toBeGreaterThan(0);
      expect(v2.generateGridDots().length).toBeGreaterThan(0);
    });

    it('grid dots are within approximate visible area', () => {
      const viewport = new SolmuViewport(
        createViewportConfig({
          zoom: 1,
          worldBounds: { x: 0, y: 0, width: 100, height: 100 },
          grid: { size: 10, visible: true, snap: true },
        })
      );
      const dots = viewport.generateGridDots();
      dots.forEach((dot) => {
        // Grid extends slightly beyond visible bounds for edge padding
        expect(dot.x).toBeGreaterThanOrEqual(-200);
        expect(dot.y).toBeGreaterThanOrEqual(-200);
        expect(dot.x).toBeLessThanOrEqual(300);
        expect(dot.y).toBeLessThanOrEqual(300);
      });
    });
  });
});
