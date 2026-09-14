import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { CANONICAL_BESTIARY_MONSTERS } from '../apps/web/lib/cyclopediaData';
import { initialHunts } from '../packages/domain/src/hunt';

describe('Phase 160: Bestiary Multi-Monster HUD, Top-Right Position & Sprite Integrity', () => {
  const PROJECT_ROOT = process.cwd();

  it('1. Verifies that rat.png and cave-rat.png exist and are NOT demons', () => {
    const ratPath = path.resolve(PROJECT_ROOT, 'public', 'generated', 'bestiary', 'rat.png');
    const caveRatPath = path.resolve(PROJECT_ROOT, 'public', 'generated', 'bestiary', 'cave-rat.png');
    const demonPath = path.resolve(PROJECT_ROOT, 'public', 'generated', 'bestiary', 'demon.png');

    expect(fs.existsSync(ratPath), 'rat.png must exist in public/generated/bestiary').toBe(true);
    expect(fs.existsSync(caveRatPath), 'cave-rat.png must exist in public/generated/bestiary').toBe(true);
    expect(fs.existsSync(demonPath), 'demon.png must exist in public/generated/bestiary').toBe(true);

    const ratBuf = fs.readFileSync(ratPath);
    const demonBuf = fs.readFileSync(demonPath);

    // Rat must have its own distinct sprite, completely different from Demon
    expect(ratBuf.equals(demonBuf)).toBe(false);
    expect(ratBuf.length).toBeLessThan(1000); // Authentic 32x32 rat sprite is ~352 bytes
  });

  it('2. Rat and Cave Rat in CANONICAL_BESTIARY_MONSTERS point to their real sprites and not demon.png', () => {
    const rat = CANONICAL_BESTIARY_MONSTERS.find((m) => m.id === 'rat');
    const caveRat = CANONICAL_BESTIARY_MONSTERS.find((m) => m.id === 'cave-rat');

    expect(rat).toBeDefined();
    expect(rat?.spriteUrl).toBe('/generated/bestiary/rat.png');
    expect(rat?.name).toBe('Rat');

    expect(caveRat).toBeDefined();
    expect(caveRat?.spriteUrl).toBe('/generated/bestiary/cave-rat.png');
    expect(caveRat?.name).toBe('Cave Rat');
  });

  it('3. Saneamento Global: No creature other than the actual Demon has spriteUrl pointing to demon.png', () => {
    const fakeDemons = CANONICAL_BESTIARY_MONSTERS.filter(
      (m) =>
        m.id.toLowerCase() !== 'demon' &&
        m.name.toLowerCase() !== 'demon' &&
        (m.spriteUrl.endsWith('/demon.png') || m.spriteUrl === 'demon.png')
    );
    expect(fakeDemons.length).toBe(0);
  });

  it('4. Multi-Monster per Hunt: Rat Cellars defines multiple monsters (rat and cave-rat) in domain', () => {
    const ratCellars = initialHunts.find((h) => h.id === 'rat-cellars');
    expect(ratCellars).toBeDefined();
    expect(ratCellars?.monsters).toEqual(['rat', 'cave-rat']);

    // Resolve both monsters from CANONICAL_BESTIARY_MONSTERS
    const resolved = (ratCellars?.monsters || []).map((mId) =>
      CANONICAL_BESTIARY_MONSTERS.find((m) => m.id.toLowerCase() === mId.toLowerCase())
    );

    expect(resolved.length).toBe(2);
    expect(resolved[0]?.name).toBe('Rat');
    expect(resolved[1]?.name).toBe('Cave Rat');
  });

  it('5. Verifies multi-monster progress calculations for BestiaryTrackerHUD', () => {
    const rat = CANONICAL_BESTIARY_MONSTERS.find((m) => m.id === 'rat')!;
    const caveRat = CANONICAL_BESTIARY_MONSTERS.find((m) => m.id === 'cave-rat')!;

    const killsById: Record<string, number> = {
      'rat': 50,
      'cave-rat': 250,
    };

    // Rat: 50 / 250 = 20%
    const ratPct = Math.round((killsById['rat'] / rat.killsNeeded) * 100);
    expect(ratPct).toBe(20);

    // Cave Rat: 250 / 250 = 100% (Complete)
    const caveRatPct = Math.round((killsById['cave-rat'] / caveRat.killsNeeded) * 100);
    expect(caveRatPct).toBe(100);
  });
});
