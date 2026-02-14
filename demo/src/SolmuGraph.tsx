import React from "react";
import { useSolmu, SolmuCanvas } from "../../src";
import type { Edge } from "../../src/types";

function Box(props: any) {
  return (
    <rect
      {...props}
      transform="translate(-7.5, -2.5)"
      fill="#efefef"
      stroke="#dedede"
      rx={1}
      ry={1}
      strokeWidth={0.2}
      width={15} // 15mm wide (was 150px)
      height={5}  // 5mm high (was 50px)
    />
  );
}

function Diamond(props: any) {
  return (
    <rect
      {...props}
      transform="rotate(45) translate(-5, -5)" // Adjust for new size
      fill="#efefef"
      stroke="#dedede"
      rx={0.5}
      ry={0.5}
      strokeWidth={0.2}
      width={10}  // 10mm wide (was 100px)
      height={10} // 10mm high (was 100px)
    >
      <title>Test</title>
    </rect>
  );
}

export default function App() {
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });
  const [viewportConfig, setViewportConfig] = React.useState({
    origin: 'bottom-left' as const,
    units: 'mm' as const,
    width: window.innerWidth,
    height: window.innerHeight,
    worldBounds: { x: -200, y: -200, width: 400, height: 400 },
    zoom: 1,
    pan: { x: 0, y: 0 },
    grid: {
      size: 2.54, // 0.1 inch in mm
      visible: true,
      snap: true,
    },
  });
  const [routingMode, setRoutingMode] = React.useState<'orthogonal' | 'bezier' | 'direct'>('orthogonal');

  const [data, setData] = React.useState({
    nodes: [
      {
        id: "resistor1",
        x: 0, // Start position
        y: 30,
        type: "box",
        connectors: [
          {
            id: "resistor1-pin1",
            x: -7.5,
            y: 0,
          },
          {
            id: "resistor1-pin2",
            x: 7.5,
            y: 0,
          },
        ],
      },
      {
        id: "capacitor1",
        x: 60, // End position
        y: 30,
        type: "box",
        connectors: [
          {
            id: "capacitor1-pin1",
            x: -7.5,
            y: 0,
          },
          {
            id: "capacitor1-pin2",
            x: 7.5,
            y: 0,
          },
        ],
      },
      {
        id: "obstacle1",
        x: 30, // Obstacle in the middle
        y: 30,
        type: "box",
        connectors: [
          {
            id: "obstacle1-pin1",
            x: 0,
            y: 2.5,
          },
        ],
      },
      {
        id: "ic1",
        x: 30, // Another component
        y: 60,
        type: "diamond",
        connectors: [
          {
            id: "ic1-pin1",
            x: -7,
            y: 0,
          },
          {
            id: "ic1-pin2",
            x: 7,
            y: 0,
          },
        ],
      },
      {
        id: "resistor2",
        x: -30,
        y: 0,
        type: "box",
        connectors: [
          {
            id: "resistor2-pin1",
            x: -7.5,
            y: 0,
          },
          {
            id: "resistor2-pin2",
            x: 7.5,
            y: 0,
          },
        ],
      },
    ],
    edges: [
      // This edge should route AROUND obstacle1
      {
        source: {
          node: "resistor1",
          connector: "resistor1-pin2",
        },
        target: {
          node: "capacitor1",
          connector: "capacitor1-pin1",
        },
        type: "orthogonal",
      } as Edge,
      // Edge to IC
      {
        source: {
          node: "resistor1",
          connector: "resistor1-pin1",
        },
        target: {
          node: "ic1",
          connector: "ic1-pin1",
        },
        type: "bezier",
      } as Edge,
      // Direct line for comparison
      {
        source: {
          node: "resistor2",
          connector: "resistor2-pin2",
        },
        target: {
          node: "obstacle1",
          connector: "obstacle1-pin1",
        },
        type: "direct",
      } as Edge,
    ],
  });

  function onConnect(
    start: { node: string; connector: string },
    end: { node: string; connector: string }
  ) {
    setData((data) => {
      const edges = [
        ...data.edges,
        {
          source: start,
          target: end,
          type: routingMode,
        } as Edge,
      ];

      return { ...data, edges };
    });
  }

  function onNodeMove(node: string, x: number, y: number) {
    setData((data) => {
      const nodes = data.nodes.map((d) => {
        if (d.id !== node) return d;

        return {
          ...d,
          x,
          y,
        };
      });
      return {
        ...data,
        nodes,
      };
    });
  }

  const config = {
    renderers: [
      {
        type: "box",
        component: Box,
      },
      {
        type: "diamond",
        component: Diamond,
      },
    ],
    viewport: viewportConfig,
    routing: {
      mode: routingMode,
      avoidNodes: true,
      margin: 3,
      gridSize: 2.54,
      cornerRadius: 3,
    },
  };

  console.log(viewportConfig);
  const { canvas, elements } = useSolmu({
    data,
    config,
    onNodeMove,
    onConnect,
  });

  // Add zoom and pan functionality
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setViewportConfig(prev => ({
      ...prev,
      zoom: Math.max(0.1, Math.min(10, prev.zoom * zoomFactor))
    }));
  };

  const [isPanning, setIsPanning] = React.useState(false);
  const [lastPanPos, setLastPanPos] = React.useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) { // Middle mouse or Ctrl+left mouse
      e.preventDefault();
      setIsPanning(true);
      setLastPanPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Update mouse position for coordinate display
    if (canvas.viewport) {
      const svg = e.currentTarget.querySelector('svg');
      if (svg) {
        const rect = svg.getBoundingClientRect();
        const worldPos = canvas.viewport.screenToWorld(
          e.clientX - rect.left, 
          e.clientY - rect.top
        );
        setMousePos(worldPos);
      }
    }

    // Handle panning
    if (isPanning) {
      e.preventDefault();
      const deltaX = e.clientX - lastPanPos.x;
      const deltaY = e.clientY - lastPanPos.y;
      
      // The key insight: normalize to screen percentage, then apply zoom
      // At zoom 1x: moving 100px on a 800px screen = 12.5% of view
      // At zoom 2x: same movement should be 6.25% of view (half as much panning)
      const normalizedDeltaX = deltaX / viewportConfig.width / viewportConfig.zoom;
      const normalizedDeltaY = deltaY / viewportConfig.height / viewportConfig.zoom;
      
      setViewportConfig(prev => ({
        ...prev,
        pan: {
          x: prev.pan.x - normalizedDeltaX,
          y: prev.pan.y - normalizedDeltaY,
        }
      }));
      
      setLastPanPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Global mouse up handler to stop panning even when mouse leaves canvas
  React.useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsPanning(false);
    };
    
    if (isPanning) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('mouseleave', handleGlobalMouseUp);
      return () => {
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        document.removeEventListener('mouseleave', handleGlobalMouseUp);
      };
    }
  }, [isPanning]);

  // Handle window resize
  React.useEffect(() => {
    const handleResize = () => {
      setViewportConfig(prev => ({
        ...prev,
        width: window.innerWidth,
        height: window.innerHeight,
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div 
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      {/* Coordinate display */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        background: 'rgba(255,255,255,0.95)',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '13px',
        fontFamily: 'monospace',
        zIndex: 1000,
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        border: '1px solid #e0e0e0',
      }}>
        <div><strong>Solmu Routing Demo</strong></div>
        <div>Zoom: {viewportConfig.zoom.toFixed(1)}x</div>
        <div>Mouse: {canvas.viewport?.formatCoordinate(mousePos.x)}, {canvas.viewport?.formatCoordinate(mousePos.y)}</div>
        <hr style={{ margin: '8px 0' }} />
        <div style={{ marginBottom: '8px' }}><strong>Routing Mode:</strong></div>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
          <button
            onClick={() => setRoutingMode('orthogonal')}
            style={{
              padding: '4px 8px',
              background: routingMode === 'orthogonal' ? '#4CAF50' : '#ddd',
              color: routingMode === 'orthogonal' ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            90°
          </button>
          <button
            onClick={() => setRoutingMode('bezier')}
            style={{
              padding: '4px 8px',
              background: routingMode === 'bezier' ? '#2196F3' : '#ddd',
              color: routingMode === 'bezier' ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Bezier
          </button>
          <button
            onClick={() => setRoutingMode('direct')}
            style={{
              padding: '4px 8px',
              background: routingMode === 'direct' ? '#FF9800' : '#ddd',
              color: routingMode === 'direct' ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Direct
          </button>
        </div>
        <hr style={{ margin: '8px 0' }} />
        <div><small>Scroll: Zoom</small></div>
        <div><small>Middle/Ctrl+Drag: Pan</small></div>
        <div><small>Drag nodes to move</small></div>
      </div>
      
      {/* Canvas container with zoom/pan */}
      <div
        style={{ 
          width: "100%", 
          height: "100%",
          overflow: "hidden", // Prevent scrollbars
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <SolmuCanvas 
          canvas={canvas} 
          elements={elements}
          style={{ 
            cursor: isPanning ? 'grabbing' : 'default',
            width: "100%",
            height: "100%",
          }}
        />
      </div>
    </div>
  );
}
