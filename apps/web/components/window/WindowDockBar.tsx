'use client';

import React, { useState } from 'react';
import { useWindowManager, type WindowId } from './WindowManagerContext';

interface WindowDockBarProps {
  gold: number;
  characterName: string;
  debug: boolean;
  onToggleDebug: () => void;
  onSelectHunt: () => void;
  onOpenSkills: () => void;
  onOpenOutfit?: () => void;
  onExitGame?: () => void;
}

const WINDOW_ITEMS: Array<{ id: WindowId; label: string; icon: string }> = [
  { id: 'chat', label: 'Chat', icon: '💬' },
  { id: 'party', label: 'Party', icon: '👥' },
  { id: 'friends', label: 'Amigos', icon: '⭐' },
  { id: 'metrics', label: 'Métricas', icon: '📊' },
  { id: 'logs', label: 'Logs', icon: '📜' },
];

export function WindowDockBar({
  gold,
  characterName,
  debug,
  onToggleDebug,
  onSelectHunt,
  onOpenSkills,
  onOpenOutfit,
  onExitGame,
}: WindowDockBarProps) {
  const { windows, toggleWindow, resetLayout } = useWindowManager();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lang, setLang] = useState<'pt' | 'en'>('pt');

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleExit = () => {
    if (onExitGame) {
      onExitGame();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <header className="window-dock-bar" aria-label="Barra de janelas do jogo">
      <div className="dock-left">
        <div className="game-brand" title="Exura Idle Adventures">
          <img src="/logo.png" alt="Exura Idle Adventures" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
        </div>
        <div className="player-summary">
          <button
            type="button"
            className="player-name-btn"
            onClick={onOpenSkills}
            onContextMenu={(e) => {
              e.preventDefault();
              onOpenOutfit?.();
            }}
            title="Abrir janela de Skills · Clique direito para mudar Outfit"
          >
            {characterName}
          </button>
          {onOpenOutfit && (
            <button
              type="button"
              className="player-outfit-quick-btn"
              onClick={onOpenOutfit}
              title="Mudar Outfit / Montaria (Set Outfit)"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '3px',
                padding: '1px 5px',
                fontSize: '11px',
                cursor: 'pointer',
                color: '#e0c77b',
                marginLeft: '4px',
              }}
            >
              🥋 Outfit
            </button>
          )}
          <span className="player-gold">💰 {gold.toLocaleString('pt-BR')} gp</span>
        </div>
      </div>

      <nav className="dock-windows">
        {WINDOW_ITEMS.map((item) => {
          const state = windows[item.id];
          const isActive = state?.isOpen;
          return (
            <button
              key={item.id}
              type="button"
              className={`dock-btn ${isActive ? 'is-active' : ''} ${state?.isMinimized ? 'is-min' : ''}`}
              title={`${item.label} (${isActive ? (state.isMinimized ? 'Minimizada - clique para abrir' : 'Aberta - clique para fechar') : 'Fechada - clique para abrir'})`}
              onClick={() => toggleWindow(item.id)}
            >
              <span className="dock-btn-icon">{item.icon}</span>
              <span className="dock-btn-label">{item.label}</span>
              {isActive && <span className="dock-status-dot" />}
            </button>
          );
        })}
      </nav>

      <div className="dock-right">
        {/* Language selector pill */}
        <div className="dock-lang-pill" title="Alterar idioma">
          <button
            type="button"
            className={`lang-btn ${lang === 'pt' ? 'active' : ''}`}
            onClick={() => setLang('pt')}
            title="Português (Brasil)"
          >
            🇧🇷
          </button>
          <button
            type="button"
            className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
            onClick={() => setLang('en')}
            title="English (US)"
          >
            🇺🇸
          </button>
        </div>

        {/* Diamond Buttons */}
        <div className="diamond-btn-wrap" title="Stamina & Bônus de Energia">
          <div className="diamond-btn-inner">
            <span className="diamond-icon">🔋</span>
          </div>
        </div>

        <a href="https://discord.gg" target="_blank" rel="noreferrer" className="diamond-btn-wrap discord" title="Comunidade no Discord">
          <div className="diamond-btn-inner">
            <span className="diamond-icon">👾</span>
          </div>
        </a>

        <button type="button" className="diamond-btn-wrap" title="Configurações / Organizar Janelas" onClick={resetLayout}>
          <div className="diamond-btn-inner">
            <span className="diamond-icon">⚙️</span>
          </div>
        </button>

        {/* Golden Diamond Exit Door Button */}
        <button
          type="button"
          className="diamond-btn-wrap exit-gold"
          title="Voltar ao site (sua conta continua logada)"
          onClick={handleExit}
        >
          <div className="diamond-btn-inner exit-gold-inner">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              style={{ transform: 'rotate(-45deg)', display: 'block' }}
            >
              <path d="M4 3h16v18H4V3z" stroke="#e5c04b" strokeWidth="1.5" fill="none" />
              <path d="M8 5v14l7-2V7l-7-2z" fill="#ffd700" stroke="#7a5c10" strokeWidth="1" />
              <circle cx="13" cy="12" r="1" fill="#4a3500" />
              <path d="M2 12h4m-2-2l-2 2 2 2" stroke="#ffe680" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </button>
      </div>
    </header>
  );
}
