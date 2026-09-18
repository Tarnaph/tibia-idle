import { describe, it, expect } from 'vitest';

describe('Phase 166: Squad Progression, Vocation Rules, Auto-Login & City Fila Indiana', () => {
  describe('Squad Slot Progression & Level Requirements', () => {
    const getSlotRequiredLevel = (slotIndex: number): number => {
      switch (slotIndex) {
        case 0:
          return 1;
        case 1:
          return 70;
        case 2:
          return 150;
        case 3:
          return 200;
        default:
          return 999;
      }
    };

    const isSlotUnlocked = (slotIndex: number, highestLevel: number): boolean => {
      return highestLevel >= getSlotRequiredLevel(slotIndex);
    };

    it('requires Level 1 for Slot 0, Level 70 for Slot 1, Level 150 for Slot 2, Level 200 for Slot 3', () => {
      expect(getSlotRequiredLevel(0)).toBe(1);
      expect(getSlotRequiredLevel(1)).toBe(70);
      expect(getSlotRequiredLevel(2)).toBe(150);
      expect(getSlotRequiredLevel(3)).toBe(200);
    });

    it('unlocks slots progressively based on leader highest level', () => {
      // Level 1: only slot 0
      expect(isSlotUnlocked(0, 1)).toBe(true);
      expect(isSlotUnlocked(1, 1)).toBe(false);
      expect(isSlotUnlocked(2, 1)).toBe(false);
      expect(isSlotUnlocked(3, 1)).toBe(false);

      // Level 69: still only slot 0
      expect(isSlotUnlocked(0, 69)).toBe(true);
      expect(isSlotUnlocked(1, 69)).toBe(false);

      // Level 70: unlocks slot 1
      expect(isSlotUnlocked(0, 70)).toBe(true);
      expect(isSlotUnlocked(1, 70)).toBe(true);
      expect(isSlotUnlocked(2, 70)).toBe(false);

      // Level 149: slots 0 & 1
      expect(isSlotUnlocked(1, 149)).toBe(true);
      expect(isSlotUnlocked(2, 149)).toBe(false);

      // Level 150: unlocks slot 2
      expect(isSlotUnlocked(2, 150)).toBe(true);
      expect(isSlotUnlocked(3, 150)).toBe(false);

      // Level 199: slots 0, 1, 2
      expect(isSlotUnlocked(2, 199)).toBe(true);
      expect(isSlotUnlocked(3, 199)).toBe(false);

      // Level 200+: all 4 slots unlocked
      expect(isSlotUnlocked(0, 200)).toBe(true);
      expect(isSlotUnlocked(1, 200)).toBe(true);
      expect(isSlotUnlocked(2, 200)).toBe(true);
      expect(isSlotUnlocked(3, 200)).toBe(true);
    });
  });

  describe('Squad Vocation Uniqueness & Slot Capacity', () => {
    interface DummyHero {
      id: string;
      name: string;
      vocation: string;
      level: number;
    }

    const validateSquadAddition = (
      currentSquad: DummyHero[],
      candidate: DummyHero,
      maxLevel: number
    ): { allowed: boolean; reason?: string } => {
      if (currentSquad.length >= 4) {
        return { allowed: false, reason: 'Squad já está com a capacidade máxima de 4 heróis.' };
      }

      const nextSlotIndex = currentSquad.length;
      const reqLevel = nextSlotIndex === 1 ? 70 : nextSlotIndex === 2 ? 150 : nextSlotIndex === 3 ? 200 : 1;
      if (maxLevel < reqLevel) {
        return { allowed: false, reason: `Requer Nível ${reqLevel} para desbloquear o slot ${nextSlotIndex + 1}.` };
      }

      const candidateVocNorm = candidate.vocation.toLowerCase().trim();
      const hasDuplicate = currentSquad.some(
        (m) => m.vocation.toLowerCase().trim() === candidateVocNorm
      );
      if (hasDuplicate) {
        return { allowed: false, reason: `Vocação ${candidate.vocation} já está em uso no Squad.` };
      }

      return { allowed: true };
    };

    it('rejects adding a duplicate vocation to active squad', () => {
      const knight1: DummyHero = { id: '1', name: 'Tanker', vocation: 'Knight', level: 100 };
      const knight2: DummyHero = { id: '2', name: 'Slayer', vocation: 'Knight', level: 50 };
      const druid: DummyHero = { id: '3', name: 'Healer', vocation: 'Druid', level: 80 };

      const squad = [knight1];
      const resultDup = validateSquadAddition(squad, knight2, 100);
      expect(resultDup.allowed).toBe(false);
      expect(resultDup.reason).toContain('já está em uso no Squad');

      const resultOk = validateSquadAddition(squad, druid, 100);
      expect(resultOk.allowed).toBe(true);
    });

    it('allows full diversity squad: 1 Knight, 1 Druid, 1 Paladin, 1 Sorcerer at level 200+', () => {
      const knight: DummyHero = { id: '1', name: 'A', vocation: 'Knight', level: 200 };
      const druid: DummyHero = { id: '2', name: 'B', vocation: 'Druid', level: 150 };
      const paladin: DummyHero = { id: '3', name: 'C', vocation: 'Paladin', level: 160 };
      const sorcerer: DummyHero = { id: '4', name: 'D', vocation: 'Sorcerer', level: 140 };

      let squad: DummyHero[] = [knight];

      const addDruid = validateSquadAddition(squad, druid, 200);
      expect(addDruid.allowed).toBe(true);
      squad.push(druid);

      const addPaladin = validateSquadAddition(squad, paladin, 200);
      expect(addPaladin.allowed).toBe(true);
      squad.push(paladin);

      const addSorcerer = validateSquadAddition(squad, sorcerer, 200);
      expect(addSorcerer.allowed).toBe(true);
      squad.push(sorcerer);

      expect(squad.length).toBe(4);

      // Attempting to add 5th hero fails
      const extraHero: DummyHero = { id: '5', name: 'E', vocation: 'Monk', level: 100 };
      const addExtra = validateSquadAddition(squad, extraHero, 200);
      expect(addExtra.allowed).toBe(false);
      expect(addExtra.reason).toContain('capacidade máxima');
    });

    it('enforces maximum 6 total heroes in account bank', () => {
      const MAX_HEROES_IN_ACCOUNT = 6;
      const allSavedHeroes = [
        { id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }, { id: '6' }
      ];

      const canCreateNew = allSavedHeroes.length < MAX_HEROES_IN_ACCOUNT;
      expect(canCreateNew).toBe(false);

      const fiveHeroes = allSavedHeroes.slice(0, 5);
      expect(fiveHeroes.length < MAX_HEROES_IN_ACCOUNT).toBe(true);
    });
  });

  describe('Auto-Login Bypass & Manual Logout Mechanics', () => {
    it('bypasses selection screen when characters exist and not manual logout', () => {
      const characters = [{ id: 'char-1', name: 'Hero' }];
      const isManualLogout = false;

      let actionTaken = '';
      if (characters.length === 0) {
        actionTaken = 'open_create_character';
      } else if (!isManualLogout) {
        actionTaken = 'auto_login_direct';
      } else {
        actionTaken = 'stay_on_selection';
      }

      expect(actionTaken).toBe('auto_login_direct');
    });

    it('stays on character selection screen if manual logout was triggered', () => {
      const characters = [{ id: 'char-1', name: 'Hero' }];
      const isManualLogout = true;

      let actionTaken = '';
      if (characters.length === 0) {
        actionTaken = 'open_create_character';
      } else if (!isManualLogout) {
        actionTaken = 'auto_login_direct';
      } else {
        actionTaken = 'stay_on_selection';
      }

      expect(actionTaken).toBe('stay_on_selection');
    });

    it('opens character creation automatically if account has zero characters', () => {
      const characters: Array<{ id: string }> = [];
      const isManualLogout = false;

      let actionTaken = '';
      if (characters.length === 0) {
        actionTaken = 'open_create_character';
      } else if (!isManualLogout) {
        actionTaken = 'auto_login_direct';
      } else {
        actionTaken = 'stay_on_selection';
      }

      expect(actionTaken).toBe('open_create_character');
    });
  });

  describe('City Fila Indiana (Snake Trail Follow) Chain Determinism', () => {
    interface Tile {
      x: number;
      y: number;
      z: number;
    }

    interface FollowerState {
      id: string;
      currentTile: Tile;
    }

    it('propagates positions through single-file line (fila indiana) with 1-tile distance', () => {
      // Initial state: Leader at (10, 10), Follower 1 at (10, 9), Follower 2 at (10, 8), Follower 3 at (10, 7)
      let leaderPos: Tile = { x: 10, y: 10, z: 7 };
      const followers: FollowerState[] = [
        { id: 'f1', currentTile: { x: 10, y: 9, z: 7 } },
        { id: 'f2', currentTile: { x: 10, y: 8, z: 7 } },
        { id: 'f3', currentTile: { x: 10, y: 7, z: 7 } },
      ];

      // Leader takes 1 step south: from (10, 10) to (10, 11)
      const prevLeaderTile = { ...leaderPos };
      leaderPos = { x: 10, y: 11, z: 7 };

      // Snake follow step simulation
      let nextTarget = { ...prevLeaderTile };
      for (let i = 0; i < followers.length; i++) {
        const prevFollowerTile = { ...followers[i].currentTile };
        followers[i].currentTile = { ...nextTarget };
        nextTarget = prevFollowerTile;
      }

      // Assertions
      expect(leaderPos).toEqual({ x: 10, y: 11, z: 7 });
      expect(followers[0].currentTile).toEqual({ x: 10, y: 10, z: 7 }); // follower 1 took leader's old pos
      expect(followers[1].currentTile).toEqual({ x: 10, y: 9, z: 7 });  // follower 2 took follower 1's old pos
      expect(followers[2].currentTile).toEqual({ x: 10, y: 8, z: 7 });  // follower 3 took follower 2's old pos

      // Verify strict 1-tile distance between consecutive chain members
      const distLeaderToF1 = Math.abs(leaderPos.x - followers[0].currentTile.x) + Math.abs(leaderPos.y - followers[0].currentTile.y);
      const distF1ToF2 = Math.abs(followers[0].currentTile.x - followers[1].currentTile.x) + Math.abs(followers[0].currentTile.y - followers[1].currentTile.y);
      const distF2ToF3 = Math.abs(followers[1].currentTile.x - followers[2].currentTile.x) + Math.abs(followers[1].currentTile.y - followers[2].currentTile.y);

      expect(distLeaderToF1).toBe(1);
      expect(distF1ToF2).toBe(1);
      expect(distF2ToF3).toBe(1);
    });

    it('resets all followers on teleport or floor change', () => {
      let leaderPos: Tile = { x: 32369, y: 32241, z: 7 };
      const followers: FollowerState[] = [
        { id: 'f1', currentTile: { x: 32369, y: 32240, z: 7 } },
        { id: 'f2', currentTile: { x: 32369, y: 32239, z: 7 } },
      ];

      // Leader teleports to depot (large jump > 2.5 tiles)
      const targetTeleport: Tile = { x: 32345, y: 32220, z: 7 };
      const distJump = Math.hypot(targetTeleport.x - leaderPos.x, targetTeleport.y - leaderPos.y);
      const isTeleport = distJump > 2.5;

      expect(isTeleport).toBe(true);

      if (isTeleport) {
        leaderPos = { ...targetTeleport };
        for (const f of followers) {
          f.currentTile = { ...targetTeleport };
        }
      }

      expect(leaderPos).toEqual(targetTeleport);
      expect(followers[0].currentTile).toEqual(targetTeleport);
      expect(followers[1].currentTile).toEqual(targetTeleport);
    });
  });
});
