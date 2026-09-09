'use client';

import React, { useEffect, useState } from 'react';
import { useWindowManager, type WindowId } from './WindowManagerContext';
import { AutoIdleButton } from '../AutoIdleButton';
import { getZoomMultiplier, setZoomMultiplier, resetZoomMultiplier, onZoomChange } from '@/apps/web/lib/zoomManager';
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
  onOpenSkills: () => void;
  onOpenShop?: () => void;
  onOpenOutfit?: () => void;
  onExitGame?: () => void;
}

export function WindowDockBar({
  gold,
  accountUsername = 'ADMIN',
  characterName = 'Hero',
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
  onExitGame,
}: WindowDockBarProps) {
  const { windows, toggleWindow, resetLayout } = useWindowManager();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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

  return (
    <header className="huntera-top-bar" aria-label="Barra de Navegação Huntera">
      {/* Brand Logo */}
      <div className="huntera-logo-wrap" title="Huntera / Exura Online">
        <img src="/logo.png" alt="Huntera Logo" className="huntera-logo-img" />
      </div>

      {/* Account Profile Card */}
      <div
        className="huntera-profile-card"
        title="Conta Conectada — Clique para abrir o Perfil do Personagem"
        onClick={onOpenProfile}
        style={{ cursor: onOpenProfile ? 'pointer' : 'default' }}
      >
        <div className="huntera-avatar-box" title="Avatar do Personagem">
          <img
            src={`/images/avatars/avatar-${avatarId || 1}.svg`}
            alt={`Avatar ${avatarId || 1}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '2px' }}
          />
        </div>
        <div className="huntera-profile-info">
          <span className="huntera-account-tag">CONTA</span>
          <strong className="huntera-account-username">
            {accountUsername.toUpperCase()}
          </strong>
        </div>
      </div>

      {/* Currency Badges */}
      <div className="huntera-currency-group">
        <div className="huntera-badge coins-badge" title="Huntera Coins">
          <span className="coin-icon">🪙</span>
          <span className="badge-value">0</span>
          <button type="button" className="badge-plus-btn" title="Comprar Coins">+</button>
        </div>

        <div className="huntera-badge gold-badge" title="Gold Coins no inventário/banco">
          <span className="gold-icon">✨</span>
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
        <span className="shop-icon">🏯</span>
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
          className={`huntera-square-btn ${windows.equipment?.isOpen ? 'active' : ''}`}
          onClick={() => toggleWindow('equipment')}
          title="Equipamentos e Armadura"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 2L4 7v10l8 5 8-5V7l-8-5z" />
          </svg>
        </button>

        <button
          type="button"
          className="huntera-square-btn"
          onClick={onOpenSkills}
          title="Skills e Atributos"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
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
          className={`huntera-square-btn ${windows.chat?.isOpen ? 'active' : ''}`}
          onClick={() => toggleWindow('chat')}
          title="Chat do Jogo (World / Local / PM)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
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

        <button
          type="button"
          className="huntera-square-btn"
          onClick={resetLayout}
          title="Organizar Janelas / Reset Layout"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>

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
