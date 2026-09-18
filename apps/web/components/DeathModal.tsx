'use client';

import React, { useState } from 'react';
import type { DeathPenaltyReport } from '@/packages/domain/src/combat';
import { ItemSprite } from './ItemSprite';

interface DeathModalProps {
  open: boolean;
  report?: DeathPenaltyReport;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function DeathModal({ open, report, onConfirm, onCancel }: DeathModalProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showRecentLog, setShowRecentLog] = useState(false);

  if (!open) return null;

  const killer = report?.killerName || 'Monstro';
  const consumedBlessings = report?.consumedBlessingsCount ?? 0;
  const lostEquipCount = report?.lostEquipment?.length ?? 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        fontFamily: 'Verdana, Arial, sans-serif',
        userSelect: 'none',
      }}
    >
      {/* Janela Central Gótica */}
      <div
        style={{
          position: 'relative',
          width: '450px',
          maxWidth: '94vw',
          backgroundColor: '#12131c',
          border: '2px solid #2a3144',
          borderRadius: '6px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.95), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
          padding: '24px 24px 20px 24px',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Fita / Marcador de Página Superior Esquerda com Caveira */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '24px',
            width: '28px',
            height: '42px',
            background: 'linear-gradient(180deg, #881337 0%, #4c0519 100%)',
            borderLeft: '1px solid #be123c',
            borderRight: '1px solid #be123c',
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingBottom: '6px',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.6)',
            zIndex: 2,
          }}
        >
          <span
            style={{
              fontSize: '13px',
              filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.6))',
            }}
          >
            💀
          </span>
        </div>

        {/* Botão Minimizar / Fechar no Canto Superior Direito */}
        <button
          type="button"
          onClick={onCancel ?? onConfirm}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '20px',
            height: '20px',
            backgroundColor: '#181b26',
            border: '1px solid #2e374e',
            borderRadius: '3px',
            color: '#71717a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            cursor: 'pointer',
            padding: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#293247';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#181b26';
            e.currentTarget.style.color = '#71717a';
          }}
          title="Fechar"
        >
          ✕
        </button>

        {/* Título Principal em Tipografia Serifada */}
        <div style={{ textAlign: 'center', marginTop: '4px' }}>
          <h2
            style={{
              margin: 0,
              fontFamily: 'Cinzel, Georgia, serif',
              fontSize: '19px',
              fontWeight: '700',
              color: '#f87171',
              letterSpacing: '0.16em',
              textShadow: '0 0 12px rgba(248, 113, 113, 0.4)',
            }}
          >
            †&nbsp;&nbsp;VOCÊ MORREU.&nbsp;&nbsp;†
          </h2>

          <div
            style={{
              marginTop: '10px',
              fontSize: '13.5px',
              fontWeight: '700',
              color: '#ffffff',
            }}
          >
            Morto por {killer}.
          </div>

          <div
            style={{
              marginTop: '3px',
              fontSize: '12px',
              color: '#94a3b8',
            }}
          >
            Você vai reviver no templo da cidade.
          </div>
        </div>

        {/* Divisor Superior */}
        <div
          style={{
            margin: '16px 0 14px 0',
            height: '1px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          }}
        />

        {/* Resumo da Perda de Experiência e Nível */}
        {report ? (
          <div style={{ textAlign: 'center', padding: '0 6px' }}>
            <p
              style={{
                margin: 0,
                fontSize: '12px',
                lineHeight: '1.5',
                color: '#94a3b8',
              }}
            >
              Você perdeu{' '}
              <strong style={{ color: '#f1f5f9' }}>
                {report.lostExp.toLocaleString('pt-BR')} de experiência
              </strong>
              {report.isDelevel && (
                <span>
                  {' '}e{' '}
                  <strong style={{ color: '#f87171' }}>
                    {report.currentLevel - report.newLevel} level
                    {report.currentLevel - report.newLevel > 1 ? 's' : ''}
                  </strong>
                </span>
              )}
              , além de uma parte das suas skills.
            </p>

            {lostEquipCount > 0 && (
              <div
                style={{
                  marginTop: '8px',
                  fontSize: '11px',
                  color: '#fca5a5',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                }}
              >
                ⚠️ {lostEquipCount} item(ns) equipado(s) perdido(s) na morte!
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
            Calculando penalidades da morte...
          </div>
        )}

        {/* Divisor Inferior */}
        <div
          style={{
            margin: '14px 0 16px 0',
            height: '1px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          }}
        />

        {/* Notificação / Pill de Consumo de Blessings */}
        <div
          style={{
            backgroundColor: 'rgba(45, 17, 30, 0.35)',
            border: '1px solid rgba(244, 63, 94, 0.25)',
            borderRadius: '6px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              border: '1px solid rgba(244, 63, 94, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fda4af',
              fontSize: '11px',
              flexShrink: 0,
            }}
          >
            †
          </div>

          <span
            style={{
              fontSize: '12px',
              color: '#fda4af',
              fontWeight: '500',
            }}
          >
            {consumedBlessings > 0
              ? `Suas ${consumedBlessings} blessing${consumedBlessings > 1 ? 's' : ''} foram consumidas.`
              : 'Nenhuma blessing ativa para proteger sua alma.'}
          </span>
        </div>

        {/* Botão de Expansão de Detalhes */}
        <div style={{ textAlign: 'center', marginTop: '14px' }}>
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '11px',
              textDecoration: 'underline dotted',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {showDetails ? 'Ocultar detalhes' : 'Ver detalhes'}
          </button>
        </div>

        {/* Detalhes Expandidos (Skills perdidas e Equipamentos) */}
        {showDetails && report && (
          <div
            style={{
              marginTop: '10px',
              backgroundColor: '#0d0f16',
              border: '1px solid #252b3d',
              borderRadius: '4px',
              padding: '8px 10px',
              maxHeight: '140px',
              overflowY: 'auto',
              fontSize: '10.5px',
            }}
          >
            <div style={{ color: '#818cf8', fontWeight: '700', marginBottom: '6px' }}>
              Taxa de Perda Aplicada: {report.expPercent}% XP e Skills
            </div>

            {report.skillsLost.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {report.skillsLost.map((sk) => (
                  <div key={sk.skill} style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                    <span>{sk.name}:</span>
                    <span style={{ color: sk.lost > 0 ? '#f87171' : '#4ade80' }}>
                      {sk.before} ➔ {sk.after} {sk.lost > 0 ? `(-${sk.lost})` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {report.lostEquipment && report.lostEquipment.length > 0 && (
              <div style={{ marginTop: '6px', borderTop: '1px solid #1f2434', paddingTop: '4px' }}>
                <div style={{ color: '#f87171', fontWeight: '700', marginBottom: '3px' }}>Itens Perdidos:</div>
                {report.lostEquipment.map((eq, idx) => (
                  <div key={idx} style={{ color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ItemSprite itemId={eq.itemId} label={eq.name} />
                    <span>{eq.name} ({eq.slot})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Botão Ver o Último Minuto */}
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => setShowRecentLog((prev) => !prev)}
            style={{
              backgroundColor: '#151824',
              border: '1px solid #2e354a',
              borderRadius: '4px',
              color: '#cbd5e1',
              fontSize: '11px',
              padding: '6px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1f2538';
              e.currentTarget.style.borderColor = '#475574';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#151824';
              e.currentTarget.style.borderColor = '#2e354a';
            }}
          >
            <span>▶</span>
            <span>{showRecentLog ? 'Fechar registro' : 'Ver o último minuto'}</span>
          </button>
        </div>

        {/* Registro do Último Minuto */}
        {showRecentLog && (
          <div
            style={{
              marginTop: '10px',
              backgroundColor: '#0a0b10',
              border: '1px solid #202636',
              borderRadius: '4px',
              padding: '8px',
              maxHeight: '90px',
              overflowY: 'auto',
              fontSize: '10px',
              color: '#94a3b8',
              lineHeight: '1.4',
            }}
          >
            <div style={{ color: '#e2e8f0', fontWeight: '700', marginBottom: '4px' }}>Últimos Registros:</div>
            <div>[Combate] O herói foi cercado e sofreu dano crítico fatal.</div>
            <div style={{ color: '#f87171' }}>[Morte] Derrotado por {killer}.</div>
          </div>
        )}

        {/* Botão Principal Reviver */}
        <button
          type="button"
          onClick={onConfirm}
          style={{
            marginTop: '16px',
            width: '100%',
            height: '42px',
            backgroundColor: '#27354d',
            background: 'linear-gradient(180deg, #2c3c58 0%, #1e293d 100%)',
            border: '1px solid #435b86',
            borderRadius: '5px',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: '700',
            letterSpacing: '0.6px',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            transition: 'all 0.12s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(180deg, #374c70 0%, #25334c 100%)';
            e.currentTarget.style.borderColor = '#5675ac';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(180deg, #2c3c58 0%, #1e293d 100%)';
            e.currentTarget.style.borderColor = '#435b86';
          }}
        >
          Reviver
        </button>
      </div>
    </div>
  );
}
