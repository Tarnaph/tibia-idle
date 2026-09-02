export interface PixelCameraLayout {
  scale: number;
  tilePixelSize: number;
  visibleColumns: number;
  visibleRows: number;
  sceneWidth: number;
  sceneHeight: number;
  originX: number;
  originY: number;
}

export function calculatePixelCamera(viewportWidth: number, viewportHeight: number, tileSize = 32): PixelCameraLayout {
  const scale = viewportHeight >= 1050 ? 3 : viewportHeight >= 620 ? 2 : 1;
  const tilePixelSize = tileSize * scale;
  const visibleColumns = Math.ceil(viewportWidth / tilePixelSize) + 2;
  const visibleRows = Math.ceil(viewportHeight / tilePixelSize) + 2;
  const sceneWidth = visibleColumns * tileSize;
  const sceneHeight = visibleRows * tileSize;
  return {
    scale, tilePixelSize, visibleColumns, visibleRows, sceneWidth, sceneHeight,
    originX: Math.floor((viewportWidth / scale - sceneWidth) / 2),
    originY: Math.floor((viewportHeight / scale - sceneHeight) / 2),
  };
}

export interface WorldCameraState { x: number; y: number; zoom: number }
export interface WorldCameraInput {
  viewportWidth: number; viewportHeight: number; worldWidth: number; worldHeight: number;
  targetX: number; targetY: number; fixedZoom?: number;
}

export function desiredWorldCamera(input: WorldCameraInput): WorldCameraState {
  const zoom = Math.max(1, Math.round(input.fixedZoom ?? 2));
  // The viewport may reveal backing outside a small imported region. Clamping
  // the camera center itself keeps the followed actor centered at map edges.
  const x = Math.max(0, Math.min(input.worldWidth, input.targetX));
  const y = Math.max(0, Math.min(input.worldHeight, input.targetY));
  return { x, y, zoom };
}

export function smoothWorldCamera(current: WorldCameraState, desired: WorldCameraState, deltaMs: number): WorldCameraState {
  const factor = 1 - Math.exp(-Math.max(0, deltaMs) / 180);
  return {
    x: current.x + (desired.x - current.x) * factor,
    y: current.y + (desired.y - current.y) * factor,
    zoom: desired.zoom,
  };
}

export function worldToViewport(point: { x: number; y: number }, camera: WorldCameraState, viewport: { width: number; height: number }) {
  return { x: viewport.width / 2 + (point.x - camera.x) * camera.zoom, y: viewport.height / 2 + (point.y - camera.y) * camera.zoom };
}
