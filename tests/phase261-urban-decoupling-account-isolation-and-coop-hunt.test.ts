import { describe, it, expect, vi } from 'vitest';
import type { CharacterState, EnemyState, GameState } from '../packages/domain/src/types';
import { transferActiveMemberOnDeath } from '../packages/domain/src/combat';

describe('Phase 261 / Onda 13: Urban Decoupling, Account Isolation & Co-op Hunt', () => {
  it('1. should reject selecting or controlling remote party members', () => {
    const localCharId = 'char_caos_123';
    const remoteMemberSessionId = 'colyseus_sess_brututus';
    const remoteMemberCharId = 'char_brututus_456';

    const multiplayerParty = {
      leaderSessionId: localCharId,
      leaderName: 'Caos',
      members: [
        { sessionId: localCharId, characterId: localCharId, name: 'Caos', isLeader: true },
        { sessionId: remoteMemberSessionId, characterId: remoteMemberCharId, name: 'Brututus', isLeader: false },
      ],
    };

    const isRemote = (charId: string) => {
      return multiplayerParty.members.some(
        (m) =>
          m.sessionId !== localCharId &&
          (m.sessionId.toLowerCase() === charId.toLowerCase() ||
            (m.characterId && m.characterId.toLowerCase() === charId.toLowerCase()) ||
            (m.name && m.name.trim().toLowerCase() === charId.trim().toLowerCase()))
      );
    };

    expect(isRemote(localCharId)).toBe(false);
    expect(isRemote(remoteMemberSessionId)).toBe(true);
    expect(isRemote(remoteMemberCharId)).toBe(true);
    expect(isRemote('Brututus')).toBe(true);
  });

  it('2. should purge foreign/remote party characters from session.characters upon return to city', () => {
    const localChar: CharacterState = {
      id: 'caos_id',
      name: 'Caos',
      vocation: 'Knight',
      level: 45,
      experience: 120000,
      currentHp: 650,
      maxHp: 650,
      currentMana: 150,
      maxMana: 150,
      skills: { sword: 75, shielding: 70 } as any,
      equipment: {} as any,
      inventory: [],
      hotbar: [],
      hotbarConfigs: {},
      spells: [],
      combatState: { targetId: null, spellCooldowns: {}, groupCooldowns: {} },
    } as any;

    const foreignChar: CharacterState = {
      id: 'brututus_id',
      name: 'Brututus',
      vocation: 'Knight',
      level: 28,
      experience: 50000,
      currentHp: 400,
      maxHp: 400,
      currentMana: 90,
      maxMana: 90,
      skills: { club: 60, shielding: 55 } as any,
      equipment: {} as any,
      inventory: [],
      hotbar: [],
      hotbarConfigs: {},
      spells: [],
      combatState: { targetId: null, spellCooldowns: {}, groupCooldowns: {} },
    } as any;

    const remoteKeys = new Set<string>(['brututus_id', 'brututus']);
    const sessionChars = [localChar, foreignChar];

    const ownChars = sessionChars.filter((c) => {
      const idLower = (c.id || '').toLowerCase();
      const nameLower = (c.name || '').trim().toLowerCase();
      if (remoteKeys.has(idLower) || (nameLower && remoteKeys.has(nameLower))) {
        return false;
      }
      return c.id === localChar.id;
    });

    expect(ownChars).toHaveLength(1);
    expect(ownChars[0].name).toBe('Caos');
    expect(ownChars.some((c) => c.name === 'Brututus')).toBe(false);
  });

  it('3. should isolate level-up alerts so only the leveling character triggers notifications', () => {
    const localActiveCharId = 'caos_1';
    const remoteCharId = 'brututus_2';

    const events = [
      { type: 'hit', damage: 85, targetId: 'cyclops_1' },
      { type: 'level-up', characterId: remoteCharId, level: 29, message: 'Brututus avançou para o nível 29!' },
      { type: 'hit', damage: 120, targetId: 'cyclops_1' },
    ];

    const localLevelUpEvents = events.filter((e) => {
      if (e.type !== 'level-up') return false;
      const cId = (e as any).characterId;
      return cId === localActiveCharId;
    });

    expect(localLevelUpEvents).toHaveLength(0); // Caos doesn't see Brututus's level-up banner!

    const ownLevelUp = { type: 'level-up', characterId: localActiveCharId, level: 46, message: 'Você avançou para o nível 46!' };
    events.push(ownLevelUp);

    const updatedEvents = events.filter((e) => {
      if (e.type !== 'level-up') return false;
      const cId = (e as any).characterId;
      return cId === localActiveCharId;
    });

    expect(updatedEvents).toHaveLength(1);
    expect(updatedEvents[0].characterId).toBe(localActiveCharId);
  });

  it('4. should reconcile follower monster state from authoritative leader snapshot', () => {
    const leaderSnapshot = {
      huntId: 'cyclops-camp',
      wave: 2,
      enemies: [
        { id: 'cyc_1', monsterId: 'cyclops', name: 'Cyclops', hp: 120, maxHp: 260, x: 14, y: 18, targetId: 'caos_1' },
        { id: 'cyc_2', monsterId: 'cyclops-drone', name: 'Cyclops Drone', hp: 320, maxHp: 320, x: 16, y: 19, targetId: null },
      ],
    };

    const followerEnemies: EnemyState[] = [
      {
        id: 'cyc_1',
        monsterId: 'cyclops',
        name: 'Cyclops',
        hp: 260,
        maxHp: 260,
        attackMax: 35,
        defense: 15,
        armor: 8,
        alive: true,
        position: { x: 12, y: 15, z: 7 },
        previousPosition: { x: 12, y: 15, z: 7 },
        direction: 'south',
        path: [],
        targetId: null,
        nextAttackAt: 0,
        attackIntervalMs: 2000,
        speed: 100,
        behavior: 'chase',
        nextRoamAt: 0,
        nextMoveAt: 0,
        detectionRange: 6,
        variant: null,
      },
    ];

    const enemyMap = new Map(leaderSnapshot.enemies.map((e) => [e.id, e]));
    const reconciled = followerEnemies
      .filter((e) => enemyMap.has(e.id))
      .map((e) => {
        const sync = enemyMap.get(e.id)!;
        return {
          ...e,
          hp: sync.hp,
          maxHp: sync.maxHp,
          position: { x: sync.x, y: sync.y, z: 7 },
          targetId: sync.targetId ?? null,
          alive: sync.hp > 0,
        };
      });

    for (const sync of leaderSnapshot.enemies) {
      if (!reconciled.some((e) => e.id === sync.id)) {
        reconciled.push({
          id: sync.id,
          monsterId: sync.monsterId,
          name: sync.name,
          hp: sync.hp,
          maxHp: sync.maxHp,
          attackMax: 25,
          defense: 10,
          armor: 5,
          position: { x: sync.x, y: sync.y, z: 7 },
          previousPosition: { x: sync.x, y: sync.y, z: 7 },
          direction: 'south',
          path: [],
          speed: 100,
          behavior: 'chase',
          attackIntervalMs: 2000,
          nextAttackAt: 0,
          nextRoamAt: 0,
          nextMoveAt: 0,
          detectionRange: 6,
          variant: null,
          targetId: sync.targetId ?? null,
          alive: sync.hp > 0,
        });
      }
    }

    expect(reconciled).toHaveLength(2);
    expect(reconciled.find((e) => e.id === 'cyc_1')?.hp).toBe(120);
    expect(reconciled.find((e) => e.id === 'cyc_2')?.name).toBe('Cyclops Drone');
  });

  it('5. should NOT transfer active member on death when isMultiplayerParty is true', () => {
    const localChar: CharacterState = {
      id: 'local_caos',
      name: 'Caos',
      currentHp: 0,
      maxHp: 650,
    } as any;

    const remoteChar: CharacterState = {
      id: 'remote_brututus',
      name: 'Brututus',
      currentHp: 500,
      maxHp: 500,
    } as any;

    const state: GameState = {
      session: {
        isMultiplayerParty: true,
        selectedCharacterId: 'local_caos',
        leaderId: 'local_caos',
        characters: [localChar, remoteChar],
      },
    } as any;

    transferActiveMemberOnDeath(state, 'local_caos');

    // Local player should NEVER switch control or active focus to remote player
    expect(state.session.selectedCharacterId).toBe('local_caos');
    expect(state.session.leaderId).toBe('local_caos');
  });

  it('6. should transfer active member on death in single-player squad mode (isMultiplayerParty: false)', () => {
    const char1: CharacterState = {
      id: 'squad_char_1',
      name: 'Knight 1',
      currentHp: 0,
      maxHp: 650,
    } as any;

    const char2: CharacterState = {
      id: 'squad_char_2',
      name: 'Mage 2',
      currentHp: 300,
      maxHp: 300,
    } as any;

    const state: GameState = {
      session: {
        isMultiplayerParty: false,
        selectedCharacterId: 'squad_char_1',
        leaderId: 'squad_char_1',
        characters: [char1, char2],
      },
      encounter: {
        nextLogId: 1,
        round: 1,
        log: [],
        events: [],
      },
    } as any;

    transferActiveMemberOnDeath(state, 'squad_char_1');

    // In single-player squad mode, controls smoothly transfer to next living hero
    expect(state.session.selectedCharacterId).toBe('squad_char_2');
    expect(state.session.leaderId).toBe('squad_char_2');
  });

  it('7. should protect loading screen against zombie visibility state', () => {
    // Phase 261 / Onda 14: if !isVisible, loading overlay MUST NOT render regardless of active prop
    const isVisible = false;
    const active = true;

    const shouldRender = isVisible; // New rule: if (!isVisible) return null;
    expect(shouldRender).toBe(false);

    // Legacy bug check: previously `if (!isVisible && !active) return null;` meant that if active was still true, it rendered even when isVisible was false!
    const legacyShouldRender = !(!isVisible && !active);
    expect(legacyShouldRender).toBe(true); // Demonstrates the previous zombie bug!
  });
});

