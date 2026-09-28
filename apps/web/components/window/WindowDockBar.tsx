'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useWindowManager, type WindowId } from './WindowManagerContext';
import { useGameModal } from '@/apps/web/contexts/GameModalContext';
import { AutoIdleButton } from '../AutoIdleButton';
import { getZoomMultiplier, setZoomMultiplier, resetZoomMultiplier, onZoomChange } from '@/apps/web/lib/zoomManager';
import type { CharacterState, DerivedStats } from '@/packages/domain/src';
import { experienceProgress, isGreenStaminaActive, getEffectiveExpMultiplier, getCompletedBestiaryCount, getBestiaryExpBonusPercent } from '@/packages/domain/src';
import {
  getAudioVolume,
  setAudioVolume,
  isAudioMuted,
  setAudioMuted,
  toggleAudioMuted,
  onAudioChange,
  stopCityBgm,
  stopAllAudio,
  triggerTrackNotification,
  THAIS_THEME_TRACK,
  type AudioState,
} from '@/apps/web/lib/audioManager';
import { clientErrorLogger } from '@/apps/web/lib/errorLogger';

interface WindowDockBarProps {
  gold: number;
  coins?: number;
  accountUsername?: string;
  characterName?: string;
  character?: CharacterState;
  stats?: DerivedStats;
  onlinePlayersCount?: number;
  debug: boolean;
  isAdmin?: boolean;
  isAutoIdle?: boolean;
  inHunt?: boolean;
  isTraining?: boolean;
  staminaMinutes?: number;
  maxStaminaMinutes?: number;
  avatarId?: number;
  onOpenProfile?: () => void;
  onToggleAutoIdle?: () => void;
  onToggleDebug: () => void;
  onSelectHunt: () => void;
  onOpenSkills?: () => void;
  onOpenShop?: () => void;
  onOpenOutfit?: () => void;
  onOpenCyclopedia?: () => void;
  onOpenParty?: () => void;
  isMounted?: boolean;
  onToggleMount?: () => void;
  onExitGame?: () => void;
  onOpenPromotion?: () => void;
  onOpenRanking?: () => void;
  onOpenPvP?: () => void;
  onOpenDebug?: () => void;
  bestiaryKills?: Record<string, number>;
  isBestiaryTrackerOpen?: boolean;
  onToggleBestiaryTracker?: () => void;
}

