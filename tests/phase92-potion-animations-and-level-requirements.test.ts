import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { HOTBAR_POTIONS, isHotbarActionUnlocked } from '../packages/domain/src/hotbarActions.ts';
import { encodeRgbaApng, generateSparkleApng } from '../packages/tibia1098-assets/src/png.ts';

function hasApngChunks(buffer: Buffer): { hasAcTL: boolean; hasFcTL: boolean; numFrames: number } {
  const hasAcTL = buffer.includes(Buffer.from('acTL'));
  const hasFcTL = buffer.includes(Buffer.from('fcTL'));
  let numFrames = 0;

  const acTLIndex = buffer.indexOf(Buffer.from('acTL'));
  if (acTLIndex !== -1 && acTLIndex + 8 <= buffer.length) {
    // In acTL chunk: 4 bytes length, 4 bytes chunk type 'acTL', then 4 bytes num_frames (big endian uint32)
    numFrames = buffer.readUInt32BE(acTLIndex + 4);
  }

  return { hasAcTL, hasFcTL, numFrames };
}

describe('Phase 92: Potion Animations (APNG) & Level Requirements', () => {
  describe('1. Potion Animations (APNG)', () => {
    const HIGH_TIER_POTION_IDS = [8473, 26031, 26029, 26030];
    const HIGH_TIER_POTION_FILENAMES = [
      'ultimate-health-potion.png',
      'supreme-health-potion.png',
      'ultimate-mana-potion.png',
      'ultimate-spirit-potion.png',
    ];

    const ALL_POTION_FILENAMES = [
      'small-health-potion.png',
      'health-potion.png',
      'strong-health-potion.png',
      'great-health-potion.png',
      'ultimate-health-potion.png',
      'supreme-health-potion.png',
      'mana-potion.png',
      'strong-mana-potion.png',
      'great-mana-potion.png',
      'ultimate-mana-potion.png',
      'great-spirit-potion.png',
      'ultimate-spirit-potion.png',
      'antidote-potion.png',
      'berserk-potion.png',
      'mastermind-potion.png',
      'bullseye-potion.png',
      'empty-potion-flask-small.png',
      'empty-potion-flask-medium.png',
      'empty-potion-flask.png',
    ];

    it('creates valid APNG animations with acTL chunk in public/potions/', () => {
      for (const filename of ALL_POTION_FILENAMES) {
        const filePath = path.resolve('public', 'potions', filename);
        expect(fs.existsSync(filePath), `Missing public potion: ${filePath}`).toBe(true);
        const buf = fs.readFileSync(filePath);

        const { hasAcTL, hasFcTL, numFrames } = hasApngChunks(buf);
        expect(hasAcTL, `Potion ${filename} missing acTL chunk`).toBe(true);
        expect(hasFcTL, `Potion ${filename} missing fcTL chunk`).toBe(true);
        expect(numFrames, `Potion ${filename} has invalid frame count`).toBeGreaterThanOrEqual(1);
      }
    });

    it('provides authentic 12-frame animations for high-tier potions', () => {
      for (const filename of HIGH_TIER_POTION_FILENAMES) {
        const filePath = path.resolve('public', 'potions', filename);
        const buf = fs.readFileSync(filePath);
        const { numFrames } = hasApngChunks(buf);
        expect(numFrames, `High-tier potion ${filename} should have 12 animated frames`).toBe(12);
      }

      for (const serverId of HIGH_TIER_POTION_IDS) {
        const filePath = path.resolve('public', 'generated', 'tibia1098', 'items', `item-${serverId}.png`);
        const buf = fs.readFileSync(filePath);
        const { numFrames } = hasApngChunks(buf);
        expect(numFrames, `Item sprite item-${serverId}.png should have 12 animated frames`).toBe(12);
      }
    });

    it('encodeRgbaApng and generateSparkleApng utilities produce valid APNGs', () => {
      const dummyRgba = Buffer.alloc(32 * 32 * 4);
      // Put a colored pixel in center
      const centerIdx = (16 * 32 + 16) * 4;
      dummyRgba[centerIdx] = 200;
      dummyRgba[centerIdx + 1] = 50;
      dummyRgba[centerIdx + 2] = 50;
      dummyRgba[centerIdx + 3] = 255;

      const animatedBuf = generateSparkleApng(32, 32, dummyRgba, 100);
      const { hasAcTL, hasFcTL, numFrames } = hasApngChunks(animatedBuf);
      expect(hasAcTL).toBe(true);
      expect(hasFcTL).toBe(true);
      expect(numFrames).toBe(12);

      const multiFrameBuf = encodeRgbaApng(32, 32, [dummyRgba, dummyRgba], 150);
      const multiInfo = hasApngChunks(multiFrameBuf);
      expect(multiInfo.hasAcTL).toBe(true);
      expect(multiInfo.hasFcTL).toBe(true);
      expect(multiInfo.numFrames).toBe(2);
    });
  });

  describe('2. Canonical Level Requirements & Action Unlocking', () => {
    it('defines canonical requiredLevel on all hotbar potions', () => {
      const levelMap: Record<number, number> = {
        8704: 1,   // Small Health Potion
        7618: 1,   // Health Potion
        7588: 50,  // Strong Health Potion
        7591: 80,  // Great Health Potion
        8473: 130, // Ultimate Health Potion
        26031: 200,// Supreme Health Potion
        7620: 1,   // Mana Potion
        7589: 50,  // Strong Mana Potion
        7590: 80,  // Great Mana Potion
        26029: 130,// Ultimate Mana Potion
        8472: 80,  // Great Spirit Potion
        26030: 130,// Ultimate Spirit Potion
        8474: 1,   // Antidote Potion
        7439: 1,   // Berserk Potion
        7440: 1,   // Mastermind Potion
        7443: 1,   // Bullseye Potion
      };

      for (const [idStr, expectedLevel] of Object.entries(levelMap)) {
        const id = Number(idStr);
        const potion = HOTBAR_POTIONS.find((p) => p.id === id);
        expect(potion, `Potion ${id} not found in HOTBAR_POTIONS`).toBeDefined();
        expect(potion?.requiredLevel, `Potion ${potion?.name} (${id}) requiredLevel mismatch`).toBe(expectedLevel);
      }
    });

    it('correctly locks and unlocks potions according to character level via isHotbarActionUnlocked', () => {
      const knight = { level: 1, vocation: 'Knight' } as any;
      const midKnight = { level: 60, vocation: 'Knight' } as any;
      const highKnight = { level: 100, vocation: 'Knight' } as any;
      const masterKnight = { level: 150, vocation: 'Elite Knight' } as any;
      const endKnight = { level: 250, vocation: 'Elite Knight' } as any;

      const getPotionItem = (id: number) => {
        const potion = HOTBAR_POTIONS.find((p) => p.id === id)!;
        return { kind: 'potion' as const, potion };
      };

      // Level 1: Health Potion unlocked, Strong Health Potion locked
      expect(isHotbarActionUnlocked(knight, getPotionItem(7618))).toBe(true);
      expect(isHotbarActionUnlocked(knight, getPotionItem(7588))).toBe(false);
      expect(isHotbarActionUnlocked(knight, getPotionItem(7591))).toBe(false);
      expect(isHotbarActionUnlocked(knight, getPotionItem(8473))).toBe(false);
      expect(isHotbarActionUnlocked(knight, getPotionItem(26031))).toBe(false);

      // Level 60: Strong Health Potion unlocked, Great Health locked
      expect(isHotbarActionUnlocked(midKnight, getPotionItem(7588))).toBe(true);
      expect(isHotbarActionUnlocked(midKnight, getPotionItem(7591))).toBe(false);

      // Level 100: Great Health unlocked, Ultimate Health locked
      expect(isHotbarActionUnlocked(highKnight, getPotionItem(7591))).toBe(true);
      expect(isHotbarActionUnlocked(highKnight, getPotionItem(8473))).toBe(false);

      // Level 150: Ultimate Health unlocked, Supreme Health locked
      expect(isHotbarActionUnlocked(masterKnight, getPotionItem(8473))).toBe(true);
      expect(isHotbarActionUnlocked(masterKnight, getPotionItem(26031))).toBe(false);

      // Level 250: Supreme Health unlocked
      expect(isHotbarActionUnlocked(endKnight, getPotionItem(26031))).toBe(true);
    });

    it('enforces vocation restrictions in addition to level requirements', () => {
      const sorcerer = { level: 100, vocation: 'Sorcerer' } as any;
      const getPotionItem = (id: number) => {
        const potion = HOTBAR_POTIONS.find((p) => p.id === id)!;
        return { kind: 'potion' as const, potion };
      };

      // Great Health Potion (id 7591) requires Knight or Paladin
      expect(isHotbarActionUnlocked(sorcerer, getPotionItem(7591))).toBe(false);

      // Great Mana Potion (id 7590) requires Sorcerer, Druid, or Paladin
      expect(isHotbarActionUnlocked(sorcerer, getPotionItem(7590))).toBe(true);
    });
  });

  describe('3. Hotbar Configuration Modal Potion UI', () => {
    it('does not display quantity badges on potion cards in HotbarConfigModal', () => {
      const modalSource = fs.readFileSync(path.resolve('apps', 'web', 'components', 'HotbarConfigModal.tsx'), 'utf-8');

      // The previous badge variable and hotbar-potion-badge class must be absent
      expect(modalSource).not.toContain('hotbar-potion-badge');
      expect(modalSource).not.toMatch(/badge\s*=\s*(?:'50'|'108'|'225')/);

      // Level lock handling must be present
      expect(modalSource).toContain('potion.requiredLevel ?? 0');
      expect(modalSource).toContain('handleSelect(potion.id, isLocked)');
      expect(modalSource).toContain('Requer Lv');
    });
  });
});
