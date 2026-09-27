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
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f3c766" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
          Boneco de Treino #{dummy.id}
        </span>
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
        style={{ fontWeight: '600', color: '#f3c766', display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f3c766" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
          <line x1="13" y1="19" x2="19" y2="13" />
          <line x1="16" y1="16" x2="20" y2="20" />
          <line x1="19" y1="21" x2="21" y2="19" />
        </svg>
        Usar
      </button>

      <div className="context-menu-divider" />

      <button
        type="button"
        className="context-menu-item"
        onClick={onClose}
        style={{ color: '#8c95a3', display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8c95a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        Fechar
      </button>
    </div>
  );
}
