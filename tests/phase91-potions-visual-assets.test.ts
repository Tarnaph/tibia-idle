import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import manifestJson from '../content/generated/tibia1098-assets.json';
import { itemVisualAsset } from '../apps/web/components/ItemSprite.tsx';
import { resolveActionImagePath } from '../apps/web/components/Tibia11ActionIcon.tsx';

describe('Phase 91: Authentic Tibia 10.98 Potion Sprites & Visual Assets', () => {
  const CANONICAL_POTIONS = [
    { id: 8704, name: 'small health potion', expectedClientId: 7876, actionIcon: '/potions/small-health-potion.png' },
    { id: 7618, name: 'health potion', expectedClientId: 266, actionIcon: '/potions/health-potion.png' },
    { id: 7588, name: 'strong health potion', expectedClientId: 236, actionIcon: '/potions/strong-health-potion.png' },
    { id: 7591, name: 'great health potion', expectedClientId: 239, actionIcon: '/potions/great-health-potion.png' },
    { id: 8473, name: 'ultimate health potion', expectedClientId: 7643, actionIcon: '/potions/ultimate-health-potion.png' },
    { id: 26031, name: 'supreme health potion', expectedClientId: 23375, actionIcon: '/potions/supreme-health-potion.png' },
    { id: 7620, name: 'mana potion', expectedClientId: 268, actionIcon: '/potions/mana-potion.png' },
    { id: 7589, name: 'strong mana potion', expectedClientId: 237, actionIcon: '/potions/strong-mana-potion.png' },
    { id: 7590, name: 'great mana potion', expectedClientId: 238, actionIcon: '/potions/great-mana-potion.png' },
    { id: 26029, name: 'ultimate mana potion', expectedClientId: 23373, actionIcon: '/potions/ultimate-mana-potion.png' },
    { id: 8472, name: 'great spirit potion', expectedClientId: 7642, actionIcon: '/potions/great-spirit-potion.png' },
    { id: 26030, name: 'ultimate spirit potion', expectedClientId: 23374, actionIcon: '/potions/ultimate-spirit-potion.png' },
    { id: 8474, name: 'antidote potion', expectedClientId: 7644, actionIcon: '/potions/antidote-potion.png' },
    { id: 7439, name: 'berserk potion', expectedClientId: 7439, actionIcon: '/potions/berserk-potion.png' },
    { id: 7440, name: 'mastermind potion', expectedClientId: 7440, actionIcon: '/potions/mastermind-potion.png' },
    { id: 7443, name: 'bullseye potion', expectedClientId: 7443, actionIcon: '/potions/bullseye-potion.png' },
    { id: 7634, name: 'empty potion flask (small)', expectedClientId: 283, actionIcon: '/potions/empty-potion-flask-small.png' },
    { id: 7635, name: 'empty potion flask (medium)', expectedClientId: 284, actionIcon: '/potions/empty-potion-flask-medium.png' },
    { id: 7636, name: 'empty potion flask (large)', expectedClientId: 285, actionIcon: '/potions/empty-potion-flask.png' },
  ];

  it('registers all canonical potions in content/generated/tibia1098-assets.json with authentic client IDs', () => {
    const manifest = manifestJson as any;
    expect(manifest.items).toBeDefined();

    for (const potion of CANONICAL_POTIONS) {
      const itemAsset = manifest.items[String(potion.id)];
      expect(itemAsset, `Potion ${potion.id} (${potion.name}) missing in items manifest`).toBeDefined();
      expect(itemAsset.resolved).toBe(true);
      expect(itemAsset.clientId).toBe(potion.expectedClientId);
      expect(itemAsset.frame?.width).toBe(32);
      expect(itemAsset.frame?.height).toBe(32);
    }
  });

  it('generates authentic 32x32 transparent PNGs in public/generated/tibia1098/items/', () => {
    for (const potion of CANONICAL_POTIONS) {
      const filePath = path.resolve('public', 'generated', 'tibia1098', 'items', `item-${potion.id}.png`);
      expect(fs.existsSync(filePath), `File missing: ${filePath}`).toBe(true);
      const stat = fs.statSync(filePath);
      expect(stat.size).toBeGreaterThan(100);

      // Verify PNG magic header
      const buf = fs.readFileSync(filePath);
      expect(buf[0]).toBe(0x89);
      expect(buf[1]).toBe(0x50); // P
      expect(buf[2]).toBe(0x4e); // N
      expect(buf[3]).toBe(0x47); // G
    }
  });

  it('populates public/potions/ with authentic 10.98 extracted sprites (identical to generated item sprites)', () => {
    for (const potion of CANONICAL_POTIONS) {
      const potionFilePath = path.resolve('public', potion.actionIcon.slice(1));
      const extractedFilePath = path.resolve('public', 'generated', 'tibia1098', 'items', `item-${potion.id}.png`);

      expect(fs.existsSync(potionFilePath), `Public potion missing: ${potionFilePath}`).toBe(true);
      const potionBuf = fs.readFileSync(potionFilePath);
      const extractedBuf = fs.readFileSync(extractedFilePath);

      // The potion icon must be identical byte-for-byte to the authentic Tibia 10.98 extracted sprite
      expect(potionBuf.equals(extractedBuf), `Potion file ${potion.actionIcon} differs from authentic 10.98 sprite`).toBe(true);
    }
  });

  it('resolves itemVisualAsset correctly for all potion items in ItemSprite component', () => {
    for (const potion of CANONICAL_POTIONS) {
      const asset = itemVisualAsset(potion.id);
      expect(asset, `itemVisualAsset(${potion.id}) returned undefined`).toBeDefined();
      expect(asset?.resolved).toBe(true);
      expect(asset?.frame?.publicUrl).toMatch(new RegExp(`^/generated/tibia1098/items/item-${potion.id}(?:-frame-\\d+)?\\.png$`));
    }
  });

  it('resolves action image paths accurately in resolveActionImagePath for hotbar and action bars', () => {
    for (const potion of CANONICAL_POTIONS) {
      const resolved = resolveActionImagePath(potion.id, 'potion', potion.name);
      expect(resolved).toBe(potion.actionIcon);
    }
  });
});
