'use client';

import React, { useState } from 'react';
import type { HuntAnalyzerData } from '../AdvancedMetricsWindow';

interface MobileHuntMetricsWidgetProps {
  data?: HuntAnalyzerData;
  isOpen: boolean;
  onClose: () => void;
  onReset?: () => void;
}

function formatRate(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return Math.round(value).toLocaleString();
}

function formatDuration(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function MobileHuntMetricsWidget({
  data,
  isOpen,
  onClose,
  onReset,
}: MobileHuntMetricsWidgetProps) {
  const [minimized, setMinimized] = useState<boolean>(false);

  if (!isOpen) return null;

  const elapsedMs = data?.elapsedMs ?? 0;
  const elapsedHours = Math.max(0.00028, elapsedMs / 3_600_000); // min 1 segundo
  const xpGained = data?.xpGained ?? 0;
  const lootGold = data?.lootGold ?? 0;
  const kills = data?.kills ?? 0;

  const xpHour = elapsedMs > 2000 ? Math.round(xpGained / elapsedHours) : 0;
  const goldHour = elapsedMs > 2000 ? Math.round(lootGold / elapsedHours) : 0;

  // Modo Minimizado (Pill compacto no canto superior)
  if (minimized) {
    return (
      <div
        data-testid="mobile-metrics-pill"
        onClick={() => setMinimized(false)}
        style={{
          position: 'fixed',
          top: '64px',
          left: '12px',
          zIndex: 48,
          backgroundColor: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(202, 138, 4, 0.4)',
          borderRadius: '20px',
          padding: '4px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.6)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: '11px', color: '#facc15', fontWeight: 700 }}>⚡ {formatRate(xpHour)}/h</span>
        <span style={{ fontSize: '11px', color: '#94a3b8' }}>·</span>
        <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600 }}>💀 {kills}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            fontSize: '12px',
            padding: '2px 4px',
            cursor: 'pointer',
            marginLeft: '2px',
          }}
        >
          ✕
        </button>
      </div>
    );
  }

  // Modo Compacto Expandido (Card minimalista de jogo)
  return (
    <div
      data-testid="mobile-metrics-card"
      style={{
        position: 'fixed',
        top: '64px',
        left: '12px',
        zIndex: 48,
        width: 'calc(100vw - 24px)',
        maxWidth: '320px',
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(202, 138, 4, 0.45)',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Header do Widget */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          backgroundColor: 'rgba(2, 6, 23, 0.7)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: '#facc15' }}>📊</span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#fef08a', letterSpacing: '0.3px' }}>
            Métricas de Caçada
          </span>
          <span style={{ fontSize: '10px', color: '#64748b' }}>({formatDuration(elapsedMs)})</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              title="Zerar Métricas"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '11px',
                cursor: 'pointer',
                padding: '4px 6px',
                borderRadius: '3px',
              }}
            >
              ↺
            </button>
          )}
          <button
            type="button"
            onClick={() => setMinimized(true)}
            title="Minimizar"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '12px',
              cursor: 'pointer',
              padding: '4px 6px',
              borderRadius: '3px',
            }}
          >
            ▾
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Fechar"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ef4444',
              fontSize: '12px',
              cursor: 'pointer',
              padding: '4px 6px',
              borderRadius: '3px',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Grid de 3 Indicadores Vitais */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '6px',
          padding: '8px 10px',
        }}
      >
        {/* Card XP/h */}
        <div
          style={{
            backgroundColor: 'rgba(30, 41, 59, 0.6)',
            borderRadius: '5px',
            padding: '6px 4px',
            textAlign: 'center',
            border: '1px solid rgba(250, 204, 21, 0.15)',
          }}
        >
          <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>XP / HORA</div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#facc15', marginTop: '2px' }}>
            {formatRate(xpHour)}
          </div>
          <div style={{ fontSize: '8.5px', color: '#64748b' }}>+{formatRate(xpGained)}</div>
        </div>

        {/* Card Gold/h */}
        <div
          style={{
            backgroundColor: 'rgba(30, 41, 59, 0.6)',
            borderRadius: '5px',
            padding: '6px 4px',
            textAlign: 'center',
            border: '1px solid rgba(52, 211, 153, 0.15)',
          }}
        >
          <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>GOLD / HORA</div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
            {formatRate(goldHour)}
          </div>
          <div style={{ fontSize: '8.5px', color: '#64748b' }}>+{formatRate(lootGold)} gp</div>
        </div>

        {/* Card Kills */}
        <div
          style={{
            backgroundColor: 'rgba(30, 41, 59, 0.6)',
            borderRadius: '5px',
            padding: '6px 4px',
            textAlign: 'center',
            border: '1px solid rgba(56, 189, 248, 0.15)',
          }}
        >
          <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>ABATES</div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
            {kills}
          </div>
          <div style={{ fontSize: '8.5px', color: '#64748b' }}>monstros</div>
        </div>
      </div>
    </div>
  );
}
