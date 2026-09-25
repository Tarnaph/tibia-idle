'use client';

import React from 'react';
import type { CharacterState } from '@/packages/domain/src/types';
import { PROMOTION_COST, PROMOTION_LEVEL, promotedVocationFor } from '@/packages/domain/src';

interface PromotionModalProps {
  open: boolean;
  character: CharacterState;
  gold: number;
  onClose: () => void;
  onPromote: () => void;
}

export function PromotionModal({
  open,
  character,
  gold,
  onClose,
  onPromote,
}: PromotionModalProps) {
  if (!open) return null;

  const baseVocation = character.baseVocation || character.vocation || 'Knight';
  const promotedTitle = promotedVocationFor(baseVocation);
  const canAfford = gold >= PROMOTION_COST;
  const gender = character.gender === 'female' ? 'female' : 'male';

  const getOutfitVisual = (voc: string) => {
    switch (voc) {
      case 'Knight':
        return {
          thumbUrl: `/generated/outfits/knight-${gender}-south-f0-base.png`,
          fallbackThumbUrl: '/generated/outfit-thumbs/knight.png',
          addonDesc: 'Com armadura de placas completas e espada nas costas',
        };
      case 'Paladin':
        return {
          thumbUrl: `/generated/outfits/hunter-${gender}-south-f0-base.png`,
          fallbackThumbUrl: '/generated/outfit-thumbs/hunter.png',
          addonDesc: 'Com aljava dourada e arco de elite em punho',
        };
      case 'Sorcerer':
        return {
          thumbUrl: `/generated/outfits/mage-${gender}-south-f0-base.png`,
          fallbackThumbUrl: '/generated/outfit-thumbs/mage.png',
          addonDesc: 'Com chapéu de arquimago e varinha arcana lendária',
        };
      case 'Druid':
      default:
        return {
          thumbUrl: `/generated/outfits/mage-${gender}-south-f0-base.png`,
          fallbackThumbUrl: '/generated/outfit-thumbs/mage.png',
          addonDesc: 'Com manto cerimonial da natureza e cajado místico',
        };
    }
  };

  const visual = getOutfitVisual(baseVocation);

  return (
    <div
      className="modal-backdrop promotion-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        zIndex: 2100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="promotion-card-window"
        style={{
          width: '520px',
          maxWidth: '94vw',
          maxHeight: '90vh',
          backgroundColor: '#131720',
          border: '2px solid #ca8a04',
          borderRadius: '10px',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.9), 0 0 24px rgba(202, 138, 4, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          color: '#e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner Compacto */}
        <div
          className="promotion-header"
          style={{
            padding: '14px 16px',
            background: 'linear-gradient(180deg, #231f0f 0%, #161a22 100%)',
            borderBottom: '1px solid #3b3318',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="promotion-close-btn"
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              width: '38px',
              height: '38px',
              minWidth: '38px',
              minHeight: '38px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '6px',
              color: '#f87171',
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              touchAction: 'manipulation',
            }}
            title="Fechar"
            aria-label="Fechar Promoção"
          >
            ✕
          </button>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>👑</span>
            <h2
              style={{
                margin: 0,
                fontSize: '17px',
                color: '#facc15',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                fontWeight: 900,
                textShadow: '0 2px 8px rgba(250, 204, 21, 0.4)',
              }}
            >
              PROMOÇÃO DE VOCAÇÃO
            </h2>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#94a3b8' }}>
            Parabéns <strong>{character.name}</strong>! Ascenda para{' '}
            <strong style={{ color: '#facc15' }}>{promotedTitle}</strong> (Nível {PROMOTION_LEVEL}+).
          </p>
        </div>

        {/* Body Content Condensado */}
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Hero Preview Card Compacto */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: '#1a202c',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '10px 14px',
            }}
          >
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '8px',
                backgroundColor: '#0f172a',
                border: '2px solid #eab308',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 0 12px rgba(234, 179, 8, 0.25)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={visual.thumbUrl}
                alt={promotedTitle}
                style={{ width: '40px', height: '40px', objectFit: 'contain', imageRendering: 'pixelated' }}
                onError={(e) => {
                  if (e.currentTarget.src !== visual.fallbackThumbUrl && !e.currentTarget.src.endsWith(visual.fallbackThumbUrl)) {
                    e.currentTarget.src = visual.fallbackThumbUrl;
                  }
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '15px', color: '#facc15' }}>{promotedTitle}</strong>
                <span
                  style={{
                    fontSize: '9.5px',
                    fontWeight: 800,
                    backgroundColor: 'rgba(234, 179, 8, 0.15)',
                    color: '#fef08a',
                    border: '1px solid rgba(234, 179, 8, 0.4)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    letterSpacing: '0.04em',
                  }}
                >
                  FULL ADDONS UNLOCKED
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#94a3b8', lineHeight: 1.3 }}>
                {visual.addonDesc}. Prestígio por todo o continente.
              </p>
            </div>
          </div>

          {/* Benefits Grid Repensado (4 Cards Compactos) */}
          <div>
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 800,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'block',
                marginBottom: '6px',
              }}
            >
              VANTAGENS EXCLUSIVAS:
            </span>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
              }}
            >
              <div
                style={{
                  backgroundColor: 'rgba(26, 32, 44, 0.7)',
                  border: '1px solid #283344',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '16px', flexShrink: 0 }}>⚡</span>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ fontSize: '11.5px', color: '#e2e8f0', display: 'block' }}>Regeneração Acelerada</strong>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>HP e Mana recuperam mais rápido</span>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'rgba(26, 32, 44, 0.7)',
                  border: '1px solid #283344',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '16px', flexShrink: 0 }}>💀</span>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ fontSize: '11.5px', color: '#e2e8f0', display: 'block' }}>-30% Perda ao Morrer</strong>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>Menor penalidade de XP e skills</span>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'rgba(26, 32, 44, 0.7)',
                  border: '1px solid #283344',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '16px', flexShrink: 0 }}>📜</span>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ fontSize: '11.5px', color: '#e2e8f0', display: 'block' }}>Magias & Runas Mestre</strong>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>Conjuração de feitiços de elite</span>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'rgba(26, 32, 44, 0.7)',
                  border: '1px solid #283344',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '16px', flexShrink: 0 }}>👑</span>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ fontSize: '11.5px', color: '#e2e8f0', display: 'block' }}>Título & Reconhecimento</strong>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>Identificação gloriosa na comunidade</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cost and Balance Note */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#0d1117',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #1e293b',
            }}
          >
            <div>
              <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>CUSTO DA PROMOÇÃO</span>
              <strong style={{ fontSize: '13.5px', color: '#facc15' }}>
                {PROMOTION_COST.toLocaleString('pt-BR')} Gold Coins
              </strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>SEU SALDO ATUAL</span>
              <strong style={{ fontSize: '13.5px', color: canAfford ? '#4ade80' : '#ef4444' }}>
                {gold.toLocaleString('pt-BR')} GP
              </strong>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#0d1117',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid #334155',
              backgroundColor: 'transparent',
              color: '#94a3b8',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Decidir Depois
          </button>

          <button
            type="button"
            onClick={() => {
              if (canAfford) {
                onPromote();
                onClose();
              }
            }}
            disabled={!canAfford}
            style={{
              flex: 1,
              maxWidth: '280px',
              padding: '9px 16px',
              borderRadius: '6px',
              border: 'none',
              background: canAfford
                ? 'linear-gradient(180deg, #eab308 0%, #ca8a04 100%)'
                : '#334155',
              color: canAfford ? '#000000' : '#64748b',
              fontSize: '13px',
              fontWeight: 800,
              cursor: canAfford ? 'pointer' : 'not-allowed',
              boxShadow: canAfford ? '0 2px 10px rgba(234, 179, 8, 0.35)' : 'none',
              transition: 'all 0.15s ease',
              textAlign: 'center',
            }}
          >
            {canAfford ? 'Comprar Promoção (20.000 GP)' : 'Saldo Insuficiente'}
          </button>
        </div>
      </div>
    </div>
  );
}
