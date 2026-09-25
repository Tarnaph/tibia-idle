'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';

export type MovementDirection = 'north' | 'south' | 'east' | 'west' | 'north-east' | 'north-west' | 'south-east' | 'south-west';

interface MobileVirtualDPadProps {
  onMove: (direction: MovementDirection) => void;
  disabled?: boolean;
}

export function MobileVirtualDPad({ onMove, disabled = false }: MobileVirtualDPadProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeDir, setActiveDir] = useState<MovementDirection | null>(null);

  const activeDirRef = useRef<MovementDirection | null>(null);
  activeDirRef.current = activeDir;

  const repeatIntervalRef = useRef<any>(null);

  const startRepeating = useCallback((dir: MovementDirection) => {
    if (repeatIntervalRef.current) clearInterval(repeatIntervalRef.current);
    onMove(dir);
    repeatIntervalRef.current = setInterval(() => {
      if (activeDirRef.current) {
        onMove(activeDirRef.current);
      }
    }, 180);
  }, [onMove]);

  const stopRepeating = useCallback(() => {
    if (repeatIntervalRef.current) {
      clearInterval(repeatIntervalRef.current);
      repeatIntervalRef.current = null;
    }
    setActiveDir(null);
    setKnobPos({ x: 0, y: 0 });
  }, []);

  const calculateDirection = (deltaX: number, deltaY: number): MovementDirection | null => {
    const distance = Math.hypot(deltaX, deltaY);
    if (distance < 12) return null; // Deadzone

    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI); // -180 to 180
    // 0 is East, 90 is South, -90 is North, 180/-180 is West

    if (angle >= -22.5 && angle < 22.5) return 'east';
    if (angle >= 22.5 && angle < 67.5) return 'south-east';
    if (angle >= 67.5 && angle < 112.5) return 'south';
    if (angle >= 112.5 && angle < 157.5) return 'south-west';
    if (angle >= -67.5 && angle < -22.5) return 'north-east';
    if (angle >= -112.5 && angle < -67.5) return 'north';
    if (angle >= -157.5 && angle < -112.5) return 'north-west';
    return 'west';
  };

  const handleTouch = (clientX: number, clientY: number) => {
    if (disabled || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    const distance = Math.hypot(deltaX, deltaY);
    const maxRadius = rect.width / 2 - 14;

    const clampedRadius = Math.min(distance, maxRadius);
    const angle = Math.atan2(deltaY, deltaX);

    setKnobPos({
      x: Math.cos(angle) * clampedRadius,
      y: Math.sin(angle) * clampedRadius,
    });

    const newDir = calculateDirection(deltaX, deltaY);
    if (newDir !== activeDir) {
      setActiveDir(newDir);
      if (newDir) {
        startRepeating(newDir);
      } else {
        stopRepeating();
      }
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (disabled) return;
    const touch = e.touches[0];
    handleTouch(touch.clientX, touch.clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (disabled) return;
    const touch = e.touches[0];
    handleTouch(touch.clientX, touch.clientY);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    stopRepeating();
  };

  useEffect(() => {
    return () => {
      if (repeatIntervalRef.current) clearInterval(repeatIntervalRef.current);
    };
  }, []);

  if (disabled) return null;

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      style={{
        position: 'absolute',
        bottom: '120px',
        left: '18px',
        width: '130px',
        height: '130px',
        borderRadius: '50%',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        border: '2px solid rgba(148, 163, 184, 0.35)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7), inset 0 0 16px rgba(0, 0, 0, 0.5)',
        zIndex: 40,
        touchAction: 'none',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Directional Arrow Indicators matching screenshot */}
      <span
        style={{
          position: 'absolute',
          top: '6px',
          color: activeDir === 'north' ? '#fde047' : '#94a3b8',
          fontSize: '14px',
          transition: 'color 0.15s ease',
        }}
      >
        ▲
      </span>
      <span
        style={{
          position: 'absolute',
          bottom: '6px',
          color: activeDir === 'south' ? '#fde047' : '#94a3b8',
          fontSize: '14px',
          transition: 'color 0.15s ease',
        }}
      >
        ▼
      </span>
      <span
        style={{
          position: 'absolute',
          left: '8px',
          color: activeDir === 'west' ? '#fde047' : '#94a3b8',
          fontSize: '14px',
          transition: 'color 0.15s ease',
        }}
      >
        ◀
      </span>
      <span
        style={{
          position: 'absolute',
          right: '8px',
          color: activeDir === 'east' ? '#fde047' : '#94a3b8',
          fontSize: '14px',
          transition: 'color 0.15s ease',
        }}
      >
        ▶
      </span>

      {/* Floating Thumb Knob */}
      <div
        style={{
          width: '46px',
          height: '46px',
          borderRadius: '50%',
          backgroundColor: '#1e293b',
          border: '2px solid #64748b',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.6), inset 0 0 6px rgba(255, 255, 255, 0.15)',
          transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          transition: activeDir ? 'none' : 'transform 0.15s ease-out',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: activeDir ? '#facc15' : '#475569',
            boxShadow: activeDir ? '0 0 8px #facc15' : 'none',
          }}
        />
      </div>
    </div>
  );
}
