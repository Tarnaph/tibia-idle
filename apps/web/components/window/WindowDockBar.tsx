'use client';

import React, { useState } from 'react';
import { useWindowManager, type WindowId } from './WindowManagerContext';

interface WindowDockBarProps {
  gold: number;
  accountUsername?: string;
  characterName?: string;
  onlinePlayersCount?: number;
  debug: boolean;
  onToggleDebug: () => void;
  onSelectHunt: () => void;
  onOpenSkills: () => void;
  onOpenOutfit?: () => void;
  onExitGame?: () => void;
}

export function WindowDockBar({
  gold,
  accountUsername = 'ADMIN',
  characterName = 'Hero',
  onlinePlayersCount = 13315,
  debug,
  onToggleDebug,
  onSelectHunt,
  onOpenSkills,
  onOpenOutfit,
  onExitGame,
}: WindowDockBarProps) {
  const { windows, toggleWindow, resetLayout } = useWindowManager();

  const handleExit = () => {
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
      <div className="huntera-profile-card" title="Conta Conectada">
        <div className="huntera-avatar-box">
          <div className="avatar-sprite-placeholder" />
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
        onClick={() => toggleWindow('trade')}
        title="Abrir Loja / Mercado"
      >
        <span className="shop-icon">🏯</span>
        <span className="shop-label">Loja</span>
      </button>

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
