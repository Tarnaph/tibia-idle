import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { BaseVocationName, StarterLoadoutCatalog, StarterLoadoutDefinition } from '../../content-schema/src/index.ts';

interface ImportOptions { projectRoot?: string; write?: boolean }

const definitions: Array<{ id: number; vocation: BaseVocationName; hand: number }> = [
  { id: 1, vocation: 'Sorcerer', hand: 2190 },
  { id: 2, vocation: 'Druid', hand: 2182 },
  { id: 3, vocation: 'Paladin', hand: 2389 },
  { id: 4, vocation: 'Knight', hand: 8601 },
];

export async function importStarterLoadouts(options: ImportOptions = {}): Promise<StarterLoadoutCatalog> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const sourcePath = resolve(projectRoot, '..', 'styller-master', 'data', 'creaturescripts', 'scripts', 'custom', 'firstitems.lua');
  const source = await readFile(sourcePath, 'utf8');
  const commonIds = [2457, 2463, 2647, 2525, 2643];
  for (const itemId of [...commonIds, ...definitions.map((entry) => entry.hand)]) {
    if (!new RegExp(`\\{${itemId},\\s*1\\}`).test(source)) throw new Error(`Starter item ${itemId} was not found in firstitems.lua.`);
  }
  const loadouts: StarterLoadoutDefinition[] = definitions.map(({ id, vocation, hand }) => ({
    vocation,
    equipped: { head: 2457, armor: 2463, legs: 2647, boots: 2643, leftHand: hand, rightHand: hand === 2389 ? null : 2525 },
    sourceFile: 'data/creaturescripts/scripts/custom/firstitems.lua',
    sourceVocationId: id,
    warnings: vocation === 'Paladin'
      ? ['The firstitems.lua backpack bow/arrows are deferred; the directly granted spear is used for this slice.']
      : vocation === 'Knight'
        ? ['Backpack alternatives jagged sword and daramian mace are deferred.']
        : ['Complex wand/rod spell damage is deferred; the real starter item is equipped for training identity only.'],
  }));
  const catalog: StarterLoadoutCatalog = { importedAtBuildTime: true, loadouts };
  if (options.write !== false) {
    const outputPath = resolve(projectRoot, 'content', 'generated', 'starter-loadouts.json');
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  }
  return catalog;
}
