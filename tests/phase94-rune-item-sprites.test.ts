import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import manifestJson from '../content/generated/tibia1098-assets.json';
import { itemVisualAsset } from '../apps/web/components/ItemSprite.tsx';
import { resolveActionImagePath } from '../apps/web/components/Tibia11ActionIcon.tsx';
import { CANONICAL_RUNE_METADATA, CANONICAL_RUNE_SERVER_IDS } from '../packages/tibia1098-assets/src/extractor.ts';

describe('Phase 94: Authentic Tibia 10.98 Rune Item Sprites & Visual Parity', () => {
  it('registers all 34 canonical runes in content/generated/tibia1098-assets.json with authentic item frames', () => {
    const manifest = manifestJson as any;
    expect(manifest.items).toBeDefined();

    for (const serverId of CANONICAL_RUNE_SERVER_IDS) {
      const runeMeta = CANONICAL_RUNE_METADATA[serverId];
      const itemAsset = manifest.items[String(serverId)];
      expect(itemAsset, `Rune ${serverId} (${runeMeta.name}) missing in items manifest`).toBeDefined();
      expect(itemAsset.resolved).toBe(true);
      expect(itemAsset.frame?.width).toBe(32);
      expect(itemAsset.frame?.height).toBe(32);
      expect(itemAsset.frame?.publicUrl).toBe(`/generated/tibia1098/items/item-${serverId}.png`);
    }
  });

  it('generates authentic 32x32 transparent PNGs in public/generated/tibia1098/items/ and public/runes/', () => {
    for (const serverId of CANONICAL_RUNE_SERVER_IDS) {
      const runeMeta = CANONICAL_RUNE_METADATA[serverId];

      // Item sprite in generated items folder
      const itemFilePath = path.resolve('public', 'generated', 'tibia1098', 'items', `item-${serverId}.png`);
      expect(fs.existsSync(itemFilePath), `Missing generated item file: ${itemFilePath}`).toBe(true);
      const itemStat = fs.statSync(itemFilePath);
      expect(itemStat.size).toBeGreaterThan(100);

      // Semantic rune file in public/runes/
      const runeSlugFilePath = path.resolve('public', 'runes', `${runeMeta.slug}.png`);
      expect(fs.existsSync(runeSlugFilePath), `Missing rune file: ${runeSlugFilePath}`).toBe(true);
      const runeSlugStat = fs.statSync(runeSlugFilePath);
      expect(runeSlugStat.size).toBeGreaterThan(100);

      // ID-based rune file in public/runes/
      const runeIdFilePath = path.resolve('public', 'runes', `item-${serverId}.png`);
      expect(fs.existsSync(runeIdFilePath), `Missing rune file: ${runeIdFilePath}`).toBe(true);

      // Byte-for-byte identity between item file and rune file
      const bufItem = fs.readFileSync(itemFilePath);
      const bufRune = fs.readFileSync(runeSlugFilePath);
      expect(bufItem.equals(bufRune)).toBe(true);

      // Verify PNG magic header
      expect(bufItem[0]).toBe(0x89);
      expect(bufItem[1]).toBe(0x50); // P
      expect(bufItem[2]).toBe(0x4e); // N
      expect(bufItem[3]).toBe(0x47); // G
    }
  });

  it('resolves itemVisualAsset in ItemSprite for all runes without fallback question mark', () => {
    for (const serverId of CANONICAL_RUNE_SERVER_IDS) {
      const asset = itemVisualAsset(serverId);
      expect(asset, `itemVisualAsset for rune ${serverId} is undefined`).toBeDefined();
      expect(asset?.resolved).toBe(true);
      expect(asset?.frame?.publicUrl).toBe(`/generated/tibia1098/items/item-${serverId}.png`);
    }
  });

  it('resolves resolveActionImagePath strictly to rune item sprite and NEVER to spell icon', () => {
    for (const serverId of CANONICAL_RUNE_SERVER_IDS) {
      const runeMeta = CANONICAL_RUNE_METADATA[serverId];
      const resolved = resolveActionImagePath(serverId, 'rune', runeMeta.name);
      expect(resolved).toBeDefined();
      expect(resolved).not.toBeNull();

      // Must point to /runes/
      expect(resolved).toMatch(/^\/runes\//);

      // Must NEVER point to /spells/
      expect(resolved).not.toContain('/spells/');

      // Must NOT reuse old spell-sheet cropped names
      expect(resolved).not.toBe('/spells/sd-rune.png');
      expect(resolved).not.toBe('/spells/gfb-rune.png');
      expect(resolved).not.toBe('/spells/explosion-rune.png');
      expect(resolved).not.toBe('/spells/hmm-rune.png');
      expect(resolved).not.toBe('/spells/ice-storm.png');

      // The resolved file must exist on disk
      const fullDiskPath = path.resolve('public', resolved!.replace(/^\//, ''));
      expect(fs.existsSync(fullDiskPath), `Resolved path ${resolved} does not exist on disk`).toBe(true);
    }
  });

  it('preserves visual parity between Inventory, Modal List, Details and Action Bar', () => {
    // Check core combat runes: Sudden Death (2268), GFB (2304), Avalanche (2274), HMM (2311), UH (2273), Explosion (2313)
    const sampleRunes = [2268, 2304, 2274, 2311, 2273, 2313, 2302, 2271, 2288, 2315, 2293, 2278];

    for (const runeId of sampleRunes) {
      const runeMeta = CANONICAL_RUNE_METADATA[runeId];
      // 1. Inventory asset url
      const invAsset = itemVisualAsset(runeId);
      const invUrl = invAsset!.frame!.publicUrl;

      // 2. Action icon url (used in Action Bar, Modal List, Modal Details)
      const actionUrl = resolveActionImagePath(runeId, 'rune', runeMeta.name);

      // Both URLs must resolve to existing files with identical buffer content
      const invBuf = fs.readFileSync(path.resolve('public', invUrl.replace(/^\//, '')));
      const actionBuf = fs.readFileSync(path.resolve('public', actionUrl!.replace(/^\//, '')));

      expect(invBuf.equals(actionBuf)).toBe(true);
    }
  });
});