export function WindowDockBar({
  gold,
  coins = 0,
  accountUsername = 'ADMIN',
  characterName = 'Hero',
  character,
  stats,
  onlinePlayersCount = 13315,
  debug,
  isAdmin = false,
  isAutoIdle = false,
  inHunt = false,
  isTraining = false,
  staminaMinutes = 15,
  maxStaminaMinutes = 15,
  avatarId = 1,
  bestiaryKills,
  onOpenProfile,
  onToggleAutoIdle,
  onToggleDebug,
  onSelectHunt,
  onOpenSkills,
  onOpenShop,
  onOpenOutfit,
  onOpenCyclopedia,
  onOpenParty,
  onOpenRanking,
  onOpenPvP,
  onOpenDebug,
  isMounted = false,
  onToggleMount,
  onExitGame,
  onOpenPromotion,
  isBestiaryTrackerOpen = false,
  onToggleBestiaryTracker,
}: WindowDockBarProps) {
  const { windows, toggleWindow, resetLayout } = useWindowManager();
  const gameModal = useGameModal();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);
  const [isInspectOpen, setIsInspectOpen] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const inspectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setErrorCount(clientErrorLogger.getErrorCount());
    const unsub = clientErrorLogger.subscribe(() => {
      setErrorCount(clientErrorLogger.getErrorCount());
    });
    return () => unsub();
  }, []);
  const [zoom, setZoom] = useState(() => getZoomMultiplier());
  const [audioState, setAudioState] = useState<AudioState>(() => ({
    volume: getAudioVolume(),
    isMuted: isAudioMuted(),
    isPlayingCityBgm: false,
  }));

  useEffect(() => {
    return onZoomChange((newZoom) => {
      setZoom(newZoom);
    });
  }, []);

  useEffect(() => {
    return onAudioChange((nextAudio) => {
      setAudioState(nextAudio);
    });
  }, []);

  // Quick shortcut: Press 'M' (when not in input) to toggle mute
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;
      if (e.key === 'm' || e.key === 'M') {
        toggleAudioMuted();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleExit = () => {
    stopAllAudio();
    if (onExitGame) {
      onExitGame();
    } else {
      window.location.href = '/';
    }
  };

  const handleInspectMouseEnter = () => {
    if (inspectTimeoutRef.current) {
      clearTimeout(inspectTimeoutRef.current);
      inspectTimeoutRef.current = null;
    }
    setIsAvatarHovered(true);
    setIsInspectOpen(true);
  };

  const handleInspectMouseLeave = () => {
    setIsAvatarHovered(false);
    inspectTimeoutRef.current = setTimeout(() => {
      setIsInspectOpen(false);
    }, 250);
  };

  useEffect(() => {
    return () => {
      if (inspectTimeoutRef.current) {
        clearTimeout(inspectTimeoutRef.current);
      }
    };
  }, []);

  const charName = character?.name || characterName;
  const vocationName = (character?.vocation || 'Elite Knight').toUpperCase();
  const level = character?.level ?? 1;
  const isPremium = character?.isPremium ?? false;
  const rawAdminTitle = (character as any)?.adminTitle;
  const cleanCharTitle = (rawAdminTitle && rawAdminTitle !== 'null' && rawAdminTitle !== 'undefined') ? rawAdminTitle : undefined;
  const adminTitle = (cleanCharTitle === 'GOD' || cleanCharTitle === 'GM') ? cleanCharTitle : (isAdmin ? 'GOD' : undefined);
  const isGreenStamina = isGreenStaminaActive(character?.staminaMinutes ?? staminaMinutes);
  const effectiveBestiaryKills = bestiaryKills || (character as any)?.bestiaryKills || {};
  const bestiaryCompletedCount = getCompletedBestiaryCount(effectiveBestiaryKills);
  const bestiaryBonusPercent = getBestiaryExpBonusPercent(effectiveBestiaryKills);
  const effectiveExpMult = getEffectiveExpMultiplier(
    level,
    character?.staminaMinutes ?? staminaMinutes,
    1.0,
    bestiaryBonusPercent
  );

  const currentHp = character?.currentHp ?? 150;
  const maxHp = character?.maxHp ?? 150;
  const currentMana = character?.currentMana ?? 35;
  const maxMana = character?.maxMana ?? 35;
  const currentExp = character?.experience ?? 0;

  const xpProgressVal = experienceProgress(level, currentExp);
  const xpPercent = Math.min(100, Math.max(0, Number((xpProgressVal * 100).toFixed(1))));

  const hpPercent = maxHp > 0 ? Math.min(100, Math.max(0, (currentHp / maxHp) * 100)) : 100;
  const manaPercent = maxMana > 0 ? Math.min(100, Math.max(0, (currentMana / maxMana) * 100)) : 100;

  // Skills
  const skills = character?.skills ?? {
    fist: 10,
    club: 10,
    sword: 10,
    axe: 10,
    distance: 10,
    shielding: 10,
    magicLevel: 0,
  };

  // Combat Stats
  const rawAttack = stats?.attack ?? 15;
  const maxDmg = Math.max(1, rawAttack);
  const minDmg = Math.max(1, Math.round(maxDmg * 0.7));
  const damageRangeStr = `${minDmg}-${maxDmg}`;
  const armorVal = stats?.armor ?? 0;
  const defenseVal = stats?.defense ?? 0;

  // Party Exp Share Range (Classic Tibia formula: 2/3 level to 3/2 level)
  const shareMin = Math.ceil((level * 2) / 3);
  const shareMax = Math.floor((level * 3) / 2);

  return (
    <header className="huntera-top-bar" aria-label="Barra de Navegação Exura">
      {/* Left Cluster: Brand Logo, Account Profile Card & Currencies */}
      <div className="huntera-left-cluster" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="huntera-logo-wrap" title="Exura Online">
          <img src="/logo.png" alt="Exura Logo" className="huntera-logo-img" />
        </div>

        {/* Account Profile Card & Character Inspect Container */}
        <div
          className="huntera-profile-card"
          data-testid="huntera-profile-card"
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(20, 24, 33, 0.92)',
            border: '1px solid #2d3748',
            borderRadius: '6px',
            padding: '3px 10px 3px 6px',
            cursor: 'pointer',
          }}
          onMouseEnter={handleInspectMouseEnter}
          onMouseLeave={handleInspectMouseLeave}
          onClick={() => {
            if (onOpenOutfit) onOpenOutfit();
            else if (onOpenProfile) onOpenProfile();
            else gameModal.openOutfit();
          }}
        >
          {/* Avatar Box with "Personagem" Tooltip */}
          <div
            className="huntera-avatar-box"
            data-testid="huntera-avatar-box"
            style={{
              position: 'relative',
              width: '38px',
              height: '38px',
              minWidth: '38px',
              minHeight: '38px',
              background: '#0a0d14',
              cursor: 'pointer',
              border: isAvatarHovered ? '2px solid #38bdf8' : '2px solid #232c3d',
              borderRadius: '4px',
              transition: 'all 0.15s ease-in-out',
              transform: isAvatarHovered ? 'scale(1.04)' : 'scale(1)',
              boxShadow: isAvatarHovered ? '0 0 12px rgba(56, 189, 248, 0.4)' : 'none',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                borderRadius: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={`/assets/avatars/avatar-${avatarId}.png`}
                alt={charName}
                className="huntera-avatar-img"
                style={{
                  width: '100%',
                  height: '100%',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
                onError={(e) => {
                  e.currentTarget.src = '/assets/avatars/avatar-1.png';
                }}
              />
            </div>
            {/* Quick floating "Personagem" tooltip on hover */}
            {isAvatarHovered && (
              <div
                style={{
                  position: 'absolute',
                  top: '-24px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid #38bdf8',
                  color: '#38bdf8',
                  fontSize: '9px',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  zIndex: 100,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.85)',
                }}
              >
                Personagem
              </div>
            )}
          </div>

          {/* Header Info beside Avatar */}
          <div
            className="huntera-profile-info"
            style={{ display: 'flex', flexDirection: 'column', gap: '2px', lineHeight: 1.15 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {adminTitle && (adminTitle === 'GOD' || adminTitle === 'GM') && (
                <span
                  style={{
                    color: '#ffd700',
                    fontWeight: 800,
                    fontSize: '11px',
                    letterSpacing: '0.04em',
                    textShadow: '0 0 6px rgba(255, 215, 0, 0.5)',
                  }}
                >
                  [{adminTitle}]
                </span>
              )}
              <span
                style={{
                  color: '#f3b749',
                  fontWeight: 800,
                  fontSize: '12px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {charName}
              </span>
            </div>
            <div
              style={{
                color: '#6bb3f2',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
              }}
            >
              {vocationName} <span style={{ color: '#4a85ba' }}>LV</span> {level}
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                background: isGreenStamina ? 'rgba(74, 222, 128, 0.15)' : 'rgba(243, 183, 73, 0.12)',
                border: isGreenStamina ? '1px solid rgba(74, 222, 128, 0.45)' : '1px solid rgba(243, 183, 73, 0.35)',
                borderRadius: '999px',
                padding: '1px 6px',
                fontSize: '9px',
                fontWeight: 700,
                color: isGreenStamina ? '#4ade80' : '#f3b749',
                width: 'fit-content',
                marginTop: '1px',
              }}
              title={
                `${isGreenStamina ? 'Stamina Verde ativa: +50% EXP adicional! ' : 'Multiplicador de EXP por estágio de nível. '}${
                  bestiaryCompletedCount > 0 ? `Bônus permanente de Bestiário: +${bestiaryCompletedCount}% EXP (${bestiaryCompletedCount} monstros concluídos). ` : ''
                }Multiplicador efetivo: ${Number(effectiveExpMult.toFixed(2))}×.`
              }
            >
              {isGreenStamina
                ? `⚡ EXP ${Number(effectiveExpMult.toFixed(2))}× (Verde)${bestiaryCompletedCount > 0 ? ` (+${bestiaryCompletedCount}%)` : ''}`
                : `EXP ${Number(effectiveExpMult.toFixed(2))}×${bestiaryCompletedCount > 0 ? ` (+${bestiaryCompletedCount}%)` : ''}`}
            </div>
          </div>

          {/* Character Inspect Card Popover - Authentic Tibia 11 Dark Stone */}
          {isInspectOpen && (
            <div
              className="tibia-inspect-popover huntera-inspect-popover"
              data-testid="huntera-inspect-popover"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: '0',
                width: '310px',
                background: 'linear-gradient(180deg, #25282f 0%, #191c20 100%)',
                border: '2px solid #3c424d',
                borderRadius: '4px',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.95), inset 1px 1px 0 rgba(255, 255, 255, 0.12), inset -1px -1px 0 rgba(0, 0, 0, 0.8)',
                padding: '14px',
                zIndex: 9999,
                animation: 'popoverFadeIn 0.15s ease-out forwards',
                cursor: 'pointer',
                fontFamily: 'Verdana, Tahoma, sans-serif',
              }}
              onClick={() => {
                if (onOpenProfile) onOpenProfile();
                else toggleWindow('character');
              }}
              title="Clique para abrir a Janela Completa de Habilidades"
            >
              {/* Title & Status */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderBottom: '1px solid #2d323b', paddingBottom: '8px' }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '6px', textShadow: '1px 1px 0 #000' }}>
                  {adminTitle && (adminTitle === 'GOD' || adminTitle === 'GM') && (
                    <span style={{ color: '#ffd700', fontWeight: 800, fontSize: '13px', textShadow: '0 0 8px rgba(255, 215, 0, 0.6)' }}>
                      [{adminTitle}]
                    </span>
                  )}
                  {charName}
                </div>

                <div style={{ fontSize: '11px', fontWeight: 700, color: '#f3b749', letterSpacing: '0.04em', textShadow: '1px 1px 0 #000' }}>
                  {vocationName} <span style={{ color: '#a0aab8' }}>LV</span> {level}
                </div>
                <div style={{ fontSize: '9px', fontWeight: 800, color: isPremium ? '#4ade80' : '#94a3b8', letterSpacing: '0.06em' }}>
                  {isPremium ? 'CONTA PREMIUM' : 'CONTA FREE'}
                </div>
              </div>

              {/* Progress Bars (HP, Mana, XP) - Canonical Tibia 11 Style */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                {/* HP Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#a0aab8', width: '32px' }}>HP</span>
                  <div
                    style={{
                      flex: 1,
                      height: '11px',
                      background: '#0d0f12',
                      border: '1px solid #14171a',
                      borderRadius: '2px',
                      overflow: 'hidden',
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.85)',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${hpPercent}%`,
                        background: hpPercent > 50
                          ? 'linear-gradient(180deg, #00e600 0%, #009900 100%)'
                          : hpPercent > 20
                          ? 'linear-gradient(180deg, #f59e0b 0%, #b45309 100%)'
                          : 'linear-gradient(180deg, #ef4444 0%, #991b1b 100%)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
                        transition: 'width 0.2s ease',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#e2e8f0',
                      minWidth: '82px',
                      textAlign: 'right',
                      textShadow: '1px 1px 0 #000',
                    }}
                  >
                    {currentHp.toLocaleString('pt-BR')} / {maxHp.toLocaleString('pt-BR')}
                  </span>
                </div>

                {/* Mana Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#a0aab8', width: '32px' }}>MP</span>
                  <div
                    style={{
                      flex: 1,
                      height: '11px',
                      background: '#0d0f12',
                      border: '1px solid #14171a',
                      borderRadius: '2px',
                      overflow: 'hidden',
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.85)',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${manaPercent}%`,
                        background: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
                        transition: 'width 0.2s ease',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#e2e8f0',
                      minWidth: '82px',
                      textAlign: 'right',
                      textShadow: '1px 1px 0 #000',
                    }}
                  >
                    {currentMana.toLocaleString('pt-BR')} / {maxMana.toLocaleString('pt-BR')}
                  </span>
                </div>

                {/* XP Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#a0aab8', width: '32px' }}>XP</span>
                  <div
                    style={{
                      flex: 1,
                      height: '11px',
                      background: '#0d0f12',
                      border: '1px solid #14171a',
                      borderRadius: '2px',
                      overflow: 'hidden',
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.85)',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${xpPercent}%`,
                        background: 'linear-gradient(180deg, #facc15 0%, #ca8a04 100%)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)',
                        transition: 'width 0.2s ease',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#facc15',
                      minWidth: '82px',
                      textAlign: 'right',
                      textShadow: '1px 1px 0 #000',
                    }}
                  >
                    {xpPercent.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Skills Grid with Real Tibia Sprites (No Emojis) */}
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #2d323b', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.04em' }}>HABILIDADES</div>
                
                {/* Row 1: Fist, Club, Sword, Axe */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 4px', background: '#14161a', border: '1px solid #292e37', borderRadius: '3px' }} title="Fist Fighting">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v3" />
                      <circle cx="16" cy="18" r="4" />
                    </svg>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#f8fafc', textShadow: '1px 1px 0 #000' }}>{skills.fist}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 4px', background: '#14161a', border: '1px solid #292e37', borderRadius: '3px' }} title="Club Fighting">
                    <img src="/assets/items/item-2398.png" alt="Club" style={{ width: '16px', height: '16px', imageRendering: 'pixelated' }} />
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#f8fafc', textShadow: '1px 1px 0 #000' }}>{skills.club}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 4px', background: '#14161a', border: '1px solid #292e37', borderRadius: '3px' }} title="Sword Fighting">
                    <img src="/assets/items/item-2376.png" alt="Sword" style={{ width: '16px', height: '16px', imageRendering: 'pixelated' }} />
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#f8fafc', textShadow: '1px 1px 0 #000' }}>{skills.sword}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 4px', background: '#14161a', border: '1px solid #292e37', borderRadius: '3px' }} title="Axe Fighting">
                    <img src="/assets/items/item-2387.png" alt="Axe" style={{ width: '16px', height: '16px', imageRendering: 'pixelated' }} />
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#f8fafc', textShadow: '1px 1px 0 #000' }}>{skills.axe}</span>
                  </div>
                </div>

                {/* Row 2: Distance, Shielding, Magic Level */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 4px', background: '#14161a', border: '1px solid #292e37', borderRadius: '3px' }} title="Distance Fighting">
                    <img src="/assets/items/item-2456.png" alt="Bow" style={{ width: '16px', height: '16px', imageRendering: 'pixelated' }} />
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#f8fafc', textShadow: '1px 1px 0 #000' }}>{skills.distance}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 4px', background: '#14161a', border: '1px solid #292e37', borderRadius: '3px' }} title="Shielding">
                    <img src="/assets/items/item-2516.png" alt="Shield" style={{ width: '16px', height: '16px', imageRendering: 'pixelated' }} />
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#f8fafc', textShadow: '1px 1px 0 #000' }}>{skills.shielding}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 4px', background: '#14161a', border: '1px solid #292e37', borderRadius: '3px' }} title="Magic Level">
                    <img src="/assets/items/item-2182.png" alt="Magic Level" style={{ width: '16px', height: '16px', imageRendering: 'pixelated' }} />
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#f8fafc', textShadow: '1px 1px 0 #000' }}>{skills.magicLevel}</span>
                  </div>
                </div>
              </div>

              {/* Combat Stats Summary (3 Columns: DANO, ARMADURA, DEFESA) */}
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #2d323b', display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '6px', textAlign: 'center' }}>
                <div style={{ padding: '4px', background: '#14161a', border: '1px solid #292e37', borderRadius: '3px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#f3b749', textShadow: '1px 1px 0 #000' }}>{damageRangeStr}</div>
                  <div style={{ fontSize: '8px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em' }}>DANO</div>
                </div>
                <div style={{ padding: '4px', background: '#14161a', border: '1px solid #292e37', borderRadius: '3px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc', textShadow: '1px 1px 0 #000' }}>{armorVal}</div>
                  <div style={{ fontSize: '8px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em' }}>ARMADURA</div>
                </div>
                <div style={{ padding: '4px', background: '#14161a', border: '1px solid #292e37', borderRadius: '3px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc', textShadow: '1px 1px 0 #000' }}>{defenseVal}</div>
                  <div style={{ fontSize: '8px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em' }}>DEFESA</div>
                </div>
              </div>

              {/* Bottom Extra Info: Bestiary & Exp Share */}
              <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #2d323b', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em' }}>
                    DANO BESTIÁRIO
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#f3b749' }}>
                    +0%
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em' }}>
                    COMPARTILHAR EXP
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#f8fafc' }}>
                    {shareMin} - {shareMax}
                  </span>
                </div>
              </div>

              {/* Promotion Section (Level 20+) */}
              {character && character.level >= 20 && (
                <>
                  <div style={{ height: '1px', background: '#2d323b', margin: '10px 0 8px 0' }} />
                  {!character.promotion ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenPromotion?.();
                      }}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '3px',
                        border: '1px solid #ca8a04',
                        background: 'linear-gradient(180deg, #ca8a04 0%, #854d0e 100%)',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 900,
                        letterSpacing: '0.04em',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 10px rgba(202, 138, 4, 0.35)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
                      </svg>
                      <span>PROMOVER VOCAÇÃO (20.000 GP)</span>
                    </button>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: 'rgba(34, 197, 94, 0.12)',
                        padding: '5px 8px',
                        borderRadius: '3px',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                      }}
                    >
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#86efac' }}>STATUS</span>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#4ade80' }}>Vocação Promovida</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Currency Badges (Exura Coins & Gold Stack) */}
        <div className="huntera-currency-group">
          <div className="huntera-badge coins-badge" title="Exura Coins">
            <img
              src="/images/tibia-coin.png"
              alt="Exura Coins"
              className="huntera-coin-img"
              style={{ width: '26px', height: '26px', imageRendering: 'pixelated', objectFit: 'contain' }}
            />
            <span className="badge-value">{coins.toLocaleString('pt-BR')}</span>
            <button type="button" className="badge-plus-btn" title="Comprar Exura Coins">+</button>
          </div>

          <div className="huntera-badge gold-badge" title="Gold Coins no inventário/banco">
            <img
              src="/images/gold-stack.png"
              alt="Gold Coins"
              className="huntera-gold-img"
              style={{ width: '26px', height: '26px', imageRendering: 'pixelated', objectFit: 'contain' }}
            />
            <span className="badge-value">{gold.toLocaleString('pt-BR')}</span>
          </div>
        </div>
      </div>

      {/* Center Cluster: Real-time Online Players Status */}
      <div className="huntera-center-cluster">
        <div className="huntera-online-status" title="Contas únicas conectadas no mundo online (cidade e caçadas)">
          <span className="status-dot green pulse" />
          <span className="online-text">
            <strong>{onlinePlayersCount.toLocaleString('pt-BR')}</strong> {onlinePlayersCount === 1 ? 'jogador online' : 'jogadores online'}
          </span>
        </div>
      </div>

      {/* Right Cluster: Shop Button, Auto-Idle and Utility Actions Grid */}
      <div className="huntera-right-cluster">
        {/* Pure Text LOJA Button (Item 2: sem ícones, tipografia limpa) */}
        <button
          type="button"
          className="huntera-shop-btn"
          onClick={() => {
            if (onOpenShop) onOpenShop();
            else toggleWindow('equipment');
          }}
          title="Abrir Loja de Itens da Cidade"
          style={{
            padding: '6px 14px',
            fontWeight: 900,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          <span className="shop-label" style={{ fontSize: '12px', fontWeight: 900 }}>LOJA</span>
        </button>

        {/* Auto-Idle Button */}
        {onToggleAutoIdle && (
          <AutoIdleButton
            isAutoIdle={isAutoIdle}
            onToggle={onToggleAutoIdle}
            inHunt={inHunt}
            isTraining={isTraining}
            staminaMinutes={staminaMinutes}
            maxStaminaMinutes={maxStaminaMinutes}
          />
        )}

        {/* Right Action Icons Grid */}
        <div className="huntera-actions-grid">
        <button
          type="button"
          className="huntera-square-btn hunt-btn"
          onClick={onSelectHunt}
          title="Abrir Seleção de Caçadas / Hunts"
          style={{ borderColor: '#f0d080', backgroundColor: 'rgba(240, 208, 128, 0.2)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f0d080" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        </button>

        <button
          type="button"
          className="huntera-square-btn"
          onClick={() => {
            if (onOpenParty) {
              onOpenParty();
            }
          }}
          title="Gerenciador de Party (Grupo)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" />
            <path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
        </button>

        <button
          type="button"
          className={`huntera-square-btn ${windows.friends?.isOpen ? 'active' : ''}`}
          onClick={() => toggleWindow('friends')}
          title="Lista de Amigos"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>

        <button
          type="button"
          className={`huntera-square-btn ${windows.metrics?.isOpen ? 'active' : ''}`}
          onClick={() => toggleWindow('metrics')}
          title="Métricas e Analisadores"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </button>

        {/* Bestiary Tracker Toggle Button (Item 1: Lineart cabeça de monstro ao lado de métricas) */}
        <button
          type="button"
          className={`huntera-square-btn bestiary-tracker-btn ${isBestiaryTrackerOpen ? 'active' : ''}`}
          onClick={onToggleBestiaryTracker}
          title="Rastreador de Bestiário na Tela"
          style={{
            borderColor: isBestiaryTrackerOpen ? '#22c55e' : undefined,
            backgroundColor: isBestiaryTrackerOpen ? 'rgba(34, 197, 94, 0.18)' : undefined,
            color: isBestiaryTrackerOpen ? '#4ade80' : undefined,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M9 10h.01" />
            <path d="M15 10h.01" />
            <path d="M8 15s1.5 2 4 2 4-2 4-2" />
          </svg>
        </button>

        {onOpenRanking && (
          <button
            type="button"
            className="huntera-square-btn ranking-btn"
            onClick={onOpenRanking}
            title="Highscores e Ranking Geral"
            style={{ borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.15)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2" />
              <path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-2.34" />
              <path d="M18 17c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1v-2.34" />
              <path d="M6 3h12v7a6 6 0 0 1-12 0V3z" />
            </svg>
          </button>
        )}

        <button
          type="button"
          className="huntera-square-btn cyclopedia-btn"
          onClick={() => {
            if (onOpenCyclopedia) onOpenCyclopedia();
            else gameModal.openCyclopedia();
          }}
          title="Cyclopedia (Items, Bestiary, Bosstiary, Boss Points, Character)"
          style={{ borderColor: '#f1c40f', backgroundColor: 'rgba(241, 196, 15, 0.15)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f1c40f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </button>

        <button
          type="button"
          className="huntera-square-btn outfit-btn"
          onClick={onOpenOutfit}
          title="Customizar Aparência / Outfit & Montaria"
          style={{ borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.15)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </button>

        {isAdmin && (
          <>
            {onOpenDebug && (
              <button
                type="button"
                className="huntera-square-btn debug-btn"
                onClick={onOpenDebug}
                title="Painel Centralizado de Debug & Logs (Exclusivo ADMIN)"
                style={{
                  borderColor: '#f59e0b',
                  backgroundColor: 'rgba(245, 158, 11, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fbbf24',
                  fontWeight: 800,
                  fontSize: '11px',
                  padding: '0 8px',
                  width: 'auto',
                  minWidth: '58px',
                  gap: '4px',
                  position: 'relative',
                  cursor: 'pointer',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
                <span>Debug</span>
                {errorCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-5px',
                      right: '-5px',
                      backgroundColor: '#ef4444',
                      color: '#fff',
                      borderRadius: '10px',
                      padding: '1px 5px',
                      fontSize: '9px',
                      fontWeight: 900,
                      boxShadow: '0 0 6px #ef4444',
                    }}
                  >
                    {errorCount}
                  </span>
                )}
              </button>
            )}
            <a
              href="/admin"
              className="huntera-square-btn"
              title="Painel de Administração (/admin)"
              style={{ borderColor: '#e74c3c', backgroundColor: 'rgba(231, 76, 60, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </a>
          </>
        )}

        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button
            type="button"
            className={`huntera-square-btn hamburger-btn ${isMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMenuOpen((prev) => !prev)}
            title="Menu de Opções & Câmera Zoom"
            aria-expanded={isMenuOpen}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {isMenuOpen && (
            <div className="huntera-menu-dropdown">
              <div className="menu-header">
                <span>Opções & Câmera</span>
                <button type="button" className="close-menu-btn" onClick={() => setIsMenuOpen(false)}>×</button>
              </div>

              <div className="menu-section">
                <div className="menu-section-title">Zoom da Câmera</div>
                <div className="zoom-controls-row">
                  <button
                    type="button"
                    className="zoom-btn"
                    onClick={() => setZoomMultiplier(zoom - 0.15)}
                    disabled={zoom <= 0.5}
                    title="Diminuir Zoom (Aproximar Câmera)"
                  >
                    -
                  </button>
                  <div className="zoom-percentage-badge">
                    {Math.round(zoom * 100)}%
                  </div>
                  <button
                    type="button"
                    className="zoom-btn"
                    onClick={() => setZoomMultiplier(zoom + 0.15)}
                    disabled={zoom >= 2.0}
                    title="Aumentar Zoom (Afastar Câmera)"
                  >
                    +
                  </button>
                </div>

                <div className="zoom-presets-grid">
                  {[0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`zoom-preset-btn ${Math.abs(zoom - preset) < 0.03 ? 'selected' : ''}`}
                      onClick={() => setZoomMultiplier(preset)}
                    >
                      {Math.round(preset * 100)}%
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="zoom-reset-btn"
                  onClick={() => resetZoomMultiplier()}
                >
                  Resetar Zoom (Padrão 125%)
                </button>
              </div>

              {/* Phase 103: Audio & Volume Section inside Hamburger Menu */}
              <div className="menu-section" style={{ marginTop: '12px', borderTop: '1px solid #3d403c', paddingTop: '10px' }}>
                <div className="menu-section-title">Volume & Áudio</div>

                <div className="audio-controls-row">
                  <span className="audio-icon-label" style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8' }}>
                    {audioState.isMuted ? 'MUTE' : 'VOL'}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={audioState.isMuted ? 0 : Math.round(audioState.volume * 100)}
                    onChange={(e) => {
                      const val = Number(e.target.value) / 100;
                      if (audioState.isMuted) setAudioMuted(false);
                      setAudioVolume(val);
                    }}
                    className="audio-volume-slider"
                    title={`Volume: ${Math.round(audioState.volume * 100)}%`}
                    aria-label="Controle de volume de áudio"
                  />
                  <div className="audio-percentage-badge">
                    {audioState.isMuted ? '0%' : `${Math.round(audioState.volume * 100)}%`}
                  </div>
                </div>

                <div className="zoom-presets-grid" style={{ marginBottom: '8px' }}>
                  {[
                    { label: '0%', val: 0 },
                    { label: '25%', val: 0.25 },
                    { label: '50%', val: 0.5 },
                    { label: '75%', val: 0.75 },
                    { label: '100%', val: 1.0 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      className={`zoom-preset-btn ${!audioState.isMuted && Math.abs(audioState.volume - preset.val) < 0.05 ? 'selected' : ''}`}
                      onClick={() => {
                        if (preset.val === 0) {
                          setAudioMuted(true);
                        } else {
                          setAudioMuted(false);
                          setAudioVolume(preset.val);
                        }
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="zoom-reset-btn"
                  onClick={() => toggleAudioMuted()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    backgroundColor: audioState.isMuted ? '#b91c1c' : '#047857',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                >
                  {audioState.isMuted ? 'Som Desligado (Clique para Ligar)' : 'Som Ligado (Clique para Desligar)'}
                </button>

                <div
                  className="audio-track-status"
                  onClick={() => !inHunt && triggerTrackNotification(THAIS_THEME_TRACK)}
                  style={{ cursor: !inHunt ? 'pointer' : 'default' }}
                  title="Clique para exibir a notificação de música tocando"
                >
                  <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 800 }}>AUDIO:</span>
                  <span>{inHunt ? 'Trilha pausada (Em Caçada)' : 'Thais Theme (Sunset in the Village)'}</span>
                </div>
              </div>

              {/* Window Layout Reset */}
              <div className="menu-section" style={{ marginTop: '12px', borderTop: '1px solid #3d403c', paddingTop: '10px' }}>
                <div className="menu-section-title">Layout da Interface</div>
                <button
                  type="button"
                  className="zoom-reset-btn"
                  onClick={() => {
                    resetLayout();
                    setIsMenuOpen(false);
                  }}
                  title="Restaurar posições originais de todas as janelas e barras"
                >
                  ↺ Organizar Janelas / Reset Layout
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          className="huntera-square-btn exit-btn"
          onClick={handleExit}
          title="Sair do Jogo"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  </header>
);
}
