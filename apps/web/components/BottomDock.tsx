'use client';

import { useState } from 'react';
import visualAssetsJson from '@/content/generated/tibia860-assets.json';
import type { SpellDefinition } from '@/packages/content-schema/src';
import { isSpellUnlocked, type CharacterState, type CombatLogEntry, type HuntEncounterState, type PartyActorState } from '@/packages/domain/src';
import type { Tibia860AssetManifest } from '@/packages/tibia860-assets/src/types';

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
}

export function BottomDock({ logs, seed, status, character, actor, spells, elapsedMs, onSeed, onBegin, onReset, onReorderSpell }: BottomDockProps) {
  const [logOpen, setLogOpen] = useState(false);
  const running = status === 'running';
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
      <div className="character-hotbar" aria-label={`Rotação automática de ${character.name}`}>
        <span className="hotbar-vocation">{character.promotion ? character.promotion.split(' ').map((part) => part[0]).join('') : character.baseVocation.slice(0, 2).toUpperCase()}</span>
        {character.hotbar.map((spellId, index) => {
          const spell = spells.find((candidate) => candidate.spellId === spellId);
          if (!spell) return null;
          const locked = !isSpellUnlocked(character, spell);
          const cooldownUntil = Math.max(actor?.spellCooldowns[String(spellId)] ?? 0, actor?.groupCooldowns[spell.group] ?? 0);
          const cooldownLeft = Math.max(0, cooldownUntil - elapsedMs);
          const cooldownRatio = Math.min(1, cooldownLeft / Math.max(spell.cooldownMs, spell.groupCooldownMs));
          const effectFrame = spell.visual.effectId === null ? null : visualAssets.effects[String(spell.visual.effectId)]?.frames[0];
          const disabled = locked || (actor?.mana ?? character.currentMana) < spell.mana;
          return <div className={`hotbar-slot ${disabled ? 'disabled' : ''}`} key={spellId} title={`${spell.name} · ${spell.words} · ${spell.mana} mana${locked ? ` · Level ${spell.requiredLevel} necessário` : ''}`}>
            {/* Generated pixel art must remain unoptimized and pixel-perfect. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {effectFrame ? <img src={effectFrame.publicUrl} alt="" /> : <b>{spell.name.slice(0, 2).toUpperCase()}</b>}
            <span>{index + 1}</span><small>{spell.mana}mp</small>
            {locked && <i className="hotbar-lock">Lv{spell.requiredLevel}</i>}
            {cooldownRatio > 0 && <i className="hotbar-cooldown" style={{ height: `${cooldownRatio * 100}%` }}><em>{(cooldownLeft / 1000).toFixed(1)}</em></i>}
            <button type="button" className="priority-left" aria-label={`Aumentar prioridade de ${spell.name}`} disabled={index === 0} onClick={() => onReorderSpell(index, index - 1)}>‹</button>
            <button type="button" className="priority-right" aria-label={`Reduzir prioridade de ${spell.name}`} disabled={index === character.hotbar.length - 1} onClick={() => onReorderSpell(index, index + 1)}>›</button>
          </div>;
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
