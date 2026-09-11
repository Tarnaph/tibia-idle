'use client';

import React, { useState, useEffect } from 'react';
import type { BestiaryMonster } from '../lib/cyclopediaData';
import { formatNumberWithDots } from '../lib/cyclopediaData';

interface BestiaryTrackerHUDProps {
  monster: BestiaryMonster | null;
  kills: number;
  firstKillAlert?: string | null;
  onClose: () => void;
  onOpenCyclopedia?: () => void;
}

export function BestiaryTrackerHUD({
  monster,
  kills,
  firstKillAlert,
  onClose,
  onOpenCyclopedia,
}: BestiaryTrackerHUDProps) {
  const [visibleAlert, setVisibleAlert] = useState<string | null>(null);

  useEffect(() => {
    if (firstKillAlert) {
      setVisibleAlert(firstKillAlert);
      const timer = setTimeout(() => {
        setVisibleAlert(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [firstKillAlert]);

  if (!monster) return null;

  const currentKills = Math.max(0, kills);
  const targetKills = monster.killsNeeded;
  const isComplete = currentKills >= targetKills;
  const remaining = Math.max(0, targetKills - currentKills);
  const percent = Math.min(100, Math.round((currentKills / targetKills) * 100));

  return (
    <aside
      id="bestiary-tracker-hud"
      className="bestiary-tracker-hud"
      aria-label="Rastreador de Bestiário"
      style={{
        position: 'fixed',
        top: '68px',
        right: '295px',
        zIndex: 9999,
        width: '240px',
        backgroundColor: '#1b1d20',
        backgroundImage: 'linear-gradient(180deg, #24282e 0%, #17191c 100%)',
        border: '1px solid #3c424d',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        borderRadius: '3px',
        fontFamily: 'Verdana, sans-serif',
        color: '#dcdcdc',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Toast Notification for First Kill */}
      {visibleAlert && (
        <div
          style={{
            backgroundColor: '#1e382b',
            borderBottom: '1px solid #2ecc71',
            padding: '6px 8px',
            fontSize: '10px',
            color: '#2ecc71',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            animation: 'fadeIn 0.3s ease-in-out',
          }}
        >
          <span style={{ fontSize: '13px' }}>✨</span>
          <span>{visibleAlert}</span>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '5px 8px',
          backgroundColor: '#2b3038',
          borderBottom: '1px solid #15171a',
          fontSize: '11px',
          fontWeight: 'bold',
          color: '#f0ad4e',
          textShadow: '1px 1px 0 #000',
        }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
          onClick={onOpenCyclopedia}
          title="Clique para abrir na Cyclopedia"
        >
          <span style={{ color: '#f39c12' }}>•</span>
          <span>Bestiário: {monster.name}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#a0a0a0',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: 'pointer',
            padding: '0 4px',
            lineHeight: 1,
          }}
          title="Fechar rastreador"
          onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#fff')}
          onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#a0a0a0')}
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '8px 10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        {/* Monster Sprite */}
        <div
          onClick={onOpenCyclopedia}
          title="Abrir Cyclopedia"
          style={{
            width: '42px',
            height: '42px',
            backgroundColor: '#121416',
            border: '1px solid #2d333b',
            borderRadius: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <img
            src={monster.spriteUrl}
            alt={monster.name}
            style={{
              maxWidth: '36px',
              maxHeight: '36px',
              imageRendering: 'pixelated',
            }}
          />
        </div>

        {/* Progress & Kills info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '10px',
              marginBottom: '4px',
            }}
          >
            <span style={{ color: '#e0e0e0', fontWeight: 'bold' }}>
              {isComplete ? (
                <span style={{ color: '#f1c40f' }}>Completo!</span>
              ) : (
                `${formatNumberWithDots(currentKills)} / ${formatNumberWithDots(targetKills)}`
              )}
            </span>
            <span style={{ color: '#8c95a0', fontSize: '9px' }}>{percent}%</span>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              height: '8px',
              backgroundColor: '#101214',
              borderRadius: '2px',
              border: '1px solid #2d3239',
              overflow: 'hidden',
              marginBottom: '4px',
              position: 'relative',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${percent}%`,
                backgroundColor: isComplete ? '#f1c40f' : '#2ecc71',
                backgroundImage: isComplete
                  ? 'linear-gradient(90deg, #d4ac0d, #f1c40f)'
                  : 'linear-gradient(90deg, #27ae60, #2ecc71)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>

          <div style={{ fontSize: '9px', color: '#88929b' }}>
            {isComplete ? (
              <span style={{ color: '#f1c40f' }}>★ Bestiário concluído!</span>
            ) : (
              `Faltam ${formatNumberWithDots(remaining)} kills`
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
