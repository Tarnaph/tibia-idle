'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { BestiaryMonster } from '../lib/cyclopediaData';
import { formatNumberWithDots } from '../lib/cyclopediaData';

interface BestiaryTrackerHUDProps {
  monsters?: BestiaryMonster[];
  monster?: BestiaryMonster | null;
  killsById?: Record<string, number>;
  kills?: number;
  firstKillAlert?: string | null;
  onClose: () => void;
  onRemoveMonster?: (monsterId: string) => void;
  onOpenCyclopedia?: (monsterId?: string) => void;
}

const STORAGE_KEY = 'cavebound_bestiary_tracker_pos';

export function BestiaryTrackerHUD({
  monsters,
  monster,
  killsById = {},
  kills = 0,
  firstKillAlert,
  onClose,
  onRemoveMonster,
  onOpenCyclopedia,
}: BestiaryTrackerHUDProps) {
  const [visibleAlert, setVisibleAlert] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // Position state with default at top-right corner
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            return {
              x: Math.min(parsed.x, window.innerWidth - 100),
              y: Math.min(parsed.y, window.innerHeight - 80),
            };
          }
        }
      } catch {}
      // Default top-right position
      return { x: Math.max(20, window.innerWidth - 275), y: 58 };
    }
    return { x: 1000, y: 58 };
  });

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

  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (firstKillAlert) {
      setVisibleAlert(firstKillAlert);
      const timer = setTimeout(() => {
        setVisibleAlert(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [firstKillAlert]);

  // Support both multi-monster array or legacy single monster prop
  const effectiveMonsters: BestiaryMonster[] = (
    monsters && monsters.length > 0 ? monsters : monster ? [monster] : []
  ).filter(Boolean);

  if (effectiveMonsters.length === 0) return null;

  // Pointer drag handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: pos.x,
      initialY: pos.y,
      isDragging: true,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const nextX = Math.max(10, Math.min(window.innerWidth - 120, dragRef.current.initialX + dx));
    const nextY = Math.max(10, Math.min(window.innerHeight - 60, dragRef.current.initialY + dy));
    setPos({ x: nextX, y: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.isDragging) {
      dragRef.current.isDragging = false;
      setIsDragging(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
      } catch {}
    }
  };

  return (
    <aside
      id="bestiary-tracker-hud"
      className="bestiary-tracker-hud"
      aria-label="Rastreador de Bestiário Flutuante"
      style={{
        position: 'fixed',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        zIndex: 9999,
        width: '255px',
        backgroundColor: '#1b1d20',
        backgroundImage: 'linear-gradient(180deg, #24282e 0%, #17191c 100%)',
        border: '2px solid #3c424d',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        borderRadius: '4px',
        fontFamily: 'Verdana, sans-serif',
        color: '#dcdcdc',
        overflow: 'hidden',
        userSelect: 'none',
        transition: isDragging ? 'none' : 'box-shadow 0.2s',
      }}
    >
      {/* Toast Notification for First Kill */}
      {visibleAlert && (
        <div
          style={{
            backgroundColor: '#1e382b',
            borderBottom: '1px solid #2ecc71',
            padding: '6px 8px',
            fontSize: '10px',
            color: '#2ecc71',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            animation: 'fadeIn 0.3s ease-in-out',
          }}
        >
          <span style={{ fontSize: '13px' }}>✨</span>
          <span>{visibleAlert}</span>
        </div>
      )}

      {/* Draggable Window Header */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '5px 8px',
          backgroundColor: isDragging ? '#373e49' : '#2b3038',
          borderBottom: '1px solid #15171a',
          fontSize: '11px',
          fontWeight: 'bold',
          color: '#f0ad4e',
          textShadow: '1px 1px 0 #000',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          title="Clique e arraste para posicionar a janela"
        >
          <span style={{ color: '#f39c12', fontSize: '12px' }}>📖</span>
          <span>Bestiário ({effectiveMonsters.length})</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Minimize / Expand button */}
          <button
            type="button"
            onClick={() => setIsMinimized((prev) => !prev)}
            style={{
              background: 'none',
              border: 'none',
              color: '#a0a0a0',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
            }}
            title={isMinimized ? 'Expandir' : 'Minimizar'}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#fff')}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#a0a0a0')}
          >
            {isMinimized ? '□' : '_'}
          </button>

          {/* Close HUD button */}
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#a0a0a0',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
            }}
            title="Fechar rastreador de bestiário"
            onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#fff')}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#a0a0a0')}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Body Content (if not minimized) */}
      {!isMinimized && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {effectiveMonsters.map((m, idx) => {
            const mId = m.id.toLowerCase();
            const currentKills = Math.max(0, killsById[mId] ?? (effectiveMonsters.length === 1 ? kills : 0));
            const targetKills = m.killsNeeded || 250;
            const isComplete = currentKills >= targetKills;
            const remaining = Math.max(0, targetKills - currentKills);
            const percent = Math.min(100, Math.round((currentKills / targetKills) * 100));

            return (
              <div
                key={m.id}
                style={{
                  padding: '7px 10px',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center',
                  borderTop: idx > 0 ? '1px solid #23272e' : 'none',
                  backgroundColor: idx % 2 === 1 ? 'rgba(0,0,0,0.12)' : 'transparent',
                }}
              >
                {/* Monster Sprite */}
                <div
                  onClick={() => onOpenCyclopedia?.(m.id)}
                  title={`Abrir ${m.name} na Cyclopedia`}
                  style={{
                    width: '38px',
                    height: '38px',
                    backgroundColor: '#121416',
                    border: '1px solid #2d333b',
                    borderRadius: '3px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={m.spriteUrl}
                    alt={m.name}
                    style={{
                      maxWidth: '34px',
                      maxHeight: '34px',
                      imageRendering: 'pixelated',
                    }}
                    onError={(e) => {
                      const clean = m.id.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                      const fallback = `/generated/tibia1098/monster-${clean}-thumb.png`;
                      if (e.currentTarget.src !== fallback && !e.currentTarget.src.endsWith(fallback)) {
                        e.currentTarget.src = fallback;
                      }
                    }}
                  />
                </div>

                {/* Progress & Kills info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '10px',
                      marginBottom: '3px',
                    }}
                  >
                    <span
                      onClick={() => onOpenCyclopedia?.(m.id)}
                      style={{
                        color: '#f3f4f6',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '110px',
                      }}
                      title={m.name}
                    >
                      {m.name}
                    </span>
                    <span style={{ color: isComplete ? '#f1c40f' : '#8c95a0', fontSize: '9px', fontWeight: 'bold' }}>
                      {isComplete ? '★ 100%' : `${percent}%`}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div
                    style={{
                      height: '7px',
                      backgroundColor: '#101214',
                      borderRadius: '2px',
                      border: '1px solid #2d3239',
                      overflow: 'hidden',
                      marginBottom: '3px',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${percent}%`,
                        backgroundColor: isComplete ? '#f1c40f' : '#2ecc71',
                        backgroundImage: isComplete
                          ? 'linear-gradient(90deg, #d4ac0d, #f1c40f)'
                          : 'linear-gradient(90deg, #27ae60, #2ecc71)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '9px',
                      color: '#88929b',
                    }}
                  >
                    <span>
                      {formatNumberWithDots(currentKills)} / {formatNumberWithDots(targetKills)}
                    </span>
                    {isComplete ? (
                      <span style={{ color: '#f1c40f' }}>Completo!</span>
                    ) : (
                      <span>Faltam {formatNumberWithDots(remaining)}</span>
                    )}
                  </div>
                </div>

                {/* Individual remove button if more than 1 monster */}
                {effectiveMonsters.length > 1 && onRemoveMonster && (
                  <button
                    type="button"
                    onClick={() => onRemoveMonster(m.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#6b7280',
                      fontSize: '11px',
                      cursor: 'pointer',
                      padding: '2px',
                      lineHeight: 1,
                    }}
                    title={`Remover ${m.name} do rastreador`}
                    onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#ef4444')}
                    onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#6b7280')}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
