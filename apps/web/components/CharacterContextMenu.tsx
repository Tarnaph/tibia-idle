'use client';

import React, { useEffect, useRef } from 'react';
import type { CharacterState } from '@/packages/domain/src/types';

export interface CharacterContextMenuProps {
  x: number;
  y: number;
  character: CharacterState;
  onInspect?: () => void;
  onPrivateMessage?: () => void;
  onAddFriend?: () => void;
  onSetOutfit?: () => void;
  onClose: () => void;
}

export function CharacterContextMenu({
  x,
  y,
  character,
  onInspect,
  onPrivateMessage,
  onAddFriend,
  onSetOutfit,
  onClose,
}: CharacterContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const adjustedLeft = Math.min(x, typeof window !== 'undefined' ? window.innerWidth - 200 : x);
  const adjustedTop = Math.min(y, typeof window !== 'undefined' ? window.innerHeight - 260 : y);

  return (
    <div
      ref={menuRef}
      className="tibia-context-menu character-context-menu"
      style={{ left: `${adjustedLeft}px`, top: `${adjustedTop}px`, zIndex: 999999999 }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="context-menu-title">
        <span>👑 {character.name}</span>
        <small style={{ display: 'block', fontSize: '10px', color: '#a0aab8', fontWeight: 'normal', marginTop: '2px' }}>
          {character.vocation} · Lv. {character.level}
        </small>
      </div>
      <div className="context-menu-divider" />

      {onSetOutfit && (
        <button
          type="button"
          className="context-menu-item"
          onClick={() => {
            onSetOutfit();
            onClose();
          }}
          style={{ fontWeight: '600', color: '#f3c769' }}
        >
          🎭 Set Outfit
        </button>
      )}

      {onInspect && (
        <button
          type="button"
          className="context-menu-item"
          onClick={() => {
            onInspect();
            onClose();
          }}
          style={{ fontWeight: '600', color: '#60a5fa' }}
        >
          🔍 Inspecionar
        </button>
      )}

      {onPrivateMessage && (
        <button
          type="button"
          className="context-menu-item"
          onClick={() => {
            onPrivateMessage();
            onClose();
          }}
        >
          💬 Mandar Mensagem Privada
        </button>
      )}

      {onAddFriend && (
        <button
          type="button"
          className="context-menu-item"
          onClick={() => {
            onAddFriend();
            onClose();
          }}
        >
          ⭐ Adicionar como Amigo
        </button>
      )}

      <div className="context-menu-divider" />

      <button
        type="button"
        className="context-menu-item"
        onClick={onClose}
        style={{ color: '#8c95a3' }}
      >
        ✕ Fechar
      </button>
    </div>
  );
}
