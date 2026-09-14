'use client';

import React from 'react';
import type { TrainableSkill } from '@/packages/domain/src';
import type { TrainingTimeEstimate } from '@/packages/domain/src/training';

interface TrainingProgressHUDProps {
  skill: TrainableSkill;
  skillLabel: string;
  estimate: TrainingTimeEstimate;
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

export function TrainingProgressHUD({
  skill,
  skillLabel,
  estimate,
  onStopTraining,
}: TrainingProgressHUDProps) {
  const icon = SKILL_ICONS[skill] || '⚔️';

  return (
    <div
      className="training-progress-hud"
      data-testid="training-progress-hud"
      style={{
        position: 'fixed',
        top: '72px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 900,
        width: '360px',
        maxWidth: '92vw',
        background: 'linear-gradient(180deg, rgba(28, 26, 23, 0.95) 0%, rgba(16, 15, 13, 0.98) 100%)',
        border: '2px solid #5a472c',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.85), 0 0 12px rgba(227, 180, 72, 0.25)',
        borderRadius: '6px',
        padding: '12px 14px',
        color: '#e0d7c6',
        fontFamily: 'Verdana, Arial, sans-serif',
        userSelect: 'none',
        pointerEvents: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(138, 114, 76, 0.3)',
          paddingBottom: '8px',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>{icon}</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f5e4b8', letterSpacing: '0.4px' }}>
              {skillLabel}
            </div>
            <div style={{ fontSize: '11px', color: '#a69b89' }}>
              Nível {estimate.currentLevel} → <span style={{ color: '#68d391', fontWeight: 600 }}>Nível {estimate.targetLevel}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onStopTraining}
          style={{
            background: 'linear-gradient(180deg, #8a2424 0%, #521515 100%)',
            border: '1px solid #c53030',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 700,
            padding: '4px 10px',
            cursor: 'pointer',
            transition: 'all 0.15s ease-in-out',
            boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(180deg, #9b2c2c 0%, #631717 100%)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(180deg, #8a2424 0%, #521515 100%)';
          }}
          title="Interromper o treino no dummy e liberar movimento"
        >
          Parar Treino
        </button>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: '8px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            marginBottom: '4px',
            fontWeight: 600,
          }}
        >
          <span style={{ color: '#d4c7b2' }}>Progresso para o próximo nível</span>
          <span style={{ color: '#ecc94b' }}>{estimate.progressPercent.toFixed(1)}%</span>
        </div>
        <div
          style={{
            width: '100%',
            height: '14px',
            backgroundColor: '#12110f',
            borderRadius: '3px',
            border: '1px solid #3d3527',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: `${estimate.progressPercent}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #d69e2e 0%, #ecc94b 70%, #f6e05e 100%)',
              transition: 'width 0.4s ease-out',
              borderRadius: '2px',
              boxShadow: '0 0 8px rgba(236, 201, 75, 0.4)',
            }}
          />
        </div>
      </div>

      {/* Remaining Time & Stats */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(0, 0, 0, 0.35)',
          borderRadius: '4px',
          padding: '6px 8px',
          fontSize: '11px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: '#ecc94b' }}>⏱️</span>
          <span style={{ color: '#cbd5e0' }}>Tempo estimado:</span>
          <strong style={{ color: '#f7fafc' }}>{estimate.formattedTime}</strong>
        </div>

        <div style={{ color: '#718096', fontSize: '10px' }}>
          Dummy de Thais (32349, Z:7)
        </div>
      </div>
    </div>
  );
}
