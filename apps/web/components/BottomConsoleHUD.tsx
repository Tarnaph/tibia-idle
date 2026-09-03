'use client';

import React, { useState } from 'react';
import type { SpellDefinition } from '@/packages/content-schema/src';
import {
  findHotbarAction,
  type CharacterState,
  type PartyActorState,
} from '@/packages/domain/src';
import { Tibia11ActionIcon } from './Tibia11ActionIcon';

interface BottomConsoleHUDProps {
  character: CharacterState;
  actor?: PartyActorState;
  spells: SpellDefinition[];
  elapsedMs: number;
  onConfigureSlot?: (slotIndex: number) => void;
  onSlotClick?: (slotIndex: number) => void;
  onToggleBackpack?: () => void;
  onToggleCombatLog?: () => void;
  logCount?: number;
}

export function BottomConsoleHUD({
  character,
  actor,
  spells,
  elapsedMs,
  onConfigureSlot,
  onSlotClick,
  onToggleBackpack,
  onToggleCombatLog,
  logCount = 0,
}: BottomConsoleHUDProps) {
  // Stances: 'offensive' | 'balanced' | 'defensive'
  const [stance, setStance] = useState<'offensive' | 'balanced' | 'defensive'>('offensive');
  const [presetSet, setPresetSet] = useState('Default');
  const [targetMode, setTargetMode] = useState('Mais próximo');
  const [targetCount, setTargetCount] = useState(1);

  const maxHp = character.maxHp || 2555;
  const currentHp = actor?.hp ?? character.currentHp;
  const hpPercent = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));

  const maxMana = character.maxMana || 840;
  const currentMana = actor?.mana ?? character.currentMana;
  const manaPercent = Math.max(0, Math.min(100, (currentMana / maxMana) * 100));

  // Calculate XP percentage to next level
  const xpCurrent = character.experience;
  const xpCurrentLevelBase = (character.level - 1) * 1000;
  const xpNextLevelBase = character.level * 1000;
  const xpProgress = Math.max(
    0,
    Math.min(
      99.9,
      ((xpCurrent - xpCurrentLevelBase) / Math.max(1, xpNextLevelBase - xpCurrentLevelBase)) * 100
    )
  );

  // Border colors corresponding to action categories
  const topRowBorderColors: Record<number, string> = {
    0: 'border-gold',
    1: 'border-red',
    2: 'border-pink',
    3: 'border-pink',
    4: 'border-orange',
    5: 'border-white',
    6: 'border-cyan',
    7: 'border-green',
  };

  const renderSlot = (slotIndex: number, isBottomRow = false) => {
    const actionId = character.hotbar[slotIndex];
    const hasAction = typeof actionId === 'number' && actionId > 0;
    const action = hasAction ? findHotbarAction(actionId, { spells } as any) : undefined;
    const hotkeyLabel = !isBottomRow ? `F${slotIndex + 1}` : `${(slotIndex - 10 + 1) % 10}`;

    // If empty slot
    if (!hasAction || !action) {
      return (
        <button
          type="button"
          key={`slot-${slotIndex}`}
          id={`hud-slot-${slotIndex}`}
          className="hud-action-slot empty-plus-slot"
          title={`Slot ${slotIndex + 1} [${hotkeyLabel}] Vazio · Clique para configurar magia/poção`}
          onClick={() => onConfigureSlot?.(slotIndex)}
        >
          <span className="empty-dots" style={{ opacity: 0.45, fontSize: '9px', letterSpacing: '1px' }}>▫ ▫ ▫ ▫</span>
          <span className="hud-key-label" style={{ position: 'absolute', top: '1px', left: '2px', fontSize: '7.5px', color: '#7e8781' }}>{hotkeyLabel}</span>
        </button>
      );
    }

    const borderColorClass = topRowBorderColors[slotIndex % 8] || 'border-cyan';
    const manaCost = action.kind === 'spell' ? action.spell.mana : undefined;

    return (
      <div
        key={`slot-${slotIndex}`}
        id={`hud-slot-${slotIndex}`}
        className={`hud-action-slot occupied-slot ${borderColorClass}`}
        onClick={() => {
          if (onSlotClick) onSlotClick(slotIndex);
          else onConfigureSlot?.(slotIndex);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onConfigureSlot?.(slotIndex);
        }}
        title={`${action.kind === 'spell' ? action.spell.name : action.kind === 'potion' ? action.potion.name : action.rune.name} [${hotkeyLabel}] (Clique para usar · Botão direito para configurar)`}
        style={{ cursor: 'pointer', position: 'relative' }}
      >
        {/* Hotkey Indicator */}
        <span className="hud-key-label" style={{ position: 'absolute', top: '1px', left: '2px', fontSize: '7.5px', color: '#c7d6cc', zIndex: 7, textShadow: '1px 1px 0 #000' }}>
          {hotkeyLabel}
        </span>

        {/* Center Icon with official CipSoft sprites */}
        <Tibia11ActionIcon
          id={action.kind === 'spell' ? action.spell.spellId : action.kind === 'potion' ? action.potion.id : action.rune.id}
          kind={action.kind}
          name={action.kind === 'spell' ? action.spell.name : action.kind === 'potion' ? action.potion.name : action.rune.name}
          size={30}
        />

        {/* Bottom-Right Blue Mana Cost */}
        {manaCost !== undefined && (
          <span className="hud-mana-cost">{manaCost}</span>
        )}
      </div>
    );
  };

  return (
    <div className="bottom-console-hud" aria-label="Console de Batalha e Ações">
      {/* 1. LEFT: Vitality & Player Status Panel */}
      <div className="hud-status-panel">
        {/* Health Bar (Green with centered HP and +15 regen) */}
        <div className="hud-bar-wrapper hp-bar-container">
          <div className="hud-bar-fill hp-fill" style={{ width: `${hpPercent}%` }} />
          <span className="hud-bar-text">{currentHp}/{maxHp}</span>
          <span className="hud-regen-text hp-regen">+15</span>
        </div>

        {/* Mana Bar (Blue with centered MP and +5 regen) */}
        <div className="hud-bar-wrapper mp-bar-container">
          <div className="hud-bar-fill mp-fill" style={{ width: `${manaPercent}%` }} />
          <span className="hud-bar-text">{currentMana}/{maxMana}</span>
          <span className="hud-regen-text mp-regen">+5</span>
        </div>

        {/* Level Badge + XP Progress */}
        <div className="hud-level-xp-row">
          <div className="hud-level-badge">Lv {character.level}</div>
          <div className="hud-xp-bar-container">
            <div className="hud-xp-fill" style={{ width: `${xpProgress}%` }} />
            <span className="hud-xp-text">{xpProgress.toFixed(1)}%</span>
          </div>
        </div>

        {/* Stamina / Energy Bar (Diagonal green stripes + 10:12h (+)) */}
        <div className="hud-stamina-container">
          <div className="hud-stamina-fill" />
          <div className="hud-stamina-info">
            <span className="hud-stamina-time">10:12h</span>
            <button type="button" className="hud-stamina-plus-btn" title="Adicionar Stamina / Bônus">+</button>
          </div>
        </div>
      </div>

      {/* 2. QUICK BACKPACK / INVENTORY SLOT */}
      <div className="hud-backpack-col">
        <button
          type="button"
          className="hud-backpack-slot"
          title="Abrir Mochila / Equipamentos (I)"
          onClick={onToggleBackpack}
        >
          {/* Authentic Leather Backpack SVG Icon */}
          <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
            <rect x="5" y="8" width="22" height="20" rx="4" fill="#693d1b" stroke="#3d220e" strokeWidth="1.2" />
            {/* Top flap */}
            <path d="M5 12 C5 7, 27 7, 27 12 L25 18 C20 19, 12 19, 7 18 Z" fill="#874e22" stroke="#4a2a12" strokeWidth="1" />
            {/* Straps */}
            <line x1="10" y1="9" x2="10" y2="28" stroke="#361e0b" strokeWidth="2" />
            <line x1="22" y1="9" x2="22" y2="28" stroke="#361e0b" strokeWidth="2" />
            {/* Golden Buckle */}
            <rect x="13.5" y="15" width="5" height="4" rx="0.5" fill="#f5c242" stroke="#876612" strokeWidth="0.8" />
            <rect x="15" y="16" width="2" height="2" fill="#361e0b" />
          </svg>
        </button>
      </div>

      {/* 3. CENTER: Dual Row Action Bar */}
      <div className="hud-dual-action-bar">
        {/* Top Row: 10 slots */}
        <div className="hud-action-row top-row">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((idx) => renderSlot(idx, false))}
        </div>

        {/* Bottom Row: 10 slots */}
        <div className="hud-action-row bottom-row">
          {[10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((idx) => renderSlot(idx, true))}
        </div>
      </div>

      {/* 4. RIGHT: Tactical Selectors & Combat Stances */}
      <div className="hud-tactics-panel">
        {/* Row 1: Dropdown CONJUNTO */}
        <div className="hud-dropdown-row">
          <span className="hud-dropdown-label">CONJUNTO</span>
          <select
            className="hud-select"
            value={presetSet}
            onChange={(e) => setPresetSet(e.target.value)}
          >
            <option value="Default">Default</option>
            <option value="Boss">Boss</option>
            <option value="AoE">AoE</option>
            <option value="Sustentação">Sustentação</option>
          </select>
        </div>

        {/* Row 2: Dropdown ALVO */}
        <div className="hud-dropdown-row">
          <span className="hud-dropdown-label">ALVO</span>
          <select
            className="hud-select"
            value={targetMode}
            onChange={(e) => setTargetMode(e.target.value)}
          >
            <option value="Mais próximo">Mais próximo</option>
            <option value="Menor vida">Menor vida</option>
            <option value="Maior vida">Maior vida</option>
          </select>
        </div>

        {/* Row 3: Stance Buttons & Target Control */}
        <div className="hud-stances-row">
          {/* Defensive Stance (Shield) */}
          <button
            type="button"
            className={`hud-stance-btn ${stance === 'defensive' ? 'active' : ''}`}
            title="Modo Defensivo (Foco em Defesa)"
            onClick={() => setStance('defensive')}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1 L14 3 C14 8, 12 13, 8 15 C4 13, 2 8, 2 3 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>

          {/* Balanced Stance (Scales) */}
          <button
            type="button"
            className={`hud-stance-btn ${stance === 'balanced' ? 'active' : ''}`}
            title="Modo Equilibrado (Ataque e Defesa balanceados)"
            onClick={() => setStance('balanced')}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" strokeWidth="1.5" />
              <line x1="2" y1="4" x2="14" y2="4" stroke="currentColor" strokeWidth="1.5" />
              <path d="M4 4 L2 9 L6 9 Z" fill="none" stroke="currentColor" strokeWidth="1" />
              <path d="M12 4 L10 9 L14 9 Z" fill="none" stroke="currentColor" strokeWidth="1" />
            </svg>
          </button>

          {/* Offensive Stance (Crossed Swords - Highlighted active with green border) */}
          <button
            type="button"
            className={`hud-stance-btn ${stance === 'offensive' ? 'active' : ''}`}
            title="Modo Ofensivo (Foco em Dano Máximo)"
            onClick={() => setStance('offensive')}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" strokeWidth="1.6" />
              <line x1="13" y1="3" x2="3" y2="13" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="8" cy="8" r="1.5" fill="#52e043" />
            </svg>
          </button>

          {/* Target Reticle Button */}
          <button
            type="button"
            className="hud-target-reticle-btn"
            title="Fixar Alvo / Mira Automática"
          >
            <svg width="16" height="14" viewBox="0 0 20 16" fill="currentColor">
              <circle cx="6" cy="8" r="5" fill="none" stroke="#e03838" strokeWidth="1.5" />
              <line x1="6" y1="1" x2="6" y2="15" stroke="#e03838" strokeWidth="1" />
              <line x1="0" y1="8" x2="12" y2="8" stroke="#e03838" strokeWidth="1" />
              {/* Blue projectile arrow */}
              <line x1="10" y1="8" x2="18" y2="8" stroke="#47b0f5" strokeWidth="1.5" />
              <polygon points="18,8 15,6 15,10" fill="#47b0f5" />
            </svg>
          </button>

          {/* Target Count Adjuster (- 1 +) */}
          <div className="hud-target-stepper">
            <button
              type="button"
              className="stepper-btn"
              onClick={() => setTargetCount((c) => Math.max(1, c - 1))}
            >
              -
            </button>
            <span className="stepper-val">{targetCount}</span>
            <button
              type="button"
              className="stepper-btn"
              onClick={() => setTargetCount((c) => Math.min(5, c + 1))}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Optional Log Drawer Button in Corner */}
      {onToggleCombatLog && (
        <button
          type="button"
          className="hud-log-toggle"
          title="Ver Combat Log"
          onClick={onToggleCombatLog}
        >
          Log ({logCount})
        </button>
      )}
    </div>
  );
}
