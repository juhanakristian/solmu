# Viewport

Solmu's viewport system handles coordinate transforms, zoom/pan, grid rendering, and unit conversion. Configure it via `config.viewport` in `useSolmu`.

## Configuration

```tsx
const { canvas, elements } = useSolmu({
  data,
  config: {
    renderers: [...],
    viewport: {
      origin: "top-left",
      units: "mm",
      width: window.innerWidth,
      height: window.innerHeight,
      worldBounds: { x: -200, y: -200, width: 400, height: 400 },
      zoom: 1,
      pan: { x: 0, y: 0 },
      grid: {
        size: 5,
        snapSize: 2.5,
        visible: true,
        snap: true,
      },
    },
  },
});
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `origin` | `"top-left" \| "bottom-left" \| "center"` | `"top-left"` | Coordinate system origin |
| `units` | `"px" \| "mm" \| "in" \| "mil" \| "units"` | `"px"` | World coordinate units (for display formatting) |
| `width` | `number` | `800` | SVG element width in screen pixels |
| `height` | `number` | `600` | SVG element height in screen pixels |
| `worldBounds` | `{ x, y, width, height }` | `{ x:0, y:0, width:800, height:600 }` | World coordinate extent |
| `zoom` | `number` | `1` | Zoom level (1 = fit worldBounds to screen) |
| `pan` | `{ x, y }` | `{ x:0, y:0 }` | Pan offset (normalized, 0 = centered) |
| `grid.size` | `number` | — | Visual grid spacing in world units |
| `grid.snapSize` | `number?` | same as `size` | Snap resolution (can differ from visual grid) |
| `grid.visible` | `boolean` | — | Whether to render grid dots |
| `grid.snap` | `boolean` | — | Whether node/edge positions snap to grid |

## Coordinate origins

| Origin | Y direction | Use case |
|--------|-------------|----------|
| `"top-left"` | Y increases downward | Flow charts, UML, databases |
| `"bottom-left"` | Y increases upward | Electronics, engineering drawings |
| `"center"` | Y increases upward, (0,0) at center | Mathematical, physics |

## Zoom and pan

Solmu doesn't provide built-in zoom/pan UI — you control it by updating `config.viewport.zoom` and `config.viewport.pan` in your state. This gives you full control over the interaction (wheel zoom, pinch zoom, button controls, etc.).

### Typical wheel zoom

```tsx
const [viewportConfig, setViewportConfig] = useState({
  width: window.innerWidth,
  height: window.innerHeight,
  worldBounds: { x: -200, y: -200, width: 400, height: 400 },
  zoom: 1,
  pan: { x: 0, y: 0 },
});

function handleWheel(e: React.WheelEvent) {
  e.preventDefault();
  const factor = e.deltaY > 0 ? 0.9 : 1.1;
  setViewportConfig((prev) => ({
    ...prev,
    zoom: Math.max(0.1, Math.min(10, prev.zoom * factor)),
  }));
}
```

### Middle-click pan

```tsx
const [isPanning, setIsPanning] = useState(false);
const [lastPanPos, setLastPanPos] = useState({ x: 0, y: 0 });

function handleMouseDown(e: React.MouseEvent) {
  if (e.button === 1) {  // middle click
    setIsPanning(true);
    setLastPanPos({ x: e.clientX, y: e.clientY });
  }
}

function handleMouseMove(e: React.MouseEvent) {
  if (isPanning) {
    const dx = e.clientX - lastPanPos.x;
    const dy = e.clientY - lastPanPos.y;
    setViewportConfig((prev) => ({
      ...prev,
      pan: {
        x: prev.pan.x - dx / prev.width / prev.zoom,
        y: prev.pan.y - dy / prev.height / prev.zoom,
      },
    }));
    setLastPanPos({ x: e.clientX, y: e.clientY });
  }
}
```

## Grid

### Visual grid

When `grid.visible` is `true`, `canvas.gridDots` contains an array of dot positions to render:

```tsx
{canvas.gridDots?.map((dot, i) => (
  <circle key={i} cx={dot.x} cy={dot.y} r={dot.size} fill="#ccc" opacity={dot.opacity} />
))}
```

Grid dot density adapts automatically to zoom level — at low zoom, only major grid lines are shown to avoid clutter.

### Grid snapping

When `grid.snap` is `true`, node positions and edge segment drags are snapped to the grid. The snap resolution is `grid.snapSize` (defaults to `grid.size`).

You can have different visual and snap resolutions:

```tsx
grid: {
  size: 1,        // show dots every 1mm
  snapSize: 0.5,  // but snap to 0.5mm increments
  visible: true,
  snap: true,
}
```

## Viewport utilities

`canvas.viewport` provides coordinate conversion functions:

```tsx
const { viewport } = canvas;

// Convert screen pixel to world coordinate
const worldPos = viewport.screenToWorld(event.clientX, event.clientY);

// Convert world coordinate to screen pixel
const screenPos = viewport.worldToScreen(node.x, node.y);

// Snap a point to the grid
const snapped = viewport.snapToGrid({ x: 10.3, y: 20.7 });

// Format a coordinate for display
viewport.formatCoordinate(25.4);  // "25.40mm" (when units="mm")

// Get current effective grid size
viewport.getEffectiveGridSize();  // varies with zoom level
```

## `SolmuViewport` class

The viewport is also exported as a standalone class for advanced use:

```ts
import { SolmuViewport } from "solmu";

const viewport = new SolmuViewport({
  origin: "bottom-left",
  units: "mm",
  width: 800,
  height: 600,
  worldBounds: { x: 0, y: 0, width: 200, height: 150 },
  zoom: 1,
  pan: { x: 0, y: 0 },
  grid: { size: 2.54, visible: true, snap: true },
});

viewport.getViewBox();        // SVG viewBox string
viewport.generateGridDots();  // array of grid dot positions
viewport.zoomIn(1.2);
viewport.panBy(10, 0);
viewport.fitToView(contentBounds);
```
