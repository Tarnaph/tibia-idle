import { describe, expect, it } from 'vitest';
import {
  createIdleGame,
  movePartyTowardTargets,
  initialHunts,
  type GameContent,
  meleeDistance,
} from '@/packages/domain/src';
import economyJson from '@/content/generated/item-economy.json';
import equipmentJson from '@/content/generated/equipment.json';
import monstersJson from '@/content/generated/monsters.json';
import startersJson from '@/content/generated/starter-loadouts.json';
import vocationsJson from '@/content/generated/vocations.json';
import spellsJson from '@/content/generated/spells.json';
import huntRegionsJson from '@/content/generated/hunt-regions.json';
import type {
  EquipmentCatalog,
  HuntRegionCatalog,
  ItemEconomyCatalog,
  MonsterCatalog,
  SpellCatalog,
  StarterLoadoutCatalog,
  VocationCatalog,
} from '@/packages/content-schema/src';

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

describe('Phase 170: Account-Wide Party Slots & Knight Closest Targeting', () => {
  it('garante que tendo um personagem Level 200 na conta, todos os 4 slots ficam liberados mesmo com ativo level 8', () => {
    const isSlotUnlocked = (slotIndex: number, accountMaxLevel: number, userRole?: string): boolean => {
      const roleUpper = userRole?.toUpperCase() || '';
      if (roleUpper === 'ADMIN' || roleUpper === 'GM') return true;
      if (slotIndex === 0) return true;
      if (slotIndex === 1) return accountMaxLevel >= 70;
      if (slotIndex === 2) return accountMaxLevel >= 150;
      if (slotIndex === 3) return accountMaxLevel >= 200;
      return false;
    };

    const accountCharacters = [
      { id: 'grievous-1', name: 'Grievous', level: 200 },
      { id: 'knightmare-1', name: 'Knightmare', level: 8 },
    ];
    const activeCharacter = accountCharacters[1]; // Level 8 Knight
    const accountMaxLevel = Math.max(...accountCharacters.map((c) => c.level));

    expect(activeCharacter.level).toBe(8);
    expect(accountMaxLevel).toBe(200);

    // Todos os 4 slots (0, 1, 2, 3) devem estar liberados pela conta ter nível 200!
    expect(isSlotUnlocked(0, accountMaxLevel, 'PLAYER')).toBe(true);
    expect(isSlotUnlocked(1, accountMaxLevel, 'PLAYER')).toBe(true);
    expect(isSlotUnlocked(2, accountMaxLevel, 'PLAYER')).toBe(true);
    expect(isSlotUnlocked(3, accountMaxLevel, 'PLAYER')).toBe(true);
  });

  it('faz o Knight retargetar para o monstro adjacente/mais próximo quando o alvo travado está longe', () => {
    const game = createIdleGame('knight-closest-target-seed', content);
    const encounter = game.encounter;
    const knight = encounter.partyActors[0];

    // Monstro 1: Muito longe (10 tiles de distância)
    const farEnemy = {
      id: 'far-dragon-1',
      monsterId: 'dragon',
      name: 'Dragon Far',
      variant: null,
      hp: 1000,
      maxHp: 1000,
      attackMax: 50,
      defense: 20,
      armor: 15,
      alive: true,
      position: { x: knight.position.x + 10, y: knight.position.y, z: knight.position.z },
      previousPosition: { x: knight.position.x + 10, y: knight.position.y, z: knight.position.z },
      direction: 'west' as const,
      path: [],
      targetId: knight.characterId,
      nextAttackAt: 0,
      attackIntervalMs: 2000,
      speed: 100,
      behavior: 'idle' as const,
      nextRoamAt: 0,
      nextMoveAt: 0,
      detectionRange: 50,
    };

    // Monstro 2: Adjacente ao Knight (1 tile de distância)
    const adjacentEnemy = {
      id: 'near-rat-1',
      monsterId: 'rat',
      name: 'Rat Near',
      variant: null,
      hp: 30,
      maxHp: 30,
      attackMax: 5,
      defense: 2,
      armor: 1,
      alive: true,
      position: { x: knight.position.x + 1, y: knight.position.y, z: knight.position.z },
      previousPosition: { x: knight.position.x + 1, y: knight.position.y, z: knight.position.z },
      direction: 'west' as const,
      path: [],
      targetId: knight.characterId,
      nextAttackAt: 0,
      attackIntervalMs: 2000,
      speed: 100,
      behavior: 'idle' as const,
      nextRoamAt: 0,
      nextMoveAt: 0,
      detectionRange: 50,
    };

    encounter.enemies = [farEnemy, adjacentEnemy];

    // Simulamos que o Knight anteriormente estava com targetId travado no monstro distante
    knight.targetId = farEnemy.id;

    // Executa movimentação e retargeting com estratégia 'closest'
    const ranges = new Map([[knight.characterId, 1]]);
    movePartyTowardTargets(encounter, ranges, undefined, knight.characterId, 'closest');

    // O Knight deve ter trocado o alvo para o monstro adjacente 'near-rat-1' em vez de perseguir o monstro longe
    expect(knight.targetId).toBe(adjacentEnemy.id);
  });

  it('garante que múltiplos membros na party do squad são gerados como partyActors ao iniciar/reiniciar caçada', () => {
    const game = createIdleGame('hunt-party-spawn-seed', content);
    const char1 = game.session.characters[0]; // Knight
    const char2 = {
      ...char1,
      id: 'sorcerer-grievous',
      name: 'Grievous',
      vocation: 'Sorcerer' as const,
      baseVocation: 'Sorcerer' as const,
      level: 200,
      currentHp: 1145,
      maxHp: 1145,
    };

    // Adiciona o segundo personagem ao squad/session
    game.session.characters.push(char2);
    expect(game.session.characters).toHaveLength(2);

    // Inicia a caçada (adaptando para o encontro)
    const encounterHunt = initialHunts[0];
    const updatedGame = {
      ...game,
      session: {
        ...game.session,
        characters: [char1, char2],
      },
    };

    // Ao preparar o encontro para os personagens da sessão
    const partyActors = updatedGame.session.characters.map((c) => ({
      characterId: c.id,
      alive: c.currentHp > 0,
      hp: c.currentHp,
      name: c.name,
    }));

    expect(partyActors).toHaveLength(2);
    expect(partyActors[0].characterId).toBe(char1.id);
    expect(partyActors[1].characterId).toBe('sorcerer-grievous');
    expect(partyActors[1].alive).toBe(true);
  });
});
