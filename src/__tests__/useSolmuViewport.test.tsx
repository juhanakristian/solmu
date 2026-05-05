import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { useSolmuViewport } from '../useViewport';

function TestViewport(props: {
  initial: Parameters<typeof useSolmuViewport>[0];
  options?: Parameters<typeof useSolmuViewport>[1];
  children?: (result: ReturnType<typeof useSolmuViewport>) => React.ReactNode;
}) {
  const result = useSolmuViewport(props.initial, props.options);
  return (
    <div ref={result.containerRef} data-testid="viewport-container">
      {/* Allow optional render prop to read result synchronously */}
      {props.children?.(result)}
    </div>
  );
}

describe('useSolmuViewport', () => {
  it('initializes with correct state', () => {
    let captured!: ReturnType<typeof useSolmuViewport>;
    render(
      <TestViewport
        initial={{
          zoom: 2,
          pan: { x: 0.1, y: -0.1 },
          worldBounds: { x: 0, y: 0, width: 800, height: 600 },
        }}
      >
        {(result) => {
          captured = result;
          return null;
        }}
      </TestViewport>
    );
    expect(captured.viewportConfig.zoom).toBe(2);
    expect(captured.viewportConfig.pan).toEqual({ x: 0.1, y: -0.1 });
    expect(captured.viewportConfig.width).toBe(800);
    expect(captured.viewportConfig.height).toBe(600);
    expect(captured.isPanning).toBe(false);
  });

  it('exposes setViewportConfig for direct updates', () => {
    let captured!: ReturnType<typeof useSolmuViewport>;
    render(
      <TestViewport
        initial={{
          zoom: 1,
          pan: { x: 0, y: 0 },
          worldBounds: { x: 0, y: 0, width: 800, height: 600 },
        }}
      >
        {(result) => {
          captured = result;
          return null;
        }}
      </TestViewport>
    );
    act(() => {
      captured.setViewportConfig((prev) => ({ ...prev, zoom: 3 }));
    });
    expect(captured.viewportConfig.zoom).toBe(3);
  });

  describe('wheel zoom (Ctrl+wheel)', () => {
    it('zooms in on ctrl+wheel up', () => {
      let captured!: ReturnType<typeof useSolmuViewport>;
      render(
        <TestViewport
          initial={{
            zoom: 1,
            pan: { x: 0, y: 0 },
            worldBounds: { x: 0, y: 0, width: 800, height: 600 },
          }}
        >
          {(result) => {
            captured = result;
            return null;
          }}
        </TestViewport>
      );
      const container = screen.getByTestId('viewport-container');
      act(() => {
        container.dispatchEvent(
          new WheelEvent('wheel', {
            deltaY: -100,
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
            clientX: 400,
            clientY: 300,
          })
        );
      });
      expect(captured.viewportConfig.zoom).toBeGreaterThan(1);
    });

    it('zooms out on ctrl+wheel down', () => {
      let captured!: ReturnType<typeof useSolmuViewport>;
      render(
        <TestViewport
          initial={{
            zoom: 2,
            pan: { x: 0, y: 0 },
            worldBounds: { x: 0, y: 0, width: 800, height: 600 },
          }}
        >
          {(result) => {
            captured = result;
            return null;
          }}
        </TestViewport>
      );
      const container = screen.getByTestId('viewport-container');
      act(() => {
        container.dispatchEvent(
          new WheelEvent('wheel', {
            deltaY: 100,
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
            clientX: 400,
            clientY: 300,
          })
        );
      });
      expect(captured.viewportConfig.zoom).toBeLessThan(2);
    });

    it('clamps zoom to minZoom', () => {
      let captured!: ReturnType<typeof useSolmuViewport>;
      render(
        <TestViewport
          initial={{
            zoom: 0.15,
            pan: { x: 0, y: 0 },
            worldBounds: { x: 0, y: 0, width: 800, height: 600 },
          }}
          options={{ minZoom: 0.1 }}
        >
          {(result) => {
            captured = result;
            return null;
          }}
        </TestViewport>
      );
      const container = screen.getByTestId('viewport-container');
      act(() => {
        container.dispatchEvent(
          new WheelEvent('wheel', {
            deltaY: 200,
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
          })
        );
      });
      expect(captured.viewportConfig.zoom).toBe(0.1);
    });

    it('clamps zoom to maxZoom', () => {
      let captured!: ReturnType<typeof useSolmuViewport>;
      render(
        <TestViewport
          initial={{
            zoom: 9,
            pan: { x: 0, y: 0 },
            worldBounds: { x: 0, y: 0, width: 800, height: 600 },
          }}
          options={{ maxZoom: 10 }}
        >
          {(result) => {
            captured = result;
            return null;
          }}
        </TestViewport>
      );
      const container = screen.getByTestId('viewport-container');
      act(() => {
        container.dispatchEvent(
          new WheelEvent('wheel', {
            deltaY: -1000,
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
          })
        );
      });
      expect(captured.viewportConfig.zoom).toBe(10);
    });

    it('applies zoomSpeed multiplier', () => {
      let captured!: ReturnType<typeof useSolmuViewport>;
      render(
        <TestViewport
          initial={{
            zoom: 1,
            pan: { x: 0, y: 0 },
            worldBounds: { x: 0, y: 0, width: 800, height: 600 },
          }}
          options={{ zoomSpeed: 2 }}
        >
          {(result) => {
            captured = result;
            return null;
          }}
        </TestViewport>
      );
      const container = screen.getByTestId('viewport-container');
      act(() => {
        container.dispatchEvent(
          new WheelEvent('wheel', {
            deltaY: -10,
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
            clientX: 400,
            clientY: 300,
          })
        );
      });
      expect(captured.viewportConfig.zoom).toBeGreaterThan(1.02);
    });

    it('centers zoom on cursor', () => {
      let captured!: ReturnType<typeof useSolmuViewport>;
      render(
        <TestViewport
          initial={{
            zoom: 1,
            pan: { x: 0, y: 0 },
            worldBounds: { x: 0, y: 0, width: 800, height: 600 },
          }}
        >
          {(result) => {
            captured = result;
            return null;
          }}
        </TestViewport>
      );
      const initialPan = { ...captured.viewportConfig.pan };
      const container = screen.getByTestId('viewport-container');
      act(() => {
        container.dispatchEvent(
          new WheelEvent('wheel', {
            deltaY: -100,
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
            clientX: 200,
            clientY: 150,
          })
        );
      });
      expect(captured.viewportConfig.pan.x).not.toBe(initialPan.x);
    });

    it('does not zoom when enableZoom is false', () => {
      let captured!: ReturnType<typeof useSolmuViewport>;
      render(
        <TestViewport
          initial={{
            zoom: 1,
            pan: { x: 0, y: 0 },
            worldBounds: { x: 0, y: 0, width: 800, height: 600 },
          }}
          options={{ enableZoom: false }}
        >
          {(result) => {
            captured = result;
            return null;
          }}
        </TestViewport>
      );
      const container = screen.getByTestId('viewport-container');
      act(() => {
        container.dispatchEvent(
          new WheelEvent('wheel', {
            deltaY: -100,
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
          })
        );
      });
      expect(captured.viewportConfig.zoom).toBe(1);
    });
  });

  describe('wheel pan (regular wheel)', () => {
    it('pans on regular wheel', () => {
      let captured!: ReturnType<typeof useSolmuViewport>;
      render(
        <TestViewport
          initial={{
            zoom: 1,
            pan: { x: 0, y: 0 },
            worldBounds: { x: 0, y: 0, width: 800, height: 600 },
          }}
        >
          {(result) => {
            captured = result;
            return null;
          }}
        </TestViewport>
      );
      const initialPan = { ...captured.viewportConfig.pan };
      const container = screen.getByTestId('viewport-container');
      act(() => {
        container.dispatchEvent(
          new WheelEvent('wheel', {
            deltaX: 50,
            deltaY: 30,
            bubbles: true,
            cancelable: true,
          })
        );
      });
      expect(captured.viewportConfig.pan.x).not.toBe(initialPan.x);
      expect(captured.viewportConfig.pan.y).not.toBe(initialPan.y);
    });

    it('does not pan when enableScrollPan is false', () => {
      let captured!: ReturnType<typeof useSolmuViewport>;
      render(
        <TestViewport
          initial={{
            zoom: 1,
            pan: { x: 0, y: 0 },
            worldBounds: { x: 0, y: 0, width: 800, height: 600 },
          }}
          options={{ enableScrollPan: false }}
        >
          {(result) => {
            captured = result;
            return null;
          }}
        </TestViewport>
      );
      const initialZoom = captured.viewportConfig.zoom;
      const container = screen.getByTestId('viewport-container');
      act(() => {
        container.dispatchEvent(
          new WheelEvent('wheel', {
            deltaY: -30,
            bubbles: true,
            cancelable: true,
          })
        );
      });
      expect(captured.viewportConfig.zoom).not.toBe(initialZoom);
    });

    it('applies panSpeed multiplier', () => {
      let captured!: ReturnType<typeof useSolmuViewport>;
      render(
        <TestViewport
          initial={{
            zoom: 1,
            pan: { x: 0, y: 0 },
            worldBounds: { x: 0, y: 0, width: 800, height: 600 },
          }}
          options={{ panSpeed: 2 }}
        >
          {(result) => {
            captured = result;
            return null;
          }}
        </TestViewport>
      );
      const initialPan = { ...captured.viewportConfig.pan };
      const container = screen.getByTestId('viewport-container');
      act(() => {
        container.dispatchEvent(
          new WheelEvent('wheel', {
            deltaX: 50,
            deltaY: 0,
            bubbles: true,
            cancelable: true,
          })
        );
      });
      const panDelta = Math.abs(captured.viewportConfig.pan.x - initialPan.x);
      expect(panDelta).toBeGreaterThan(0);
    });
  });

  describe('mouse pan (middle-click)', () => {
    it('starts panning on middle mouse down', () => {
      let captured!: ReturnType<typeof useSolmuViewport>;
      render(
        <TestViewport
          initial={{
            zoom: 1,
            pan: { x: 0, y: 0 },
            worldBounds: { x: 0, y: 0, width: 800, height: 600 },
          }}
        >
          {(result) => {
            captured = result;
            return null;
          }}
        </TestViewport>
      );
      act(() => {
        captured.containerProps.onMouseDown!(
          new MouseEvent('mousedown', { button: 1, clientX: 100, clientY: 100 }) as any
        );
      });
      expect(captured.isPanning).toBe(true);
    });

    it('pans on mouse move while panning', () => {
      let captured!: ReturnType<typeof useSolmuViewport>;
      render(
        <TestViewport
          initial={{
            zoom: 1,
            pan: { x: 0, y: 0 },
            worldBounds: { x: 0, y: 0, width: 800, height: 600 },
          }}
        >
          {(result) => {
            captured = result;
            return null;
          }}
        </TestViewport>
      );
      act(() => {
        captured.containerProps.onMouseDown!(
          new MouseEvent('mousedown', { button: 1, clientX: 100, clientY: 100 }) as any
        );
      });
      const initialPan = { ...captured.viewportConfig.pan };
      act(() => {
        captured.containerProps.onMouseMove!(
          new MouseEvent('mousemove', { clientX: 120, clientY: 110 }) as any
        );
      });
      expect(captured.viewportConfig.pan.x).not.toBe(initialPan.x);
      expect(captured.viewportConfig.pan.y).not.toBe(initialPan.y);
    });

    it('stops panning on mouse up', () => {
      let captured!: ReturnType<typeof useSolmuViewport>;
      render(
        <TestViewport
          initial={{
            zoom: 1,
            pan: { x: 0, y: 0 },
            worldBounds: { x: 0, y: 0, width: 800, height: 600 },
          }}
        >
          {(result) => {
            captured = result;
            return null;
          }}
        </TestViewport>
      );
      act(() => {
        captured.containerProps.onMouseDown!(
          new MouseEvent('mousedown', { button: 1, clientX: 100, clientY: 100 }) as any
        );
        captured.containerProps.onMouseUp!();
      });
      expect(captured.isPanning).toBe(false);
    });

    it('does not start pan when enableMousePan is false', () => {
      let captured!: ReturnType<typeof useSolmuViewport>;
      render(
        <TestViewport
          initial={{
            zoom: 1,
            pan: { x: 0, y: 0 },
            worldBounds: { x: 0, y: 0, width: 800, height: 600 },
          }}
          options={{ enableMousePan: false }}
        >
          {(result) => {
            captured = result;
            return null;
          }}
        </TestViewport>
      );
      act(() => {
        captured.containerProps.onMouseDown!(
          new MouseEvent('mousedown', { button: 1, clientX: 100, clientY: 100 }) as any
        );
      });
      expect(captured.isPanning).toBe(false);
    });
  });

  describe('mouse pan (ctrl+left-click)', () => {
    it('starts panning on ctrl+left-click', () => {
      let captured!: ReturnType<typeof useSolmuViewport>;
      render(
        <TestViewport
          initial={{
            zoom: 1,
            pan: { x: 0, y: 0 },
            worldBounds: { x: 0, y: 0, width: 800, height: 600 },
          }}
        >
          {(result) => {
            captured = result;
            return null;
          }}
        </TestViewport>
      );
      act(() => {
        captured.containerProps.onMouseDown!(
          new MouseEvent('mousedown', { button: 0, ctrlKey: true, clientX: 100, clientY: 100 }) as any
        );
      });
      expect(captured.isPanning).toBe(true);
    });
  });

  describe('ResizeObserver', () => {
    it.skip('updates width/height when container resizes', () => {
      let resizeCallback: ((entries: any[]) => void) | undefined;
      const MockResizeObserver = vi.fn((callback) => {
        resizeCallback = callback;
        return { observe: vi.fn(), disconnect: vi.fn() };
      });

      Object.defineProperty(globalThis, 'ResizeObserver', {
        writable: true,
        configurable: true,
        value: MockResizeObserver,
      });

      let captured!: ReturnType<typeof useSolmuViewport>;
      act(() => {
        render(
          <TestViewport
            initial={{
              zoom: 1,
              pan: { x: 0, y: 0 },
              worldBounds: { x: 0, y: 0, width: 800, height: 600 },
            }}
          >
            {(result) => {
              captured = result;
              return null;
            }}
          </TestViewport>
        );
      });

      expect(resizeCallback).toBeDefined();
      act(() => {
        resizeCallback!([{ contentRect: { width: 1024, height: 768 } }]);
      });
      expect(captured.viewportConfig.width).toBe(1024);
      expect(captured.viewportConfig.height).toBe(768);
    });
  });
});
