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
          width: '560px',
          maxWidth: '92vw',
          backgroundColor: '#131720',
          border: '2px solid #ca8a04',
          borderRadius: '10px',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.9), 0 0 24px rgba(202, 138, 4, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div
          style={{
            padding: '18px',
            background: 'linear-gradient(180deg, #231f0f 0%, #161a22 100%)',
            borderBottom: '1px solid #3b3318',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '16px',
              cursor: 'pointer',
            }}
            title="Fechar"
          >
            ✕
          </button>
          <span style={{ fontSize: '28px', display: 'block', marginBottom: '4px' }}>👑</span>
          <h2
            style={{
              margin: 0,
              fontSize: '20px',
              color: '#facc15',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: 900,
              textShadow: '0 2px 8px rgba(250, 204, 21, 0.4)',
            }}
          >
            PROMOÇÃO DE VOCAÇÃO DISPONÍVEL!
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#94a3b8' }}>
            Parabéns <strong>{character.name}</strong>! Você atingiu o Nível {PROMOTION_LEVEL} e agora pode ascender a{' '}
            <strong style={{ color: '#facc15' }}>{promotedTitle}</strong>.
          </p>
        </div>

        {/* Body Content */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Hero Preview Card */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              backgroundColor: '#1a202c',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '12px 16px',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
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
                style={{ width: '48px', height: '48px', objectFit: 'contain', imageRendering: 'pixelated' }}
                onError={(e) => {
                  if (e.currentTarget.src !== visual.fallbackThumbUrl && !e.currentTarget.src.endsWith(visual.fallbackThumbUrl)) {
                    e.currentTarget.src = visual.fallbackThumbUrl;
                  }
                }}
              />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '16px', color: '#facc15' }}>{promotedTitle}</strong>
                <span
                  style={{
                    fontSize: '10px',
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
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                {visual.addonDesc}. Reconhecimento e prestígio por todo o continente.
              </p>
            </div>
          </div>

          {/* Benefits Grid */}
          <div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              VANTAGENS EXCLUSIVAS DA PROMOÇÃO:
            </span>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
              }}
            >
              <div
                style={{
                  backgroundColor: 'rgba(26, 32, 44, 0.6)',
                  border: '1px solid #283344',
                  borderRadius: '6px',
                  padding: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px' }}>⚡</span>
                  <strong style={{ fontSize: '12px', color: '#e2e8f0' }}>Regeneração Acelerada</strong>
                </div>
                <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
                  Recupere Vida (HP) e Mana muito mais rápido fora de combate.
                </p>
              </div>

              <div
                style={{
                  backgroundColor: 'rgba(26, 32, 44, 0.6)',
                  border: '1px solid #283344',
                  borderRadius: '6px',
                  padding: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px' }}>💀</span>
                  <strong style={{ fontSize: '12px', color: '#e2e8f0' }}>Menor Perda ao Morrer</strong>
                </div>
                <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
                  Redução de 30% na penalidade de experiência e skills por morte.
                </p>
              </div>

              <div
                style={{
                  backgroundColor: 'rgba(26, 32, 44, 0.6)',
                  border: '1px solid #283344',
                  borderRadius: '6px',
                  padding: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px' }}>📜</span>
                  <strong style={{ fontSize: '12px', color: '#e2e8f0' }}>Magias & Runas Mestre</strong>
                </div>
                <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
                  Poder para conjurar magias avançadas e usar runas de alto escalão.
                </p>
              </div>

              <div
                style={{
                  backgroundColor: 'rgba(26, 32, 44, 0.6)',
                  border: '1px solid #283344',
                  borderRadius: '6px',
                  padding: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px' }}>👑</span>
                  <strong style={{ fontSize: '12px', color: '#e2e8f0' }}>Título de Glória</strong>
                </div>
                <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
                  Identificação gloriosa no chat, perfil e lista de líderes.
                </p>
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
              padding: '10px 14px',
              borderRadius: '6px',
              border: '1px solid #1e293b',
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>CUSTO DA PROMOÇÃO</span>
              <strong style={{ fontSize: '14px', color: '#facc15' }}>
                {PROMOTION_COST.toLocaleString('pt-BR')} Gold Coins
              </strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>SEU SALDO ATUAL</span>
              <strong style={{ fontSize: '14px', color: canAfford ? '#4ade80' : '#ef4444' }}>
                {gold.toLocaleString('pt-BR')} GP
              </strong>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: '#0d1117',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
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
              padding: '9px 22px',
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
            }}
          >
            {canAfford ? 'Comprar Promoção (20.000 GP)' : 'Saldo Insuficiente'}
          </button>
        </div>
      </div>
    </div>
  );
}
