'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type WindowId = 'character' | 'equipment' | 'party' | 'hunt' | 'metrics' | 'logs';

export interface WindowState {
  id: WindowId;
  title: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  isOpen: boolean;
  isMinimized: boolean;
  zIndex: number;
}

interface WindowManagerContextValue {
  windows: Record<WindowId, WindowState>;
  bringToFront: (id: WindowId) => void;
  updatePosition: (id: WindowId, x: number, y: number) => void;
  toggleWindow: (id: WindowId) => void;
  openWindow: (id: WindowId) => void;
  closeWindow: (id: WindowId) => void;
  toggleMinimize: (id: WindowId) => void;
  resetLayout: () => void;
}

const STORAGE_KEY = 'cavebound_window_layout_v1';

function getDefaultWindows(viewportWidth = 1280, viewportHeight = 720): Record<WindowId, WindowState> {
  const w = typeof window !== 'undefined' ? window.innerWidth : viewportWidth;
  const h = typeof window !== 'undefined' ? window.innerHeight : viewportHeight;

  return {
    character: {
      id: 'character',
      title: 'Personagem & Habilidades',
      x: 20,
      y: 54,
      width: 280,
      isOpen: true,
      isMinimized: false,
      zIndex: 10,
    },
    metrics: {
      id: 'metrics',
      title: 'Métricas & Combate',
      x: 20,
      y: Math.min(480, h - 260),
      width: 280,
      isOpen: true,
      isMinimized: false,
      zIndex: 11,
    },
    hunt: {
      id: 'hunt',
      title: 'Navegação & Expedição',
      x: Math.max(310, Math.floor(w / 2 - 210)),
      y: 54,
      width: 420,
      isOpen: true,
      isMinimized: false,
      zIndex: 12,
    },
    party: {
      id: 'party',
      title: 'Grupo (Party)',
      x: Math.max(320, w - 320),
      y: 54,
      width: 300,
      isOpen: true,
      isMinimized: false,
      zIndex: 13,
    },
    equipment: {
      id: 'equipment',
      title: 'Equipamentos & Bolsa',
      x: Math.max(320, w - 360),
      y: Math.min(300, h - 420),
      width: 340,
      isOpen: true,
      isMinimized: false,
      zIndex: 14,
    },
    logs: {
      id: 'logs',
      title: 'Console de Batalha & Ações',
      x: Math.max(310, Math.floor(w / 2 - 270)),
      y: Math.max(120, h - 230),
      width: 540,
      isOpen: true,
      isMinimized: false,
      zIndex: 15,
    },
  };
}

const WindowManagerContext = createContext<WindowManagerContextValue | null>(null);

export function WindowManagerProvider({ children }: { children: React.ReactNode }) {
  const [windows, setWindows] = useState<Record<WindowId, WindowState>>(() => {
    if (typeof window === 'undefined') return getDefaultWindows();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<WindowId, Partial<WindowState>>;
        const defaults = getDefaultWindows();
        const merged: Record<WindowId, WindowState> = { ...defaults };
        for (const key of Object.keys(defaults) as WindowId[]) {
          if (parsed[key]) {
            merged[key] = {
              ...defaults[key],
              ...parsed[key],
              // Ensure coordinates remain within screen bounds
              x: Math.max(0, Math.min(window.innerWidth - 80, parsed[key].x ?? defaults[key].x)),
              y: Math.max(40, Math.min(window.innerHeight - 60, parsed[key].y ?? defaults[key].y)),
            };
          }
        }
        return merged;
      }
    } catch {
      // Ignore parse error
    }
    return getDefaultWindows();
  });

  const [topZ, setTopZ] = useState(20);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(windows));
    } catch {
      // Ignore write errors
    }
  }, [windows]);

  const bringToFront = useCallback((id: WindowId) => {
    setTopZ((current) => {
      const next = current + 1;
      setWindows((prev) => {
        if (!prev[id] || prev[id].zIndex === current) return prev;
        return {
          ...prev,
          [id]: { ...prev[id], zIndex: next },
        };
      });
      return next;
    });
  }, []);

  const updatePosition = useCallback((id: WindowId, x: number, y: number) => {
    setWindows((prev) => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], x, y },
      };
    });
  }, []);

  const toggleWindow = useCallback((id: WindowId) => {
    setWindows((prev) => {
      if (!prev[id]) return prev;
      const isOpen = !prev[id].isOpen;
      return {
        ...prev,
        [id]: { ...prev[id], isOpen },
      };
    });
    bringToFront(id);
  }, [bringToFront]);

  const openWindow = useCallback((id: WindowId) => {
    setWindows((prev) => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], isOpen: true },
      };
    });
    bringToFront(id);
  }, [bringToFront]);

  const closeWindow = useCallback((id: WindowId) => {
    setWindows((prev) => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], isOpen: false },
      };
    });
  }, []);

  const toggleMinimize = useCallback((id: WindowId) => {
    setWindows((prev) => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], isMinimized: !prev[id].isMinimized },
      };
    });
    bringToFront(id);
  }, [bringToFront]);

  const resetLayout = useCallback(() => {
    const defaults = getDefaultWindows();
    setWindows(defaults);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  return (
    <WindowManagerContext.Provider
      value={{
        windows,
        bringToFront,
        updatePosition,
        toggleWindow,
        openWindow,
        closeWindow,
        toggleMinimize,
        resetLayout,
      }}
    >
      {children}
    </WindowManagerContext.Provider>
  );
}

export function useWindowManager() {
  const context = useContext(WindowManagerContext);
  if (!context) {
    throw new Error('useWindowManager must be used within WindowManagerProvider');
  }
  return context;
}
