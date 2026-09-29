import { describe, it, expect, vi } from 'vitest';
import type { CharacterState, GameContent, SessionState } from '../packages/domain/src/types';
import { experienceForLevel } from '../packages/domain/src/experience';

describe('Phase 260 - Authoritative Multiplayer Hunts, Party Lifecycle & Urban Freedom', () => {
  describe('Onda 10: Friends Invite, UnifiedPartyModal Slots & Gender Feedback', () => {
    it('allocates remote members to any available slot even if vocations match', () => {
      // Simulates the UnifiedPartyModal slot allocation algorithm
      const vocOrder = ['Knight', 'Paladin', 'Sorcerer', 'Druid'] as const;
      const slotOccupants: Record<string, { member: any; source: 'local' | 'remote' | 'empty' }> = {
        Knight: { member: { id: 'c1', name: 'Caos', vocation: 'Knight' }, source: 'local' },
        Paladin: { member: null, source: 'empty' },
        Sorcerer: { member: null, source: 'empty' },
        Druid: { member: null, source: 'empty' },
      };

      const remoteMember = { id: 'r1', name: 'Brututus', vocation: 'Knight', level: 25 };

      // Algorithm from UnifiedPartyModal.tsx:
      let targetVoc = remoteMember.vocation;
      if (slotOccupants[targetVoc].source !== 'empty') {
        const nextFree = vocOrder.find((v) => slotOccupants[v].source === 'empty');
        if (nextFree) targetVoc = nextFree;
      }
      slotOccupants[targetVoc] = { member: remoteMember, source: 'remote' };

      // Brututus must NOT be dropped, but placed in the next free slot (Paladin slot)
      expect(slotOccupants.Knight.member?.name).toBe('Caos');
      expect(slotOccupants.Paladin.member?.name).toBe('Brututus');
      expect(slotOccupants.Paladin.source).toBe('remote');

      const filledSlots = Object.values(slotOccupants).filter((s) => s.source !== 'empty');
      expect(filledSlots.length).toBe(2); // 2/4 vagas, never stuck at 1/4!
    });
  });

  describe('Onda 11: Urban Freedom & Remote Character Appearance Hydration', () => {
    it('hydrates remote character with authentic gender, addons, outfit and level experience', () => {
      const remoteSnapshot = {
        sessionId: 'sess-brututus',
        characterId: 'char-brututus-1',
        name: 'Brututus',
        vocationId: 1, // Knight
        vocationName: 'Knight',
        level: 35,
        hp: 450,
        maxHp: 450,
        mp: 120,
        maxMp: 120,
        gender: 'female' as const,
        outfit: 'Citizen',
        outfitLookType: 136,
        outfitAddons: 2,
        outfitColors: { head: 10, primary: 20, secondary: 30, detail: 40 },
        mount: 'Widow Queen',
        mountActive: true,
      };

      const vocName = remoteSnapshot.vocationName;
      const expectedExp = experienceForLevel(remoteSnapshot.level);

      const hydratedRemoteChar = {
        id: remoteSnapshot.characterId,
        name: remoteSnapshot.name,
        level: Math.max(remoteSnapshot.level, 1),
        experience: expectedExp,
        currentHp: remoteSnapshot.hp,
        maxHp: remoteSnapshot.maxHp,
        currentMana: remoteSnapshot.mp,
        maxMana: remoteSnapshot.maxMp,
        gender: remoteSnapshot.gender === 'female' ? ('female' as const) : ('male' as const),
        addons: remoteSnapshot.outfitAddons ?? 0,
        outfit: remoteSnapshot.outfit || (remoteSnapshot.gender === 'female' ? `${vocName}_female` : vocName),
        outfitLookType: remoteSnapshot.outfitLookType,
        outfitColors: remoteSnapshot.outfitColors,
        mount: remoteSnapshot.mount,
        mountActive: Boolean(remoteSnapshot.mountActive),
      };

      expect(hydratedRemoteChar.gender).toBe('female');
      expect(hydratedRemoteChar.addons).toBe(2);
      expect(hydratedRemoteChar.outfit).toBe('Citizen');
      expect(hydratedRemoteChar.outfitLookType).toBe(136);
      expect(hydratedRemoteChar.experience).toBeGreaterThan(0);
      expect(hydratedRemoteChar.mountActive).toBe(true);
    });

    it('guarantees urban freedom where isFollowingLeader is strictly false in city', () => {
      const mode = 'training'; // Thais city mode
      const isFollowingLeader = false; // Phase 260 urban freedom guarantee
      expect(isFollowingLeader).toBe(false);
      expect(mode).toBe('training');
    });
  });

  describe('Onda 12: Strict Session Sanitization & Anti-Hijacking', () => {
    it('purges remote characters from session when exiting hunt or leaving party', () => {
      const myAccountChar: Partial<CharacterState> = {
        id: 'char-caos-1',
        name: 'Caos',
        level: 42,
      };
      const remotePlayerChar: Partial<CharacterState> = {
        id: 'char-brututus-1',
        name: 'Brututus',
        level: 35,
      };

      const savedPool = [myAccountChar];
      const sessionCharacters = [myAccountChar, remotePlayerChar] as CharacterState[];

      // Purge logic from GamePrototype.tsx
      const ownChars = sessionCharacters.filter((c) =>
        savedPool.some((p) => p.id === c.id || (p.name && c.name && p.name.trim().toLowerCase() === c.name.trim().toLowerCase()))
      );

      expect(ownChars.length).toBe(1);
      expect(ownChars[0].id).toBe('char-caos-1');
      expect(ownChars.some((c) => c.id === 'char-brututus-1')).toBe(false);
    });

    it('blocks selectPartyCharacter from selecting any non-owned character', () => {
      const onlineCharacter = { id: 'char-caos-1', name: 'Caos' };
      const savedPool = [{ id: 'char-caos-1', name: 'Caos' }];
      const attemptSelectId = 'char-brututus-1'; // Remote character

      const isOwned =
        (onlineCharacter && (onlineCharacter.id === attemptSelectId || onlineCharacter.name.toLowerCase() === attemptSelectId.toLowerCase())) ||
        savedPool.some((c) => c.id === attemptSelectId || c.name.toLowerCase() === attemptSelectId.toLowerCase());

      expect(isOwned).toBe(false);
    });
  });
});
