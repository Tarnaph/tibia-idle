'use client';

import React from 'react';

export type MobileTab = 'world' | 'character' | 'inventory' | 'social' | 'metrics' | 'menu';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
  isHunting?: boolean;
  onExitHunt?: () => void;
}

export function MobileBottomNav({
  activeTab,
  onSelectTab,
  isHunting = false,
  onExitHunt,
}: MobileBottomNavProps) {
  const tabs: Array<{
    id: MobileTab;
    label: string;
    renderIcon: (color: string) => React.ReactNode;
  }> = [
    {
      id: 'world',
      label: 'Mundo',
      renderIcon: (color) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      ),
    },
    {
      id: 'character',
      label: 'Herói',
      renderIcon: (color) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
    {
      id: 'inventory',
      label: 'Inventário',
      renderIcon: (color) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10z" />
          <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="16" y2="17" />
        </svg>
      ),
    },
    {
      id: 'social',
      label: 'Social',
      renderIcon: (color) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      id: 'metrics',
      label: 'Métricas',
      renderIcon: (color) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
    {
      id: 'menu',
      label: 'Menu',
      renderIcon: (color) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(54px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        zIndex: 50,
        backgroundColor: '#090d16',
        borderTop: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingLeft: '4px',
        paddingRight: '4px',
        boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.7)',
        userSelect: 'none',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {tabs.map((t) => {
        const isActive = activeTab === t.id;
        const iconColor = isActive ? '#fef08a' : '#94a3b8';
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelectTab(t.id)}
            style={{
              position: 'relative',
              flex: 1,
              minWidth: 0,
              height: '44px',
              backgroundColor: isActive ? 'rgba(202, 138, 4, 0.15)' : 'transparent',
              border: isActive ? '1px solid #ca8a04' : '1px solid transparent',
              borderRadius: '6px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              cursor: 'pointer',
              color: isActive ? '#fef08a' : '#94a3b8',
              transition: 'all 0.15s ease',
              padding: '2px 1px',
              touchAction: 'manipulation',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {t.renderIcon(iconColor)}
            </span>
            <span
              style={{
                fontSize: '9.5px',
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '0.1px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
                lineHeight: 1.1,
              }}
            >
              {t.label}
            </span>
          </button>
        );
      })}

      {/* Floating Exit Hunt button when in combat, separate from normal actions and placed safely above hotkeys */}
      {isHunting && onExitHunt && (
        <button
          type="button"
          onClick={onExitHunt}
          title="Encerrar caçada e retornar a Thais"
          style={{
            position: 'fixed',
            bottom: '124px',
            right: '12px',
            zIndex: 48,
            backgroundColor: '#991b1b',
            border: '1.5px solid #ef4444',
            color: '#fff',
            borderRadius: '6px',
            padding: '8px 14px',
            fontSize: '11px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sair da Caçada
        </button>
      )}
    </nav>
  );
}
