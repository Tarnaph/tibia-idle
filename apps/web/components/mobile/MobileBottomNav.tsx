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
  const tabs: Array<{ id: MobileTab; label: string; icon: string }> = [
    { id: 'world', label: 'Mundo', icon: '🎯' },
    { id: 'character', label: 'Personagem', icon: '🛡️' },
    { id: 'inventory', label: 'Inventário', icon: '🎒' },
    { id: 'social', label: 'Social', icon: '👥' },
    { id: 'metrics', label: 'Métricas', icon: '📊' },
    { id: 'menu', label: 'Menu', icon: '☰' },
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
            <span style={{ fontSize: '15px', lineHeight: 1 }}>{t.icon}</span>
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
          🏃 Sair da Caçada
        </button>
      )}
    </nav>
  );
}
