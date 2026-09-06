'use client';

import React, { useState } from 'react';
import type { CharacterState, DerivedStats, GameContent, SkillTooltipInfo } from '@/packages/domain/src';
import { skillProgress, vocationFor, characterCapacity, inventoryWeight, getSkillTooltipInfo } from '@/packages/domain/src';

interface SkillsWindowProps {
  open: boolean;
  character: CharacterState;
  stats: DerivedStats;
  content: GameContent;
  onClose: () => void;
}

export function SkillsWindow({
  open,
  character,
  stats,
  content,
  onClose,
}: SkillsWindowProps) {
  const [minimized, setMinimized] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<SkillTooltipInfo | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  if (!open) return null;

  const vocation = vocationFor(content, character.vocation);

  // Experience calculations
  const currentExp = character.experience;
  const level = character.level;

  // Calculate percentage of skills using domain's skillProgress
  const getProgress = (skillName: 'fist' | 'club' | 'sword' | 'axe' | 'distance' | 'shielding' | 'magicLevel') => {
    return Math.round(skillProgress(character, skillName, vocation) * 100);
  };

  const hp = character.currentHp;
  const maxHp = character.maxHp;
  const mana = character.currentMana;
  const maxMana = character.maxMana;

  // Calculate free capacity and speed
  const capacity = Math.max(0, characterCapacity(character, content) - inventoryWeight(character, content.equipment));
  const speed = 110 + (character.level - 1) * 2 + stats.movementSpeedBonus;

  const handleMouseEnter = (
    e: React.MouseEvent,
    skillKey: 'fist' | 'club' | 'sword' | 'axe' | 'distance' | 'shielding' | 'magicLevel' | 'fishing' | 'level',
  ) => {
    const info = getSkillTooltipInfo(character.skills, skillKey, character.level);
    setActiveTooltip(info);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: rect.right + 12, y: rect.top });
  };

  const handleMouseLeave = () => {
    setActiveTooltip(null);
  };

  return (
    <div className="tibia-skills-floating-window" role="dialog" aria-label="Skills">
      {/* Title Bar */}
      <div className="tibia-skills-titlebar">
        <div className="tibia-skills-title">
          <span className="skills-icon">🏹</span>
          <span>Skills & Atributos</span>
        </div>
        <div className="tibia-skills-controls">
          <button
            type="button"
            className="tibia-skills-btn-ctrl"
            onClick={() => setMinimized((prev) => !prev)}
            title="Minimizar"
          >
            _
          </button>
          <button
            type="button"
            className="tibia-skills-btn-ctrl"
            onClick={onClose}
            title="Fechar"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Window Body */}
      {!minimized && (
        <div className="tibia-skills-body">
          {/* Level & XP */}
          <div
            className="skills-row-level"
            style={{ cursor: 'help' }}
            onMouseEnter={(e) => handleMouseEnter(e, 'level')}
            onMouseLeave={handleMouseLeave}
          >
            <span className="skills-label">Level</span>
            <span className="skills-val bold">{level}</span>
          </div>
          <div className="skills-meter-track">
            <div className="skills-meter-fill red" style={{ width: '45%' }} />
          </div>

          <div className="skills-row">
            <span className="skills-label">Experience</span>
            <span className="skills-val">{currentExp.toLocaleString('en-US')}</span>
          </div>

          <div className="skills-row">
            <span className="skills-label">XP Gain Rate</span>
            <span className="skills-val green">237%</span>
          </div>

          <div className="skills-boost-container">
            <div className="skills-boost-badge">
              <span className="boost-icon">📦⚡</span>
              <span className="boost-text">XP Boost</span>
            </div>
          </div>

          {/* Vitals */}
          <div className="skills-row">
            <span className="skills-label">Hit Points</span>
            <span className="skills-val">{hp} / {maxHp}</span>
          </div>

          <div className="skills-row">
            <span className="skills-label">Mana</span>
            <span className="skills-val">{mana} / {maxMana}</span>
          </div>

          <div className="skills-row">
            <span className="skills-label">Soul Points</span>
            <span className="skills-val">200</span>
          </div>

          <div className="skills-row">
            <span className="skills-label">Capacity</span>
            <span className="skills-val">{capacity} oz</span>
          </div>

          <div className="skills-row">
            <span className="skills-label">Speed</span>
            <span className="skills-val">{speed} (+{stats.movementSpeedBonus} skill)</span>
          </div>

          <div className="skills-row">
            <span className="skills-label">Food</span>
            <span className="skills-val">00:09</span>
          </div>

          {/* Stamina with Green Meter */}
          <div className="skills-row">
            <span className="skills-label">Stamina</span>
            <span className="skills-val">40:01</span>
          </div>
          <div className="skills-meter-track">
            <div className="skills-meter-fill green" style={{ width: '95%' }} />
          </div>

          {/* Offline Training with Red Meter */}
          <div className="skills-row">
            <span className="skills-label">Offline Training</span>
            <span className="skills-val">07:36</span>
          </div>
          <div className="skills-meter-track">
            <div className="skills-meter-fill red" style={{ width: '65%' }} />
          </div>

          {/* Magic Level with Red Meter */}
          <div
            className="skills-row"
            style={{ cursor: 'help' }}
            onMouseEnter={(e) => handleMouseEnter(e, 'magicLevel')}
            onMouseLeave={handleMouseLeave}
          >
            <span className="skills-label">Magic Level</span>
            <span className="skills-val bold">{character.skills.magicLevel}</span>
          </div>
          <div className="skills-meter-track">
            <div className="skills-meter-fill red" style={{ width: `${getProgress('magicLevel')}%` }} />
          </div>

          <div className="tibia-skills-divider" />

          {/* Weapon / Defensive Skills */}
          {[
            { label: 'Fist Fighting', key: 'fist' as const, val: character.skills.fist },
            { label: 'Club Fighting', key: 'club' as const, val: character.skills.club },
            { label: 'Sword Fighting', key: 'sword' as const, val: character.skills.sword },
            { label: 'Axe Fighting', key: 'axe' as const, val: character.skills.axe },
            { label: 'Distance Fighting', key: 'distance' as const, val: character.skills.distance },
            { label: 'Shielding', key: 'shielding' as const, val: character.skills.shielding },
            { label: 'Fishing', key: 'fishing' as const, val: character.skills.fishing ?? 10 },
          ].map((item) => (
            <React.Fragment key={item.label}>
              <div
                className="skills-row"
                style={{ cursor: 'help' }}
                onMouseEnter={(e) => handleMouseEnter(e, item.key)}
                onMouseLeave={handleMouseLeave}
              >
                <span className="skills-label">{item.label}</span>
                <span className="skills-val bold">{item.val}</span>
              </div>
              <div className="skills-meter-track">
                <div
                  className="skills-meter-fill green"
                  style={{ width: `${item.key !== 'fishing' ? getProgress(item.key) : 15}%` }}
                />
              </div>
            </React.Fragment>
          ))}

          <div className="tibia-skills-divider" />

          {/* Imbuements / Leech Stats */}
          <div className="skills-section-header">Resistências & Mitigações:</div>
          <div className="skills-sub-row">
            <span className="skills-sub-label">Resist. Mágica</span>
            <span className="skills-val green">+{stats.magicDamageResistancePercent}%</span>
          </div>
          <div className="skills-sub-row">
            <span className="skills-sub-label">Mitigação Física</span>
            <span className="skills-val green">+{stats.physicalDamageMitigationPercent}%</span>
          </div>
          <div className="skills-sub-row">
            <span className="skills-sub-label">Vel. de Ataque</span>
            <span className="skills-val green">+{stats.attackSpeedBonusPercent}% ({stats.attackIntervalMs}ms)</span>
          </div>
        </div>
      )}

      {/* Floating Rich Tooltip */}
      {activeTooltip && (
        <div
          style={{
            position: 'fixed',
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            zIndex: 9999999,
            width: '280px',
            backgroundColor: '#16191d',
            border: '2px solid #5a4b32',
            boxShadow: '0 8px 24px rgba(0,0,0,0.85)',
            borderRadius: '4px',
            padding: '10px 12px',
            color: '#e2d6c1',
            fontFamily: 'sans-serif',
            fontSize: '12px',
            pointerEvents: 'none',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', borderBottom: '1px solid #3c3121', paddingBottom: '4px' }}>
            <span style={{ color: '#ffd700', fontWeight: 'bold', fontSize: '13px' }}>{activeTooltip.name}</span>
            <span style={{ backgroundColor: '#2b2318', color: '#ff8c00', padding: '1px 6px', borderRadius: '3px', fontWeight: 'bold' }}>Nível {activeTooltip.level}</span>
          </div>

          <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#a09888', lineHeight: '1.3' }}>
            {activeTooltip.description}
          </p>

          <div style={{ marginBottom: '8px' }}>
            <div style={{ color: '#67de82', fontWeight: 'bold', marginBottom: '3px', fontSize: '11px' }}>✨ Bônus Atuais (Nível {activeTooltip.level}):</div>
            <ul style={{ margin: 0, paddingLeft: '14px', color: '#d0c8b8', lineHeight: '1.4' }}>
              {activeTooltip.currentPerks.map((perk, idx) => (
                <li key={idx}>{perk}</li>
              ))}
            </ul>
          </div>

          <div>
            <div style={{ color: '#ffb830', fontWeight: 'bold', marginBottom: '3px', fontSize: '11px' }}>⬆️ Próximo Nível (Nível {activeTooltip.level + 1}):</div>
            <ul style={{ margin: 0, paddingLeft: '14px', color: '#b8b0a0', lineHeight: '1.4' }}>
              {activeTooltip.nextLevelPerks.map((perk, idx) => (
                <li key={idx}>{perk}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

