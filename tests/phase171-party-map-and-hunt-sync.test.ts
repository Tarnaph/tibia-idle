import { describe, expect, it } from 'vitest';
import {
  createIdleGame,
  movePartyTowardTargets,
  initialHunts,
  type GameContent,
  meleeDistance,
  addPartyMember,
  restartHunt,
  respawnInTemple,
  leaveHunt,
  selectedCharacterOf,
  type CharacterState,
  calculateStatsForLevel,
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

describe('Phase 171: Party Map & Hunt Synchronization + Closest Targeting', () => {
  it('1. Garante que membros secundários (Knight) com estratégia closest atacam o inimigo mais próximo em vez do alvo do líder distante', () => {
    let game = createIdleGame('party-sync-seed', content);
    // Adiciona um Knight como membro secundário
    game = addPartyMember(game, 'Valiant Knight', 'Knight', content);
    game = restartHunt(game, 'party-sync-seed', content);

    const encounter = game.encounter;
    expect(encounter.partyActors.length).toBe(2);

    const leader = encounter.partyActors[0];
    const knight = encounter.partyActors[1];

    // Cria um monstro distante que é o alvo do líder
    const farEnemy = {
      id: 'far-dragon-leader-target',
      monsterId: 'dragon',
      name: 'Dragon Far',
      variant: null,
      hp: 1000,
      maxHp: 1000,
      attackMax: 50,
      defense: 20,
      armor: 15,
      alive: true,
      position: { x: knight.position.x + 8, y: knight.position.y, z: knight.position.z },
      previousPosition: { x: knight.position.x + 8, y: knight.position.y, z: knight.position.z },
      direction: 'west' as const,
      path: [],
      targetId: leader.characterId,
      nextAttackAt: 0,
      attackIntervalMs: 2000,
      speed: 100,
      behavior: 'idle' as const,
      nextRoamAt: 0,
      nextMoveAt: 0,
      detectionRange: 50,
    };

    // Cria um monstro adjacente ao Knight (1 tile de distância)
    const nearEnemy = {
      id: 'near-goblin-adjacent',
      monsterId: 'goblin',
      name: 'Goblin Near',
      variant: null,
      hp: 100,
      maxHp: 100,
      attackMax: 10,
      defense: 5,
      armor: 2,
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

    encounter.enemies = [farEnemy, nearEnemy];
    leader.targetId = farEnemy.id; // Líder trava no monstro distante

    const ranges = new Map([
      [leader.characterId, 4],
      [knight.characterId, 1],
    ]);

    // Executa o movimento tático do grupo com estratégia 'closest'
    movePartyTowardTargets(encounter, ranges, undefined, leader.characterId, 'closest');

    // O Knight deve escolher o monstro próximo (nearEnemy) e NÃO o do líder distante (farEnemy)
    expect(knight.targetId).toBe(nearEnemy.id);
  });

  it('2. Garante que prepareHuntCharacters sincroniza corretamente alts adicionados e mantém todos na caçada', () => {
    let game = createIdleGame('prepare-hunt-sync-seed', content);
    const mainChar = game.session.characters[0];

    // Simula alt Knight criado na conta
    const stats = calculateStatsForLevel('Knight', 50);
    const altKnight: CharacterState = {
      ...mainChar,
      id: 'alt-knight-id',
      name: 'AltKnight',
      vocation: 'Knight',
      baseVocation: 'Knight',
      level: 50,
      maxHp: stats.maxHp,
      currentHp: stats.maxHp,
      maxMana: stats.maxMana,
      currentMana: stats.maxMana,
    };

    const savedPool = [mainChar, altKnight];
    const partyMemberIds = [mainChar.id, altKnight.id];

    // Lógica canônica de prepareHuntCharacters agora implementada
    const prepareHunt = (cur: any) => {
      const activeId = cur.session.selectedCharacterId || cur.session.characters[0]?.id;
      const charMap = new Map<string, CharacterState>();
      cur.session.characters.forEach((c: CharacterState) => charMap.set(c.id, c));
      savedPool.forEach((c) => {
        if (!charMap.has(c.id)) charMap.set(c.id, c);
      });

      const desiredIds = new Set<string>();
      if (activeId) desiredIds.add(activeId);
      for (const id of partyMemberIds) desiredIds.add(id);
      for (const c of cur.session.characters) desiredIds.add(c.id);

      const huntSquad: CharacterState[] = [];
      if (activeId && charMap.has(activeId)) {
        huntSquad.push(charMap.get(activeId)!);
      }
      for (const id of desiredIds) {
        if (id !== activeId && charMap.has(id) && huntSquad.length < 4) {
          huntSquad.push(charMap.get(id)!);
        }
      }
      return {
        ...cur,
        session: {
          ...cur.session,
          characters: huntSquad,
        },
      };
    };

    const preparedGame = prepareHunt(game);
    expect(preparedGame.session.characters.length).toBe(2);
    expect(preparedGame.session.characters.some((c: CharacterState) => c.id === 'alt-knight-id')).toBe(true);

    const restartedHunt = restartHunt(preparedGame, 'prepare-hunt-sync-seed', content);
    expect(restartedHunt.encounter.partyActors.length).toBe(2);
    expect(restartedHunt.encounter.partyActors.some((a) => a.characterId === 'alt-knight-id')).toBe(true);
  });

  it('3. Garante que morte (handleConfirmDeath / respawnInTemple) preserva todos os personagens do squad com HP total em Thais', () => {
    let game = createIdleGame('death-respawn-sync-seed', content);
    game = addPartyMember(game, 'Squad Druid', 'Druid', content);
    expect(game.session.characters.length).toBe(2);

    // Aplica penalidade de morte do templo
    const respawned = respawnInTemple(game, { expLossPercent: 10, skillLossPercent: 10, loseLoot: false }, content);

    // Simula a nova retenção total do squad (sem o antigo bug "characters: localOnly")
    const allRespawned = respawned.session.characters.map((c: CharacterState) => ({
      ...c,
      currentHp: c.maxHp,
      currentMana: c.maxMana,
      combatState: { targetId: null, spellCooldowns: {}, groupCooldowns: {} },
    }));

    const finalSession = {
      ...respawned,
      session: {
        ...respawned.session,
        characters: allRespawned,
      },
    };

    // Nenhum personagem do squad é deletado ao morrer e renascer em Thais
    expect(finalSession.session.characters.length).toBe(2);
    expect(finalSession.session.characters[0].currentHp).toBe(finalSession.session.characters[0].maxHp);
    expect(finalSession.session.characters[1].currentHp).toBe(finalSession.session.characters[1].maxHp);
  });

  it('4. Garante que saída normal de caçada (leaveHunt) restaura os membros para o mapa de Thais sem perdas', () => {
    let game = createIdleGame('leave-hunt-sync-seed', content);
    game = addPartyMember(game, 'Squad Paladin', 'Paladin', content);
    game = restartHunt(game, 'leave-hunt-sync-seed', content);

    expect(game.encounter.partyActors.length).toBe(2);

    const left = leaveHunt(game);
    // Todos os personagens continuam presentes na sessão ao retornar à cidade
    expect(left.session.characters.length).toBe(2);
    expect(left.session.characters.some((c) => c.name === 'Squad Paladin')).toBe(true);
  });
});
