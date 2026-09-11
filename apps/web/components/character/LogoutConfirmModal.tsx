'use client';

import React, { useEffect } from 'react';

export interface LogoutConfirmModalProps {
  open: boolean;
  characterName?: string;
  onSwitchCharacter: () => void;
  onLogoutGame: () => void;
  onCancel: () => void;
}

export function LogoutConfirmModal({
  open,
  characterName = 'Seu Personagem',
  onSwitchCharacter,
  onLogoutGame,
  onCancel,
}: LogoutConfirmModalProps) {
  // ESC key dismisses the modal
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop logout-confirm-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        className="logout-confirm-card"
        style={{
          width: '460px',
          maxWidth: '92vw',
          backgroundColor: '#161a20',
          backgroundImage: 'linear-gradient(180deg, #1d232c 0%, #101419 100%)',
          border: '2px solid #7d5c2e',
          outline: '1px solid rgba(212, 168, 67, 0.35)',
          borderRadius: '6px',
          padding: '24px',
          boxShadow: '0 16px 45px rgba(0,0,0,0.95), 0 0 25px rgba(212, 168, 67, 0.15)',
          color: '#d6d2c4',
          position: 'relative',
          fontFamily: 'Verdana, Arial, sans-serif',
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            paddingBottom: '10px',
            borderBottom: '1px solid rgba(212, 168, 67, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>⚔️</span>
            <span
              id="logout-modal-title"
              style={{
                color: '#f3e5ab',
                fontSize: '14px',
                fontWeight: 'bold',
                letterSpacing: '0.08em',
                textShadow: '1px 1px 2px #000',
              }}
            >
              ✦ MENU DE SAÍDA / LOGOUT
            </span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            title="Fechar (Esc)"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a09886',
              fontSize: '18px',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '2px 6px',
              borderRadius: '3px',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#a09886')}
          >
            ✕
          </button>
        </div>

        {/* Prompt Body */}
        <div style={{ marginBottom: '20px' }}>
          <p
            style={{
              margin: '0 0 10px 0',
              fontSize: '13px',
              lineHeight: '1.5',
              color: '#d0c8b6',
            }}
          >
            Você está jogando com <strong style={{ color: '#f3e5ab' }}>{characterName}</strong>. O que deseja fazer?
          </p>
          <div
            style={{
              backgroundColor: 'rgba(212, 168, 67, 0.08)',
              border: '1px solid rgba(212, 168, 67, 0.25)',
              borderRadius: '4px',
              padding: '8px 12px',
              fontSize: '11px',
              color: '#c9b88f',
              lineHeight: '1.4',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>💾</span>
            <span>Seu progresso será salvo permanentemente antes de sair.</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Option 1: Switch Character */}
          <button
            type="button"
            onClick={onSwitchCharacter}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'linear-gradient(180deg, #ba8e54 0%, #7d5c2e 100%)',
              border: '1px solid #d4a843',
              borderRadius: '4px',
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              textShadow: '1px 1px 3px #000',
              boxShadow: '0 3px 8px rgba(0,0,0,0.6)',
              transition: 'transform 0.1s ease, filter 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'brightness(1.1)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'none';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>👤</span>
              <span>Trocar de Personagem</span>
            </span>
            <span style={{ fontSize: '11px', opacity: 0.85, fontWeight: 'normal' }}>
              Ir para Seleção →
            </span>
          </button>

          {/* Option 2: Exit Game / Logout */}
          <button
            type="button"
            onClick={onLogoutGame}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'linear-gradient(180deg, #8b2222 0%, #521313 100%)',
              border: '1px solid #b83232',
              borderRadius: '4px',
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              textShadow: '1px 1px 3px #000',
              boxShadow: '0 3px 8px rgba(0,0,0,0.6)',
              transition: 'transform 0.1s ease, filter 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'brightness(1.1)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'none';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🚪</span>
              <span>Sair do Jogo</span>
            </span>
            <span style={{ fontSize: '11px', opacity: 0.85, fontWeight: 'normal' }}>
              Desconectar Conta →
            </span>
          </button>

          {/* Option 3: Cancel */}
          <button
            type="button"
            onClick={onCancel}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: 'linear-gradient(180deg, #2b3442 0%, #1a2029 100%)',
              border: '1px solid #48566b',
              borderRadius: '4px',
              color: '#bbb',
              fontWeight: 'bold',
              fontSize: '12px',
              cursor: 'pointer',
              marginTop: '4px',
              transition: 'color 0.15s ease, border-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.borderColor = '#6c7f9c';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#bbb';
              e.currentTarget.style.borderColor = '#48566b';
            }}
          >
            ✕ Cancelar e Continuar Jogando
          </button>
        </div>
      </div>
    </div>
  );
}
