'use client';

import { useEffect, useState } from 'react';
import visualAssetsJson from '@/content/generated/tibia860-assets.json';
import type { SpellDefinition } from '@/packages/content-schema/src';
import { findHotbarAction, type CharacterState, type CombatLogEntry, type HuntEncounterState, type PartyActorState } from '@/packages/domain/src';
import type { Tibia860AssetManifest } from '@/packages/tibia860-assets/src/types';
import { Tibia11ActionIcon } from './Tibia11ActionIcon';

const visualAssets = visualAssetsJson as Tibia860AssetManifest;

interface BottomDockProps {
  logs: CombatLogEntry[];
  seed: string;
  status: HuntEncounterState['status'];
  character: CharacterState;
  actor?: PartyActorState;
  spells: SpellDefinition[];
  elapsedMs: number;
  onSeed(value: string): void;
  onBegin(): void;
  onReset(): void;
  onReorderSpell(fromIndex: number, toIndex: number): void;
  onConfigureSlot?: (slotIndex: number) => void;
}

export function BottomDock({
  logs,
  seed,
  status,
  character,
  actor,
  spells,
  elapsedMs,
  onSeed,
  onBegin,
  onReset,
  onReorderSpell,
  onConfigureSlot,
}: BottomDockProps) {
  const [logOpen, setLogOpen] = useState(false);
  const running = status === 'running';

  // Global keyboard shortcuts (1 - 5) for the Tibia 11 Action Bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const keyNum = parseInt(e.key, 10);
      if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= 5) {
        const slotIdx = keyNum - 1;
        const slotEl = document.getElementById(`tibia11-slot-${slotIdx}`);
        slotEl?.classList.add('hotkey-pressed');
        setTimeout(() => slotEl?.classList.remove('hotkey-pressed'), 160);

        if (character.hotbar[slotIdx] === undefined) {
          onConfigureSlot?.(slotIdx);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [character.hotbar, onConfigureSlot]);

  return (
    <footer className="bottom-dock">
      {logOpen && (
        <section className="combat-log-drawer">
          <header><strong>Combat log</strong><small>{logs.length} registros desta execução</small><button type="button" onClick={() => setLogOpen(false)}>×</button></header>
          <ol>{logs.map((entry) => <li key={entry.id}><time>#{entry.round.toString().padStart(2, '0')}</time><span>{entry.message}</span></li>)}</ol>
        </section>
      )}
      <div className="dock-tabs">
        <button type="button" className={logOpen ? 'active' : ''} onClick={() => setLogOpen((current) => !current)}>Combate <b>{logs.length}</b></button>
        <button type="button" disabled title="Em breve">Geral</button>
        <button type="button" disabled title="Em breve">Sistema</button>
      </div>
      <div className="character-hotbar tibia11-action-bar" aria-label={`Tibia 11 Action Bar - ${character.name}`}>
        <span className="hotbar-vocation tibia11-vocation-badge">
          {character.promotion ? character.promotion.split(' ').map((part) => part[0]).join('') : character.baseVocation.slice(0, 2).toUpperCase()}
        </span>
        {[0, 1, 2, 3, 4].map((index) => {
          const actionId = character.hotbar[index];
          const hotkeyLabel = String(index + 1);

          if (typeof actionId !== 'number') {
            return (
              <button
                type="button"
                id={`tibia11-slot-${index}`}
                className="hotbar-slot tibia11-slot empty-slot"
                key={`empty-${index}`}
                title={`Slot ${hotkeyLabel} Vazio · Clique ou pressione [${hotkeyLabel}] para configurar`}
                onClick={() => onConfigureSlot?.(index)}
              >
                <span className="tibia11-hotkey-badge">{hotkeyLabel}</span>
                <span className="empty-plus">+</span>
              </button>
            );
          }

          const action = findHotbarAction(actionId, { spells } as any);
          if (!action) {
            return (
              <button
                type="button"
                id={`tibia11-slot-${index}`}
                className="hotbar-slot tibia11-slot empty-slot"
                key={`empty-${index}`}
                title={`Slot ${hotkeyLabel} Vazio · Clique ou pressione [${hotkeyLabel}] para configurar`}
                onClick={() => onConfigureSlot?.(index)}
              >
                <span className="tibia11-hotkey-badge">{hotkeyLabel}</span>
                <span className="empty-plus">+</span>
              </button>
            );
          }

          if (action.kind === 'potion') {
            const potion = action.potion;
            const cooldownUntil = actor?.groupCooldowns['potion'] ?? 0;
            const cooldownLeft = Math.max(0, cooldownUntil - elapsedMs);
            const cooldownRatio = Math.min(1, cooldownLeft / potion.cooldownMs);
            const isHealing = potion.category === 'healing';

            return (
              <div
                id={`tibia11-slot-${index}`}
                className="hotbar-slot tibia11-slot potion-slot"
                key={`action-${index}-${potion.id}`}
                title={`${potion.name} [${hotkeyLabel}] · ${potion.description} · Clique para alterar`}
                onClick={() => onConfigureSlot?.(index)}
              >
                <span className="tibia11-hotkey-badge">{hotkeyLabel}</span>
                <Tibia11ActionIcon id={potion.id} kind="potion" name={potion.name} size={30} />
                <span className={`tibia11-cost-badge ${isHealing ? 'hp-cost' : 'mp-cost'}`}>
                  {isHealing ? 'HP' : 'MP'}
                </span>
                {cooldownRatio > 0 && (
                  <div className="tibia11-cooldown-sweep" style={{ height: `${cooldownRatio * 100}%` }}>
                    <em className="cd-timer">{(cooldownLeft / 1000).toFixed(1)}</em>
                  </div>
                )}
                <button
                  type="button"
                  className="priority-left"
                  aria-label={`Mover para a esquerda`}
                  disabled={index === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReorderSpell(index, index - 1);
                  }}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="priority-right"
                  aria-label={`Mover para a direita`}
                  disabled={index === character.hotbar.length - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReorderSpell(index, index + 1);
                  }}
                >
                  ›
                </button>
              </div>
            );
          }

          if (action.kind === 'rune') {
            const rune = action.rune;
            const cooldownUntil = actor?.groupCooldowns['rune'] ?? 0;
            const cooldownLeft = Math.max(0, cooldownUntil - rune.cooldownMs);
            const cooldownRatio = Math.min(1, cooldownLeft / rune.cooldownMs);

            return (
              <div
                id={`tibia11-slot-${index}`}
                className="hotbar-slot tibia11-slot rune-slot"
                key={`action-${index}-${rune.id}`}
                title={`${rune.name} [${hotkeyLabel}] · ${rune.words} · Clique para alterar`}
                onClick={() => onConfigureSlot?.(index)}
              >
                <span className="tibia11-hotkey-badge">{hotkeyLabel}</span>
                <Tibia11ActionIcon id={rune.id} kind="rune" name={rune.name} size={30} />
                <span className="tibia11-cost-badge rune-cost">
                  {rune.name.split(' ').map((w) => w[0]).join('')}
                </span>
                {cooldownRatio > 0 && (
                  <div className="tibia11-cooldown-sweep" style={{ height: `${cooldownRatio * 100}%` }}>
                    <em className="cd-timer">{(cooldownLeft / 1000).toFixed(1)}</em>
                  </div>
                )}
                <button
                  type="button"
                  className="priority-left"
                  aria-label={`Mover para a esquerda`}
                  disabled={index === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReorderSpell(index, index - 1);
                  }}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="priority-right"
                  aria-label={`Mover para a direita`}
                  disabled={index === character.hotbar.length - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReorderSpell(index, index + 1);
                  }}
                >
                  ›
                </button>
              </div>
            );
          }

          const spell = action.spell;
          const cooldownUntil = Math.max(actor?.spellCooldowns[String(spell.spellId)] ?? 0, actor?.groupCooldowns[spell.group] ?? 0);
          const cooldownLeft = Math.max(0, cooldownUntil - elapsedMs);
          const cooldownRatio = Math.min(1, cooldownLeft / Math.max(spell.cooldownMs, spell.groupCooldownMs));
          const disabled = (actor?.mana ?? character.currentMana) < spell.mana;

          return (
            <div
              id={`tibia11-slot-${index}`}
              className={`hotbar-slot tibia11-slot ${disabled ? 'disabled' : ''}`}
              key={`action-${index}-${spell.spellId}`}
              title={`${spell.name} [${hotkeyLabel}] · ${spell.words} · ${spell.mana} mana · Clique para alterar`}
              onClick={() => onConfigureSlot?.(index)}
            >
              <span className="tibia11-hotkey-badge">{hotkeyLabel}</span>
              <Tibia11ActionIcon id={spell.spellId} kind="spell" name={spell.name} size={30} />
              <span className="tibia11-cost-badge mana-cost">{spell.mana}</span>
              {cooldownRatio > 0 && (
                <div className="tibia11-cooldown-sweep" style={{ height: `${cooldownRatio * 100}%` }}>
                  <em className="cd-timer">{(cooldownLeft / 1000).toFixed(1)}</em>
                </div>
              )}
              <button
                type="button"
                className="priority-left"
                aria-label={`Aumentar prioridade de ${spell.name}`}
                disabled={index === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  onReorderSpell(index, index - 1);
                }}
              >
                ‹
              </button>
              <button
                type="button"
                className="priority-right"
                aria-label={`Reduzir prioridade de ${spell.name}`}
                disabled={index === character.hotbar.length - 1}
                onClick={(e) => {
                  e.stopPropagation();
                  onReorderSpell(index, index + 1);
                }}
              >
                ›
              </button>
            </div>
          );
        })}
      </div>
      <label className="seed-control"><span>Seed</span><input value={seed} onChange={(event) => onSeed(event.target.value)} disabled={running} /></label>
      <div className="dock-actions">
        <button type="button" className="reset-action" onClick={onReset} disabled={running}>Reset</button>
        <button type="button" className="primary-action" onClick={onBegin} disabled={running}>Entrar na hunt</button>
      </div>
    </footer>
  );
}
