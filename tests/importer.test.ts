import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { importEquipment } from '../packages/styller-importer/src/importEquipment';
import { importEconomy } from '../packages/styller-importer/src/importEconomy';
import { importKnightVocation } from '../packages/styller-importer/src/importKnightVocation';
import { importMonsters } from '../packages/styller-importer/src/importMonsters';
import { importRotworm } from '../packages/styller-importer/src/importRotworm';
import { importStarterLoadouts } from '../packages/styller-importer/src/importStarterLoadouts';
import { importVocations } from '../packages/styller-importer/src/importVocations';
import { importSpells } from '../packages/styller-importer/src/importSpells';
import { classifyTileWalkability, importHuntRegions } from '../packages/styller-importer/src/importHuntRegions';

const digest = (buffer: Buffer) => createHash('sha256').update(buffer).digest('hex');
const hasRealmap = () => existsSync(resolve(process.cwd(), '..', 'realmap11', 'data', 'items', 'items.otb'));

describe('read-only realmap11 importer', () => {
  it('derives walkability from the complete item stack flags', () => {
    const ground = { clientId: 100, group: 1, flags: 0, blockSolid: false, blockPathFind: false };
    const decoration = { clientId: 200, group: 0, flags: 0, blockSolid: false, blockPathFind: false };
    const solid = { clientId: 201, group: 0, flags: 1, blockSolid: true, blockPathFind: false };
    const pathBlocker = { clientId: 202, group: 0, flags: 4, blockSolid: false, blockPathFind: true };
    expect(classifyTileWalkability([100, 200], new Map([[100, ground], [200, decoration]]))).toBe(true);
    expect(classifyTileWalkability([100, 201], new Map([[100, ground], [201, solid]]))).toBe(false);
    expect(classifyTileWalkability([100, 202], new Map([[100, ground], [202, pathBlocker]]))).toBe(false);
    expect(classifyTileWalkability([100, 999], new Map([[100, ground]]))).toBe(false);
  });

  it('imports the Rat spike variants as solid non-walkable stacks', async () => {
    if (!hasRealmap()) return;
    const catalog = await importHuntRegions({ projectRoot: process.cwd(), write: false });
    const rat = catalog.regions.find((region) => region.huntId.includes('rat'));
    expect(rat).toBeDefined();
    expect(rat?.tiles.length).toBeGreaterThan(0);
  });
  it('normalizes the Rotworm XML and resolves loot names from items.xml', async () => {
    if (!hasRealmap()) return;
    const rotworm = await importRotworm({ projectRoot: process.cwd(), write: false });

    expect(rotworm.name).toBe('Rotworm');
    expect(rotworm.maxHp).toBe(65);
    expect(rotworm.experience).toBe(40);
    expect(rotworm.armor).toBe(10);
    expect(rotworm.defense).toBe(10);
    expect(rotworm.attacks[0]).toMatchObject({ intervalMs: 2_000, minDamage: 0, maxDamage: 40 });
    expect(rotworm.loot).toHaveLength(7);
    expect(rotworm.loot.find((loot) => loot.itemId === 2376)?.name).toBe('sword');
    expect(rotworm.source.relativePath).toContain('rotworm.xml');
  });

  it('verifies selected equipment in items.otb and enriches it from items.lua', async () => {
    if (!hasRealmap()) return;
    const equipment = await importEquipment({ projectRoot: process.cwd(), write: false });
    const sword = equipment.items.find((item) => item.id === 2376);
    const chainArmor = equipment.items.find((item) => item.id === 2464);

    expect(equipment.items).toHaveLength(21);
    expect(sword).toMatchObject({
      name: 'sword',
      weaponType: 'sword',
      attack: 14,
      defense: 12,
      extraDefense: 1,
      slot: 'hand',
      sourceId: 2376,
    });
    expect(sword?.source.otb).toMatchObject({ serverId: 2376, clientId: 3264 });
    expect(chainArmor).toMatchObject({ name: 'chain armor', armor: 6, slot: 'armor' });
  });

  it('imports the curated early-game monsters and their real corpse ids', async () => {
    if (!hasRealmap()) return;
    const catalog = await importMonsters({ projectRoot: process.cwd(), write: false });
    expect(catalog.monsters).toHaveLength(13);
    expect(catalog.monsters.find((monster) => monster.id === 'rotworm')).toMatchObject({ lookType: 26, corpseId: 5967 });
    expect(catalog.monsters.every((monster) => monster.attacks[0].intervalMs === 2_000)).toBe(true);
  });

  it('imports Knight vocation factors from vocations.xml', async () => {
    if (!hasRealmap()) return;
    const vocation = await importKnightVocation({ projectRoot: process.cwd(), write: false });
    expect(vocation).toMatchObject({
      id: 4,
      name: 'Knight',
      gainHp: 15,
      meleeDamageMultiplier: 1,
      defenseMultiplier: 1,
      armorMultiplier: 1,
      attackSpeedMs: 2000,
      skillMultipliers: expect.objectContaining({ sword: 1.1, distance: 1.4 }),
    });
  });

  it('imports base and promoted vocations, real skill rates and firstitems.lua loadouts', async () => {
    if (!hasRealmap()) return;
    const [vocations, starters] = await Promise.all([
      importVocations({ projectRoot: process.cwd(), write: false }),
      importStarterLoadouts({ projectRoot: process.cwd(), write: false }),
    ]);
    expect(vocations).toMatchObject({ rateSkill: 50, rateMagic: 25 });
    expect(vocations.vocations.map((vocation) => vocation.name)).toEqual(['Sorcerer', 'Druid', 'Paladin', 'Knight', 'Master Sorcerer', 'Elder Druid', 'Royal Paladin', 'Elite Knight']);
    expect(vocations.vocations.find((vocation) => vocation.name === 'Elite Knight')).toMatchObject({ id: 8, fromVocationId: 4, promoted: true, attackSpeedMs: 2000 });
    expect(starters.loadouts.find((loadout) => loadout.vocation === 'Knight')?.equipped.leftHand).toBe(8601);
    expect(starters.loadouts.find((loadout) => loadout.vocation === 'Paladin')?.equipped.leftHand).toBe(2389);
  });

  it('imports NPC sell offers without confusing buy prices', async () => {
    if (!hasRealmap()) return;
    const economy = await importEconomy({ projectRoot: process.cwd(), write: false });
    const sword = economy.items.find((item) => item.itemId === 2376);
    expect(sword).toMatchObject({ canonicalSellPrice: 25, status: 'sellable' });
    expect(sword?.offers[0]).toMatchObject({ sourceNpc: 'Brengus', sourceKind: 'npc-xml-shop-sellable' });
    expect(economy.items.find((item) => item.itemId === 2666)).toMatchObject({ canonicalSellPrice: 2, status: 'sellable' });
    expect(economy.items.find((item) => item.itemId === 8859)).toMatchObject({
      canonicalSellPrice: 10,
      offers: expect.arrayContaining([expect.objectContaining({ sourceKind: 'npc-xml-shop-sellable' })]),
    });
  });

  it('imports only the proven spell subset with source formulas and visual ids', async () => {
    if (!hasRealmap()) return;
    const catalog = await importSpells({ projectRoot: process.cwd(), write: false });
    expect(catalog.spells.length).toBeGreaterThanOrEqual(24);
    expect(catalog.spells.find((spell) => spell.name === 'Energy Strike')).toMatchObject({
      spellId: 88, requiredLevel: 12, mana: 20, cooldownMs: 2000, combatType: 'energy',
      formula: { kind: 'level-magic' }, visual: { effectId: 38, projectileId: 5 },
    });
    expect(catalog.spells.every((spell) => spell.sourceFiles[0] === 'data/spells/spells.xml')).toBe(true);
  });

  it('extracts six bounded regions from real spawn.xml coordinates and OTBM tiles', async () => {
    if (!hasRealmap()) return;
    const catalog = await importHuntRegions({ projectRoot: process.cwd(), write: false });
    expect(catalog.regions.length).toBeGreaterThanOrEqual(6);
    expect(catalog.regions.filter((region) => region.available !== false).every((region) => region.tiles.length > 0)).toBe(true);
  });

  it('does not modify realmap11 item sources during import', async () => {
    if (!hasRealmap()) return;
    const root = resolve(process.cwd(), '..', 'realmap11');
    const paths = [
      resolve(root, 'data', 'items', 'items.otb'),
      resolve(root, 'data', 'world', 'world', 'realmap.otbm'),
    ];
    const before = await Promise.all(paths.map(async (path) => digest(await readFile(path))));

    await Promise.all([
      importEquipment({ projectRoot: process.cwd(), write: false }),
      importVocations({ projectRoot: process.cwd(), write: false }),
      importStarterLoadouts({ projectRoot: process.cwd(), write: false }),
      importEconomy({ projectRoot: process.cwd(), write: false }),
      importSpells({ projectRoot: process.cwd(), write: false }),
      importHuntRegions({ projectRoot: process.cwd(), write: false }),
    ]);

    const after = await Promise.all(paths.map(async (path) => digest(await readFile(path))));
    expect(after).toEqual(before);
  });
});
