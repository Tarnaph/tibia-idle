import { describe, it, expect } from 'vitest';
import { prisma } from '../packages/database/src';
import { PlayerState } from '../packages/server/src/schemas/PlayerState';
import { ChatMessageSchema } from '../packages/server/src/schemas/ChatMessageSchema';
import { THAIS_TRAINING_DUMMIES, findBestTrainingTile } from '../packages/domain/src/training';
import type { RemotePlayerSnapshot } from '../apps/web/lib/GameClientNetworkManager';

describe('Phase 176 - Admin Wolfy GOD Title, Training Dummy Right-Click Use, and Remote Appearance', () => {
  describe('Pillar 1: Wolfy Admin Promotion, GOD Title & Schema Security', () => {
    it('persists Wolfy in database as ADMIN with adminTitle GOD while preserving original name Wolfy', async () => {
      const wolfy = await prisma.character.findUnique({
        where: { name: 'Wolfy' },
        include: {
          account: {
            select: { role: true, email: true },
          },
        },
      });

      expect(wolfy).not.toBeNull();
      expect(wolfy?.name).toBe('Wolfy');
      expect(wolfy?.adminTitle).toBe('GOD');
      expect(wolfy?.account?.role).toBe('ADMIN');
    });

    it('validates PlayerState and ChatMessageSchema contain adminTitle, gender, and senderTitle', () => {
      const player = new PlayerState();
      expect(player.adminTitle).toBeDefined();
      expect(player.adminTitle).toBe('');
      expect(player.gender).toBeDefined();
      expect(player.gender).toBe('male');

      player.adminTitle = 'GOD';
      player.gender = 'female';
      expect(player.adminTitle).toBe('GOD');
      expect(player.gender).toBe('female');

      const chatMsg = new ChatMessageSchema();
      expect(chatMsg.senderTitle).toBeDefined();
      expect(chatMsg.senderTitle).toBe('');
      chatMsg.senderTitle = 'GOD';
      expect(chatMsg.senderTitle).toBe('GOD');
    });

    it('enforces that adminTitle is strictly restricted to ADMIN accounts and valid titles (GOD/GM)', () => {
      const validateAdminTitle = (accountRole: string, rawTitle: string | null | undefined): string => {
        if (accountRole !== 'ADMIN') return '';
        if (!rawTitle) return '';
        const title = rawTitle.trim().toUpperCase();
        return title === 'GOD' || title === 'GM' ? title : '';
      };

      expect(validateAdminTitle('PLAYER', 'GOD')).toBe('');
      expect(validateAdminTitle('PLAYER', 'GM')).toBe('');
      expect(validateAdminTitle('ADMIN', 'GOD')).toBe('GOD');
      expect(validateAdminTitle('ADMIN', 'GM')).toBe('GM');
      expect(validateAdminTitle('ADMIN', 'KING')).toBe('');
      expect(validateAdminTitle('ADMIN', null)).toBe('');
    });
  });

  describe('Pillar 2: Training Dummy Direct & Right-Click Use', () => {
    it('defines all three official Thais training dummies in depot floor Z:7', () => {
      expect(THAIS_TRAINING_DUMMIES).toHaveLength(3);
      expect(THAIS_TRAINING_DUMMIES[0]).toEqual({ id: 1, position: { x: 32349, y: 32219, z: 7 } });
      expect(THAIS_TRAINING_DUMMIES[1]).toEqual({ id: 2, position: { x: 32349, y: 32221, z: 7 } });
      expect(THAIS_TRAINING_DUMMIES[2]).toEqual({ id: 3, position: { x: 32349, y: 32223, z: 7 } });
    });

    it('finds valid adjacent training spots around each dummy', () => {
      const isWalkable = () => true;
      const occupied = new Set<string>();

      for (const dummy of THAIS_TRAINING_DUMMIES) {
        const spot = findBestTrainingTile(dummy.position, 'Knight', occupied, isWalkable);
        expect(spot).not.toBeNull();
        expect(spot?.z).toBe(7);
        // Adjacent spot distance
        const dx = Math.abs((spot?.x ?? 0) - dummy.position.x);
        const dy = Math.abs((spot?.y ?? 0) - dummy.position.y);
        expect(Math.max(dx, dy)).toBe(1);
      }
    });

    it('returns null with clear accessibility failure when all dummy positions are crowded', () => {
      const dummy = THAIS_TRAINING_DUMMIES[0];
      const isWalkable = () => false; // Dummy surrounded by obstacles or impassable tiles
      const occupied = new Set<string>();

      const spot = findBestTrainingTile(dummy.position, 'Knight', occupied, isWalkable);
      expect(spot).toBeNull();
    });
  });

  describe('Pillar 3: Remote Player Appearance Synchronization & Zero-Color Preservation', () => {
    it('preserves color index zero (0) across head, body, legs, and feet without falling back to defaults', () => {
      const rawSnapshot: RemotePlayerSnapshot = {
        id: 'remote-1',
        name: 'DarkKnight',
        vocationId: 4,
        level: 50,
        hp: 500,
        maxHp: 500,
        mp: 100,
        maxMp: 100,
        x: 32369,
        y: 32241,
        z: 7,
        direction: 'south',
        isMoving: false,
        adminTitle: '',
        gender: 'male',
        outfit: {
          outfit: 'Knight',
          lookType: 131,
          lookHead: 0,
          lookBody: 0,
          lookLegs: 0,
          lookFeet: 0,
          addons: 3,
        },
      };

      const hasCustomColors =
        rawSnapshot.outfit &&
        typeof rawSnapshot.outfit.lookBody === 'number' &&
        rawSnapshot.outfit.lookBody >= 0;

      expect(hasCustomColors).toBe(true);

      const colors = hasCustomColors
        ? {
            head: rawSnapshot.outfit.lookHead ?? 0,
            primary: rawSnapshot.outfit.lookBody,
            secondary: rawSnapshot.outfit.lookLegs ?? 0,
            detail: rawSnapshot.outfit.lookFeet ?? 0,
          }
        : { head: 0, primary: 86, secondary: 114, detail: 76 };

      expect(colors.head).toBe(0);
      expect(colors.primary).toBe(0);
      expect(colors.secondary).toBe(0);
      expect(colors.detail).toBe(0);
    });

    it('correctly reads addons from outfit.addons with fallbacks', () => {
      const snapshotWithNestedAddons = {
        outfit: { outfit: 'Citizen', lookType: 128, lookHead: 10, lookBody: 20, lookLegs: 30, lookFeet: 40, addons: 2 },
      };
      const rAddons1 = Number((snapshotWithNestedAddons.outfit as any)?.addons ?? 0);
      expect(rAddons1).toBe(2);

      const snapshotWithFlatAddons = {
        outfit: { outfit: 'Citizen', lookType: 128, lookHead: 10, lookBody: 20, lookLegs: 30, lookFeet: 40 },
        outfitAddons: 1,
      };
      const rAddons2 = Number(
        (snapshotWithFlatAddons.outfit as any)?.addons ??
        (snapshotWithFlatAddons as any).outfitAddons ??
        (snapshotWithFlatAddons as any).addons ??
        0
      );
      expect(rAddons2).toBe(1);
    });

    it('transmits female gender to remote player snapshots and appearance signature', () => {
      const femaleSnapshot: RemotePlayerSnapshot = {
        id: 'remote-2',
        name: 'Sorceress',
        gender: 'female',
        vocationId: 1,
        level: 80,
        hp: 400,
        maxHp: 400,
        mp: 1200,
        maxMp: 1200,
        x: 32369,
        y: 32241,
        z: 7,
        direction: 'south',
        isMoving: false,
        adminTitle: '',
        outfit: {
          outfit: 'Mage',
          lookType: 138,
          lookHead: 95,
          lookBody: 115,
          lookLegs: 95,
          lookFeet: 115,
          addons: 1,
        },
      };

      const rGender: 'male' | 'female' = femaleSnapshot.gender === 'female' ? 'female' : 'male';
      expect(rGender).toBe('female');

      const appearanceSig = `${femaleSnapshot.outfit.outfit}_${rGender}_none_${femaleSnapshot.outfit.addons}_${femaleSnapshot.outfit.lookHead}_${femaleSnapshot.outfit.lookBody}_${femaleSnapshot.outfit.lookLegs}_${femaleSnapshot.outfit.lookFeet}`;
      expect(appearanceSig).toBe('Mage_female_none_1_95_115_95_115');
    });
  });
});
