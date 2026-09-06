'use client';

import React, { useState } from 'react';
import type { SpellDefinition } from '@/packages/content-schema/src';
import {
  findHotbarAction,
  formatStaminaTime,
  getStaminaPercentage,
  type CharacterState,
  type CombatStance,
  type PartyActorState,
} from '@/packages/domain/src';
import { Tibia11ActionIcon } from './Tibia11ActionIcon';

interface BottomConsoleHUDProps {
  character: CharacterState;
  actor?: PartyActorState;
  spells: SpellDefinition[];
  elapsedMs: number;
  isAutoIdle?: boolean;
  onToggleAutoIdle?: () => void;
  onConfigureSlot?: (slotIndex: number) => void;
  onSlotClick?: (slotIndex: number) => void;
  onToggleBackpack?: () => void;
  onToggleCombatLog?: () => void;
  logCount?: number;
  onChangeStance?: (stance: CombatStance) => void;
  onChangeTargetDistance?: (distance: number) => void;
}

export function BottomConsoleHUD({
  character,
  actor,
  spells,
  elapsedMs,
  isAutoIdle = false,
  onToggleAutoIdle,
  onConfigureSlot,
  onSlotClick,
  onToggleBackpack,
  onToggleCombatLog,
  logCount = 0,
  onChangeStance,
  onChangeTargetDistance,
}: BottomConsoleHUDProps) {
  // Stances: 'offensive' | 'balanced' | 'defensive'
  const [stance, setStance] = useState<CombatStance>('offensive');
  const [presetSet, setPresetSet] = useState('Default');
  const [targetMode, setTargetMode] = useState('Mais próximo');
  const [targetCount, setTargetCount] = useState(1);

  const currentStance = character.stance ?? stance;
  const currentTargetDistance = character.targetDistance ?? targetCount;

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
    const action = hasAction ? findHotbarAction(actionId, { spells } as unknown as Parameters<typeof findHotbarAction>[1]) : undefined;
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

    // Cooldown calculation
    const spellCooldown = action.kind === 'spell'
      ? (actor?.spellCooldowns?.[String(action.spell.spellId)] ?? character.combatState?.spellCooldowns?.[String(action.spell.spellId)] ?? 0)
      : 0;
    const groupCooldown = action.kind === 'spell'
      ? (actor?.groupCooldowns?.[action.spell.group] ?? character.combatState?.groupCooldowns?.[action.spell.group] ?? 0)
      : action.kind === 'potion'
      ? (actor?.groupCooldowns?.['potion'] ?? character.combatState?.groupCooldowns?.['potion'] ?? 0)
      : (actor?.groupCooldowns?.['rune'] ?? character.combatState?.groupCooldowns?.['rune'] ?? 0);

    const cooldownUntil = Math.max(spellCooldown, groupCooldown);
    const isOnCooldown = cooldownUntil > elapsedMs;
    const remainingSec = isOnCooldown ? ((cooldownUntil - elapsedMs) / 1000).toFixed(1) : null;

    return (
      <div
        key={`slot-${slotIndex}`}
        id={`hud-slot-${slotIndex}`}
        className={`hud-action-slot occupied-slot ${borderColorClass}`}
        onClick={() => {
          if (isOnCooldown) return;
          if (onSlotClick) onSlotClick(slotIndex);
          else onConfigureSlot?.(slotIndex);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onConfigureSlot?.(slotIndex);
        }}
        title={`${action.kind === 'spell' ? action.spell.name : action.kind === 'potion' ? action.potion.name : action.rune.name} [${hotkeyLabel}] ${isOnCooldown ? `(Cooldown: ${remainingSec}s)` : '(Clique para usar · Botão direito para configurar)'}`}
        style={{ cursor: isOnCooldown ? 'not-allowed' : 'pointer', position: 'relative' }}
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

        {/* Cooldown Dark Overlay & Timer */}
        {isOnCooldown && (
          <div
            className="hud-slot-cooldown-overlay"
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              pointerEvents: 'none',
              borderRadius: '2px',
            }}
          >
            <span
              style={{
                color: '#ffffff',
                fontSize: '10.5px',
                fontWeight: 'bold',
                fontFamily: 'Verdana, Arial, sans-serif',
                textShadow: '0 0 3px #000, 1px 1px 0 #000',
              }}
            >
              {remainingSec}s
            </span>
          </div>
        )}

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

        {/* Stamina / Energy Bar (Diagonal green stripes + dynamic MM:SS (+)) */}
        <div
          className="hud-stamina-container"
          title={`Estamina: ${formatStaminaTime(character.staminaMinutes ?? 15)} / ${formatStaminaTime(character.maxStaminaMinutes ?? 15)}`}
        >
          <div
            className="hud-stamina-fill"
            style={{ width: `${getStaminaPercentage(character.staminaMinutes ?? 15, character.maxStaminaMinutes ?? 15)}%` }}
          />
          <div className="hud-stamina-info">
            <span className="hud-stamina-time">{formatStaminaTime(character.staminaMinutes ?? 15)}</span>
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
          <img
            src="/backpack.png"
            alt="Mochila"
            width={32}
            height={32}
            style={{ imageRendering: 'pixelated', display: 'block' }}
          />
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
            className={`hud-stance-btn ${currentStance === 'defensive' ? 'active' : ''}`}
            title="Modo Defensivo (Foco em Defesa Máxima, 50% de Dano de Ataque)"
            onClick={() => {
              setStance('defensive');
              onChangeStance?.('defensive');
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1 L14 3 C14 8, 12 13, 8 15 C4 13, 2 8, 2 3 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>

          {/* Balanced Stance (Scales) */}
          <button
            type="button"
            className={`hud-stance-btn ${currentStance === 'balanced' ? 'active' : ''}`}
            title="Modo Equilibrado (75% de Ataque e 75% de Defesa)"
            onClick={() => {
              setStance('balanced');
              onChangeStance?.('balanced');
            }}
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
            className={`hud-stance-btn ${currentStance === 'offensive' ? 'active' : ''}`}
            title="Modo Ofensivo (100% de Dano de Ataque, 50% de Fator de Defesa)"
            onClick={() => {
              setStance('offensive');
              onChangeStance?.('offensive');
            }}
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
            title="Fixar Alvo / Perseguição Automática"
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

          {/* Target Distance Stepper (- 1 +) */}
          <div className="hud-target-stepper">
            <button
              type="button"
              className="stepper-btn"
              onClick={() => {
                const nextVal = Math.max(1, currentTargetDistance - 1);
                setTargetCount(nextVal);
                onChangeTargetDistance?.(nextVal);
              }}
              title="Reduzir distância mantida do alvo (1 = melee/encostar)"
            >
              -
            </button>
            <span
              className="stepper-val"
              title={currentTargetDistance === 1 ? 'Distância 1: Encosta no monstro (corpo a corpo)' : `Distância ${currentTargetDistance}: Mantém ${currentTargetDistance} tiles de distância`}
            >
              {currentTargetDistance}
            </span>
            <button
              type="button"
              className="stepper-btn"
              onClick={() => {
                const nextVal = Math.min(5, currentTargetDistance + 1);
                setTargetCount(nextVal);
                onChangeTargetDistance?.(nextVal);
              }}
              title="Aumentar distância mantida do alvo (útil para Paladinos e Magos)"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Integrated AUTO ON/OFF Control Button matching reference HUD screenshot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {onToggleAutoIdle && (
          <button
            type="button"
            className={`hud-auto-toggle-btn ${isAutoIdle ? 'active' : ''}`}
            title="Alternar Modo Auto-Idle (Caça ⇄ Treino ⇄ Loja)"
            onClick={onToggleAutoIdle}
            style={{
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: 'bold',
              borderRadius: '4px',
              border: isAutoIdle ? '1px solid #52e043' : '1px solid #555',
              backgroundColor: isAutoIdle ? 'rgba(82, 224, 67, 0.2)' : 'rgba(20, 20, 20, 0.8)',
              color: isAutoIdle ? '#52e043' : '#a0a0a0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: isAutoIdle ? '0 0 6px rgba(82, 224, 67, 0.5)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontSize: '10px' }}>🤖</span>
            <span>AUTO {isAutoIdle ? 'ON' : 'OFF'}</span>
          </button>
        )}

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
    </div>
  );
}
