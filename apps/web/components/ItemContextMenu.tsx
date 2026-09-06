'use client';

import React, { useEffect, useRef } from 'react';

export interface ItemContextMenuProps {
  x: number;
  y: number;
  itemName: string;
  itemId?: number;
  isEquipped?: boolean;
  isEquippable?: boolean;
  autoLoot: boolean;
  lockSell: boolean;
  quickSell: boolean;
  onEquipToggle?: () => void;
  onUse?: () => void;
  onMarketSell?: () => void;
  onMarketView?: () => void;
  onToggleAutoLoot: () => void;
  onToggleLockSell: () => void;
  onToggleQuickSell: () => void;
  onDestroy: () => void;
  onClose: () => void;
}

export function ItemContextMenu({
  x,
  y,
  itemName,
  isEquipped = false,
  isEquippable = true,
  autoLoot,
  lockSell,
  quickSell,
  onEquipToggle,
  onUse,
  onMarketSell,
  onMarketView,
  onToggleAutoLoot,
  onToggleLockSell,
  onToggleQuickSell,
  onDestroy,
  onClose,
}: ItemContextMenuProps) {
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

  // Adjust position so it stays on screen
  const adjustedLeft = Math.min(x, typeof window !== 'undefined' ? window.innerWidth - 200 : x);
  const adjustedTop = Math.min(y, typeof window !== 'undefined' ? window.innerHeight - 280 : y);

  return (
    <div
      ref={menuRef}
      className="tibia-context-menu"
      style={{ left: `${adjustedLeft}px`, top: `${adjustedTop}px` }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="context-menu-title">{itemName}</div>
      <div className="context-menu-divider" />

      {onUse && (
        <button
          type="button"
          className="context-menu-item"
          style={{ color: '#51cf66', fontWeight: 'bold' }}
          onClick={() => {
            onUse();
            onClose();
          }}
        >
          ✨ Usar
        </button>
      )}

      {isEquippable && (
        <button
          type="button"
          className="context-menu-item"
          onClick={() => {
            onEquipToggle?.();
            onClose();
          }}
        >
          {isEquipped ? 'Desequipar' : 'Equipar'}
        </button>
      )}

      <button
        type="button"
        className="context-menu-item"
        onClick={() => {
          onMarketSell?.();
          onClose();
        }}
      >
        Vender no Market
      </button>

      <button
        type="button"
        className="context-menu-item"
        onClick={() => {
          onMarketView?.();
          onClose();
        }}
      >
        Ver no Market
      </button>

      <label className="context-menu-item checkbox-item">
        <span>Auto loot</span>
        <input
          type="checkbox"
          checked={autoLoot}
          onChange={() => onToggleAutoLoot()}
        />
        <span className="custom-checkbox" />
      </label>

      <label className="context-menu-item checkbox-item">
        <span>Travar venda</span>
        <input
          type="checkbox"
          checked={lockSell}
          onChange={() => onToggleLockSell()}
        />
        <span className="custom-checkbox" />
      </label>

      <label className="context-menu-item checkbox-item">
        <span>Venda rápida</span>
        <input
          type="checkbox"
          checked={quickSell}
          onChange={() => onToggleQuickSell()}
        />
        <span className="custom-checkbox" />
      </label>

      <button
        type="button"
        className="context-menu-item destructive-item"
        onClick={() => {
          if (confirm(`Deseja realmente destruir "${itemName}"?`)) {
            onDestroy();
          }
          onClose();
        }}
      >
        <span>Destruir</span>
        <span className="chevron-icon">›</span>
      </button>
    </div>
  );
}
