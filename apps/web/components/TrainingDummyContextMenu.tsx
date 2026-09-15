'use client';

import React, { useEffect, useRef } from 'react';
import type { TrainingDummyInfo } from '@/packages/domain/src/training';

export interface TrainingDummyContextMenuProps {
  x: number;
  y: number;
  dummy: TrainingDummyInfo;
  onUse: () => void;
  onClose: () => void;
}

export function TrainingDummyContextMenu({
  x,
  y,
  dummy,
  onUse,
  onClose,
}: TrainingDummyContextMenuProps) {
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

  const adjustedLeft = Math.min(x, typeof window !== 'undefined' ? window.innerWidth - 180 : x);
  const adjustedTop = Math.min(y, typeof window !== 'undefined' ? window.innerHeight - 150 : y);

  return (
    <div
      ref={menuRef}
      className="tibia-context-menu training-dummy-context-menu"
      style={{ left: `${adjustedLeft}px`, top: `${adjustedTop}px`, zIndex: 999999999 }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="context-menu-title">
        <span>🎯 Boneco de Treino #{dummy.id}</span>
        <small style={{ display: 'block', fontSize: '10px', color: '#a0aab8', fontWeight: 'normal', marginTop: '2px' }}>
          Depot de Thais · Piso Z:7
        </small>
      </div>
      <div className="context-menu-divider" />

      <button
        type="button"
        className="context-menu-item"
        onClick={() => {
          onUse();
          onClose();
        }}
        style={{ fontWeight: '600', color: '#f3c766' }}
      >
        ⚔️ Usar
      </button>

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
