'use client';

import React, { useState, useEffect } from 'react';
import type { CharacterState } from '@/packages/domain/src/types';
import { isAudioMuted, toggleAudioMuted, onAudioChange } from '@/apps/web/lib/audioManager';

interface MobileTopBarProps {
  character: CharacterState;
  isPremium?: boolean;
  avatarUrl?: string;
  isConnected?: boolean;
  onOpenSettings?: () => void;
  onOpenProfile?: () => void;
  onOpenHuntSelector?: () => void;
}

export function MobileTopBar({
  character,
  isPremium = false,
  avatarUrl = '/assets/avatars/avatar-1.png',
  isConnected = true,
  onOpenSettings,
  onOpenProfile,
  onOpenHuntSelector,
}: MobileTopBarProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(() => (typeof window !== 'undefined' ? isAudioMuted() : false));

  useEffect(() => {
    return onAudioChange((state) => {
      setIsMuted(state.isMuted);
    });
  }, []);

  const handleToggleSound = () => {
    const next = toggleAudioMuted();
    setIsMuted(next);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      const docEl = document.documentElement as any;
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  };

  const currentHp = (character as any)?.currentHp ?? (character as any)?.health ?? 150;
  const maxHp = Math.max(1, (character as any)?.maxHp ?? (character as any)?.maxHealth ?? 150);
  const hpPercent = Math.min(100, Math.max(0, (currentHp / maxHp) * 100));

  const currentMp = (character as any)?.currentMana ?? (character as any)?.mana ?? 35;
  const maxMp = Math.max(1, (character as any)?.maxMana ?? (character as any)?.maxMana ?? 35);
  const mpPercent = Math.min(100, Math.max(0, (currentMp / maxMp) * 100));

  // XP calculation
  const currentExp = Number(character.experience ?? 0);
  const nextLevelExp = (character.level + 1) * 1000;
  const currentLevelBaseExp = character.level * 1000;
  const expNeeded = Math.max(1, nextLevelExp - currentLevelBaseExp);
  const expProgress = Math.max(0, currentExp - currentLevelBaseExp);
  const xpPercent = Math.min(100, Math.max(0, (expProgress / expNeeded) * 100));

  const vocName = character.vocation || character.baseVocation || 'Knight';

  return (
    <header
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: '8px 12px',
        background: 'linear-gradient(180deg, rgba(11, 15, 25, 0.95) 0%, rgba(11, 15, 25, 0.8) 80%, transparent 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        pointerEvents: 'auto',
      }}
    >
      {/* Left: Avatar + Identity + Bars */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0, position: 'relative' }}>
        {/* Avatar Frame */}
        <div
          onClick={onOpenProfile}
          role="button"
          tabIndex={0}
          title="Ver Perfil do Personagem"
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '8px',
            border: '2px solid #ca8a04',
            background: '#090d16',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.6), inset 0 0 4px rgba(202, 138, 4, 0.4)',
            overflow: 'hidden',
            flexShrink: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={avatarUrl}
            alt={character.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/generated/outfit-thumbs/citizen.png';
            }}
          />
        </div>

        {/* Floating Circular Hunt Button directly below the avatar */}
        {onOpenHuntSelector && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenHuntSelector();
            }}
            title="Abrir Mapa de Caçadas"
            style={{
              position: 'absolute',
              top: '52px',
              left: '5px',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#0f172a',
              border: '2px solid #eab308',
              color: '#facc15',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.8), 0 0 10px rgba(234, 179, 8, 0.35)',
              cursor: 'pointer',
              zIndex: 55,
              transition: 'transform 0.15s ease',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="22" y1="12" x2="18" y2="12" />
              <line x1="6" y1="12" x2="2" y2="12" />
              <line x1="12" y1="6" x2="12" y2="2" />
              <line x1="12" y1="22" x2="12" y2="18" />
            </svg>
          </button>
        )}

        {/* Identity & Status Bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
          {/* Row 1: Name, Voc/Level, Premium badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 800,
                color: '#fff',
                letterSpacing: '0.2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {character.name}
            </span>
            <span style={{ fontSize: '11px', color: '#93c5fd', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {vocName} Lv {character.level}
            </span>
            {isPremium ? (
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  backgroundColor: '#854d0e',
                  border: '1px solid #facc15',
                  color: '#fef08a',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  lineHeight: '1.2',
                }}
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fef08a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
                </svg>
                PREMIUM
              </span>
            ) : (
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  backgroundColor: '#1e293b',
                  color: '#94a3b8',
                  padding: '1px 4px',
                  borderRadius: '3px',
                  lineHeight: '1.2',
                }}
              >
                FREE
              </span>
            )}
          </div>

          {/* Row 2: HP Bar */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '180px',
              height: '11px',
              backgroundColor: '#180808',
              borderRadius: '3px',
              border: '1px solid #7f1d1d',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${hpPercent}%`,
                height: '100%',
                backgroundColor: '#dc2626',
                background: 'linear-gradient(90deg, #b91c1c 0%, #ef4444 100%)',
                transition: 'width 0.2s ease',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 4px',
                fontSize: '8.5px',
                fontWeight: 700,
                color: '#fff',
                textShadow: '0 1px 2px #000',
              }}
            >
              <span>HP</span>
              <span>{Math.round(currentHp)} / {maxHp}</span>
            </div>
          </div>

          {/* Row 3: Mana Bar */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '180px',
              height: '11px',
              backgroundColor: '#08101e',
              borderRadius: '3px',
              border: '1px solid #1e3a8a',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${mpPercent}%`,
                height: '100%',
                backgroundColor: '#2563eb',
                background: 'linear-gradient(90deg, #1d4ed8 0%, #3b82f6 100%)',
                transition: 'width 0.2s ease',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 4px',
                fontSize: '8.5px',
                fontWeight: 700,
                color: '#fff',
                textShadow: '0 1px 2px #000',
              }}
            >
              <span>MP</span>
              <span>{Math.round(currentMp)} / {maxMp}</span>
            </div>
          </div>

          {/* Row 4: Thin Gold XP Bar */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '180px',
              height: '5px',
              backgroundColor: '#1c1503',
              borderRadius: '2px',
              border: '1px solid #713f12',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${xpPercent}%`,
                height: '100%',
                backgroundColor: '#eab308',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* Right: Quick Action Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        {/* Fullscreen Native Toggle Button */}
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Sair da Tela Cheia' : 'Modo Tela Cheia (Ocultar Barra do Navegador)'}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: '1px solid #ca8a04',
            background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
            color: '#fef08a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.4)',
            transition: 'all 0.15s ease',
          }}
        >
          {isFullscreen ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          )}
        </button>

        {/* Audio Mute / Unmute Button */}
        <button
          type="button"
          onClick={handleToggleSound}
          title={isMuted ? 'Desmutar Áudio do Jogo' : 'Mutar Áudio do Jogo'}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: isMuted ? '1px solid #ef4444' : '1px solid #10b981',
            background: isMuted
              ? 'linear-gradient(180deg, rgba(239, 68, 68, 0.25) 0%, #0f172a 100%)'
              : 'linear-gradient(180deg, rgba(16, 185, 129, 0.25) 0%, #0f172a 100%)',
            color: isMuted ? '#f87171' : '#34d399',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.4)',
            transition: 'all 0.15s ease',
          }}
        >
          {isMuted ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
        </button>

        {/* Network Signal Indicator */}
        <div
          title={isConnected ? 'Conectado ao Servidor Thais' : 'Desconectado'}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: '1px solid #334155',
            background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.4)',
            gap: '4px',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 20h.01" />
            <path d="M7 20v-4" />
            <path d="M12 20v-8" />
            <path d="M17 20V4" />
          </svg>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#22c55e' : '#ef4444',
              boxShadow: isConnected ? '0 0 6px #22c55e' : '0 0 6px #ef4444',
            }}
          />
        </div>
      </div>
    </header>
  );
}
