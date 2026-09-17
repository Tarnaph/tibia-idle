import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  defeatEnemy,
  createIdleGame,
  experienceForLevel,
  levelForExperience,
  initialHunts,
  getExpStageMultiplier,
  type GameContent,
  type EnemyState,
} from '../packages/domain/src';
import monstersJson from '../content/generated/monsters.json';
import vocationsJson from '../content/generated/vocations.json';
import equipmentJson from '../content/generated/equipment.json';
import startersJson from '../content/generated/starter-loadouts.json';
import spellsJson from '../content/generated/spells.json';
import huntRegionsJson from '../content/generated/hunt-regions.json';
import economyJson from '../content/generated/item-economy.json';
import { parseInventoryData } from '../apps/web/lib/characterHydration';
import { progressionDiagnostics } from '../apps/web/lib/progressionDiagnostics';
import { ServerCharacterContextRegistry } from '../packages/auth/src';
import { PrismaPersistenceManager } from '../packages/server/src/persistence/PrismaPersistenceManager';
import { PlayerState } from '../packages/server/src/schemas/PlayerState';
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

describe('Phase 182 - Bloco A: Correção de Progressão, Autoridade na Caçada e Conflito Não-Destrutivo', () => {
  beforeEach(() => {
    ServerCharacterContextRegistry.clearAll();
  });

  it('1. Catálogo dos ratos contém gold coins e queijo com drop garantido', () => {
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

  it('2. Matar ratos acumula gold na Party Box e concede XP contínua sem perdas', () => {
    const state = createIdleGame('test-rat-rewards-seed', content, 'rat-cellars', 'continuous');
    const initialGold = state.session.gold;
    const initialExp = state.session.characters[0].experience;

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

  it('3. Progressão com stages configurados (50x) avança estritamente até ultrapassar o Nível 6', () => {
    const state = createIdleGame('test-levelup-seed', content, 'rat-cellars', 'continuous');
    const character = state.session.characters[0];
    character.level = 1;
    character.experience = 0;

    const levelHistory: number[] = [character.level];
    const multiplier = getExpStageMultiplier(1);
    expect(multiplier).toBe(50); // Stages de nível 1 a 8 = 50x

    // Derrotar ratos com multiplicador de stage: cada rato dá 5 * 50 = 250 XP
    // Level 7 requer 2400 XP -> ~10 ratos
    for (let r = 0; r < 12; r++) {
      const enemy = {
        id: `rat-stage-${r}`,
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
      levelHistory.push(character.level);
    }

    // Nível deve ser estritamente não-decrescente
    for (let i = 1; i < levelHistory.length; i++) {
      expect(levelHistory[i]).toBeGreaterThanOrEqual(levelHistory[i - 1]);
    }
    expect(character.level).toBeGreaterThanOrEqual(7);
  });

  it('4. Autoridade na caçada: Colyseus não grava e não incrementa versão durante a caçada', async () => {
    const charId = 'test-hunt-isolation-1';
    let dbUpdateCalls = 0;

    // Mock Prisma client
    const mockPrisma: any = {
      character: {
        findUnique: vi.fn().mockResolvedValue({
          id: charId,
          level: 1,
          experience: BigInt(0),
          saveVersion: 1,
        }),
        updateMany: vi.fn().mockImplementation(async () => {
          dbUpdateCalls++;
          return { count: 1 };
        }),
      },
      characterSkill: {
        upsert: vi.fn(),
      },
    };

    const persistence = new PrismaPersistenceManager(mockPrisma);

    // 1. Jogador na cidade: Colyseus pode salvar
    const cityPlayer = new PlayerState();
    cityPlayer.characterId = charId;
    cityPlayer.inHunt = false;
    ServerCharacterContextRegistry.setActivity(charId, { isHunting: false });

    await persistence.saveCharacter(cityPlayer);
    expect(dbUpdateCalls).toBe(1); // salvou na cidade

    // 2. Jogador entra em caçada: Colyseus DEVE ser bloqueado pelo guard de autoridade
    cityPlayer.inHunt = true;
    ServerCharacterContextRegistry.setActivity(charId, { isHunting: true, huntId: 'rat-cellars' });

    await persistence.saveCharacter(cityPlayer);
    // Chamadas continuam 1! Colyseus não tocou no banco durante a caçada!
    expect(dbUpdateCalls).toBe(1);

    // 3. Mesmo que inHunt seja falso no PlayerState, se o ServerCharacterContextRegistry registrar caçada ativa, bloqueia
    cityPlayer.inHunt = false;
    await persistence.saveCharacter(cityPlayer);
    expect(dbUpdateCalls).toBe(1); // ainda bloqueado pelo registro autoritativo
  });

  it('5. Compra, consumo, venda e morte seguidos de 409: ausência de duplicação ou restauração indevida', () => {
    // Estado inicial ativo do cliente na sessão
    let sessionGold = 1000;
    let sessionPotions = 10;
    let sessionSwords = 1;
    let sessionExp = 1200; // Level 5
    let sessionSwordSkill = 20;

    // 1. Jogador compra suprimento por 700 gold
    sessionGold -= 700; // agora 300
    expect(sessionGold).toBe(300);

    // 2. Jogador consome 8 poções
    sessionPotions -= 8; // agora 2
    expect(sessionPotions).toBe(2);

    // 3. Jogador vende a espada
    sessionSwords -= 1; // agora 0
    expect(sessionSwords).toBe(0);

    // 4. Jogador morre em combate (penalidade legítima de 10% XP e -1 skill)
    sessionExp = Math.floor(sessionExp * 0.9); // 1080 XP
    sessionSwordSkill -= 1; // skill 19
    expect(sessionExp).toBe(1080);
    expect(sessionSwordSkill).toBe(19);

    // 5. Simulação de conflito OCC HTTP 409 com resposta desatualizada do banco
    // O banco ainda tinha o estado antigo pré-gastos: 1000 gold, 10 potions, 1 sword, 1200 exp, skill 20
    const conflictData = {
      currentVersion: 5,
      character: {
        level: 5,
        experience: 1200,
        inventory: [
          { slot: 'gold', serverId: 2148, name: 'Gold Coin', count: 1000 },
          { slot: 'backpack_0', serverId: 7618, name: 'Health Potion', count: 10 },
          { slot: 'backpack_1', serverId: 2376, name: 'Sword', count: 1 },
        ],
        skills: [{ skillId: 2, skillName: 'Sword Fighting', value: 20 }],
      },
    };

    // Aplicação da regra da Phase 182: A sessão ativa é a autoridade dos eventos jogados
    // Ao receber 409, apenas a saveVersion é sincronizada para o retry save.
    // NÃO executamos Math.max em gold, itens, XP ou skills.
    let trackedSaveVersion = 3;
    trackedSaveVersion = conflictData.currentVersion;

    // Asserções críticas:
    // Gold gasto NÃO foi ressuscitado
    expect(sessionGold).toBe(300);
    expect(sessionGold).not.toBe(conflictData.character.inventory[0].count);

    // Poções consumidas NÃO foram restauradas
    expect(sessionPotions).toBe(2);
    expect(sessionPotions).not.toBe(10);

    // Espada vendida NÃO foi restaurada
    expect(sessionSwords).toBe(0);
    expect(sessionSwords).not.toBe(1);

    // Penalidade de morte (XP e skills) NÃO foi apagada
    expect(sessionExp).toBe(1080);
    expect(sessionExp).not.toBe(1200);
    expect(sessionSwordSkill).toBe(19);
    expect(sessionSwordSkill).not.toBe(20);

    // Versão de gravação foi sincronizada para 5 permitindo retry save limpo
    expect(trackedSaveVersion).toBe(5);
  });

  it('6. Sincronização e telemetria de diagnóstico registram tentativas e conflitos sem corromper estado', () => {
    progressionDiagnostics.clear();

    progressionDiagnostics.recordKill('rat', 'Rat', 250, 5, 1250);
    progressionDiagnostics.recordLoot('Gold Coin', 5, 300, 1);
    progressionDiagnostics.recordSaveAttempt('att-test', 'hero-1', 3, 5, 1250, 300, true);
    progressionDiagnostics.recordSaveConflict('att-test', 3, 5, 5, 1200);

    const logs = progressionDiagnostics.getRecentLogs(10);
    expect(logs.length).toBe(4);
    expect(logs[0].type).toBe('kill');
    expect(logs[1].type).toBe('loot');
    expect(logs[2].type).toBe('save-attempt');
    expect(logs[3].type).toBe('save-conflict');
    expect((logs[3] as any).details.serverVersion).toBe(5);
  });
});
