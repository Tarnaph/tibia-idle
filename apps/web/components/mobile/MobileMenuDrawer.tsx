'use client';

import React from 'react';

export type DrawerCategory = 'social' | 'metrics' | 'menu';

interface MobileMenuDrawerProps {
  category: DrawerCategory;
  onClose: () => void;
  onOpenHunts?: () => void;
  onOpenInventory?: () => void;
  onOpenDepot?: () => void;
  onOpenQuickSell?: () => void;
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
  onOpenQuickSell,
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
        return 'Social & Grupo';
      case 'metrics':
        return 'Métricas & Informações';
      case 'menu':
        return 'Menu do Aventureiro';
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
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
          <span style={{ fontSize: '15px', fontWeight: 800, color: '#fef08a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fef08a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {category === 'social' && (
                <>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </>
              )}
              {category === 'menu' && (
                <>
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
              {category === 'metrics' && (
                <>
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </>
              )}
            </svg>
            {getCategoryTitle()}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar Menu"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Party / Grupo
              </button>
              <button
                type="button"
                onClick={() => { onClose(); onOpenProfile?.(); }}
                style={drawerButtonStyle}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Inspecionar Herói
              </button>
            </>
          )}

          {category === 'menu' && (
            <>
              <button
                type="button"
                onClick={() => { onClose(); onOpenTraining?.(); }}
                style={drawerButtonStyle}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
                Treinamento
              </button>
              <button
                type="button"
                onClick={() => { onClose(); onOpenDepot?.(); }}
                style={drawerButtonStyle}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="21 8 21 21 3 21 3 8" />
                  <rect x="1" y="3" width="22" height="5" />
                  <line x1="10" y1="12" x2="14" y2="12" />
                </svg>
                Baú do Depot
              </button>
              <button
                type="button"
                onClick={() => { onClose(); onOpenQuickSell?.(); }}
                style={drawerButtonStyle}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 19a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4v-7H6v7z" />
                  <path d="M6 12l2-6h8l2 6" />
                  <path d="M10 6V4a2 2 0 0 1 4 0v2" />
                  <circle cx="12" cy="15" r="1.5" />
                </svg>
                Venda Rápida
              </button>
              <button
                type="button"
                onClick={() => { onClose(); onOpenOutfit?.(); }}
                style={drawerButtonStyle}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
                </svg>
                Customizar Outfit
              </button>
              <button
                type="button"
                onClick={() => { onClose(); onOpenCyclopedia?.(); }}
                style={drawerButtonStyle}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                Bestiário & Cyclopedia
              </button>
              <button
                type="button"
                onClick={() => { onClose(); onOpenRanking?.(); }}
                style={drawerButtonStyle}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                  <path d="M4 22h16" />
                  <path d="M10 14.66V17c0 .55-.45 1-1 1H7" />
                  <path d="M14 14.66V17c0 .55.45 1 1 1h2" />
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
                </svg>
                Ranking Highscores
              </button>
              <button
                type="button"
                onClick={() => { onClose(); onOpenPvP?.(); }}
                style={drawerButtonStyle}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="14.5" y1="17.5" x2="3" y2="6" />
                  <line x1="14.5" y1="6.5" x2="3" y2="18" />
                  <line x1="21" y1="3" x2="18" y2="3" />
                  <line x1="21" y1="3" x2="21" y2="6" />
                </svg>
                Arena PvP
              </button>
              <button
                type="button"
                onClick={() => { onClose(); onOpenBlessings?.(); }}
                style={drawerButtonStyle}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Bênçãos (Blessings)
              </button>
              <button
                type="button"
                onClick={() => { onClose(); onOpenImbuements?.(); }}
                style={drawerButtonStyle}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="6 3 18 3 22 9 12 22 2 9 6 3" />
                </svg>
                Imbuements
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Trocar Personagem / Sair
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
  fontSize: '12.5px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  textAlign: 'left',
  boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
};
