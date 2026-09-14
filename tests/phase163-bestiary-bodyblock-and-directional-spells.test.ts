import { describe, expect, it } from 'vitest';
import {
  advanceCombat,
  calculateBestSpellDirection,
  createIdleGame,
  initialHunts,
  isDirectionalSpell,
  isTileWalkable,
  meleeDistance,
  movePartyTowardTargets,
  surroundingPositions,
  synchronizeEncounterOccupancy,
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

describe('Phase 163: Persistência Definitiva do Bestiário, Bodyblock Clearance e Waves Direcionais Inteligentes', () => {
  describe('1. Persistência Monotônica do Bestiário (Prevenção de Reset pós-Relog)', () => {
    it('garante que contagens de bestiário no banco de dados nunca regridem mesmo com payloads parciais ou vazios', () => {
      const existingBestiary: Record<string, number> = {
        rat: 15,
        cave_rat: 8,
        demon: 2,
      };

      const incomingStalePayload: Record<string, number> = {
        rat: 0, // stale/vazio vindo de sessão sem sync
        demon: 5, // progresso novo de demon
      };

      const merged: Record<string, number> = { ...existingBestiary };
      for (const [k, v] of Object.entries(incomingStalePayload)) {
        if (typeof v === 'number') {
          merged[k] = Math.max(Number(existingBestiary[k] || 0), v);
        }
      }

      // ASSERT: Rat não resetou para 0, manteve 15!
      expect(merged.rat).toBe(15);
      // ASSERT: Cave rat foi preservado em 8!
      expect(merged.cave_rat).toBe(8);
      // ASSERT: Demon avançou para 5!
      expect(merged.demon).toBe(5);
    });

    it('valida código-fonte de PrismaPersistenceManager e ThaisCityRoom para merge não-regressivo de bestiário', () => {
      const root = process.cwd();
      const persistenceCode = fs.readFileSync(path.resolve(root, 'packages/server/src/persistence/PrismaPersistenceManager.ts'), 'utf8');
      expect(persistenceCode).toContain('mergedBestiary[k] = Math.max(Number(existingBestiary[k] || 0), v);');
      expect(persistenceCode).toContain('bestiaryKillsJson: finalBestiaryKillsJson');

      const roomCode = fs.readFileSync(path.resolve(root, 'packages/server/src/rooms/ThaisCityRoom.ts'), 'utf8');
      expect(roomCode).toContain('updated[k] = Math.max(Number(current[k] || 0), v);');

      const clientCode = fs.readFileSync(path.resolve(root, 'apps/web/components/GamePrototype.tsx'), 'utf8');
      expect(clientCode).toContain('gameNetwork.sendBestiarySetKills(bestiaryKills);');
    });
  });

  describe('2. Autodefesa no Idle e Desobstrução de Caminho (Bodyblock Clearance)', () => {
    it('prioriza monstro adjacente a 1 tile de distância no modo idle para desobstruir a passagem antes de monstros distantes', () => {
      const game = createIdleGame('idle-adjacent-priority', content);
      const encounter = game.encounter;
      const player = encounter.partyActors[0];

      const adjacentTile = surroundingPositions(player.position).find((p) => isTileWalkable(encounter.room.map, p))!;
      const distantTile = encounter.room.map.tiles.find(
        (t) => t.walkable && t.position.z === player.position.z && meleeDistance(player.position, t.position) >= 4
      )!;

      encounter.enemies = [
        createMockEnemy('distant-monster', 'rat', 'Distant Monster', 100, distantTile.position),
        createMockEnemy('adjacent-blocker', 'rat', 'Adjacent Blocker', 20, adjacentTile),
      ];
      synchronizeEncounterOccupancy(encounter);

      // Sem target lock manual: seleção puramente idle ('closest')
      player.targetId = null;
      const ranges = new Map([[player.characterId, 1]]);

      movePartyTowardTargets(encounter, ranges, undefined, player.characterId, 'closest');

      // ASSERT: O jogador seleciona imediatamente o monstro adjacente na sua cara!
      expect(player.targetId).toBe('adjacent-blocker');
    });

    it('no modo idle, prioriza monstro bloqueador no corredor adjacente mesmo com outros inimigos vivos', () => {
      const game = createIdleGame('bodyblock-clearance', content);
      const encounter = game.encounter;
      const player = encounter.partyActors[0];

      const adjacentWalkable = surroundingPositions(player.position).filter((p) => isTileWalkable(encounter.room.map, p));
      const stepTile = adjacentWalkable[0];
      const targetTile = encounter.room.map.tiles.find(
        (t) => t.walkable && t.position.z === player.position.z && meleeDistance(player.position, t.position) >= 3
      )!;

      // Monstro B bloqueia exatamente o tile onde o jogador precisa dar o próximo passo até A
      encounter.enemies = [
        createMockEnemy('target-enemy', 'demon', 'Target Enemy', 1000, targetTile.position),
        createMockEnemy('corridor-blocker', 'rat', 'Corridor Blocker', 20, stepTile),
      ];
      synchronizeEncounterOccupancy(encounter);

      // No modo idle (sem alvo travado previamente)
      player.targetId = null;
      const ranges = new Map([[player.characterId, 1]]);

      movePartyTowardTargets(encounter, ranges, undefined, player.characterId, 'closest');

      // ASSERT: No modo idle, o motor seleciona o monstro adjacente bloqueador para livrar o caminho!
      expect(player.targetId).toBe('corridor-blocker');
    });
  });

  describe('3. Inteligência Direcional de Magias Frontais (Waves & Beams - Virar o Corpo)', () => {
    it('identifica corretamente feitiços direcionais (waves e beams) pelo nome e palavras mágicas', () => {
      expect(isDirectionalSpell({ name: 'Fire Wave', words: 'exevo flam hur' })).toBe(true);
      expect(isDirectionalSpell({ name: 'Ice Wave', words: 'exevo frigo hur' })).toBe(true);
      expect(isDirectionalSpell({ name: 'Energy Wave', words: 'exevo vis hur' })).toBe(true);
      expect(isDirectionalSpell({ name: 'Terra Wave', words: 'exevo tera hur' })).toBe(true);
      expect(isDirectionalSpell({ name: 'Energy Beam', words: 'exevo vis lux' })).toBe(true);
      expect(isDirectionalSpell({ name: 'Great Energy Beam', words: 'exevo gran vis lux' })).toBe(true);
      expect(isDirectionalSpell({ name: 'Flame Strike', words: 'exori flam', area: 'target' })).toBe(false);
      expect(isDirectionalSpell({ name: 'Light Healing', words: 'exura', area: 'self' })).toBe(false);
    });

    it('calcula e seleciona a direção cardeal ideal em direção ao alvo inimigo para disparar uma wave', () => {
      const casterPos = { x: 10, y: 10, z: 7 };
      // Monstro está diretamente ao leste (x=13, y=10)
      const enemies = [
        { id: 'east-monster', position: { x: 13, y: 10, z: 7 }, alive: true },
      ];

      const waveSpell = content.spells.find((s) => s.spellId === 19)!;

      const result = calculateBestSpellDirection(casterPos, enemies, waveSpell, 'east-monster', 'north');

      // ASSERT: Virou para 'east' onde o monstro está!
      expect(result.direction).toBe('east');
      expect(result.hitCount).toBe(1);
      expect(result.hitTarget).toBe(true);
    });

    it('rotaciona automaticamente o personagem no tick de combate antes de conjurar a magia direcional', () => {
      let game = createIdleGame('wave-auto-rotation', content);
      game.encounter.status = 'running';
      game.encounter.room.phase = 'combat';
      const player = game.encounter.partyActors[0];
      player.mana = 200;

      // Encontra um par de tiles caminháveis onde o monstro está ao sul do jogador
      const map = game.encounter.room.map;
      const z = player.position.z;
      let playerPos = player.position;
      let southTile = map.tiles.find(
        (t) => t.walkable && t.position.z === z && t.position.x === playerPos.x && t.position.y > playerPos.y && (t.position.y - playerPos.y) <= 3
      );

      if (!southTile) {
        for (const t1 of map.tiles.filter((t) => t.walkable && t.position.z === z)) {
          const t2 = map.tiles.find(
            (candidate) => candidate.walkable && candidate.position.z === z && candidate.position.x === t1.position.x && candidate.position.y > t1.position.y && (candidate.position.y - t1.position.y) <= 3
          );
          if (t2) {
            player.position = { ...t1.position };
            southTile = t2;
            break;
          }
        }
      }

      expect(southTile).toBeDefined();
      player.direction = 'north'; // virado intencionalmente para o norte

      const enemy = createMockEnemy('south-rat', 'rat', 'South Rat', 50, southTile!.position);
      game.encounter.enemies = [enemy];
      synchronizeEncounterOccupancy(game.encounter);

      // Adiciona Fire Wave na hotbar do personagem
      const character = game.session.characters[0];
      character.vocation = 'Sorcerer';
      character.level = 20;
      character.currentMana = 200;
      character.skills.magicLevel = 30;
      character.hotbar = [19]; // Fire Wave spellId 19

      // Roda o combate
      game = advanceCombat(game, content, 120);

      // ASSERT: O personagem virou o corpo para 'south' para acertar a Fire Wave!
      expect(game.encounter.partyActors[0].direction).toBe('south');

      // ASSERT: O monstro ao sul tomou dano da Fire Wave!
      const enemyAfter = game.encounter.enemies.find((e) => e.id === 'south-rat');
      expect(enemyAfter?.hp).toBeLessThan(50);
    });
  });
});
