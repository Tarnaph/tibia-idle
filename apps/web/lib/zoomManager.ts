'use client';

const STORAGE_KEY_DESKTOP = 'tibia_camera_zoom';
const STORAGE_KEY_MOBILE = 'tibia_camera_zoom_mobile';
const DEFAULT_DESKTOP_ZOOM = 1.25;
const DEFAULT_MOBILE_ZOOM = 0.85;
const MIN_ZOOM = 0.5; // 50% (Zoom out - view wider map)
const MAX_ZOOM = 2.0; // 200% (Zoom in - closer view)

type ZoomCallback = (zoom: number) => void;
const listeners = new Set<ZoomCallback>();

let cachedZoom: number | null = null;

function isMobile(): boolean {
  if (typeof window !== 'undefined' && typeof window.innerWidth === 'number' && window.innerWidth <= 840) {
    return true;
  }
  if (typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '')) {
    return true;
  }
  return false;
}

function getStorageKey(): string {
  return isMobile() ? STORAGE_KEY_MOBILE : STORAGE_KEY_DESKTOP;
}

export function getDefaultZoom(): number {
  return isMobile() ? DEFAULT_MOBILE_ZOOM : DEFAULT_DESKTOP_ZOOM;
}

export function getZoomMultiplier(): number {
  if (cachedZoom !== null) return cachedZoom;
  const def = getDefaultZoom();
  if (typeof window === 'undefined') return def;
  try {
    const key = getStorageKey();
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = parseFloat(stored);
      if (!isNaN(parsed) && parsed >= MIN_ZOOM && parsed <= MAX_ZOOM) {
        cachedZoom = Math.round(parsed * 100) / 100;
        return cachedZoom;
      }
    }
  } catch (e) {}
  cachedZoom = def;
  return def;
}

export function setZoomMultiplier(value: number): void {
  const clamped = Math.round(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value)) * 100) / 100;
  cachedZoom = clamped;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(getStorageKey(), clamped.toString());
    } catch (e) {}
  }
  listeners.forEach((cb) => cb(clamped));
}

export function resetZoomMultiplier(): void {
  setZoomMultiplier(getDefaultZoom());
}

export function onZoomChange(cb: ZoomCallback): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

