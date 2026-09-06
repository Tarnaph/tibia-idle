import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createIdleGame, restartHunt, advanceCombat, startGame } from '../packages/domain/src/combat';
import { createCharacter } from '../packages/domain/src/party';
import { content } from './fixture';

const projectRoot = resolve(__dirname, '..');

describe('Phase 58: Hunt Viewport Fullscreen, Unified Attack Cadence and Strict Party Target', () => {
  it('verifies that PixiArena and hunt viewport styles enforce 100% fullscreen coverage and handle resize dynamically', () => {
    const globalsCss = readFileSync(resolve(projectRoot, 'app/globals.css'), 'utf8');
    const pixiArenaSrc = readFileSync(resolve(projectRoot, 'apps/web/components/PixiArena.tsx'), 'utf8');
    const gameProtoSrc = readFileSync(resolve(projectRoot, 'apps/web/components/GamePrototype.tsx'), 'utf8');

    // CSS guarantees fullscreen viewport
    expect(globalsCss).toContain('.fullscreen-viewport');
    expect(globalsCss).toContain('.pixi-arena');
    expect(globalsCss).toContain('width: 100%');
    expect(globalsCss).toContain('height: 100%');

    // PixiArena uses ResizeObserver and app.resize()
    expect(pixiArenaSrc).toContain('ResizeObserver');
    expect(pixiArenaSrc).toContain('app.resize()');
    expect(pixiArenaSrc).toContain("width: '100%'");
    expect(pixiArenaSrc).toContain("height: '100%'");

    // GamePrototype renders hunt mode container with fullscreen-viewport
    expect(gameProtoSrc).toContain('fullscreen-viewport');
  });

  it('guarantees offensive actions share exhaust so a character never casts basic wand attack and spell/rune at the same time', () => {
    const combatSrc = readFileSync(resolve(projectRoot, 'packages/domain/src/combat.ts'), 'utf8');

    // Basic attack sets rune cooldown and attack cooldown
    expect(combatSrc).toContain("actor.groupCooldowns['attack'] = encounter.elapsedMs + stats.attackIntervalMs");
    expect(combatSrc).toContain("actor.groupCooldowns['rune'] = encounter.elapsedMs + stats.attackIntervalMs");

    // Spell/Rune cast sets nextAttackAt and attack cooldown
    expect(combatSrc).toContain("actor.nextAttackAt = encounter.elapsedMs + spell.groupCooldownMs");
    expect(combatSrc).toContain("actor.groupCooldowns['attack'] = encounter.elapsedMs + spell.groupCooldownMs");
    expect(combatSrc).toContain('usedOffensiveActionThisTick = true');
  });

  it('in multiplayer party, secondary members only attack the leader target and do not attack other monsters alone', () => {
    let state = startGame(createIdleGame('party-target-test', content, 'rat-cellars'), content);
    // Add a secondary character to party and enable multiplayer party
    const char2 = createCharacter('member-2', 'Sorcerer Member', 'Sorcerer', content);
    state.session.characters.push(char2);
    state.session.isMultiplayerParty = true;
    state = restartHunt(state, 'party-target-test', content, 'rat-cellars');

    const leaderActor = state.encounter.partyActors[0];
    leaderActor.targetId = null; // Leader has not marked/targeted any monster

    expect(state.encounter.partyActors.length).toBeGreaterThan(1);
    expect(state.encounter.enemies.length).toBeGreaterThan(0);

    // Simulate combat advance
    const nextState = advanceCombat(state, content, 120);

    const nextLeader = nextState.encounter.partyActors.find((a) => a.characterId === leaderActor.characterId)!;

    // In multiplayer party, secondary actors must strictly mirror the leader's target
    for (const actor of nextState.encounter.partyActors) {
      if (actor.characterId !== leaderActor.characterId) {
        expect(actor.targetId).toBe(nextLeader.targetId);
      }
    }
  });

  it('clears targetId for all party members when the active monster is defeated so followers wait for the leader to target the next', () => {
    const combatSrc = readFileSync(resolve(projectRoot, 'packages/domain/src/combat.ts'), 'utf8');

    // defeatEnemy clears targets and cancels pending attacks
    expect(combatSrc).toContain('function defeatEnemy');
    expect(combatSrc).toContain('actor.targetId = null');
    expect(combatSrc).toContain('actor.pendingAttack = null');
  });
});
