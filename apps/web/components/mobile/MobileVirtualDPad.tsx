'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';

export type MovementDirection = 'north' | 'south' | 'east' | 'west' | 'north-east' | 'north-west' | 'south-east' | 'south-west';

interface MobileVirtualDPadProps {
  onMove: (direction: MovementDirection) => void;
  disabled?: boolean;
}

// 240ms provides a comfortable, authentic walking pace without flooding the game loop
const STEP_CADENCE_MS = 240;

export function MobileVirtualDPad({ onMove, disabled = false }: MobileVirtualDPadProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeDir, setActiveDir] = useState<MovementDirection | null>(null);

  const activeDirRef = useRef<MovementDirection | null>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  const repeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastStepTimeRef = useRef<number>(0);
  const isPointerDownRef = useRef(false);

  const executeStep = useCallback((dir: MovementDirection) => {
    const now = performance.now();
    lastStepTimeRef.current = now;
    onMoveRef.current(dir);
  }, []);

  const stopRepeating = useCallback(() => {
    if (repeatIntervalRef.current) {
      clearInterval(repeatIntervalRef.current);
      repeatIntervalRef.current = null;
    }
    isPointerDownRef.current = false;
    activeDirRef.current = null;
    setActiveDir(null);
    setKnobPos({ x: 0, y: 0 });
  }, []);

  const startRepeating = useCallback((dir: MovementDirection) => {
    if (repeatIntervalRef.current) {
      clearInterval(repeatIntervalRef.current);
    }
    activeDirRef.current = dir;
    setActiveDir(dir);

    // Initial step: execute immediately if enough time elapsed, otherwise wait
    const now = performance.now();
    const timeSinceLast = now - lastStepTimeRef.current;
    if (timeSinceLast >= STEP_CADENCE_MS) {
      executeStep(dir);
    }

    // Steady cadence loop
    repeatIntervalRef.current = setInterval(() => {
      if (activeDirRef.current) {
        executeStep(activeDirRef.current);
      }
    }, STEP_CADENCE_MS);
  }, [executeStep]);

  const calculateDirection = (deltaX: number, deltaY: number): MovementDirection | null => {
    const distance = Math.hypot(deltaX, deltaY);
    if (distance < 14) return null; // 14px deadzone for stable finger resting

    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI); // -180 to 180

    if (angle >= -22.5 && angle < 22.5) return 'east';
    if (angle >= 22.5 && angle < 67.5) return 'south-east';
    if (angle >= 67.5 && angle < 112.5) return 'south';
    if (angle >= 112.5 && angle < 157.5) return 'south-west';
    if (angle >= -67.5 && angle < -22.5) return 'north-east';
    if (angle >= -112.5 && angle < -67.5) return 'north';
    if (angle >= -157.5 && angle < -112.5) return 'north-west';
    return 'west';
  };

  const processPointerCoordinates = (clientX: number, clientY: number) => {
    if (disabled || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    const distance = Math.hypot(deltaX, deltaY);
    const maxRadius = rect.width / 2 - 12;

    const clampedRadius = Math.min(distance, maxRadius);
    const angle = Math.atan2(deltaY, deltaX);

    setKnobPos({
      x: Math.cos(angle) * clampedRadius,
      y: Math.sin(angle) * clampedRadius,
    });

    const newDir = calculateDirection(deltaX, deltaY);

    if (newDir !== activeDirRef.current) {
      if (newDir) {
        if (!repeatIntervalRef.current) {
          // Started moving from idle: launch steady loop
          startRepeating(newDir);
        } else {
          // Steer smoothly in motion: update direction target without triggering immediate sudden step
          activeDirRef.current = newDir;
          setActiveDir(newDir);
        }
      } else {
        // Returned to deadzone
        stopRepeating();
      }
    }
  };

  // Pointer event handlers with pointer capture support
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (disabled) return;
    isPointerDownRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    processPointerCoordinates(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!isPointerDownRef.current || disabled) return;
    processPointerCoordinates(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
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
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'absolute',
        bottom: '122px',
        left: '16px',
        width: '124px',
        height: '124px',
        borderRadius: '50%',
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(6px)',
        border: '2px solid rgba(212, 163, 89, 0.45)',
        boxShadow: '0 8px 28px rgba(0, 0, 0, 0.8), inset 0 0 16px rgba(0, 0, 0, 0.6)',
        zIndex: 40,
        touchAction: 'none',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      aria-label="Controle Virtual de Movimento"
    >
      {/* Cardinal & Diagonal Direction Indicators */}
      <span
        style={{
          position: 'absolute',
          top: '5px',
          color: activeDir?.includes('north') ? '#facc15' : '#64748b',
          fontSize: '12px',
          fontWeight: 'bold',
          transition: 'color 0.15s ease',
          pointerEvents: 'none',
        }}
      >
        ▲
      </span>
      <span
        style={{
          position: 'absolute',
          bottom: '5px',
          color: activeDir?.includes('south') ? '#facc15' : '#64748b',
          fontSize: '12px',
          fontWeight: 'bold',
          transition: 'color 0.15s ease',
          pointerEvents: 'none',
        }}
      >
        ▼
      </span>
      <span
        style={{
          position: 'absolute',
          left: '6px',
          color: activeDir?.includes('west') ? '#facc15' : '#64748b',
          fontSize: '12px',
          fontWeight: 'bold',
          transition: 'color 0.15s ease',
          pointerEvents: 'none',
        }}
      >
        ◀
      </span>
      <span
        style={{
          position: 'absolute',
          right: '6px',
          color: activeDir?.includes('east') ? '#facc15' : '#64748b',
          fontSize: '12px',
          fontWeight: 'bold',
          transition: 'color 0.15s ease',
          pointerEvents: 'none',
        }}
      >
        ▶
      </span>

      {/* Floating Center Joystick Thumb Knob */}
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          backgroundColor: '#1b1d22',
          border: `2px solid ${activeDir ? '#facc15' : '#64748b'}`,
          boxShadow: activeDir
            ? '0 0 14px rgba(250, 204, 21, 0.5), inset 0 0 8px rgba(250, 204, 21, 0.2)'
            : '0 2px 10px rgba(0, 0, 0, 0.7), inset 0 0 6px rgba(255, 255, 255, 0.1)',
          transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0)`,
          transition: activeDir ? 'none' : 'transform 0.16s cubic-bezier(0.2, 0.8, 0.2, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            backgroundColor: activeDir ? '#facc15' : '#475569',
            boxShadow: activeDir ? '0 0 8px #facc15' : 'none',
          }}
        />
      </div>
    </div>
  );
}

