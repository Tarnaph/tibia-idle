import { describe, expect, it } from 'vitest';
import {
  createIdleGame,
  castAutomaticSpells,
  triggerManualHotbarAction,
  EnemyState,
} from '../packages/domain/src';
import { content } from './fixture';

function makeTestEnemy(partial: Partial<EnemyState> & { id: string; name: string; position: { x: number; y: number; z: number } }): EnemyState {
  return {
    monsterId: 'troll',
    hp: 100,
    maxHp: 100,
    attackMax: 20,
    defense: 10,
    armor: 5,
    alive: true,
    previousPosition: { ...partial.position },
    direction: 'west',
    path: [],
    targetId: null,
    nextAttackAt: 0,
    attackIntervalMs: 2000,
    speed: 100,
    behavior: 'idle',
    nextRoamAt: 0,
    nextMoveAt: 0,
    detectionRange: 50,
    variant: null,
    ...partial,
  };
}

describe('Phase 214: Knight Exeta Res Animation/Visuals and Phantom Cooldown Elimination', () => {
  it('Knight conjura Exeta Res com fala, efeito 13 nos 8 tiles de AREA_SQUARE1X1 e taunt nos monstros', () => {
    const game = createIdleGame('p214-exeta-res-test', content);
    const knightChar = game.session.characters[0];
    knightChar.vocation = 'Elite Knight';
    knightChar.baseVocation = 'Knight';
    knightChar.level = 50;
    knightChar.currentMana = 100;
    knightChar.maxMana = 200;

    const knightActor = game.encounter.partyActors.find((a) => a.characterId === knightChar.id)!;
    knightActor.mana = 100;
    knightActor.position = { x: 50, y: 50, z: 7 };

    // Adiciona 2 monstros no raio de 3 sqm
    game.encounter.enemies = [
      makeTestEnemy({
        id: 'monster-1',
        monsterId: 'rotworm',
        name: 'Rotworm',
        hp: 65,
        maxHp: 65,
        attackMax: 20,
        defense: 10,
        armor: 5,
        position: { x: 51, y: 50, z: 7 }, // Adjacente (distância 1)
      }),
      makeTestEnemy({
        id: 'monster-2',
        monsterId: 'carrion-worm',
        name: 'Carrion Worm',
        hp: 145,
        maxHp: 145,
        attackMax: 35,
        defense: 15,
        armor: 8,
        position: { x: 52, y: 52, z: 7 }, // Distância 2
      }),
    ];

    // Sem Exeta res na hotbar, a IA não deve conjurar a magia
    knightChar.hotbar = [1]; // Apenas exura
    castAutomaticSpells(game, content);
    expect(knightActor.mana).toBe(100);
    expect(knightActor.spellCooldowns['93']).toBeUndefined();

    // Com Exeta res na hotbar, deve conjurar com sucesso
    knightChar.hotbar = [93];
    castAutomaticSpells(game, content);

    // 1. Deve ter consumido 30 de mana do Knight
    expect(knightActor.mana).toBe(70);

    // 2. Deve ter aplicado cooldown na magia 93 e no grupo support
    expect(knightActor.spellCooldowns['93']).toBeGreaterThan(game.encounter.elapsedMs);
    expect(knightActor.groupCooldowns['support']).toBeGreaterThan(game.encounter.elapsedMs);

    // 3. Deve ter emitido spell-cast com a fala oficial 'Exeta res'
    const castEvent = game.encounter.events.find(
      (e: any) => e.type === 'spell-cast' && e.speech === 'Exeta res' && e.sourceId === knightActor.characterId
    );
    expect(castEvent).toBeDefined();

    // 4. Deve ter emitido spell-visual com efeito 13 (CONST_ME_MAGIC_BLUE) nos 9 tiles da área (8 adjacentes + centro)
    const visualAreaEvents = game.encounter.events.filter(
      (e: any) => e.type === 'spell-visual' && e.spellId === 93 && e.effectId === 13 && e.targetPosition !== undefined
    );
    expect(visualAreaEvents.length).toBe(9);

    // 5. Deve ter emitido spell-visual com efeito 13 em cada monstro desafiado
    const visualEnemyEvents = game.encounter.events.filter(
      (e: any) => e.type === 'spell-visual' && e.spellId === 93 && e.effectId === 13 && (e.targetId === 'monster-1' || e.targetId === 'monster-2')
    );
    expect(visualEnemyEvents.length).toBe(2);

    // 6. Os monstros devem ter recebido o taunt mecânico
    expect(game.encounter.enemies[0].targetId).toBe(knightActor.characterId);
    expect(game.encounter.enemies[0].challengedTargetId).toBe(knightActor.characterId);
    expect(game.encounter.enemies[0].challengedUntil).toBeGreaterThan(game.encounter.elapsedMs);

    expect(game.encounter.enemies[1].targetId).toBe(knightActor.characterId);
    expect(game.encounter.enemies[1].challengedTargetId).toBe(knightActor.characterId);
    expect(game.encounter.enemies[1].challengedUntil).toBeGreaterThan(game.encounter.elapsedMs);
  });

  it('Exeta Res via acionamento manual da Hotbar aplica taunt, consome mana e gera efeitos visuais 13', () => {
    const game = createIdleGame('p214-exeta-res-manual', content);
    const knightChar = game.session.characters[0];
    knightChar.vocation = 'Elite Knight';
    knightChar.baseVocation = 'Knight';
    knightChar.level = 50;
    knightChar.currentMana = 100;
    knightChar.maxMana = 200;
    knightChar.spells = [93]; // Challenge
    knightChar.hotbar = [93];

    const knightActor = game.encounter.partyActors.find((a) => a.characterId === knightChar.id)!;
    knightActor.mana = 100;
    knightActor.position = { x: 10, y: 10, z: 7 };

    game.encounter.enemies = [
      makeTestEnemy({
        id: 'monster-solo',
        monsterId: 'cyclops',
        name: 'Cyclops',
        hp: 260,
        maxHp: 260,
        attackMax: 60,
        defense: 25,
        armor: 12,
        position: { x: 12, y: 10, z: 7 }, // Distância 2
      }),
    ];

    game.encounter.events = [];

    // Dispara Exeta Res manualmente pelo slot 0 (actionId: 93)
    const executed = triggerManualHotbarAction(game, knightChar.id, 93, content);
    expect(executed).toBe(true);

    // Mana consumida
    expect(knightActor.mana).toBe(70);
    expect(knightActor.spellCooldowns['93']).toBeGreaterThan(game.encounter.elapsedMs);

    // Efeito visual nos 9 tiles
    const visualAreaEvents = game.encounter.events.filter(
      (e: any) => e.type === 'spell-visual' && e.spellId === 93 && e.effectId === 13 && e.targetPosition !== undefined
    );
    expect(visualAreaEvents.length).toBe(9);

    // Efeito visual no ciclope
    const visualEnemy = game.encounter.events.find(
      (e: any) => e.type === 'spell-visual' && e.spellId === 93 && e.effectId === 13 && e.targetId === 'monster-solo'
    );
    expect(visualEnemy).toBeDefined();

    // Taunt no ciclope
    expect(game.encounter.enemies[0].challengedTargetId).toBe(knightActor.characterId);
  });

  it('Magia ofensiva de alvo único (Strike) fora de alcance NÃO consome mana e NÃO entra em loop de cooldown fantasma', () => {
    const game = createIdleGame('p214-phantom-cooldown', content);
    const char = game.session.characters[0];
    char.vocation = 'Master Sorcerer';
    char.baseVocation = 'Sorcerer';
    char.level = 50;
    char.currentMana = 100;
    char.maxMana = 200;

    // Spell 89: Flame Strike (Exori flam, range: 3)
    const flameStrike = content.spells.find((s) => s.words.toLowerCase().includes('flam') && s.area === 'target');
    expect(flameStrike).toBeDefined();
    const spellId = flameStrike!.spellId;

    char.spells = [spellId];
    char.hotbar = [spellId];

    const actor = game.encounter.partyActors.find((a) => a.characterId === char.id)!;
    actor.mana = 100;
    actor.position = { x: 10, y: 10, z: 7 };

    // Monstro está a 20 sqm (muito longe, fora do alcance)
    game.encounter.enemies = [
      makeTestEnemy({
        id: 'far-monster',
        monsterId: 'dragon',
        name: 'Dragon',
        hp: 1000,
        maxHp: 1000,
        attackMax: 100,
        defense: 40,
        armor: 20,
        position: { x: 30, y: 10, z: 7 }, // Distância 20
      }),
    ];

    game.encounter.events = [];

    // Jogador tenta disparar a magia de alvo fora de alcance
    const executed = triggerManualHotbarAction(game, char.id, spellId, content);

    // 1. Deve retornar false
    expect(executed).toBe(false);

    // 2. Mana NÃO pode ter sido debitada
    expect(actor.mana).toBe(100);

    // 3. Magia NÃO pode ter entrado em cooldown fantasma
    expect(actor.spellCooldowns[String(spellId)] ?? 0).toBe(0);
    expect(actor.groupCooldowns['attack'] ?? 0).toBe(0);

    // 4. Nenhum evento de spell-cast ou visual gerado
    expect(game.encounter.events.length).toBe(0);
  });

  it('Magia ofensiva de alvo único (Strike) dentro do alcance consome mana, ativa cooldown e causa dano', () => {
    const game = createIdleGame('p214-strike-in-range', content);
    const char = game.session.characters[0];
    char.vocation = 'Master Sorcerer';
    char.baseVocation = 'Sorcerer';
    char.level = 50;
    char.currentMana = 100;
    char.maxMana = 200;

    const flameStrike = content.spells.find((s) => s.words.toLowerCase().includes('flam') && s.area === 'target')!;
    const spellId = flameStrike.spellId;

    char.spells = [spellId];
    char.hotbar = [spellId];

    const actor = game.encounter.partyActors.find((a) => a.characterId === char.id)!;
    actor.mana = 100;
    actor.position = { x: 10, y: 10, z: 7 };

    // Monstro adjacente (distância 1)
    game.encounter.enemies = [
      makeTestEnemy({
        id: 'close-monster',
        monsterId: 'troll',
        name: 'Troll',
        hp: 50,
        maxHp: 50,
        attackMax: 10,
        defense: 5,
        armor: 3,
        position: { x: 11, y: 10, z: 7 },
      }),
    ];

    game.encounter.events = [];

    const executed = triggerManualHotbarAction(game, char.id, spellId, content);

    // Retorna true
    expect(executed).toBe(true);

    // Mana debitada
    expect(actor.mana).toBe(100 - flameStrike.mana);

    // Cooldown ativado
    expect(actor.spellCooldowns[String(spellId)]).toBeGreaterThan(game.encounter.elapsedMs);
    expect(actor.groupCooldowns['attack']).toBeGreaterThan(game.encounter.elapsedMs);

    // Eventos emitidos
    const castEv = game.encounter.events.find((e: any) => e.type === 'spell-cast' && e.targetId === 'close-monster');
    expect(castEv).toBeDefined();

    // Monstro tomou dano
    expect(game.encounter.enemies[0].hp).toBeLessThan(50);
  });

  it('Magia agressiva com area self (Divine Caldera / Mas San) atinge múltiplos monstros no raio', () => {
    const game = createIdleGame('p214-area-self-test', content);
    const paladinChar = game.session.characters[0];
    paladinChar.vocation = 'Royal Paladin';
    paladinChar.baseVocation = 'Paladin';
    paladinChar.level = 60;
    paladinChar.currentMana = 300;
    paladinChar.maxMana = 400;

    // Divine Caldera (exevo mas san, spellId: 124, area: 'self')
    const caldera = content.spells.find((s) => s.words.toLowerCase().includes('mas san'))!;
    expect(caldera).toBeDefined();
    expect(caldera.area).toBe('self');

    paladinChar.spells = [caldera.spellId];
    paladinChar.hotbar = [caldera.spellId];

    const actor = game.encounter.partyActors.find((a) => a.characterId === paladinChar.id)!;
    actor.mana = 300;
    actor.position = { x: 20, y: 20, z: 7 };

    // 3 monstros no raio de até 4 sqm
    game.encounter.enemies = [
      makeTestEnemy({
        id: 'm1',
        monsterId: 'orc',
        name: 'Orc 1',
        hp: 70,
        maxHp: 70,
        attackMax: 15,
        defense: 8,
        armor: 4,
        position: { x: 21, y: 20, z: 7 }, // dist 1
      }),
      makeTestEnemy({
        id: 'm2',
        monsterId: 'orc',
        name: 'Orc 2',
        hp: 70,
        maxHp: 70,
        attackMax: 15,
        defense: 8,
        armor: 4,
        position: { x: 20, y: 22, z: 7 }, // dist 2
      }),
      makeTestEnemy({
        id: 'm3',
        monsterId: 'orc',
        name: 'Orc 3',
        hp: 70,
        maxHp: 70,
        attackMax: 15,
        defense: 8,
        armor: 4,
        position: { x: 23, y: 20, z: 7 }, // dist 3
      }),
    ];

    game.encounter.events = [];

    const executed = triggerManualHotbarAction(game, paladinChar.id, caldera.spellId, content);
    expect(executed).toBe(true);

    // Efeito visual no centro (posição do paladin)
    const visualCenter = game.encounter.events.find(
      (e: any) => e.type === 'spell-visual' && e.targetPosition?.x === 20 && e.targetPosition?.y === 20
    );
    expect(visualCenter).toBeDefined();

    // TODOS os 3 monstros devem ter tomado dano
    expect(game.encounter.enemies[0].hp).toBeLessThan(70);
    expect(game.encounter.enemies[1].hp).toBeLessThan(70);
    expect(game.encounter.enemies[2].hp).toBeLessThan(70);
  });
});
