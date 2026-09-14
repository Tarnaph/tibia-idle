import { describe, expect, it } from 'vitest';
import {
  advanceCombat,
  createIdleGame,
  initialHunts,
  isTileWalkable,
  meleeDistance,
  movePartyTowardTargets,
  setActorTarget,
  surroundingPositions,
  synchronizeEncounterOccupancy,
  triggerManualHotbarAction,
  type EnemyState,
  type GameContent,
} from '@/packages/domain/src';
import economyJson from '@/content/generated/item-economy.json';
import equipmentJson from '@/content/generated/equipment.json';
import monstersJson from '@/content/generated/monsters.json';
import startersJson from '@/content/generated/starter-loadouts.json';
import vocationsJson from '@/content/generated/vocations.json';
import spellsJson from '@/content/generated/spells.json';
import huntRegionsJson from '@/content/generated/hunt-regions.json';
import type { EquipmentCatalog, HuntRegionCatalog, ItemEconomyCatalog, MonsterCatalog, SpellCatalog, StarterLoadoutCatalog, VocationCatalog } from '@/packages/content-schema/src';
import fs from 'fs';
import path from 'path';

const content: GameContent = {
  monsters: (monstersJson as MonsterCatalog).monsters,
  equipment: (equipmentJson as EquipmentCatalog).items,
  vocations: (vocationsJson as VocationCatalog).vocations,
  starterLoadouts: (startersJson as StarterLoadoutCatalog).loadouts,
  spells: (spellsJson as unknown as SpellCatalog).spells,
  huntRegions: (huntRegionsJson as HuntRegionCatalog).regions,
  economy: economyJson as ItemEconomyCatalog,
  hunts: initialHunts,
  rateSkill: (vocationsJson as VocationCatalog).rateSkill,
  rateMagic: (vocationsJson as VocationCatalog).rateMagic,
};

function createMockEnemy(
  id: string,
  monsterId: string,
  name: string,
  hp: number,
  position: { x: number; y: number; z: number },
  direction: 'north' | 'south' | 'east' | 'west' = 'north'
): EnemyState {
  return {
    id,
    monsterId,
    name,
    variant: null,
    hp,
    maxHp: hp,
    attackMax: 5,
    defense: 0,
    armor: 0,
    alive: true,
    position: { ...position },
    previousPosition: { ...position },
    direction,
    path: [],
    targetId: null,
    nextAttackAt: 0,
    attackIntervalMs: 2000,
    speed: 100,
    behavior: 'chase',
    nextRoamAt: 0,
    nextMoveAt: 0,
    detectionRange: 6,
  };
}

