'use client';

import React, { useRef, useState, useCallback } from 'react';
import { useWindowManager, type WindowId } from './WindowManagerContext';

interface DraggableWindowProps {
  id: WindowId;
  children: React.ReactNode;
  icon?: string;
  badge?: React.ReactNode;
  className?: string;
  defaultWidth?: number;
}

export function DraggableWindow({
  id,
  children,
  icon,
  badge,
  className = '',
  defaultWidth,
}: DraggableWindowProps) {
  const { windows, bringToFront, updatePosition, closeWindow, toggleMinimize } = useWindowManager();
  const windowState = windows[id];
  const windowRef = useRef<HTMLDivElement>(null);

  const dragRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    isDragging: boolean;
  }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    isDragging: false,
  });

  const [isDraggingState, setIsDraggingState] = useState(false);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Don't drag if clicking buttons
      if ((e.target as HTMLElement).closest('button')) return;

      bringToFront(id);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

      // Read true current DOM screen position to prevent jumping
      const rect = windowRef.current ? windowRef.current.getBoundingClientRect() : null;
      const initialX = rect ? rect.left : windowState.x;
      const initialY = rect ? rect.top : windowState.y;

      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialX,
        initialY,
        isDragging: true,
      };
      setIsDraggingState(true);
    },
    [bringToFront, id, windowState.x, windowState.y]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current.isDragging) return;

      const deltaX = e.clientX - dragRef.current.startX;
      const deltaY = e.clientY - dragRef.current.startY;

      // Threshold: ignore tiny vibrations/clicks so simple click never moves the window
      if (Math.abs(deltaX) < 2 && Math.abs(deltaY) < 2) return;

      const windowWidth = windowRef.current?.offsetWidth ?? windowState.width ?? 280;
      const maxX = typeof window !== 'undefined' ? Math.max(0, window.innerWidth - windowWidth) : 1200;
      const maxY = typeof window !== 'undefined' ? Math.max(40, window.innerHeight - 40) : 800;

      const nextX = Math.max(0, Math.min(maxX, Math.round(dragRef.current.initialX + deltaX)));
      const nextY = Math.max(40, Math.min(maxY, Math.round(dragRef.current.initialY + deltaY)));

      updatePosition(id, nextX, nextY);
    },
    [id, updatePosition, windowState.width]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragRef.current.isDragging) {
        dragRef.current.isDragging = false;
        setIsDraggingState(false);
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          // Ignore
        }
      }
    },
    []
  );

  if (!windowState.isOpen) return null;

  return (
    <div
      ref={windowRef}
      className={`draggable-window ${isDraggingState ? 'is-dragging' : ''} ${
        windowState.isMinimized ? 'is-minimized' : ''
      } ${className}`}
      style={{
        left: `${windowState.x}px`,
        top: `${windowState.y}px`,
        width: defaultWidth ? `${defaultWidth}px` : windowState.width ? `${windowState.width}px` : undefined,
        zIndex: windowState.zIndex,
      }}
      onPointerDown={() => bringToFront(id)}
    >
      <div
        className="window-header"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="window-title-group">
          {icon && <span className="window-icon">{icon}</span>}
          <span className="window-title">{windowState.title}</span>
          {badge}
        </div>
        <div className="window-controls">
          <button
            type="button"
            className="window-btn minimize-btn"
            title={windowState.isMinimized ? 'Expandir' : 'Minimizar'}
            onClick={(e) => {
              e.stopPropagation();
              toggleMinimize(id);
            }}
          >
            {windowState.isMinimized ? '▲' : '▼'}
          </button>
          <button
            type="button"
            className="window-btn close-btn"
            title="Fechar Janela"
            onClick={(e) => {
              e.stopPropagation();
              closeWindow(id);
            }}
          >
            ✕
          </button>
        </div>
      </div>
      {!windowState.isMinimized && <div className="window-body">{children}</div>}
    </div>
  );
}
