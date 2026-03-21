import React from "react";
import { SolmuNodeConnector, UseSolmuParams, UseSolmuResult, EdgeSegment } from "./types";
import { SolmuViewport } from "./viewport";
import { calculateRoute, buildPathFromWaypoints, getNodeBounds, type InternalRoutingConfig, type NodeBounds, type Point } from "./routing";

/**
 * Compute edge segments from resolved waypoints for hit testing and dragging.
 * Inner segments (not touching start/end connector points) are draggable.
 */
function computeSegments(resolvedPoints: Point[]): EdgeSegment[] {
  if (resolvedPoints.length < 2) return [];

  const segments: EdgeSegment[] = [];
  const waypointCount = resolvedPoints.length - 2; // exclude start and end

  for (let i = 0; i < resolvedPoints.length - 1; i++) {
    const p1 = resolvedPoints[i];
    const p2 = resolvedPoints[i + 1];

    const dx = Math.abs(p2.x - p1.x);
    const dy = Math.abs(p2.y - p1.y);

    let orientation: "horizontal" | "vertical" | "diagonal";
    if (dy < 0.01 && dx >= 0.01) {
      orientation = "horizontal";
    } else if (dx < 0.01 && dy >= 0.01) {
      orientation = "vertical";
    } else {
      orientation = "diagonal";
    }

    // A segment is draggable if at least one endpoint is a user waypoint
    // (not a connector start/end point) and it's axis-aligned.
    // resolvedPoints[0] = start (connector), resolvedPoints[last] = end (connector).
    // Index i is a waypoint when 1 <= i <= resolvedPoints.length - 2.
    // Index i+1 is a waypoint when 0 <= i <= resolvedPoints.length - 3.
    // At least one waypoint endpoint: i >= 1 OR i <= resolvedPoints.length - 3.
    // When dragging, the drag handler's bounds checks ensure only waypoint
    // endpoints move — connector endpoints stay fixed.
    const hasWaypointEndpoint = (i >= 1) || (i + 1 <= resolvedPoints.length - 2);
    const draggable = hasWaypointEndpoint && orientation !== "diagonal";

    segments.push({ index: i, p1, p2, orientation, draggable });
  }

  return segments;
}