describe('Phase 162: Target Lock Autêntico do Tibia (Foco Exclusivo de Alvo, Perseguição Estrita e Fim de Redirecionamento de Dano)', () => {
  it('1. garante que o motor de movimentação NUNCA rouba ou sobrescreve o alvo travado por proximidade física', () => {
    const game = createIdleGame('target-lock-movement', content);
    const encounter = game.encounter;
    const player = encounter.partyActors[0];

    const adjacentWalkable = surroundingPositions(player.position).find((p) => isTileWalkable(encounter.room.map, p))!;
    const distantTile = encounter.room.map.tiles.find(
      (t) => t.walkable && t.position.z === player.position.z && meleeDistance(player.position, t.position) >= 3
    )!;

    // Posiciona dois monstros: um colado no jogador (distância 1) e outro distante
    encounter.enemies = [
      createMockEnemy('close-rat', 'rat', 'Close Rat', 20, adjacentWalkable, 'north'),
      createMockEnemy('far-demon', 'demon', 'Far Demon', 8000, distantTile.position, 'west'),
    ];
    synchronizeEncounterOccupancy(encounter);

    // Jogador trava mira no monstro distante (Far Demon)
    player.targetId = 'far-demon';
    const ranges = new Map([[player.characterId, 1]]);

    // Executa movimento
    movePartyTowardTargets(encounter, ranges, undefined, player.characterId, 'closest');

    // ASSERT: O alvo travado PERMANECE 'far-demon', NÃO foi substituído por 'close-rat' que está a 1 tile!
    expect(player.targetId).toBe('far-demon');
  });

  it('2. impede que ataques básicos atinjam monstros adjacentes quando o alvo travado está fora de alcance', () => {
    let game = createIdleGame('target-lock-no-redirect', content);
    game.encounter.status = 'running';
    game.encounter.room.phase = 'combat';
    game.encounter.nextMovementAt = 0;
    const player = game.encounter.partyActors[0];
    player.nextAttackAt = 0;

    const adjacentWalkable = surroundingPositions(player.position).find((p) => isTileWalkable(game.encounter.room.map, p))!;
    const distantTile = game.encounter.room.map.tiles.find(
      (t) => t.walkable && t.position.z === player.position.z && meleeDistance(player.position, t.position) >= 3
    )!;

    const closeRat = createMockEnemy('close-rat', 'rat', 'Close Rat', 20, adjacentWalkable, 'north');
    const distantTarget = createMockEnemy('distant-target', 'rat', 'Distant Target', 50, distantTile.position, 'west');

    game.encounter.enemies = [closeRat, distantTarget];
    synchronizeEncounterOccupancy(game.encounter);

    // Jogador seleciona distantTarget como seu alvo
    player.targetId = 'distant-target';
    game.session.characters[0].combatState.targetId = 'distant-target';

    // Roda avanço de combate (tick de início e tick de impacto)
    game = advanceCombat(game, content, 120);
    game = advanceCombat(game, content, 200);

    // ASSERT: Close Rat NÃO tomou dano! Permanece com 20 HP!
    const closeRatAfter = game.encounter.enemies.find((e) => e.id === 'close-rat');
    expect(closeRatAfter?.hp).toBe(20);

    // ASSERT: Nenhum evento de ataque contra o close-rat foi gerado!
    const attackEventsOnCloseRat = game.encounter.events.filter(
      (e) => e.type === 'player-attack' && e.targetId === 'close-rat'
    );
    expect(attackEventsOnCloseRat.length).toBe(0);
  });

  it('3. executa o ataque básico no alvo travado assim que ele entra no alcance, mesmo com múltiplos inimigos ao redor', () => {
    let game = createIdleGame('target-lock-hit-target', content);
    game.encounter.status = 'running';
    game.encounter.room.phase = 'combat';
    game.encounter.nextMovementAt = 0;
    const player = game.encounter.partyActors[0];
    player.nextAttackAt = 0;

    const adjacentWalkables = surroundingPositions(player.position).filter((p) => isTileWalkable(game.encounter.room.map, p));
    const tile1 = adjacentWalkables[0];
    const tile2 = adjacentWalkables[1];

    const rat1 = createMockEnemy('rat-1', 'rat', 'Rat 1', 20, tile1, 'north');
    const targetRat = createMockEnemy('target-rat', 'rat', 'Target Rat', 100, tile2, 'west');

    game.encounter.enemies = [rat1, targetRat];
    synchronizeEncounterOccupancy(game.encounter);

    // Jogador seleciona target-rat
    player.targetId = 'target-rat';
    game.session.characters[0].combatState.targetId = 'target-rat';

    // Dispara tick de combate (início do ataque e impacto a +180ms)
    game = advanceCombat(game, content, 120);
    game = advanceCombat(game, content, 200);

    // ASSERT: target-rat recebeu o ataque
    const attackOnTarget = game.encounter.events.find(
      (e) => e.type === 'player-attack' && e.targetId === 'target-rat'
    );
    expect(attackOnTarget).toBeDefined();

    // ASSERT: rat-1 NÃO recebeu ataque
    const rat1After = game.encounter.enemies.find((e) => e.id === 'rat-1');
    expect(rat1After?.hp).toBe(20);
  });

  it('4. restaura auto-retargeting suave assim que o monstro travado morre', () => {
    let game = createIdleGame('target-lock-retarget-on-death', content);
    game.encounter.status = 'running';
    game.encounter.room.phase = 'combat';
    game.encounter.nextMovementAt = 0;
    const player = game.encounter.partyActors[0];

    const adjacentWalkables = surroundingPositions(player.position).filter((p) => isTileWalkable(game.encounter.room.map, p));
    const tile1 = adjacentWalkables[0];
    const tile2 = adjacentWalkables[1];

    const dyingEnemy = createMockEnemy('dying-enemy', 'rat', 'Dying Enemy', 1, tile1, 'west');
    const nextEnemy = createMockEnemy('next-enemy', 'rat', 'Next Enemy', 20, tile2, 'north');

    game.encounter.enemies = [dyingEnemy, nextEnemy];
    synchronizeEncounterOccupancy(game.encounter);

    // Alvo travado no monstro que vai morrer
    game = setActorTarget(game, player.characterId, 'dying-enemy');
    expect(game.encounter.partyActors[0].targetId).toBe('dying-enemy');

    // Executa combate para matar o monstro (tick 1 agenda ataque, tick 2 realiza o impacto)
    game.encounter.partyActors[0].nextAttackAt = 0;
    game = advanceCombat(game, content, 120);
    game = advanceCombat(game, content, 200);

    // O monstro morreu
    const deadEnemy = game.encounter.enemies.find((e) => e.id === 'dying-enemy');
    expect(deadEnemy?.alive).toBe(false);

    // O targetId foi limpo
    expect(game.encounter.partyActors[0].targetId).toBeNull();

    // No próximo ciclo de movimento/combate, ele seleciona automaticamente o próximo inimigo mais próximo ('next-enemy')
    const ranges = new Map([[player.characterId, 1]]);
    movePartyTowardTargets(game.encounter, ranges, undefined, player.characterId, 'closest');
    expect(game.encounter.partyActors[0].targetId).toBe('next-enemy');
  });

  it('5. valida código fonte de PixiArena e movement.ts para integridade arquitetural do Target Lock', () => {
    const PROJECT_ROOT = process.cwd();
    const movementPath = path.resolve(PROJECT_ROOT, 'packages', 'domain', 'src', 'spatial', 'movement.ts');
    const movementContent = fs.readFileSync(movementPath, 'utf8');

    // Confirma que movement.ts tem a trava de Target Lock ativo
    expect(movementContent).toContain('const currentLockedEnemy = actor.targetId ? encounter.enemies.find((e) => e.id === actor.targetId && e.alive) : undefined;');
    expect(movementContent).toContain('new Set([currentLockedEnemy.id])');

    // Confirma que PixiArena.tsx possui targetReticle e câmera/ator resolvidos
    const arenaPath = path.resolve(PROJECT_ROOT, 'apps', 'web', 'components', 'PixiArena.tsx');
    const arenaContent = fs.readFileSync(arenaPath, 'utf8');
    expect(arenaContent).toContain('cameraTargetCharacterId');
    expect(arenaContent).toContain('targetReticle');
  });

  it('6. garante que disparo manual de magia direcionada não atinge inimigos vizinhos se o alvo travado estiver fora do alcance', () => {
    let game = createIdleGame('target-lock-manual-spell', content);
    game.encounter.status = 'running';
    game.encounter.room.phase = 'combat';
    const player = game.encounter.partyActors[0];
    const character = game.session.characters[0];
    character.currentMana = 500;
    player.mana = 500;

    const adjacentWalkable = surroundingPositions(player.position).find((p) => isTileWalkable(game.encounter.room.map, p))!;
    const distantTile = game.encounter.room.map.tiles.find(
      (t) => t.walkable && t.position.z === player.position.z && meleeDistance(player.position, t.position) >= 5
    )!;

    const closeRat = createMockEnemy('close-rat', 'rat', 'Close Rat', 20, adjacentWalkable, 'north');
    const distantTarget = createMockEnemy('distant-target', 'rat', 'Distant Target', 50, distantTile.position, 'west');

    game.encounter.enemies = [closeRat, distantTarget];
    synchronizeEncounterOccupancy(game.encounter);

    // Alvo travado no monstro distante (fora de alcance da magia range 3 ou 4)
    player.targetId = 'distant-target';
    character.combatState.targetId = 'distant-target';

    // Cria ação de hotbar para uma magia direcionada de alvo (ex: Flame Strike ou Whirlwind Throw)
    const spellAction = {
      id: 9999,
      name: 'Flame Strike',
      kind: 'spell' as const,
      spell: {
        spellId: 23,
        name: 'Flame Strike',
        words: 'exori flam',
        vocation: 'Sorcerer',
        level: 12,
        mana: 20,
        group: 'attack' as const,
        groupCooldownMs: 2000,
        cooldownMs: 2000,
        range: 3,
        area: 'target' as const,
        combatType: 'fire',
        formula: { min: 30, max: 50 },
        visual: { effectId: 4, projectileId: null },
      },
    };

    // Tenta disparar manualmente a magia no alvo travado
    const fired = triggerManualHotbarAction(game, character.id, spellAction as any, content);

    // ASSERT: A magia NÃO foi disparada porque o alvo travado está fora de alcance!
    expect(fired).toBe(false);

    // ASSERT: Close Rat permanece ileso (não redirecionou para o rato colado!)
    expect(closeRat.hp).toBe(20);
  });
});
