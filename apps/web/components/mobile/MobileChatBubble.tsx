'use client';

import React from 'react';

interface MobileChatBubbleProps {
  unreadCount?: number;
  isOpen: boolean;
  onToggle: () => void;
}

export function MobileChatBubble({
  unreadCount = 0,
  isOpen,
  onToggle,
}: MobileChatBubbleProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label="Abrir chat do jogo"
      style={{
        position: 'absolute',
        bottom: '124px',
        left: '12px',
        zIndex: 48,
        width: '46px',
        height: '46px',
        borderRadius: '50%',
        backgroundColor: isOpen ? '#ca8a04' : '#0f172a',
        border: '2px solid #eab308',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.75), 0 0 10px rgba(234, 179, 8, 0.35)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isOpen ? 'scale(1.05)' : 'scale(1)',
        padding: 0,
      }}
    >
      <span style={{ fontSize: '20px', lineHeight: 1 }}>💬</span>
      {unreadCount > 0 && !isOpen && (
        <span
          style={{
            position: 'absolute',
            top: '-3px',
            right: '-3px',
            minWidth: '18px',
            height: '18px',
            padding: '0 4px',
            borderRadius: '9px',
            backgroundColor: '#ef4444',
            color: '#fff',
            fontSize: '10px',
            fontWeight: 900,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 8px #ef4444',
            border: '1.5px solid #0f172a',
          }}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
