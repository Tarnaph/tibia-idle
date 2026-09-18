'use client';

import React, { useMemo } from 'react';
import type { CharacterState } from '@/packages/domain/src/types';
import {
  BLESSINGS_CATALOG,
  calculateDeathProtection,
  calculateMissingBlessingsCost,
  getMissingBlessingIds,
  DEFAULT_BLESSING_COST,
} from '@/packages/domain/src/blessings';

interface BlessingsModalProps {
  open: boolean;
  character: CharacterState;
  gold: number;
  onClose: () => void;
  onBuyBlessing: (blessingId: number) => void;
  onBlessAll: () => void;
}

const BLESSING_CHARM_ITEM_IDS: Record<number, number> = {
  1: 11262, // Solitude Charm (The Wisdom of Solitude)
  2: 11258, // Phoenix Charm (The Spark of the Phoenix)
  3: 11261, // Twin Sun Charm (The Fire of the Suns)
  4: 11260, // Spiritual Charm (The Spiritual Shielding)
  5: 11259, // Unity Charm (The Embrace of Tibia)
};

/**
 * Renderiza o ícone de pergaminho antigo com o Charm Canônico Oficial do Tibia
 */
function BlessingScrollIcon({ id }: { id: number }) {
  const charmItemId = BLESSING_CHARM_ITEM_IDS[id] || 11262;

  return (
    <div
      style={{
        width: '42px',
        height: '42px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {/* Fundo de Pergaminho Antigo */}
      <svg
        width="40"
        height="40"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', inset: '1px' }}
      >
        <path
          d="M8 8C8 7 10 5 14 5H36C40 5 42 7 42 10V38C42 41 40 43 36 43H14C10 43 8 41 8 38V8Z"
          fill="#1c160c"
          fillOpacity="0.5"
        />
        <path
          d="M10 7C9 7 8 8 8 10C8 11.5 9.5 12.5 11 12H37C38.5 12.5 40 11.5 40 10C40 8 39 7 37 7H10Z"
          fill="#d4af6e"
          stroke="#5c431d"
          strokeWidth="1.5"
        />
        <rect
          x="9"
          y="10"
          width="30"
          height="28"
          rx="1"
          fill="#fbf0d3"
          stroke="#785928"
          strokeWidth="1.5"
        />
        <path
          d="M10 38C9 38 8 39 8 40.5C8 42 9.5 43 11 43H37C38.5 43 40 42 40 40.5C40 39 39 38 37 38H10Z"
          fill="#b89353"
          stroke="#4f3816"
          strokeWidth="1.5"
        />
        <line x1="12" y1="14" x2="36" y2="14" stroke="#e0caa3" strokeWidth="1" />
        <line x1="12" y1="34" x2="36" y2="34" stroke="#e0caa3" strokeWidth="1" />
      </svg>

      {/* Sprite Canônico Oficial do Charm do Tibia */}
      <img
        src={`/assets/items/item-${charmItemId}.png`}
        alt={`Charm ${id}`}
        width={26}
        height={26}
        style={{
          position: 'relative',
          zIndex: 2,
          imageRendering: 'pixelated',
          filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6))',
        }}
        onError={(e) => {
          // Fallback para pasta generated caso caminho alternativo seja necessário
          (e.currentTarget as HTMLImageElement).src = `/generated/cyclopedia/items/item-${charmItemId}.png`;
        }}
      />
    </div>
  );
}

