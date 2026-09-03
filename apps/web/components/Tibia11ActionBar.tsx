'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { SpellDefinition } from '@/packages/content-schema/src';
import {
  findHotbarAction,
  type CharacterState,
  type PartyActorState,
} from '@/packages/domain/src';
import { Tibia11ActionIcon } from './Tibia11ActionIcon';

interface Tibia11ActionBarProps {
  character: CharacterState;
  actor?: PartyActorState;
  spells: SpellDefinition[];
  elapsedMs: number;
  onConfigureSlot?: (slotIndex: number) => void;
  onReorderSlot?: (fromIndex: number, toIndex: number) => void;
}

const TOTAL_VISIBLE_SLOTS = 18; // F1 to F12 + 6 auxiliary slots

export function Tibia11ActionBar({
  character,
  actor,
  spells,
  elapsedMs,
  onConfigureSlot,
  onReorderSlot,
}: Tibia11ActionBarProps) {
  const [isLocked, setIsLocked] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut listener (F1 to F12 and 1 to 9)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      let slotIndex = -1;

      // Check F1 - F12
      if (e.key.startsWith('F') && e.key.length <= 3) {
        const fNum = parseInt(e.key.slice(1), 10);
        if (!isNaN(fNum) && fNum >= 1 && fNum <= 12) {
          e.preventDefault();
          slotIndex = fNum - 1;
        }
      } else {
        // Numbers 1 - 9
        const num = parseInt(e.key, 10);
        if (!isNaN(num) && num >= 1 && num <= 9) {
          slotIndex = num - 1;
        }
      }

      if (slotIndex >= 0 && slotIndex < TOTAL_VISIBLE_SLOTS) {
        const slotEl = document.getElementById(`tibia11-slot-${slotIndex}`);
        slotEl?.classList.add('tibia11-slot-pressed');
        setTimeout(() => slotEl?.classList.remove('tibia11-slot-pressed'), 140);

        if (character.hotbar[slotIndex] === undefined) {
          onConfigureSlot?.(slotIndex);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [character.hotbar, onConfigureSlot]);

  const handleScrollLeft = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: -140, behavior: 'smooth' });
  };

  const handleScrollStart = () => {
    if (scrollRef.current) scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
  };

  const handleScrollRight = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: 140, behavior: 'smooth' });
  };

  const handleScrollEnd = () => {
    if (scrollRef.current) scrollRef.current.scrollTo({ left: 1000, behavior: 'smooth' });
  };

  return (
    <div className="tibia11-action-bar-container" aria-label="Tibia 11 Action Bar">
      {/* Left Navigation Buttons */}
      <div className="tibia11-nav-group left-nav">
        <button
          type="button"
          className="tibia11-nav-btn btn-left"
          title="Rolar para a esquerda"
          onClick={handleScrollLeft}
        >
          <svg width="6" height="8" viewBox="0 0 6 8" fill="currentColor">
            <polygon points="5,0 0,4 5,8" />
          </svg>
        </button>
        <button
          type="button"
          className="tibia11-nav-btn btn-start"
          title="Início dos atalhos"
          onClick={handleScrollStart}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
            <rect x="0" y="0" width="1.5" height="8" />
            <polygon points="7,0 2,4 7,8" />
          </svg>
        </button>
      </div>

      {/* Center Scrollable Slots Track */}
      <div className="tibia11-slots-track" ref={scrollRef}>
        {Array.from({ length: TOTAL_VISIBLE_SLOTS }).map((_, index) => {
          const actionId = character.hotbar[index];
          const hotkeyLabel = index < 12 ? `F${index + 1}` : '';

          // 1. EMPTY SLOT
          if (typeof actionId !== 'number') {
            return (
              <div
                key={`slot-${index}`}
                id={`tibia11-slot-${index}`}
                className="tibia11-slot empty"
                title={hotkeyLabel ? `Slot ${hotkeyLabel} Vazio · Clique para vincular` : `Slot Extra Vazio`}
                onClick={() => onConfigureSlot?.(index)}
              >
                {hotkeyLabel && <span className="tibia11-hotkey-label">{hotkeyLabel}</span>}
                {/* 4 dots in center: ▫ ▫ ▫ ▫ */}
                <div className="tibia11-empty-dots">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
              </div>
            );
          }

          // 2. CONFIGURED SLOT
          const action = findHotbarAction(actionId, { spells } as any);
          if (!action) {
            return (
              <div
                key={`slot-${index}`}
                id={`tibia11-slot-${index}`}
                className="tibia11-slot empty"
                onClick={() => onConfigureSlot?.(index)}
              >
                {hotkeyLabel && <span className="tibia11-hotkey-label">{hotkeyLabel}</span>}
                <div className="tibia11-empty-dots">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
              </div>
            );
          }

          // 2A. POTION
          if (action.kind === 'potion') {
            const potion = action.potion;
            const cooldownUntil = actor?.groupCooldowns['potion'] ?? 0;
            const cooldownLeft = Math.max(0, cooldownUntil - elapsedMs);
            const cooldownRatio = Math.min(1, cooldownLeft / potion.cooldownMs);

            return (
              <div
                key={`slot-${index}-${potion.id}`}
                id={`tibia11-slot-${index}`}
                className="tibia11-slot potion"
                title={`${potion.name} [${hotkeyLabel}] · Clique para alterar`}
                onClick={() => onConfigureSlot?.(index)}
              >
                {hotkeyLabel && <span className="tibia11-hotkey-label">{hotkeyLabel}</span>}
                <Tibia11ActionIcon
                  id={potion.id}
                  kind="potion"
                  name={potion.name}
                  size={32}
                  stackCount={potion.category === 'healing' ? 5 : 20}
                />
                {cooldownRatio > 0 && (
                  <div className="tibia11-cooldown-overlay" style={{ height: `${cooldownRatio * 100}%` }}>
                    <em>{(cooldownLeft / 1000).toFixed(1)}</em>
                  </div>
                )}
              </div>
            );
          }

          // 2B. RUNE
          if (action.kind === 'rune') {
            const rune = action.rune;
            const cooldownUntil = actor?.groupCooldowns['rune'] ?? 0;
            const cooldownLeft = Math.max(0, cooldownUntil - rune.cooldownMs);
            const cooldownRatio = Math.min(1, cooldownLeft / rune.cooldownMs);

            return (
              <div
                key={`slot-${index}-${rune.id}`}
                id={`tibia11-slot-${index}`}
                className="tibia11-slot rune"
                title={`${rune.name} [${hotkeyLabel}] · Clique para alterar`}
                onClick={() => onConfigureSlot?.(index)}
              >
                {hotkeyLabel && <span className="tibia11-hotkey-label">{hotkeyLabel}</span>}
                <Tibia11ActionIcon
                  id={rune.id}
                  kind="rune"
                  name={rune.name}
                  size={32}
                  stackCount={100}
                  showCastBadge
                />
                {cooldownRatio > 0 && (
                  <div className="tibia11-cooldown-overlay" style={{ height: `${cooldownRatio * 100}%` }}>
                    <em>{(cooldownLeft / 1000).toFixed(1)}</em>
                  </div>
                )}
              </div>
            );
          }

          // 2C. SPELL
          const spell = action.spell;
          const cooldownUntil = Math.max(
            actor?.spellCooldowns[String(spell.spellId)] ?? 0,
            actor?.groupCooldowns[spell.group] ?? 0
          );
          const cooldownLeft = Math.max(0, cooldownUntil - elapsedMs);
          const cooldownRatio = Math.min(1, cooldownLeft / Math.max(spell.cooldownMs, spell.groupCooldownMs));
          const disabled = (actor?.mana ?? character.currentMana) < spell.mana;

          return (
            <div
              key={`slot-${index}-${spell.spellId}`}
              id={`tibia11-slot-${index}`}
              className={`tibia11-slot spell ${disabled ? 'disabled' : ''}`}
              title={`${spell.name} [${hotkeyLabel}] · ${spell.words} · ${spell.mana} mana · Clique para alterar`}
              onClick={() => onConfigureSlot?.(index)}
            >
              {hotkeyLabel && <span className="tibia11-hotkey-label">{hotkeyLabel}</span>}
              <Tibia11ActionIcon
                id={spell.spellId}
                kind="spell"
                name={spell.name}
                size={32}
                showCastBadge={true}
              />
              {cooldownRatio > 0 && (
                <div className="tibia11-cooldown-overlay" style={{ height: `${cooldownRatio * 100}%` }}>
                  <em>{(cooldownLeft / 1000).toFixed(1)}</em>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Right Navigation & Lock Buttons */}
      <div className="tibia11-nav-group right-nav">
        <button
          type="button"
          className="tibia11-nav-btn btn-right"
          title="Rolar para a direita"
          onClick={handleScrollRight}
        >
          <svg width="6" height="8" viewBox="0 0 6 8" fill="currentColor">
            <polygon points="1,0 6,4 1,8" />
          </svg>
        </button>
        <button
          type="button"
          className="tibia11-nav-btn btn-end"
          title="Fim dos atalhos"
          onClick={handleScrollEnd}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
            <polygon points="1,0 6,4 1,8" />
            <rect x="6.5" y="0" width="1.5" height="8" />
          </svg>
        </button>
        <button
          type="button"
          className={`tibia11-lock-btn ${isLocked ? 'locked' : 'unlocked'}`}
          title={isLocked ? 'Action Bar Bloqueada (Clique para desbloquear)' : 'Action Bar Desbloqueada (Clique para bloquear)'}
          onClick={() => setIsLocked((prev) => !prev)}
        >
          {isLocked ? (
            // Closed Padlock
            <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
              <rect x="1" y="4.5" width="8" height="6.5" rx="1" stroke="#2b2d2f" strokeWidth="0.5" />
              <path d="M2.5 4.5 V3 C2.5 1.6, 7.5 1.6, 7.5 3 V4.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          ) : (
            // Open Padlock (as in reference screenshot)
            <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
              <rect x="1" y="4.5" width="8" height="6.5" rx="1" stroke="#2b2d2f" strokeWidth="0.5" />
              <path d="M2.5 4.5 V2.5 C2.5 1.2, 7.5 1.2, 7.5 2.5 V1" fill="none" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
