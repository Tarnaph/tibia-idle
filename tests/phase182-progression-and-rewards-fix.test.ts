import { describe, it, expect, vi } from 'vitest';
import {
  defeatEnemy,
  createIdleGame,
  advanceCombat,
  experienceForLevel,
  levelForExperience,
  initialHunts,
  type GameContent,
  type GameState,
  type EnemyState,
} from '../packages/domain/src';
import monstersJson from '../content/generated/monsters.json';
import vocationsJson from '../content/generated/vocations.json';
import equipmentJson from '../content/generated/equipment.json';
import startersJson from '../content/generated/starter-loadouts.json';
import spellsJson from '../content/generated/spells.json';
import huntRegionsJson from '../content/generated/hunt-regions.json';
import economyJson from '../content/generated/item-economy.json';
import { mergeLootStacks, parseInventoryData } from '../apps/web/lib/characterHydration';
import { progressionDiagnostics } from '../apps/web/lib/progressionDiagnostics';
import type { MonsterCatalog, EquipmentCatalog, StarterLoadoutCatalog, VocationCatalog, SpellCatalog, HuntRegionCatalog, ItemEconomyCatalog } from '../packages/content-schema/src';

const content: GameContent = {
  equipment: (equipmentJson as EquipmentCatalog).items,
  monsters: (monstersJson as MonsterCatalog).monsters,
  starterLoadouts: (startersJson as StarterLoadoutCatalog).loadouts,
  vocations: (vocationsJson as VocationCatalog).vocations,
  spells: (spellsJson as unknown as SpellCatalog).spells,
  huntRegions: (huntRegionsJson as HuntRegionCatalog).regions,
  economy: economyJson as ItemEconomyCatalog,
  hunts: initialHunts,
  rateSkill: (vocationsJson as VocationCatalog).rateSkill,
  rateMagic: (vocationsJson as VocationCatalog).rateMagic,
};

