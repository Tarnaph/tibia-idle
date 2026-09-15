'use client';

import React from 'react';
import type { TrainableSkill } from '@/packages/domain/src';
import type { TrainingTimeEstimate } from '@/packages/domain/src/training';

export interface TrainingMemberEstimate {
  characterId: string;
  characterName: string;
  vocation: string;
  isLeader?: boolean;
  skill: TrainableSkill;
  skillLabel: string;
  estimate: TrainingTimeEstimate;
}

export interface TrainingProgressHUDProps {
  members?: TrainingMemberEstimate[];
  skill?: TrainableSkill;
  skillLabel?: string;
  estimate?: TrainingTimeEstimate;
  onStopTraining: () => void;
}

const SKILL_ICONS: Record<TrainableSkill, string> = {
  sword: '🗡️',
  axe: '🪓',
  club: '🔨',
  distance: '🏹',
  shielding: '🛡️',
  magicLevel: '🔮',
  fist: '🥊',
};

const VOCATION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  knight: { bg: 'rgba(197, 48, 48, 0.25)', text: '#feb2b2', border: '#9b2c2c' },
  paladin: { bg: 'rgba(56, 161, 105, 0.25)', text: '#9ae6b4', border: '#276749' },
  sorcerer: { bg: 'rgba(128, 90, 213, 0.25)', text: '#d6bcfa', border: '#553c9a' },
  druid: { bg: 'rgba(49, 151, 149, 0.25)', text: '#81e6d9', border: '#285e61' },
};

export function TrainingProgressHUD({
  members,
  skill,
  skillLabel,
  estimate,
  onStopTraining,
}: TrainingProgressHUDProps) {
  // Constrói lista unificada de membros
  const resolvedMembers: TrainingMemberEstimate[] = members && members.length > 0
    ? members
    : estimate && skill && skillLabel
    ? [{
        characterId: 'active',
        characterName: 'Seu Personagem',
        vocation: 'Knight',
        isLeader: true,
        skill,
        skillLabel,
        estimate,
      }]
    : [];

  if (resolvedMembers.length === 0) return null;

  const isMulti = resolvedMembers.length > 1;

  return (
    <div
      className="training-progress-hud"
      data-testid="training-progress-hud"
      style={{
        position: 'fixed',
        top: '68px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 900,
        width: isMulti ? '840px' : '360px',
        maxWidth: '96vw',
        background: 'linear-gradient(180deg, rgba(26, 24, 21, 0.97) 0%, rgba(14, 13, 11, 0.99) 100%)',
        border: '2px solid #5a472c',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.85), 0 0 14px rgba(227, 180, 72, 0.22)',
        borderRadius: '8px',
        padding: isMulti ? '10px 14px' : '12px 14px',
        color: '#e0d7c6',
        fontFamily: 'Verdana, Arial, sans-serif',
        userSelect: 'none',
        pointerEvents: 'auto',
      }}
    >
      {/* Header Geral */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(138, 114, 76, 0.35)',
          paddingBottom: '8px',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>⚔️</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f5e4b8', letterSpacing: '0.4px' }}>
              {isMulti ? `Treino em Grupo no Dummy (${resolvedMembers.length} Personagens)` : resolvedMembers[0].skillLabel}
            </div>
            <div style={{ fontSize: '10px', color: '#a69b89' }}>
              Dummy de Thais (32349, Z:7) · Todos os membros posicionados ao redor
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onStopTraining}
          style={{
            background: 'linear-gradient(180deg, #9b2c2c 0%, #631717 100%)',
            border: '1px solid #e53e3e',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 700,
            padding: '5px 12px',
            cursor: 'pointer',
            transition: 'all 0.15s ease-in-out',
            boxShadow: '0 2px 5px rgba(0,0,0,0.6)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(180deg, #c53030 0%, #742a2a 100%)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(180deg, #9b2c2c 0%, #631717 100%)';
          }}
          title="Interromper o treino no dummy e reunir a party em fila indiana"
        >
          Parar Treino
        </button>
      </div>

      {/* Grid de Cards dos Personagens */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMulti ? `repeat(${Math.min(4, resolvedMembers.length)}, minmax(0, 1fr))` : '1fr',
          gap: '8px',
        }}
      >
        {resolvedMembers.map((m) => {
          const icon = SKILL_ICONS[m.skill] || '⚔️';
          const vocKey = (m.vocation || '').toLowerCase().replace(/^(royal|elder|master|elite)\s+/, '');
          const vocTheme = VOCATION_COLORS[vocKey] || { bg: 'rgba(160, 174, 192, 0.2)', text: '#e2e8f0', border: '#4a5568' };

          return (
            <div
              key={m.characterId}
              style={{
                background: 'rgba(20, 18, 15, 0.85)',
                border: '1px solid #3d3527',
                borderRadius: '6px',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              {/* Header do Card */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#f7fafc',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: isMulti ? '110px' : '200px',
                  }}
                  title={m.characterName}
                >
                  {m.characterName}
                </span>

                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    padding: '2px 5px',
                    borderRadius: '3px',
                    background: vocTheme.bg,
                    color: vocTheme.text,
                    border: `1px solid ${vocTheme.border}`,
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                    flexShrink: 0,
                  }}
                >
                  {m.vocation || 'Knight'}
                </span>
              </div>

              {/* Skill Sendo Treinada & Nível */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10.5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '12px' }}>{icon}</span>
                  <span style={{ color: '#d4c7b2', fontWeight: 600 }}>{m.skillLabel}</span>
                </div>
                <div style={{ color: '#a0aec0', fontSize: '10px' }}>
                  Nv {m.estimate.currentLevel} → <span style={{ color: '#68d391', fontWeight: 700 }}>{m.estimate.targetLevel}</span>
                </div>
              </div>

              {/* Barra de Progresso */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', marginBottom: '2px' }}>
                  <span style={{ color: '#a69b89' }}>Progresso</span>
                  <span style={{ color: '#ecc94b', fontWeight: 700 }}>{m.estimate.progressPercent.toFixed(1)}%</span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: '#12110f',
                    borderRadius: '2px',
                    border: '1px solid #332b1f',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${m.estimate.progressPercent}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #d69e2e 0%, #ecc94b 70%, #f6e05e 100%)',
                      transition: 'width 0.4s ease-out',
                      borderRadius: '1px',
                    }}
                  />
                </div>
              </div>

              {/* Tempo Restante */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(0, 0, 0, 0.35)',
                  borderRadius: '3px',
                  padding: '3px 6px',
                  fontSize: '9.5px',
                  color: '#cbd5e0',
                }}
              >
                <span style={{ color: '#ecc94b' }}>⏱️</span>
                <span>Tempo:</span>
                <strong style={{ color: '#f7fafc', marginLeft: 'auto' }}>{m.estimate.formattedTime}</strong>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

