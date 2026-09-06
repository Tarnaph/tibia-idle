'use client';

import React from 'react';
import type { DeathPenaltyReport } from '@/packages/domain/src/combat';
import { ItemSprite } from './ItemSprite';

interface DeathModalProps {
  open: boolean;
  report?: DeathPenaltyReport;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function DeathModal({ open, report, onConfirm, onCancel }: DeathModalProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        fontFamily: 'Verdana, Arial, sans-serif',
        backdropFilter: 'blur(2px)',
      }}
    >
      {/* Authentic Classic Tibia Modal Window */}
      <div
        style={{
          width: '510px',
          maxWidth: '94vw',
          backgroundColor: '#535353',
          borderTop: '2px solid #8c8c8c',
          borderLeft: '2px solid #8c8c8c',
          borderRight: '2px solid #1f1f1f',
          borderBottom: '2px solid #1f1f1f',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.9)',
          padding: '2px',
          userSelect: 'none',
        }}
      >
        {/* Title Bar */}
        <div
          style={{
            backgroundColor: '#404040',
            borderTop: '1px solid #757575',
            borderLeft: '1px solid #757575',
            borderRight: '1px solid #181818',
            borderBottom: '1px solid #181818',
            textAlign: 'center',
            padding: '4px 0 5px 0',
            fontSize: '11px',
            fontWeight: '700',
            color: '#dedede',
            textShadow: '1px 1px 0 #000',
            letterSpacing: '0.6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <span>💀</span>
          <span>Você está morto</span>
        </div>

        {/* Content Box with Inset Frame */}
        <div
          style={{
            margin: '3px',
            backgroundColor: '#595959',
            borderTop: '2px solid #242424',
            borderLeft: '2px solid #242424',
            borderRight: '2px solid #7f7f7f',
            borderBottom: '2px solid #7f7f7f',
            padding: '14px 16px 12px 16px',
          }}
        >
          {/* Main Canonical Lore Text in Portuguese */}
          <div
            style={{
              fontSize: '11px',
              lineHeight: '1.45',
              color: '#dedede',
              textShadow: '1px 1px 0 #181818',
              fontWeight: '700',
              fontFamily: 'Verdana, Tahoma, sans-serif',
              marginBottom: '12px',
            }}
          >
            <p style={{ margin: '0 0 8px 0' }}>
              Ai de ti! Bravo aventureiro, você encontrou um triste destino.
              <br />
              Mas não se desespere, pois os deuses trarão você de volta ao mundo em troca de um pequeno sacrifício.
            </p>
            <p style={{ margin: '0', color: '#c7c7c7' }}>
              Basta clicar em <strong>&apos;Ok&apos;</strong> para retornar à segurança do Templo de Thais!
            </p>
          </div>

          {/* Detailed Penalty Report Box */}
          {report && (
            <div
              style={{
                backgroundColor: '#2a2a2a',
                borderTop: '2px solid #141414',
                borderLeft: '2px solid #141414',
                borderRight: '2px solid #555555',
                borderBottom: '2px solid #555555',
                padding: '10px 12px',
                marginBottom: '12px',
                fontSize: '11px',
                color: '#e0e0e0',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#ff7373',
                  textShadow: '1px 1px 0 #000',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #3d3d3d',
                  paddingBottom: '4px',
                }}
              >
                <span>⚔️ Penalidades Sofridas pela Morte:</span>
                <span style={{ fontSize: '10px', color: '#b0b0b0', fontWeight: 'normal' }}>
                  Taxa: {report.expPercent}% XP / {report.skillsLost[0] ? `${report.expPercent}% Skills` : 'Skills'}
                </span>
              </div>

              {/* XP and Level Loss */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#d0d0d0' }}>✨ Experiência (XP):</span>
                  <span style={{ fontWeight: '700', color: '#ff6666' }}>
                    -{report.lostExp.toLocaleString('pt-BR')} XP (-{report.expPercent}%)
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '10px',
                    color: '#9e9e9e',
                    paddingLeft: '14px',
                  }}
                >
                  <span>Anterior: {report.currentExp.toLocaleString('pt-BR')}</span>
                  <span>Nova: {report.newExp.toLocaleString('pt-BR')} XP</span>
                </div>

                {/* Level / De-level */}
                <div
                  style={{
                    marginTop: '2px',
                    padding: '3px 6px',
                    backgroundColor: report.isDelevel ? 'rgba(180, 20, 20, 0.25)' : 'rgba(40, 100, 40, 0.15)',
                    border: `1px solid ${report.isDelevel ? '#802020' : '#2b502b'}`,
                    borderRadius: '2px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontWeight: '700', color: report.isDelevel ? '#ff5252' : '#88d888' }}>
                    {report.isDelevel ? '🔻 Nível (De-level):' : '🛡️ Nível do Personagem:'}
                  </span>
                  <span style={{ fontWeight: '700', color: report.isDelevel ? '#ff5252' : '#d8d8d8' }}>
                    {report.isDelevel
                      ? `Reduzido do Nível ${report.currentLevel} ➔ Nível ${report.newLevel}!`
                      : `Permanece no Nível ${report.currentLevel}`}
                  </span>
                </div>
              </div>

              {/* Skills Loss */}
              {report.skillsLost.length > 0 && (
                <div style={{ marginTop: '8px', borderTop: '1px solid #383838', paddingTop: '6px' }}>
                  <div style={{ color: '#82b1ff', fontWeight: '700', fontSize: '10px', marginBottom: '4px' }}>
                    🗡️ Habilidades Reduzidas:
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: '4px 8px',
                      fontSize: '10px',
                    }}
                  >
                    {report.skillsLost.map((skill) => (
                      <div
                        key={skill.skill}
                        style={{
                          backgroundColor: '#202020',
                          padding: '2px 6px',
                          border: '1px solid #333',
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ color: '#ccc' }}>{skill.name}:</span>
                        <span style={{ fontWeight: '700', color: skill.lost > 0 ? '#ff8585' : '#85e085' }}>
                          {skill.before} ➔ {skill.after} {skill.lost > 0 ? `(-${skill.lost})` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hunt Loot Loss */}
              <div style={{ marginTop: '8px', borderTop: '1px solid #383838', paddingTop: '6px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '4px',
                  }}
                >
                  <span style={{ color: '#f3c362', fontWeight: '700', fontSize: '10px' }}>
                    🎒 Loot Coletado na Caçada:
                  </span>
                  <span style={{ fontSize: '10px', color: report.totalLootItemsLost > 0 ? '#ff7373' : '#88d888' }}>
                    {report.loseLootEnabled
                      ? report.totalLootItemsLost > 0
                        ? `Perdido (${report.totalLootItemsLost} ${report.totalLootItemsLost === 1 ? 'item' : 'itens'})`
                        : 'Nenhum loot na sessão'
                      : 'Preservado pelo servidor'}
                  </span>
                </div>

                {report.loseLootEnabled && report.lostLoot.length > 0 && (
                  <div
                    style={{
                      maxHeight: '60px',
                      overflowY: 'auto',
                      backgroundColor: '#1e1e1e',
                      border: '1px solid #333',
                      padding: '4px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '4px',
                    }}
                  >
                    {report.lostLoot.map((item, idx) => (
                      <div
                        key={`${item.name}-${idx}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: '#282828',
                          border: '1px solid #404040',
                          padding: '1px 5px',
                          fontSize: '10px',
                          color: '#dedede',
                        }}
                      >
                        <ItemSprite itemId={item.itemId} label={item.name} />
                        <span>{item.name}</span>
                        <span style={{ color: '#f3c362', fontWeight: '700' }}>x{item.amount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Protection Notice */}
              <div
                style={{
                  marginTop: '8px',
                  borderTop: '1px solid #383838',
                  paddingTop: '6px',
                  fontSize: '9.5px',
                  color: '#7bc87b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>🛡️</span>
                <span>Seus equipamentos equipados e os itens guardados na Bolsa principal foram preservados.</span>
              </div>
            </div>
          )}

          {/* Canonical Tibia Etched Horizontal Divider */}
          <div
            style={{
              height: '0px',
              borderTop: '1px solid #2a2a2a',
              borderBottom: '1px solid #7a7a7a',
              margin: '12px 0 10px 0',
            }}
          />

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
            }}
          >
            <button
              type="button"
              onClick={onConfirm}
              style={{
                minWidth: '70px',
                height: '24px',
                backgroundColor: '#525252',
                borderTop: '2px solid #8a8a8a',
                borderLeft: '2px solid #8a8a8a',
                borderRight: '2px solid #202020',
                borderBottom: '2px solid #202020',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: '700',
                textShadow: '1px 1px 0 #000',
                cursor: 'pointer',
                fontFamily: 'Verdana, Arial, sans-serif',
                padding: '0 12px',
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.borderTop = '2px solid #202020';
                e.currentTarget.style.borderLeft = '2px solid #202020';
                e.currentTarget.style.borderRight = '2px solid #8a8a8a';
                e.currentTarget.style.borderBottom = '2px solid #8a8a8a';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.borderTop = '2px solid #8a8a8a';
                e.currentTarget.style.borderLeft = '2px solid #8a8a8a';
                e.currentTarget.style.borderRight = '2px solid #202020';
                e.currentTarget.style.borderBottom = '2px solid #202020';
              }}
            >
              Ok
            </button>

            <button
              type="button"
              onClick={onCancel ?? onConfirm}
              style={{
                minWidth: '70px',
                height: '24px',
                backgroundColor: '#525252',
                borderTop: '2px solid #8a8a8a',
                borderLeft: '2px solid #8a8a8a',
                borderRight: '2px solid #202020',
                borderBottom: '2px solid #202020',
                color: '#c0c0c0',
                fontSize: '11px',
                fontWeight: '700',
                textShadow: '1px 1px 0 #000',
                cursor: 'pointer',
                fontFamily: 'Verdana, Arial, sans-serif',
                padding: '0 12px',
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.borderTop = '2px solid #202020';
                e.currentTarget.style.borderLeft = '2px solid #202020';
                e.currentTarget.style.borderRight = '2px solid #8a8a8a';
                e.currentTarget.style.borderBottom = '2px solid #8a8a8a';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.borderTop = '2px solid #8a8a8a';
                e.currentTarget.style.borderLeft = '2px solid #8a8a8a';
                e.currentTarget.style.borderRight = '2px solid #202020';
                e.currentTarget.style.borderBottom = '2px solid #202020';
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