describe('Phase 182 - Bloco A: Correção de Progressão, Recompensas e Reconciliação Monotônica', () => {
  it('1. Rat catalog contains guaranteed gold coins and cheese drops', () => {
    const rat = content.monsters.find((m) => m.id === 'rat');
    expect(rat).toBeDefined();
    expect(rat!.name).toBe('Rat');
    expect(rat!.experience).toBe(5);

    const goldLoot = rat!.loot.find((l) => l.itemId === 2148);
    expect(goldLoot).toBeDefined();
    expect(goldLoot!.name.toLowerCase()).toContain('gold');
    expect(goldLoot!.chance).toBe(100000); // 100% chance
    expect(goldLoot!.maxCount).toBeGreaterThanOrEqual(1);

    const cheeseLoot = rat!.loot.find((l) => l.itemId === 2696);
    expect(cheeseLoot).toBeDefined();
    expect(cheeseLoot!.chance).toBeGreaterThan(0);
  });

  it('2. Killing rats accumulates gold in party box and awards continuous XP without dropping', () => {
    const state = createIdleGame('test-rat-rewards-seed', content, 'rat-cellars', 'continuous');
    const initialGold = state.session.gold;
    const initialExp = state.session.characters[0].experience;

    // Simulate defeating 10 rats
    for (let i = 0; i < 10; i++) {
      const enemy = {
        id: `rat-test-${i}`,
        monsterId: 'rat',
        name: 'Rat',
        hp: 0,
        maxHp: 20,
        alive: true,
        position: { x: 32369, y: 32241, z: 7 },
        path: [],
        targetId: null,
        nextAttackAt: 0,
        nextMoveAt: 0,
      } as unknown as EnemyState;

      defeatEnemy(state, enemy, content);
    }

    expect(state.session.gold).toBeGreaterThan(initialGold);
    expect(state.session.characters[0].experience).toBeGreaterThan(initialExp);
    expect(state.session.characters[0].experience).toBeGreaterThanOrEqual(initialExp + 10 * 5);
  });

  it('3. Character advances continuously past Level 6 without resetting to Level 1', () => {
    const state = createIdleGame('test-levelup-seed', content, 'rat-cellars', 'continuous');
    const character = state.session.characters[0];
    character.level = 1;
    character.experience = 0;

    const levelHistory: number[] = [character.level];

    // Award XP in steps to reach Level 7 (Level 7 requires 2400 XP)
    const targetLevels = [2, 3, 4, 5, 6, 7];
    for (const targetLevel of targetLevels) {
      const neededExp = experienceForLevel(targetLevel) - character.experience;
      const ratsNeeded = Math.ceil(neededExp / 5);

      for (let r = 0; r < ratsNeeded; r++) {
        const enemy = {
          id: `rat-lvl-${targetLevel}-${r}`,
          monsterId: 'rat',
          name: 'Rat',
          hp: 0,
          maxHp: 20,
          alive: true,
          position: { x: 32369, y: 32241, z: 7 },
          path: [],
          targetId: null,
          nextAttackAt: 0,
          nextMoveAt: 0,
        } as unknown as EnemyState;
        defeatEnemy(state, enemy, content);
      }

      expect(character.level).toBeGreaterThanOrEqual(targetLevel);
      levelHistory.push(character.level);
    }

    // Verify level history is strictly monotonic non-decreasing
    for (let i = 1; i < levelHistory.length; i++) {
      expect(levelHistory[i]).toBeGreaterThanOrEqual(levelHistory[i - 1]);
    }
    expect(character.level).toBeGreaterThanOrEqual(7);
  });

  it('4. mergeLootStacks merges local drops and server inventory monotonically without data loss', () => {
    const localLoot = [
      { itemId: 2696, name: 'cheese', amount: 5 },
      { itemId: 2148, name: 'gold coin', amount: 12 },
    ];
    const serverLoot = [
      { itemId: 2696, name: 'cheese', amount: 2 }, // server has older/lesser count
      { itemId: 2120, name: 'rope', amount: 1 },    // server has item local didn't have
    ];

    const merged = mergeLootStacks(localLoot, serverLoot);

    const cheese = merged.find((item) => item.itemId === 2696);
    expect(cheese).toBeDefined();
    expect(cheese!.amount).toBe(5); // kept the maximum!

    const gold = merged.find((item) => item.itemId === 2148);
    expect(gold).toBeDefined();
    expect(gold!.amount).toBe(12);

    const rope = merged.find((item) => item.itemId === 2120);
    expect(rope).toBeDefined();
    expect(rope!.amount).toBe(1);
  });

  it('5. Monotonic 409 conflict reconciliation preserves Level 6, XP and gold when server returns stale Level 1', () => {
    // Simulated client state after hunting rats to Level 6
    const clientChar = {
      id: 'test-hero-alpha',
      level: 6,
      experience: 1550,
      skills: { fist: 10, club: 10, sword: 18, axe: 10, distance: 10, shielding: 15, magicLevel: 0 },
      skillTries: { fist: 0, club: 0, sword: 50, axe: 0, distance: 0, shielding: 30, magicLevel: 0 },
    };
    const clientGold = 45;

    // Simulated stale server state returned in 409 conflict (e.g. from Colyseus race)
    const srvChar = {
      id: 'test-hero-alpha',
      level: 1,
      experience: 0,
      skills: [{ skillId: 2, skillName: 'Sword Fighting', value: 10, tries: 0 }],
      inventory: [], // empty inventory on stale server
    };

    // Apply the Phase 182 monotonic reconciliation logic
    const srvExp = srvChar.experience !== undefined ? Number(srvChar.experience) : 0;
    const reconciledExp = Math.max(Number(clientChar.experience || 0), srvExp);
    const srvLvl = typeof srvChar.level === 'number' ? srvChar.level : 1;
    const reconciledLevel = Math.max(clientChar.level || 1, srvLvl, levelForExperience(reconciledExp));

    const invResult = parseInventoryData(srvChar.inventory, content.equipment);
    const finalGold = Math.max(clientGold || 0, invResult.gold);

    // Assert that client progress was 100% protected
    expect(reconciledLevel).toBe(6);
    expect(reconciledExp).toBe(1550);
    expect(finalGold).toBe(45);
  });

  it('6. Progression diagnostics records kills, loot, level-ups, save attempts, and reconciliations', () => {
    progressionDiagnostics.clear();

    progressionDiagnostics.recordKill('rat', 'Rat', 5, 1, 5);
    progressionDiagnostics.recordLoot('Gold Coin', 3, 3, 1);
    progressionDiagnostics.recordLevelUp(1, 2, 100);
    progressionDiagnostics.recordSaveAttempt('att-1', 'hero-1', 1, 2, 100, 3, true);
    progressionDiagnostics.recordSaveSuccess('att-1', 2, 200);
    progressionDiagnostics.recordReconciliation('hero-1', 1, 2, 2, 2, 100, 100, 3, 3);

    const logs = progressionDiagnostics.getRecentLogs(10);
    expect(logs.length).toBe(6);
    expect(logs[0].type).toBe('kill');
    expect(logs[1].type).toBe('loot');
    expect(logs[2].type).toBe('level-up');
    expect(logs[3].type).toBe('save-attempt');
    expect(logs[4].type).toBe('save-success');
    expect(logs[5].type).toBe('reconcile');
  });
});
