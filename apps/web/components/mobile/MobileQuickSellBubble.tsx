'use client';

import React, { useState } from 'react';

interface MobileQuickSellBubbleProps {
  sellableCount: number;
  onQuickSell: () => void;
  isHunting?: boolean;
}

export function MobileQuickSellBubble({
  sellableCount,
  onQuickSell,
  isHunting = false,
}: MobileQuickSellBubbleProps) {
  const [isPressing, setIsPressing] = useState(false);

  // Position safely above the hotkeys bar; if hunting, sits above the exit hunt button
  const bottomPos = isHunting ? '174px' : '124px';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setIsPressing(true);
        setTimeout(() => setIsPressing(false), 200);
        onQuickSell();
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsPressing(true);
        setTimeout(() => setIsPressing(false), 200);
        onQuickSell();
      }}
      title="Venda Rápida de Loot"
      aria-label="Venda Rápida de Loot"
      style={{
        position: 'fixed',
        bottom: bottomPos,
        right: '12px',
        zIndex: 47,
        width: '46px',
        height: '46px',
        borderRadius: '50%',
        backgroundColor: '#0f172a',
        border: sellableCount > 0 ? '2px solid #eab308' : '1.5px solid #475569',
        boxShadow: sellableCount > 0
          ? '0 0 12px rgba(234, 179, 8, 0.4), 0 4px 10px rgba(0, 0, 0, 0.7)'
          : '0 4px 10px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
        transform: isPressing ? 'scale(0.92)' : 'scale(1)',
        transition: 'transform 0.15s ease, border-color 0.2s ease, box-shadow 0.2s ease',
        touchAction: 'manipulation',
      }}
    >
      {/* Lineart SVG Money / Gold Bag */}
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke={sellableCount > 0 ? '#fef08a' : '#94a3b8'}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 19a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4v-7H6v7z" />
        <path d="M6 12l2-6h8l2 6" />
        <path d="M10 6V4a2 2 0 0 1 4 0v2" />
        <circle cx="12" cy="15" r="1.5" />
      </svg>

      {/* Numerical Badge for sellable items count */}
      {sellableCount > 0 && (
        <span
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            backgroundColor: '#ef4444',
            color: '#ffffff',
            fontSize: '10px',
            fontWeight: 800,
            borderRadius: '9999px',
            padding: '1px 5px',
            minWidth: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1.5px solid #0f172a',
            lineHeight: 1,
            boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          {sellableCount > 99 ? '99+' : sellableCount}
        </span>
      )}
    </button>
  );
}
