'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type WindowId = 'character' | 'equipment' | 'party' | 'hunt' | 'metrics' | 'logs' | 'chat' | 'trade' | 'friends';

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
      width: 340,
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
      x: Math.max(320, w - 350),
      y: 54,
      width: 340,
      isOpen: true,
      isMinimized: false,
      zIndex: 13,
    },
    equipment: {
      id: 'equipment',
      title: 'Equipamentos & Bolsa',
      x: Math.max(320, w - 280),
      y: Math.min(280, h - 440),
      width: 260,
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
    chat: {
      id: 'chat',
      title: 'Chat',
      x: 20,
      y: Math.max(100, h - 340),
      width: 380,
      isOpen: true,
      isMinimized: false,
      zIndex: 16,
    },
    trade: {
      id: 'trade',
      title: 'Sistema de Trocas (Trade)',
      x: Math.max(100, Math.floor(w / 2 - 220)),
      y: Math.max(80, Math.floor(h / 2 - 180)),
      width: 440,
      isOpen: false,
      isMinimized: false,
      zIndex: 20,
    },
    friends: {
      id: 'friends',
      title: 'Lista de Amigos',
      x: Math.max(50, Math.floor(w / 2 - 170)),
      y: 60,
      width: 340,
      isOpen: false,
      isMinimized: false,
      zIndex: 18,
    },
  };
}

const WindowManagerContext = createContext<WindowManagerContextValue | null>(null);

export function WindowManagerProvider({ children }: { children: React.ReactNode }) {
  // Always initialize with defaults so SSR and initial client render match identically
  const [windows, setWindows] = useState<Record<WindowId, WindowState>>(() => getDefaultWindows());
  const [mounted, setMounted] = useState(false);
  const [topZ, setTopZ] = useState(20);

  // Load saved positions from localStorage strictly after client hydration
  useEffect(() => {
    setMounted(true);
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
              x: Math.max(0, Math.min(window.innerWidth - 80, parsed[key].x ?? defaults[key].x)),
              y: Math.max(40, Math.min(window.innerHeight - 60, parsed[key].y ?? defaults[key].y)),
            };
          }
        }
        setWindows(merged);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save to localStorage only after mounted
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(windows));
    } catch {
      // Ignore write errors
    }
  }, [windows, mounted]);

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
