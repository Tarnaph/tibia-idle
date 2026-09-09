'use client';

const STORAGE_KEY = 'tibia_camera_zoom';
const DEFAULT_ZOOM = 1.25;
const MIN_ZOOM = 0.5; // 50% (Zoom out - view wider map)
const MAX_ZOOM = 2.0; // 200% (Zoom in - closer view)

type ZoomCallback = (zoom: number) => void;
const listeners = new Set<ZoomCallback>();

let cachedZoom: number | null = null;

export function getZoomMultiplier(): number {
  if (cachedZoom !== null) return cachedZoom;
  if (typeof window === 'undefined') return DEFAULT_ZOOM;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = parseFloat(stored);
      if (!isNaN(parsed) && parsed >= MIN_ZOOM && parsed <= MAX_ZOOM) {
        cachedZoom = Math.round(parsed * 100) / 100;
        return cachedZoom;
      }
    }
  } catch (e) {}
  cachedZoom = DEFAULT_ZOOM;
  return DEFAULT_ZOOM;
}

export function setZoomMultiplier(value: number): void {
  const clamped = Math.round(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value)) * 100) / 100;
  cachedZoom = clamped;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, clamped.toString());
    } catch (e) {}
  }
  listeners.forEach((cb) => cb(clamped));
}

export function resetZoomMultiplier(): void {
  setZoomMultiplier(DEFAULT_ZOOM);
}

export function onZoomChange(cb: ZoomCallback): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
