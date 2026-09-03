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
}

const WINDOW_ITEMS: Array<{ id: WindowId; label: string; icon: string }> = [
  { id: 'party', label: 'Party', icon: '👥' },
  { id: 'hunt', label: 'Expedição', icon: '🗺️' },
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
}: WindowDockBarProps) {
  const { windows, toggleWindow, resetLayout } = useWindowManager();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <header className="window-dock-bar" aria-label="Barra de janelas do jogo">
      <div className="dock-left">
        <div className="game-brand">
          <span className="brand-dot" />
          <span className="brand-title">CAVEBOUND</span>
          <span className="brand-sub">8.60</span>
        </div>
        <div className="player-summary">
          <button
            type="button"
            className="player-name-btn"
            onClick={onOpenSkills}
            title="Abrir janela de Skills"
          >
            {characterName}
          </button>
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
        <button
          type="button"
          className="dock-action-btn"
          title="Selecionar local de caça"
          onClick={onSelectHunt}
        >
          🏹 Caçadas
        </button>
        <button
          type="button"
          className={`dock-action-btn ${debug ? 'is-active' : ''}`}
          title="Alternar Grid de Debug"
          onClick={onToggleDebug}
        >
          {debug ? 'Grid ON' : 'Grid'}
        </button>
        <button
          type="button"
          className="dock-action-btn"
          title="Organizar todas as janelas nas posições iniciais"
          onClick={resetLayout}
        >
          🔄 Organizar
        </button>
        <button
          type="button"
          className="dock-action-btn"
          title={isFullscreen ? 'Sair da Tela Cheia' : 'Entrar em Tela Cheia'}
          onClick={toggleFullscreen}
        >
          {isFullscreen ? '⛶ Normal' : '⛶ Tela Cheia'}
        </button>
      </div>
    </header>
  );
}
