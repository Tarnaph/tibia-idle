'use client';

import React, { useState } from 'react';
import type { CharacterState, DerivedStats, GameContent } from '@/packages/domain/src';
import { skillProgress, vocationFor, characterCapacity, inventoryWeight } from '@/packages/domain/src';

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
  const speed = 110 + (character.level - 1) * 2;

  return (
    <div className="tibia-skills-floating-window" role="dialog" aria-label="Skills">
      {/* Title Bar */}
      <div className="tibia-skills-titlebar">
        <div className="tibia-skills-title">
          <span className="skills-icon">🏹</span>
          <span>Skills</span>
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
          <div className="skills-row-level">
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
            <span className="skills-val">{hp}</span>
          </div>

          <div className="skills-row">
            <span className="skills-label">Mana</span>
            <span className="skills-val">{mana}</span>
          </div>

          <div className="skills-row">
            <span className="skills-label">Soul Points</span>
            <span className="skills-val">200</span>
          </div>

          <div className="skills-row">
            <span className="skills-label">Capacity</span>
            <span className="skills-val">{capacity}</span>
          </div>

          <div className="skills-row">
            <span className="skills-label">Speed</span>
            <span className="skills-val">{speed}</span>
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
          <div className="skills-row">
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
            { label: 'Fishing', key: null, val: 10 },
          ].map((item) => (
            <React.Fragment key={item.label}>
              <div className="skills-row">
                <span className="skills-label">{item.label}</span>
                <span className="skills-val bold">{item.val}</span>
              </div>
              <div className="skills-meter-track">
                <div
                  className="skills-meter-fill green"
                  style={{ width: `${item.key ? getProgress(item.key) : 15}%` }}
                />
              </div>
            </React.Fragment>
          ))}

          <div className="tibia-skills-divider" />

          {/* Imbuements / Leech Stats */}
          <div className="skills-section-header">Critical Hit:</div>
          <div className="skills-sub-row">
            <span className="skills-sub-label">Chance</span>
            <span className="skills-val">0%</span>
          </div>
          <div className="skills-sub-row">
            <span className="skills-sub-label">Extra Damage</span>
            <span className="skills-val">0%</span>
          </div>

          <div className="skills-section-header">Hit Points Leech:</div>
          <div className="skills-sub-row">
            <span className="skills-sub-label">Chance</span>
            <span className="skills-val">0%</span>
          </div>
          <div className="skills-sub-row">
            <span className="skills-sub-label">Amount</span>
            <span className="skills-val">0%</span>
          </div>

          <div className="skills-section-header">Mana Leech:</div>
          <div className="skills-sub-row">
            <span className="skills-sub-label">Chance</span>
            <span className="skills-val">0%</span>
          </div>
          <div className="skills-sub-row">
            <span className="skills-sub-label">Amount</span>
            <span className="skills-val">0%</span>
          </div>
        </div>
      )}
    </div>
  );
}