export function BlessingsModal({
  open,
  character,
  gold,
  onClose,
  onBuyBlessing,
  onBlessAll,
}: BlessingsModalProps) {
  if (!open) return null;

  const currentBlessings = character.blessings || [];
  const protection = useMemo(() => calculateDeathProtection(currentBlessings), [currentBlessings]);
  const missingIds = useMemo(() => getMissingBlessingIds(currentBlessings), [currentBlessings]);
  const missingCost = useMemo(() => calculateMissingBlessingsCost(currentBlessings), [currentBlessings]);
  const isFullyBlessed = missingIds.length === 0;
  const canAffordAll = gold >= missingCost;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.76)',
        backdropFilter: 'blur(3px)',
        zIndex: 2200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        fontFamily: 'Verdana, Geneva, sans-serif',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Janela Central Estilo Tibia 11 */}
      <div
        style={{
          width: '450px',
          maxWidth: '95vw',
          backgroundColor: '#161924',
          border: '2px solid #282f42',
          boxShadow: '0 16px 45px rgba(0, 0, 0, 0.95), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
          borderRadius: '6px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease-out',
        }}
      >
        {/* Barra de Título */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px 8px 14px',
            backgroundColor: '#171b28',
            borderBottom: '1px solid #23293a',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontWeight: '700',
              color: '#82a4d9',
              letterSpacing: '0.8px',
              textShadow: '0 1px 2px rgba(0,0,0,0.8)',
            }}
          >
            TEMPLO — BLESSINGS
          </span>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '20px',
              height: '20px',
              backgroundColor: '#1d2232',
              border: '1px solid #363f58',
              borderRadius: '3px',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              cursor: 'pointer',
              lineHeight: 1,
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2c354e';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#1d2232';
              e.currentTarget.style.color = '#94a3b8';
            }}
            title="Fechar (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Descrição Canônica */}
        <div style={{ padding: '12px 14px 10px 14px' }}>
          <p
            style={{
              margin: 0,
              fontSize: '11px',
              lineHeight: '1.45',
              color: '#94a3b8',
            }}
          >
            A morte leva uma parte da sua experiência, das suas skills e do magic level,
            e pode destruir o que você está usando. As blessings suavizam o preço —
            e cada morte consome todas elas.
          </p>
        </div>

        {/* Cartão de Status de Proteção */}
        <div
          style={{
            margin: '0 14px 12px 14px',
            backgroundColor: '#10131d',
            border: '1px solid #242938',
            borderRadius: '5px',
            padding: '10px 12px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: '700',
              color: '#ffffff',
            }}
          >
            {protection.summaryText}
          </div>
          <div
            style={{
              fontSize: '10.5px',
              color: '#738096',
              marginTop: '4px',
            }}
          >
            Morrendo agora:
          </div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: '600',
              color: '#5b93d3',
              marginTop: '2px',
            }}
          >
            {protection.detailsText}
          </div>
        </div>

        {/* Lista das 5 Bênçãos */}
        <div
          style={{
            margin: '0 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          {BLESSINGS_CATALOG.map((blessing) => {
            const hasBlessing = currentBlessings.includes(blessing.id);
            const canAffordThis = gold >= blessing.defaultCost;

            return (
              <div
                key={blessing.id}
                style={{
                  backgroundColor: '#12151f',
                  border: '1px solid #1f2536',
                  borderRadius: '5px',
                  padding: '7px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                }}
              >
                {/* Lado Esquerdo: Ícone do Pergaminho + Textos */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <BlessingScrollIcon id={blessing.id} />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#f1f5f9',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {blessing.name}
                    </div>
                    <div
                      style={{
                        fontSize: '10.5px',
                        color: '#64748b',
                        marginTop: '1px',
                        lineHeight: '1.25',
                      }}
                    >
                      {blessing.description}
                    </div>
                  </div>
                </div>

                {/* Lado Direito: Badge ou Botão de Compra */}
                <div style={{ flexShrink: 0 }}>
                  {hasBlessing ? (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#4ade80',
                        letterSpacing: '0.5px',
                        padding: '4px 6px',
                        textShadow: '0 0 8px rgba(74, 222, 128, 0.3)',
                      }}
                    >
                      ABENÇOADO
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onBuyBlessing(blessing.id)}
                      disabled={!canAffordThis}
                      style={{
                        backgroundColor: '#191f2c',
                        border: '1px solid #38435d',
                        borderRadius: '3px',
                        color: canAffordThis ? '#93c5fd' : '#64748b',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: canAffordThis ? 'pointer' : 'not-allowed',
                        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                        transition: 'all 0.12s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (canAffordThis) {
                          e.currentTarget.style.backgroundColor = '#252e42';
                          e.currentTarget.style.borderColor = '#506187';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (canAffordThis) {
                          e.currentTarget.style.backgroundColor = '#191f2c';
                          e.currentTarget.style.borderColor = '#38435d';
                        }
                      }}
                      title={canAffordThis ? `Adquirir por ${blessing.defaultCost.toLocaleString('pt-BR')} gp` : 'Gold insuficiente'}
                    >
                      {blessing.defaultCost.toLocaleString('pt-BR')} gp
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé: Saldo do Jogador + Botão "Abençoar tudo" */}
        <div
          style={{
            marginTop: '12px',
            padding: '10px 14px',
            backgroundColor: '#11141e',
            borderTop: '1px solid #1e2434',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          {/* Gold do Personagem */}
          <div
            style={{
              fontSize: '12px',
              fontWeight: '700',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              textShadow: '0 1px 2px rgba(0,0,0,0.8)',
            }}
          >
            <span>{gold.toLocaleString('pt-BR')}</span>
            <span style={{ color: '#d97706' }}>gp</span>
          </div>

          {/* Botão de Bênção Total */}
          {!isFullyBlessed && (
            <button
              type="button"
              onClick={onBlessAll}
              disabled={!canAffordAll}
              style={{
                backgroundColor: canAffordAll ? '#1d2536' : '#141824',
                border: `1px solid ${canAffordAll ? '#3d4b6b' : '#262f44'}`,
                borderRadius: '3px',
                color: canAffordAll ? '#93c5fd' : '#475569',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: canAffordAll ? 'pointer' : 'not-allowed',
                boxShadow: canAffordAll
                  ? '0 2px 8px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
                  : 'none',
                transition: 'all 0.12s ease',
              }}
              onMouseEnter={(e) => {
                if (canAffordAll) {
                  e.currentTarget.style.backgroundColor = '#29354d';
                  e.currentTarget.style.borderColor = '#566a96';
                  e.currentTarget.style.color = '#ffffff';
                }
              }}
              onMouseLeave={(e) => {
                if (canAffordAll) {
                  e.currentTarget.style.backgroundColor = '#1d2536';
                  e.currentTarget.style.borderColor = '#3d4b6b';
                  e.currentTarget.style.color = '#93c5fd';
                }
              }}
              title={canAffordAll ? `Comprar todas as bênçãos que faltam` : 'Gold insuficiente'}
            >
              Abençoar tudo ({missingCost.toLocaleString('pt-BR')} gp)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
