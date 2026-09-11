'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useWindowManager, type WindowId } from './WindowManagerContext';
import { AutoIdleButton } from '../AutoIdleButton';
import { getZoomMultiplier, setZoomMultiplier, resetZoomMultiplier, onZoomChange } from '@/apps/web/lib/zoomManager';
import type { CharacterState, DerivedStats } from '@/packages/domain/src';
import { experienceProgress } from '@/packages/domain/src';
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

interface WindowDockBarProps {
  gold: number;
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
  isMounted?: boolean;
  onToggleMount?: () => void;
  onExitGame?: () => void;
}

export function WindowDockBar({
  gold,
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
  onOpenProfile,
  onToggleAutoIdle,
  onToggleDebug,
  onSelectHunt,
  onOpenSkills,
  onOpenShop,
  onOpenOutfit,
  onOpenCyclopedia,
  isMounted = false,
  onToggleMount,
  onExitGame,
}: WindowDockBarProps) {
  const { windows, toggleWindow, resetLayout } = useWindowManager();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);
  const [isInspectOpen, setIsInspectOpen] = useState(false);
  const inspectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
    <header className="huntera-top-bar" aria-label="Barra de Navegação Huntera">
      {/* Left Cluster: Brand Logo & Account Profile Card */}
      <div className="huntera-left-cluster" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="huntera-logo-wrap" title="Huntera / Exura Online">
          <img src="/logo.png" alt="Huntera Logo" className="huntera-logo-img" />
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
            if (onOpenSkills) onOpenSkills();
            else if (onOpenProfile) onOpenProfile();
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
              background: '#0a0d14',
              border: '1.5px solid #2d3748',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'visible',
            }}
          >
            <img
              src={`/images/avatars/avatar-${avatarId || 1}.png`}
              alt={charName}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }}
            />

            {/* "Personagem" Tooltip Tag on Avatar Hover */}
            {isAvatarHovered && (
              <div
                className="huntera-avatar-tooltip"
                data-testid="huntera-avatar-tooltip"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#0d111a',
                  border: '1px solid #4a5568',
                  borderRadius: '3px',
                  padding: '2px 6px',
                  color: '#e2e8f0',
                  fontSize: '10px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  zIndex: 10002,
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                background: 'rgba(243, 183, 73, 0.12)',
                border: '1px solid rgba(243, 183, 73, 0.35)',
                borderRadius: '999px',
                padding: '1px 6px',
                fontSize: '9px',
                fontWeight: 700,
                color: '#f3b749',
                width: 'fit-content',
                marginTop: '1px',
              }}
            >
              XP +5%
            </div>
          </div>

          {/* Character Inspect Card Popover */}
          {isInspectOpen && (
            <div
              className="huntera-inspect-popover"
              data-testid="huntera-inspect-popover"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: '0',
                width: '300px',
                background: '#10141e',
                border: '1px solid #232c3d',
                borderRadius: '8px',
                boxShadow: '0 16px 36px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                padding: '14px 16px',
                zIndex: 10000,
                cursor: 'default',
                color: '#e2e8f0',
                fontFamily: 'inherit',
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenSkills) onOpenSkills();
              }}
              title="Clique para abrir a Janela Completa de Habilidades"
            >
              {/* Title & Status */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.02em' }}>
                  {charName}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6bb3f2', letterSpacing: '0.04em' }}>
                  {vocationName} <span style={{ color: '#4a85ba' }}>LV</span> {level}
                </div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em' }}>
                  {isPremium ? 'PREMIUM' : 'GRÁTIS'}
                </div>
              </div>

              {/* Progress Bars (HP, Mana, XP) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
                {/* HP Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      flex: 1,
                      height: '9px',
                      background: '#161c27',
                      border: '1px solid #263245',
                      borderRadius: '5px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${hpPercent}%`,
                        background: 'linear-gradient(90deg, #d33c5e 0%, #e85577 100%)',
                        borderRadius: '5px',
                        transition: 'width 0.2s ease',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#8b9cb5',
                      minWidth: '78px',
                      textAlign: 'right',
                    }}
                  >
                    {currentHp.toLocaleString('pt-BR')} / {maxHp.toLocaleString('pt-BR')}
                  </span>
                </div>

                {/* Mana Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      flex: 1,
                      height: '9px',
                      background: '#161c27',
                      border: '1px solid #263245',
                      borderRadius: '5px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${manaPercent}%`,
                        background: 'linear-gradient(90deg, #3867b3 0%, #4b7dd6 100%)',
                        borderRadius: '5px',
                        transition: 'width 0.2s ease',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#8b9cb5',
                      minWidth: '78px',
                      textAlign: 'right',
                    }}
                  >
                    {currentMana.toLocaleString('pt-BR')} / {maxMana.toLocaleString('pt-BR')}
                  </span>
                </div>

                {/* XP Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      flex: 1,
                      height: '9px',
                      background: '#161c27',
                      border: '1px solid #263245',
                      borderRadius: '5px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${xpPercent}%`,
                        background: 'linear-gradient(90deg, #b88628 0%, #e5a93c 100%)',
                        borderRadius: '5px',
                        transition: 'width 0.2s ease',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#8b9cb5',
                      minWidth: '78px',
                      textAlign: 'right',
                    }}
                  >
                    {xpPercent.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: '#1c2433', margin: '12px 0 10px 0' }} />

              {/* Skills Grid (7 Skills) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Row 1: Fist, Club, Sword, Axe */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }} title="Fist Fighting">
                    <span style={{ fontSize: '13px' }}>✊</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>{skills.fist}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }} title="Club Fighting">
                    <span style={{ fontSize: '13px' }}>🔨</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>{skills.club}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }} title="Sword Fighting">
                    <span style={{ fontSize: '13px' }}>⚔️</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>{skills.sword}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }} title="Axe Fighting">
                    <span style={{ fontSize: '13px' }}>🪓</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>{skills.axe}</span>
                  </div>
                </div>

                {/* Row 2: Distance, Shielding, Magic Level */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }} title="Distance Fighting">
                    <span style={{ fontSize: '13px' }}>🏹</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>{skills.distance}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }} title="Shielding">
                    <span style={{ fontSize: '13px' }}>🛡️</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>{skills.shielding}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }} title="Magic Level">
                    <span style={{ fontSize: '13px' }}>🔮</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>{skills.magicLevel}</span>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: '#1c2433', margin: '12px 0 10px 0' }} />

              {/* Combat Stats Summary (3 Columns: DANO, ARMADURA, DEFESA) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '6px', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#f3b749' }}>{damageRangeStr}</div>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em' }}>DANO</div>
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc' }}>{armorVal}</div>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em' }}>ARMADURA</div>
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc' }}>{defenseVal}</div>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em' }}>DEFESA</div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: '#1c2433', margin: '12px 0 10px 0' }} />

              {/* Bottom Extra Info: Bestiary & Exp Share */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>
                    DANO BESTIÁRIO
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#f3b749' }}>
                    +0%
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>
                    COMPARTILHAR EXP
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#f8fafc' }}>
                    {shareMin} - {shareMax}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Currency Badges */}
      <div className="huntera-currency-group">
        <div className="huntera-badge coins-badge" title="Huntera Coins">
          <img
            src="/images/tibia-coin.png"
            alt="Huntera Coins"
            className="huntera-coin-img"
            style={{ width: '22px', height: '22px', imageRendering: 'pixelated', objectFit: 'contain' }}
          />
          <span className="badge-value">0</span>
          <button type="button" className="badge-plus-btn" title="Comprar Coins">+</button>
        </div>

        <div className="huntera-badge gold-badge" title="Gold Coins no inventário/banco">
          <img
            src="/images/gold-coin.png"
            alt="Gold Coins"
            className="huntera-gold-img"
            style={{ width: '22px', height: '22px', imageRendering: 'pixelated', objectFit: 'contain' }}
          />
          <span className="badge-value">{gold.toLocaleString('pt-BR')}</span>
        </div>
      </div>

      {/* Golden Shop Button */}
      <button
        type="button"
        className="huntera-shop-btn"
        onClick={() => {
          if (onOpenShop) onOpenShop();
          else toggleWindow('equipment');
        }}
        title="Abrir Loja de Itens da Cidade"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
        <span className="shop-label">Loja</span>
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

      {/* Online Players Status */}
      <div className="huntera-online-status" title="Jogadores conectados no mundo online">
        <span className="status-dot green" />
        <span className="online-text">
          <strong>{onlinePlayersCount.toLocaleString('pt-BR')}</strong> jogadores online
        </span>
      </div>

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
          className={`huntera-square-btn ${windows.party?.isOpen ? 'active' : ''}`}
          onClick={() => toggleWindow('party')}
          title="Seu Squad / Party"
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


        <button
          type="button"
          className="huntera-square-btn cyclopedia-btn"
          onClick={onOpenCyclopedia}
          title="Cyclopedia (Items, Bestiary, Bosstiary, Boss Points, Character)"
          style={{ borderColor: '#f1c40f', backgroundColor: 'rgba(241, 196, 15, 0.18)', fontSize: '15px' }}
        >
          📖
        </button>

        {isAdmin && (
          <a
            href="/admin"
            className="huntera-square-btn"
            title="Painel de Administração (/admin)"
            style={{ borderColor: '#e74c3c', backgroundColor: 'rgba(231, 76, 60, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
          >
            🛡️
          </a>
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
                <span>⚙️ Opções & Câmera</span>
                <button type="button" className="close-menu-btn" onClick={() => setIsMenuOpen(false)}>×</button>
              </div>

              <div className="menu-section">
                <div className="menu-section-title">🔍 Zoom da Câmera</div>
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
                  ↺ Resetar Zoom (Padrão 125%)
                </button>
              </div>

              {/* Phase 103: Audio & Volume Section inside Hamburger Menu */}
              <div className="menu-section" style={{ marginTop: '12px', borderTop: '1px solid #3d403c', paddingTop: '10px' }}>
                <div className="menu-section-title">🔊 Volume & Áudio</div>

                <div className="audio-controls-row">
                  <span className="audio-icon-label">{audioState.isMuted ? '🔇' : '🔊'}</span>
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
                >
                  {audioState.isMuted ? '🔊 Ativar Som do Jogo' : '🔇 Silenciar Som do Jogo'}
                </button>

                <div
                  className="audio-track-status"
                  onClick={() => !inHunt && triggerTrackNotification(THAIS_THEME_TRACK)}
                  style={{ cursor: !inHunt ? 'pointer' : 'default' }}
                  title="Clique para exibir a notificação de música tocando"
                >
                  <span>🎵</span>
                  <span>{inHunt ? 'Trilha pausada (Em Caçada)' : 'Thais Theme (Sunset in the Village)'}</span>
                </div>
              </div>

              {/* Window Layout Reset */}
              <div className="menu-section" style={{ marginTop: '12px', borderTop: '1px solid #3d403c', paddingTop: '10px' }}>
                <div className="menu-section-title">🪟 Layout da Interface</div>
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

        {/* Phase 103: Quick Mute / Unmute Button beside Exit Button */}
        <button
          type="button"
          className={`huntera-square-btn mute-btn ${audioState.isMuted ? 'muted' : ''}`}
          onClick={() => toggleAudioMuted()}
          title={audioState.isMuted ? 'Desmutar Áudio (Som Desativado) [Atalho: M]' : 'Mutar Áudio (Som Ativado) [Atalho: M]'}
          aria-label={audioState.isMuted ? 'Desmutar Áudio' : 'Mutar Áudio'}
        >
          {audioState.isMuted ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>

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
    </header>
  );
}
