'use client';

import React from 'react';

export type DrawerCategory = 'social' | 'metrics' | 'menu';

interface MobileMenuDrawerProps {
  category: DrawerCategory;
  onClose: () => void;
  onOpenHunts?: () => void;
  onOpenInventory?: () => void;
  onOpenDepot?: () => void;
  onOpenTraining?: () => void;
  onOpenImbuements?: () => void;
  onOpenBlessings?: () => void;
  onOpenRanking?: () => void;
  onOpenPvP?: () => void;
  onOpenCyclopedia?: () => void;
  onOpenParty?: () => void;
  onOpenOutfit?: () => void;
  onOpenProfile?: () => void;
  onOpenLogout?: () => void;
}

export function MobileMenuDrawer({
  category,
  onClose,
  onOpenHunts,
  onOpenInventory,
  onOpenDepot,
  onOpenTraining,
  onOpenImbuements,
  onOpenBlessings,
  onOpenRanking,
  onOpenPvP,
  onOpenCyclopedia,
  onOpenParty,
  onOpenOutfit,
  onOpenProfile,
  onOpenLogout,
}: MobileMenuDrawerProps) {
  const getCategoryTitle = () => {
    switch (category) {
      case 'social':
        return '👥 Social & Grupo';
      case 'metrics':
        return '📊 Métricas & Enciclopédia';
      case 'menu':
        return '☰ Menu do Aventureiro';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 5, 8, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 90,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '500px',
          backgroundColor: '#090d16',
          borderTop: '2px solid #ca8a04',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          padding: '16px 16px 32px 16px',
          boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.8)',
          color: '#e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxHeight: '75vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
          <span style={{ fontSize: '15px', fontWeight: 800, color: '#fef08a' }}>
            {getCategoryTitle()}
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Category Specific Actions Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {category === 'social' && (
            <>
              <button
                type="button"
                onClick={() => { onClose(); onOpenParty?.(); }}
                style={drawerButtonStyle}
              >
                <span>⚔️</span> Party / Grupo
              </button>
              <button
                type="button"
                onClick={() => { onClose(); onOpenProfile?.(); }}
                style={drawerButtonStyle}
              >
                <span>🛡️</span> Inspecionar Herói
              </button>
            </>
          )}

          {category === 'metrics' && (
            <>
              <button
                type="button"
                onClick={() => { onClose(); onOpenCyclopedia?.(); }}
                style={drawerButtonStyle}
              >
                <span>📖</span> Bestiário & Cyclopedia
              </button>
              <button
                type="button"
                onClick={() => { onClose(); onOpenRanking?.(); }}
                style={drawerButtonStyle}
              >
                <span>🏆</span> Ranking & Highscores
              </button>
              <button
                type="button"
                onClick={() => { onClose(); onOpenPvP?.(); }}
                style={drawerButtonStyle}
              >
                <span>⚔️</span> Arena PvP
              </button>
            </>
          )}

          {category === 'menu' && (
            <>
              <button
                type="button"
                onClick={() => { onClose(); onOpenHunts?.(); }}
                style={drawerButtonStyle}
              >
                <span>🗺️</span> Mapa de Caçadas
              </button>
              <button
                type="button"
                onClick={() => { onClose(); onOpenTraining?.(); }}
                style={drawerButtonStyle}
              >
                <span>🎯</span> Treinamento com Dummies
              </button>
              <button
                type="button"
                onClick={() => { onClose(); onOpenDepot?.(); }}
                style={drawerButtonStyle}
              >
                <span>📦</span> Baú do Depot
              </button>
              <button
                type="button"
                onClick={() => { onClose(); onOpenOutfit?.(); }}
                style={drawerButtonStyle}
              >
                <span>👘</span> Customizar Outfit
              </button>
              <button
                type="button"
                onClick={() => { onClose(); onOpenBlessings?.(); }}
                style={drawerButtonStyle}
              >
                <span>✨</span> Bênçãos (Blessings)
              </button>
              <button
                type="button"
                onClick={() => { onClose(); onOpenImbuements?.(); }}
                style={drawerButtonStyle}
              >
                <span>🔮</span> Imbuements
              </button>
              <button
                type="button"
                onClick={() => { onClose(); onOpenLogout?.(); }}
                style={{
                  ...drawerButtonStyle,
                  gridColumn: 'span 2',
                  backgroundColor: '#450a0a',
                  borderColor: '#7f1d1d',
                  color: '#fca5a5',
                  marginTop: '8px',
                }}
              >
                <span>🚪</span> Trocar Personagem / Sair
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const drawerButtonStyle: React.CSSProperties = {
  minHeight: '44px',
  padding: '10px 12px',
  backgroundColor: '#111827',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  textAlign: 'left',
  boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
};
