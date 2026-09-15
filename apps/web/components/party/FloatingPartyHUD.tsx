'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { CharacterState } from '../../../../packages/domain/src/types';
import { experienceProgress } from '../../../../packages/domain/src/experience';

export interface FloatingPartyHUDProps {
  characters: CharacterState[];
  activeCharacterId: string;
  onSelectActiveCharacter: (characterId: string) => void;
  onOpenPartyModal?: () => void;
}

const STORAGE_KEY = 'cavebound_floating_party_hud_pos';
const STORAGE_MIN_KEY = 'cavebound_floating_party_hud_min';

export function FloatingPartyHUD({
  characters,
  activeCharacterId,
  onSelectActiveCharacter,
  onOpenPartyModal,
}: FloatingPartyHUDProps) {
  // Only render when the party has more than 1 character
  if (!characters || characters.length <= 1) {
    return null;
  }

  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(STORAGE_MIN_KEY) === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            return {
              x: Math.max(10, Math.min(parsed.x, window.innerWidth - 280)),
              y: Math.max(40, Math.min(parsed.y, window.innerHeight - 100)),
            };
          }
        }
      } catch {}
      return { x: 18, y: 70 };
    }
    return { x: 18, y: 70 };
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
    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;
    if (Math.abs(deltaX) < 2 && Math.abs(deltaY) < 2) return;

    const maxX = typeof window !== 'undefined' ? Math.max(0, window.innerWidth - 260) : 1000;
    const maxY = typeof window !== 'undefined' ? Math.max(40, window.innerHeight - 60) : 800;

    const newX = Math.max(8, Math.min(maxX, Math.round(dragRef.current.initialX + deltaX)));
    const newY = Math.max(40, Math.min(maxY, Math.round(dragRef.current.initialY + deltaY)));

    setPos({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.isDragging) {
      dragRef.current.isDragging = false;
      setIsDragging(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
      } catch {}
    }
  };

  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_MIN_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  return (
    <div
      data-testid="floating-party-hud"
      style={{
        position: 'fixed',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: isMinimized ? '200px' : '260px',
        backgroundColor: 'rgba(17, 19, 21, 0.94)',
        border: '1px solid #3d3b37',
        borderRadius: '6px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.75)',
        color: '#d4cfb8',
        fontFamily: 'Verdana, Arial, sans-serif',
        fontSize: '11px',
        zIndex: 1100,
        userSelect: 'none',
        transition: isDragging ? 'none' : 'width 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {/* Header (Draggable) */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          background: 'linear-gradient(180deg, #2b2925 0%, #1a1917 100%)',
          borderBottom: isMinimized ? 'none' : '1px solid #3d3b37',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px' }}>🛡️</span>
          <span style={{ fontWeight: '700', color: '#e2a344', letterSpacing: '0.3px', fontSize: '11px' }}>
            Party ({characters.length}/4)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {onOpenPartyModal && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenPartyModal();
              }}
              title="Abrir gerenciamento de Party"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8e8a7f',
                cursor: 'pointer',
                padding: '2px 4px',
                fontSize: '11px',
                lineHeight: 1,
              }}
            >
              ⚙️
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleMinimize();
            }}
            title={isMinimized ? 'Expandir HUD da Party' : 'Minimizar HUD da Party'}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#d4cfb8',
              cursor: 'pointer',
              padding: '2px 6px',
              fontWeight: '700',
              fontSize: '12px',
              lineHeight: 1,
            }}
          >
            {isMinimized ? '＋' : '—'}
          </button>
        </div>
      </div>

      {/* Body: Members list */}
      {!isMinimized && (
        <div
          style={{
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '7px',
            maxHeight: '420px',
            overflowY: 'auto',
          }}
        >
          {characters.map((member) => {
            const isActive = member.id === activeCharacterId;
            const maxHp = Math.max(1, member.maxHp || 150);
            const currentHp = Math.max(0, Math.min(member.currentHp ?? maxHp, maxHp));
            const hpRatio = currentHp / maxHp;

            const maxMp = Math.max(1, member.maxMana || 35);
            const currentMp = Math.max(0, Math.min(member.currentMana ?? maxMp, maxMp));
            const mpRatio = currentMp / maxMp;

            const maxStamina = Math.max(1, member.maxStaminaMinutes ?? 2520);
            const curStamina = Math.max(0, member.staminaMinutes ?? maxStamina);
            const staminaHours = Math.floor(curStamina / 60);
            const staminaMins = Math.floor(curStamina % 60);
            const staminaRatio = Math.min(1, curStamina / maxStamina);

            const xpRatio = experienceProgress(member.level || 1, Number(member.experience || 0));

            return (
              <div
                key={member.id}
                data-testid={`party-hud-member-${member.id}`}
                onDoubleClick={() => onSelectActiveCharacter(member.id)}
                title="Clique 2x para tornar este personagem ativo e focar a câmera"
                style={{
                  padding: '7px 8px',
                  backgroundColor: isActive ? 'rgba(56, 44, 26, 0.55)' : 'rgba(26, 27, 29, 0.7)',
                  border: isActive ? '1px solid #e2a344' : '1px solid #2d2e30',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 0 8px rgba(226, 163, 68, 0.25)' : 'none',
                }}
              >
                {/* Name, Vocation & Active Status */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '5px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}>
                    <span
                      style={{
                        fontWeight: '700',
                        color: isActive ? '#f7cf6d' : '#f0ece1',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '130px',
                      }}
                    >
                      {member.name}
                    </span>
                    <span style={{ fontSize: '9.5px', color: '#9d998e' }}>
                      Lv. {member.level}
                    </span>
                  </div>

                  {isActive ? (
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: '700',
                        color: '#1a1405',
                        backgroundColor: '#e2a344',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        letterSpacing: '0.2px',
                      }}
                    >
                      ⭐ Ativo
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '9.5px',
                        color: '#7a766c',
                        fontStyle: 'italic',
                      }}
                    >
                      {member.vocation}
                    </span>
                  )}
                </div>

                {/* HP Bar */}
                <div style={{ marginBottom: '4px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '9px',
                      marginBottom: '1px',
                      color: '#a09c91',
                    }}
                  >
                    <span>HP</span>
                    <span>
                      {currentHp}/{maxHp} ({Math.round(hpRatio * 100)}%)
                    </span>
                  </div>
                  <div
                    style={{
                      height: '5px',
                      backgroundColor: '#251010',
                      borderRadius: '2px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.max(0, Math.min(100, hpRatio * 100))}%`,
                        height: '100%',
                        backgroundColor: '#4fc977',
                        transition: 'width 0.2s ease',
                      }}
                    />
                  </div>
                </div>

                {/* MP Bar */}
                <div style={{ marginBottom: '4px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '9px',
                      marginBottom: '1px',
                      color: '#a09c91',
                    }}
                  >
                    <span>MP</span>
                    <span>
                      {currentMp}/{maxMp} ({Math.round(mpRatio * 100)}%)
                    </span>
                  </div>
                  <div
                    style={{
                      height: '5px',
                      backgroundColor: '#0e1a2f',
                      borderRadius: '2px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.max(0, Math.min(100, mpRatio * 100))}%`,
                        height: '100%',
                        backgroundColor: '#368ce7',
                        transition: 'width 0.2s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Stamina & XP split row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '6px',
                    marginTop: '3px',
                  }}
                >
                  {/* Stamina */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '8.5px',
                        marginBottom: '1px',
                        color: '#9d998e',
                      }}
                    >
                      <span>Stamina</span>
                      <span>{staminaHours}h{staminaMins > 0 ? ` ${staminaMins}m` : ''}</span>
                    </div>
                    <div
                      style={{
                        height: '3px',
                        backgroundColor: '#2b2318',
                        borderRadius: '2px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.max(0, Math.min(100, staminaRatio * 100))}%`,
                          height: '100%',
                          backgroundColor: '#f59e0b',
                          transition: 'width 0.2s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* XP Progress */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '8.5px',
                        marginBottom: '1px',
                        color: '#9d998e',
                      }}
                    >
                      <span>XP</span>
                      <span>{Math.round(xpRatio * 100)}%</span>
                    </div>
                    <div
                      style={{
                        height: '3px',
                        backgroundColor: '#261b33',
                        borderRadius: '2px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.max(0, Math.min(100, xpRatio * 100))}%`,
                          height: '100%',
                          backgroundColor: '#a855f7',
                          transition: 'width 0.2s ease',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div
            style={{
              textAlign: 'center',
              fontSize: '8.5px',
              color: '#716e66',
              paddingTop: '3px',
              borderTop: '1px dashed #2d2e30',
            }}
          >
            Dica: 2 cliques para assumir o controle
          </div>
        </div>
      )}
    </div>
  );
}