export function useSolmu({
  data,
  onNodeMove,
  onConnect,
  onNodeClick,
  onEdgeClick,
  onEdgePathChange,
  onSelectionChange,
  config,
}: UseSolmuParams): UseSolmuResult {
  // Create viewport instance with default or provided config
  const viewport = React.useMemo(() => {
    const viewportConfig = config.viewport || {};
    return new SolmuViewport({
      origin: viewportConfig.origin || 'top-left',
      units: viewportConfig.units || 'px',
      width: viewportConfig.width || 800,
      height: viewportConfig.height || 600,
      worldBounds: viewportConfig.worldBounds || { x: 0, y: 0, width: 800, height: 600 },
      zoom: viewportConfig.zoom || 1,
      pan: viewportConfig.pan || { x: 0, y: 0 },
      grid: viewportConfig.grid,
    });
  }, [config.viewport]);
  const [dragItem, setDragItem] = React.useState<string | null>(null);

  // Multi-selection state
  const [selectedNodeIds, setSelectedNodeIds] = React.useState<Set<string>>(new Set());
  const [selectedEdgeIds, setSelectedEdgeIds] = React.useState<Set<string>>(new Set());

  // Marquee (rubber-band) selection state
  const [marquee, setMarquee] = React.useState<{
    startWorld: Point;
    currentWorld: Point;
    active: boolean;
  } | null>(null);

  // Edge segment dragging state
  const [dragSegment, setDragSegment] = React.useState<{
    edgeId: string;
    segmentIndex: number;
    orientation: "horizontal" | "vertical";
    initialWaypoints: Point[];  // waypoints (without start/end) at drag start
    initialMouseWorld: Point;   // mouse world position at drag start
  } | null>(null);


  const [dragConnector, setDragConnector] =
    React.useState<null | SolmuNodeConnector>(null);
  const [hoverConnector, setHoverConnector] =
    React.useState<null | SolmuNodeConnector>(null);
  const [dragLine, setDragLine] = React.useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    cx1: number;
    cy1: number;
    cx2: number;
    cy2: number;
  } | null>(null);

  function onMouseDown(event: React.MouseEvent, id: string) {
    setDragItem(id);
    handleNodeClick(id, event.shiftKey);
  }

  function onMouseUp(_event: React.MouseEvent) {
    if (dragItem) setDragItem(null);
    if (dragSegment) setDragSegment(null);
    // Finish marquee selection
    if (marquee) {
      if (marquee.active) {
        const rect = marqueeRect(marquee.startWorld, marquee.currentWorld);
        const nodesInRect = data.nodes.filter((node) =>
          node.x >= rect.x && node.x <= rect.x + rect.width &&
          node.y >= rect.y && node.y <= rect.y + rect.height
        );
        const newNodeIds = new Set(nodesInRect.map((n) => n.id));
        setSelectedNodeIds(newNodeIds);
        setSelectedEdgeIds(new Set());
        notifySelectionChange(newNodeIds, new Set());
      } else {
        // Was just a click on empty canvas — deselect all
        clearSelection();
      }
      setMarquee(null);
    }
    if (dragConnector) {
      if (hoverConnector && onConnect) {
        onConnect(
          { node: dragConnector.node, connector: dragConnector.id },
          { node: hoverConnector.node, connector: hoverConnector.id }
        );
      }
      setDragConnector(null);
    }
  }

  // Convert a mouse event to world coordinates via SVG CTM
  function eventToWorld(event: React.MouseEvent): Point | null {
    const svg = (event.target as Element).closest('svg');
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const svgPoint = svg.createSVGPoint();
    svgPoint.x = event.clientX - rect.left;
    svgPoint.y = event.clientY - rect.top;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const wp = svgPoint.matrixTransform(ctm.inverse());
    return { x: wp.x, y: wp.y };
  }

  function onMouseMove(event: React.MouseEvent) {
    if (dragItem && onNodeMove) {
      const node = data.nodes.find((n) => n.id === dragItem);
      if (!node) return;

      const worldPoint = eventToWorld(event);
      if (worldPoint) {
        const snapped = viewport.snapToGrid(worldPoint);
        const deltaX = snapped.x - node.x;
        const deltaY = snapped.y - node.y;

        // Move the dragged node
        onNodeMove(dragItem, snapped.x, snapped.y);

        // Move other selected nodes by the same delta (multi-drag)
        if (selectedNodeIds.has(dragItem) && selectedNodeIds.size > 1) {
          for (const selectedId of selectedNodeIds) {
            if (selectedId === dragItem) continue;
            const selectedNode = data.nodes.find((n) => n.id === selectedId);
            if (selectedNode) {
              onNodeMove(selectedId, selectedNode.x + deltaX, selectedNode.y + deltaY);
            }
          }
        }

        // Clear waypoints on all edges connected to any moved node
        if (onEdgePathChange) {
          const movedNodeIds = selectedNodeIds.has(dragItem) && selectedNodeIds.size > 1
            ? selectedNodeIds
            : new Set([dragItem]);
          data.edges.forEach((edge, index) => {
            if (edge.waypoints && edge.waypoints.length > 0) {
              if (movedNodeIds.has(edge.source.node) || movedNodeIds.has(edge.target.node)) {
                const edgeId = `${edge.source.node}-${edge.target.node}-${index}`;
                onEdgePathChange(edgeId, []);
              }
            }
          });
        }
      }
    }

    // Marquee selection drag
    if (marquee) {
      const worldPoint = eventToWorld(event);
      if (worldPoint) {
        const dx = worldPoint.x - marquee.startWorld.x;
        const dy = worldPoint.y - marquee.startWorld.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        setMarquee({
          startWorld: marquee.startWorld,
          currentWorld: worldPoint,
          active: marquee.active || dist > 2,
        });
      }
    }

    if (dragSegment && onEdgePathChange) {
      const svg = (event.target as Element).closest('svg');
      if (svg) {
        const rect = svg.getBoundingClientRect();
        const svgPoint = svg.createSVGPoint();
        svgPoint.x = event.clientX - rect.left;
        svgPoint.y = event.clientY - rect.top;

        const ctm = svg.getScreenCTM();
        if (ctm) {
          const worldPoint = svgPoint.matrixTransform(ctm.inverse());
          const snapped = viewport.snapToGrid({ x: worldPoint.x, y: worldPoint.y });

          const deltaX = snapped.x - dragSegment.initialMouseWorld.x;
          const deltaY = snapped.y - dragSegment.initialMouseWorld.y;

          // Copy the initial waypoints and modify the two that bound the dragged segment
          const newWaypoints = dragSegment.initialWaypoints.map(w => ({ ...w }));

          // Segment[i] in resolvedPoints connects resolvedPoints[i] and resolvedPoints[i+1].
          // resolvedPoints = [start, ...waypoints, end]
          // So waypoint indices are: segmentIndex - 1 and segmentIndex
          const wpIdx1 = dragSegment.segmentIndex - 1;
          const wpIdx2 = dragSegment.segmentIndex;

          if (dragSegment.orientation === "horizontal") {
            // Horizontal segment → drag vertically (change y)
            if (wpIdx1 >= 0 && wpIdx1 < newWaypoints.length) {
              newWaypoints[wpIdx1] = { ...newWaypoints[wpIdx1], y: newWaypoints[wpIdx1].y + deltaY };
            }
            if (wpIdx2 >= 0 && wpIdx2 < newWaypoints.length) {
              newWaypoints[wpIdx2] = { ...newWaypoints[wpIdx2], y: newWaypoints[wpIdx2].y + deltaY };
            }
          } else {
            // Vertical segment → drag horizontally (change x)
            if (wpIdx1 >= 0 && wpIdx1 < newWaypoints.length) {
              newWaypoints[wpIdx1] = { ...newWaypoints[wpIdx1], x: newWaypoints[wpIdx1].x + deltaX };
            }
            if (wpIdx2 >= 0 && wpIdx2 < newWaypoints.length) {
              newWaypoints[wpIdx2] = { ...newWaypoints[wpIdx2], x: newWaypoints[wpIdx2].x + deltaX };
            }
          }

          onEdgePathChange(dragSegment.edgeId, newWaypoints);
        }
      }
    }

    if (dragConnector) {
      const sourceNode = data.nodes.find((n) => n.id === dragConnector.node);
      if (sourceNode) {
        const sourceConnector = sourceNode.connectors?.find(
          (c) => c.id === dragConnector.id
        );
        if (sourceConnector) {
          const startX = sourceNode.x + sourceConnector.x;
          const startY = sourceNode.y + sourceConnector.y;
          
          // Use SVG coordinate conversion for drag line endpoint
          const svg = (event.target as Element).closest('svg');
          if (svg) {
            const rect = svg.getBoundingClientRect();
            const svgPoint = svg.createSVGPoint();
            svgPoint.x = event.clientX - rect.left;
            svgPoint.y = event.clientY - rect.top;
            
            const ctm = svg.getScreenCTM();
            if (ctm) {
              // Convert point to world coordinates
              const worldPoint = svgPoint.matrixTransform(ctm.inverse());
              const endX = worldPoint.x;
              const endY = worldPoint.y;

              // Calculate control points for the bezier curve
              const dx = endX - startX;
              const controlX1 = startX + dx / 3;
              const controlY1 = startY;
              const controlX2 = startX + (dx * 2) / 3;
              const controlY2 = endY;

              // Update the drag line with bezier curve
              setDragLine({
                x1: startX,
                y1: startY,
                x2: endX,
                y2: endY,
                cx1: controlX1,
                cy1: controlY1,
                cx2: controlX2,
                cy2: controlY2,
              });
            }
          }
        }
      }
    }
  }

  function onConnectorMouseDown(connector: string, node: string) {
    console.log(connector);
    setDragConnector({ id: connector, node });
  }

  function onConnectorMouseUp(connector: string, node: string) {
    console.log(connector);
    if (dragConnector) {
      if (onConnect)
        onConnect(
          { node: dragConnector.node, connector: dragConnector.id },
          { node, connector }
        );
      setDragConnector(null);
    }
  }

  function notifySelectionChange(nodeIds: Set<string>, edgeIds: Set<string>) {
    if (onSelectionChange) {
      onSelectionChange({
        nodeIds: Array.from(nodeIds),
        edgeIds: Array.from(edgeIds),
      });
    }
  }

  function clearSelection() {
    setSelectedNodeIds(new Set());
    setSelectedEdgeIds(new Set());
    notifySelectionChange(new Set(), new Set());
  }

  function marqueeRect(start: Point, end: Point) {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    return {
      x,
      y,
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
    };
  }

  function handleNodeClick(nodeId: string, shiftKey: boolean = false) {
    let newNodeIds: Set<string>;
    if (shiftKey) {
      // Toggle in/out of selection
      newNodeIds = new Set(selectedNodeIds);
      if (newNodeIds.has(nodeId)) {
        newNodeIds.delete(nodeId);
      } else {
        newNodeIds.add(nodeId);
      }
    } else if (selectedNodeIds.has(nodeId)) {
      // Clicking an already-selected node: keep selection (for multi-drag)
      return;
    } else {
      // Replace selection with just this node
      newNodeIds = new Set([nodeId]);
    }
    const newEdgeIds = shiftKey ? selectedEdgeIds : new Set<string>();
    setSelectedNodeIds(newNodeIds);
    setSelectedEdgeIds(newEdgeIds);
    notifySelectionChange(newNodeIds, newEdgeIds);
    if (onNodeClick) {
      onNodeClick(nodeId);
    }
  }

  function handleEdgeClick(edgeId: string, shiftKey: boolean = false) {
    let newEdgeIds: Set<string>;
    if (shiftKey) {
      newEdgeIds = new Set(selectedEdgeIds);
      if (newEdgeIds.has(edgeId)) {
        newEdgeIds.delete(edgeId);
      } else {
        newEdgeIds.add(edgeId);
      }
    } else {
      newEdgeIds = new Set([edgeId]);
    }
    const newNodeIds = shiftKey ? selectedNodeIds : new Set<string>();
    setSelectedNodeIds(newNodeIds);
    setSelectedEdgeIds(newEdgeIds);
    notifySelectionChange(newNodeIds, newEdgeIds);
    if (onEdgeClick) {
      onEdgeClick(edgeId);
    }
  }

  // Helper functions for rendering
  const createNodeProps = (node: typeof data.nodes[0]) => ({
    node,
    onMouseDown: (e: React.MouseEvent) => {
      e.stopPropagation();
      onMouseDown(e, node.id);
    },
    onMouseUp: (e: React.MouseEvent) => onMouseUp(e),
  });

  const createConnectorProps = (node: typeof data.nodes[0]) => {
    return node.connectors?.map((connector) => {
      const isHovered = !!(
        hoverConnector &&
        hoverConnector.id === connector.id &&
        hoverConnector.node === node.id
      );
      return {
        connector,
        node,
        isHovered,
        onMouseDown: () => onConnectorMouseDown(connector.id, node.id),
        onMouseOver: () => setHoverConnector({ id: connector.id, node: node.id }),
        onMouseUp: () => onConnectorMouseUp(connector.id, node.id),
        onMouseOut: () => setHoverConnector(null),
      };
    }) || [];
  };

  // Get routing configuration with defaults
  const routingConfig: InternalRoutingConfig = {
    mode: config.routing?.mode || 'bezier',
    margin: config.routing?.margin ?? 3,
    gridSize: config.routing?.gridSize ?? 2.54,
    cornerRadius: config.routing?.cornerRadius ?? 3,
    stubLength: config.routing?.stubLength ?? 0,
  };

  // Get node bounds for obstacle avoidance
  const nodeBoundsCache = config.routing?.avoidNodes === false
    ? []
    : getNodeBounds(data.nodes, undefined, config.routing?.nodeDimensions);

  const createEdgeRoute = (edge: typeof data.edges[0]) => {
    const fallback = { path: "", labelPoint: { x: 0, y: 0 }, labelAngle: 0, resolvedPoints: [] as Point[], sourceLabelPoint: { x: 0, y: 0 }, targetLabelPoint: { x: 0, y: 0 } };

    const source = data.nodes.find((n) => n.id === edge.source.node);
    const target = data.nodes.find((n) => n.id === edge.target.node);
    if (!source || !target) return fallback;

    const sc = source.connectors?.find((c) => c.id === edge.source.connector);
    const tc = target.connectors?.find((c) => c.id === edge.target.connector);
    if (!sc || !tc) return fallback;

    const x1 = source.x + sc.x;
    const y1 = source.y + sc.y;
    const x2 = target.x + tc.x;
    const y2 = target.y + tc.y;

    const start = { x: x1, y: y1 };
    const end = { x: x2, y: y2 };

    // Legacy "line" type - simple direct line
    if (edge.type === "line") {
      const resolvedPoints = [start, end];
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = len > 0 ? -dy / len : 0;
      const ny = len > 0 ? dx / len : 0;
      const t = len > 0 ? Math.min(8 / len, 0.5) : 0;
      return {
        path: `M${x1},${y1} L ${x2},${y2}`,
        labelPoint: { x: (x1 + x2) / 2, y: (y1 + y2) / 2 },
        labelAngle: Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI),
        resolvedPoints,
        sourceLabelPoint: { x: x1 + dx * t + nx * 4, y: y1 + dy * t + ny * 4 },
        targetLabelPoint: { x: x2 - dx * t + nx * 4, y: y2 - dy * t + ny * 4 },
      };
    }

    // Determine routing mode based on edge type
    let mode = routingConfig.mode;
    if (edge.type === "orthogonal") {
      mode = "orthogonal";
    } else if (edge.type === "direct") {
      mode = "direct";
    } else if (edge.type === "bezier") {
      mode = "bezier";
    }

    // If edge has user-defined waypoints, use them directly (skip auto-routing)
    if (edge.waypoints && edge.waypoints.length > 0) {
      return buildPathFromWaypoints(
        start,
        edge.waypoints,
        end,
        mode,
        routingConfig.cornerRadius
      );
    }

    // Filter out source and target nodes from obstacles
    const obstacles = nodeBoundsCache.filter(
      (ob) => ob.id !== source.id && ob.id !== target.id
    );

    return calculateRoute(start, end, obstacles, { ...routingConfig, mode }, sc, tc);
  };

  // Handle segment drag start — captures initial state for drag calculations
  function handleSegmentDragStart(
    edgeId: string,
    segmentIndex: number,
    resolvedPoints: Point[],
    event: React.MouseEvent
  ) {
    event.stopPropagation();

    const svg = (event.target as Element).closest('svg');
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const svgPoint = svg.createSVGPoint();
    svgPoint.x = event.clientX - rect.left;
    svgPoint.y = event.clientY - rect.top;

    const ctm = svg.getScreenCTM();
    if (!ctm) return;

    const worldPoint = svgPoint.matrixTransform(ctm.inverse());
    const snapped = viewport.snapToGrid({ x: worldPoint.x, y: worldPoint.y });

    // Extract waypoints (everything except start and end)
    const initialWaypoints = resolvedPoints.slice(1, -1).map(p => ({ ...p }));

    // Determine orientation of this segment
    const p1 = resolvedPoints[segmentIndex];
    const p2 = resolvedPoints[segmentIndex + 1];
    const orientation: "horizontal" | "vertical" =
      Math.abs(p2.y - p1.y) < 0.01 ? "horizontal" : "vertical";

    setDragSegment({
      edgeId,
      segmentIndex,
      orientation,
      initialWaypoints,
      initialMouseWorld: snapped,
    });

    // Select the edge being dragged
    handleEdgeClick(edgeId);
  }

  // Select all — called by useSolmuKeyboard or externally
  const selectAll = React.useCallback(() => {
    const allNodeIds = new Set(data.nodes.map((n) => n.id));
    const allEdgeIds = new Set(
      data.edges.map((edge, index) => `${edge.source.node}-${edge.target.node}-${index}`)
    );
    setSelectedNodeIds(allNodeIds);
    setSelectedEdgeIds(allEdgeIds);
    notifySelectionChange(allNodeIds, allEdgeIds);
  }, [data.nodes, data.edges]);

  // Deselect all — called by useSolmuKeyboard or externally
  const deselectAll = React.useCallback(() => {
    clearSelection();
  }, []);

  return {
    canvas: {
      props: {
        onMouseDown: (event: React.MouseEvent) => {
          // Start marquee selection (deselect happens on mouseup if no drag)
          const worldPoint = eventToWorld(event);
          if (worldPoint) {
            setMarquee({ startWorld: worldPoint, currentWorld: worldPoint, active: false });
          }
        },
        onMouseMove,
        onMouseUp,
      },
      width: viewport.getConfig().width,
      height: viewport.getConfig().height,
      viewBox: viewport.getViewBox(),
      gridDots: viewport.generateGridDots(),
      viewport: {
        screenToWorld: (x: number, y: number) => viewport.screenToWorld(x, y),
        worldToScreen: (x: number, y: number) => viewport.worldToScreen(x, y),
        snapToGrid: (point: { x: number; y: number }) => viewport.snapToGrid(point),
        formatCoordinate: (value: number) => viewport.formatCoordinate(value),
        getEffectiveGridSize: () => viewport.getEffectiveGridSize(),
      },
    },
    elements: {
      nodes: data.nodes.map((node) => {
        const renderer = config.renderers.find((r) => r.type === node.type)?.component;
        if (!renderer) {
          throw new Error(`No renderer found for node type ${node.type}`);
        }
        
        return {
          ...node,
          renderer,
          nodeProps: createNodeProps(node),
          connectorProps: createConnectorProps(node),
          transform: `translate(${node.x}, ${node.y})`,
          isDragging: dragItem === node.id,
          isSelected: selectedNodeIds.has(node.id),
        };
      }),
      edges: data.edges.map((edge, index) => {
        const { path, labelPoint, labelAngle, resolvedPoints, sourceLabelPoint, targetLabelPoint } = createEdgeRoute(edge);
        const edgeId = `${edge.source.node}-${edge.target.node}-${index}`;
        const segments = computeSegments(resolvedPoints);
        return {
          ...edge,
          id: edgeId,
          path,
          labelPoint,
          labelAngle,
          sourceLabelPoint,
          targetLabelPoint,
          isSelected: selectedEdgeIds.has(edgeId),
          onClick: (event?: React.MouseEvent) => handleEdgeClick(edgeId, event?.shiftKey),
          resolvedWaypoints: resolvedPoints,
          segments,
          onSegmentDragStart: onEdgePathChange
            ? (segmentIndex: number, event: React.MouseEvent) =>
                handleSegmentDragStart(edgeId, segmentIndex, resolvedPoints, event)
            : undefined,
        };
      }),
      dragLine: dragConnector && dragLine
        ? {
            path: `M${dragLine.x1},${dragLine.y1} C ${dragLine.cx1},${dragLine.cy1} ${dragLine.cx2},${dragLine.cy2} ${dragLine.x2},${dragLine.y2}`,
            isVisible: true,
          }
        : null,
      marquee: marquee?.active
        ? marqueeRect(marquee.startWorld, marquee.currentWorld)
        : null,
    },
    interactions: {
      onMouseDown: (event: React.MouseEvent) => {
        const worldPoint = eventToWorld(event);
        if (worldPoint) {
          setMarquee({ startWorld: worldPoint, currentWorld: worldPoint, active: false });
        }
      },
      onMouseMove,
      onMouseUp,
    },
    selection: {
      nodeIds: Array.from(selectedNodeIds),
      edgeIds: Array.from(selectedEdgeIds),
    },
    actions: {
      selectAll,
      deselectAll,
    },
  };
}
