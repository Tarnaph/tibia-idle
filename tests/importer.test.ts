import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { importEquipment } from '../packages/realmap11-importer/src/importEquipment';
import { importEconomy } from '../packages/realmap11-importer/src/importEconomy';
import { importMonsters } from '../packages/realmap11-importer/src/importMonsters';
import { importStarterLoadouts } from '../packages/realmap11-importer/src/importStarterLoadouts';
import { importVocations } from '../packages/realmap11-importer/src/importVocations';
import { importSpells } from '../packages/realmap11-importer/src/importSpells';
import { importHuntRegions } from '../packages/realmap11-importer/src/importHuntRegions';

const hasRealmap = () => existsSync(resolve(process.cwd(), '..', 'realmap11', 'data', 'items', 'items.otb'));

describe('read-only realmap11 importer', () => {
  it('imports curated monsters from realmap11 data', async () => {
    if (!hasRealmap()) return;
    const catalog = await importMonsters({ projectRoot: process.cwd(), write: false });
    expect(catalog.monsters).toHaveLength(13);
    expect(catalog.monsters.find((monster) => monster.id === 'rotworm')).toMatchObject({ lookType: 26, corpseId: 5967 });
    expect(catalog.monsters.every((monster) => monster.attacks[0].intervalMs === 2_000)).toBe(true);
  });

  it('imports Knight vocation factors from vocations.xml', async () => {
    if (!hasRealmap()) return;
    const catalog = await importVocations({ projectRoot: process.cwd(), write: false });
    const vocation = catalog.vocations.find((v) => v.name === 'Knight');
    expect(vocation).toMatchObject({
      id: 4,
      name: 'Knight',
      meleeDamageMultiplier: 1,
      defenseMultiplier: 1,
      armorMultiplier: 1,
      attackSpeedMs: 2000,
    });
  });

  it('imports base and promoted vocations and loadouts', async () => {
    if (!hasRealmap()) return;
    const [vocations, starters] = await Promise.all([
      importVocations({ projectRoot: process.cwd(), write: false }),
      importStarterLoadouts({ projectRoot: process.cwd(), write: false }),
    ]);
    expect(vocations.vocations.map((vocation) => vocation.name)).toEqual(['Sorcerer', 'Druid', 'Paladin', 'Knight', 'Master Sorcerer', 'Elder Druid', 'Royal Paladin', 'Elite Knight']);
    expect(vocations.vocations.find((vocation) => vocation.name === 'Elite Knight')).toMatchObject({ id: 8, fromVocationId: 4, promoted: true, attackSpeedMs: 2000 });
    expect(starters.loadouts.find((loadout) => loadout.vocation === 'Knight')?.equipped.leftHand).toBe(8601);
    expect(starters.loadouts.find((loadout) => loadout.vocation === 'Paladin')?.equipped.leftHand).toBe(2389);
  });

  it('imports spells from spells.xml', async () => {
    if (!hasRealmap()) return;
    const catalog = await importSpells({ projectRoot: process.cwd(), write: false });
    expect(catalog.spells.length).toBeGreaterThan(0);
  });

  it('imports hunt regions', async () => {
    if (!hasRealmap()) return;
    const catalog = await importHuntRegions({ projectRoot: process.cwd(), write: false });
    expect(catalog.regions.length).toBeGreaterThan(0);
  });
});
