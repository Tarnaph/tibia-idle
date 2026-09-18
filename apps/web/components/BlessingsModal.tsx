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

/**
 * Renderiza o ícone SVG de pergaminho canônico com a insígnia de cada bênção
 */
function BlessingScrollIcon({ id }: { id: number }) {
  // Cores de pergaminho antigo e detalhes da relíquia
  return (
    <div
      style={{
        width: '38px',
        height: '38px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Sombra suave do pergaminho */}
        <path
          d="M8 8C8 7 10 5 14 5H36C40 5 42 7 42 10V38C42 41 40 43 36 43H14C10 43 8 41 8 38V8Z"
          fill="#1c160c"
          fillOpacity="0.4"
        />
        {/* Rolo de pergaminho envelhecido */}
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
          fill="#faecc8"
          stroke="#785928"
          strokeWidth="1.5"
        />
        {/* Rolo inferior */}
        <path
          d="M10 38C9 38 8 39 8 40.5C8 42 9.5 43 11 43H37C38.5 43 40 42 40 40.5C40 39 39 38 37 38H10Z"
          fill="#b89353"
          stroke="#4f3816"
          strokeWidth="1.5"
        />
        {/* Detalhes de textura do papiro */}
        <line x1="12" y1="15" x2="36" y2="15" stroke="#e0caa3" strokeWidth="1" />
        <line x1="12" y1="33" x2="36" y2="33" stroke="#e0caa3" strokeWidth="1" />

        {/* Emblema central de acordo com o ID da Bênção */}
        {id === 1 && (
          /* The Wisdom of Solitude: Folha / Gota Esmeralda do Eremita */
          <g transform="translate(18, 16)">
            <circle cx="6" cy="7" r="5" fill="#15803d" stroke="#14532d" strokeWidth="1" />
            <path d="M6 3C4 6 3 8 6 11C9 8 8 6 6 3Z" fill="#4ade80" />
            <circle cx="6" cy="7" r="1.5" fill="#bbf7d0" />
          </g>
        )}
        {id === 2 && (
          /* The Spark of the Phoenix: Fênix Dourada de Fogo */
          <g transform="translate(16, 15)">
            <path
              d="M8 2C7 5 3 6 1 8C4 8 7 9 8 13C9 9 12 8 15 8C13 6 9 5 8 2Z"
              fill="#ea580c"
              stroke="#7c2d12"
              strokeWidth="0.8"
            />
            <path d="M8 5C7 7 5 8 3 9C5 9 7 10 8 12C9 10 11 9 13 9C11 8 9 7 8 5Z" fill="#fbbf24" />
            <circle cx="8" cy="8" r="1.2" fill="#fff" />
          </g>
        )}
        {id === 3 && (
          /* The Fire of the Suns: Sóis Gêmeos / Brasão Solar Dourado */
          <g transform="translate(16, 16)">
            <circle cx="8" cy="7" r="4.5" fill="#eab308" stroke="#854d0e" strokeWidth="1" />
            <path d="M8 0L9 4H7L8 0ZM8 14L7 10H9L8 14ZM1 7L5 6V8L1 7ZM15 7L11 8V6L15 7Z" fill="#ca8a04" />
            <circle cx="8" cy="7" r="2.2" fill="#fef08a" />
          </g>
        )}
        {id === 4 && (
          /* The Spiritual Shielding: Escudo Espiritual / Cristal Eéreo */
          <g transform="translate(17, 16)">
            <path
              d="M7 1L12 3V8C12 11 9 13 7 14C5 13 2 11 2 8V3L7 1Z"
              fill="#0284c7"
              stroke="#0369a1"
              strokeWidth="1"
            />
            <path d="M7 3L10 5V8C10 10 8 11.5 7 12C6 11.5 4 10 4 8V5L7 3Z" fill="#38bdf8" />
            <circle cx="7" cy="7" r="1.5" fill="#e0f2fe" />
          </g>
        )}
        {id === 5 && (
          /* The Embrace of Tibia: Abraço Sagrado / Lobo Branco da Natureza */
          <g transform="translate(16, 15)">
            <ellipse cx="8" cy="8" rx="6" ry="5.5" fill="#8b5cf6" stroke="#5b21b6" strokeWidth="1" />
            <path
              d="M5 4L8 10L11 4C11 7 9 11 8 12C7 11 5 7 5 4Z"
              fill="#c084fc"
            />
            <circle cx="8" cy="7" r="2" fill="#f5f3ff" />
          </g>
        )}
      </svg>
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
