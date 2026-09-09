import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { BaseVocationName, StarterLoadoutCatalog, StarterLoadoutDefinition } from '../../content-schema/src/index.ts';
import { getServerDataRoot } from './helpers.ts';

interface ImportOptions { projectRoot?: string; write?: boolean }

const definitions: Array<{ id: number; vocation: BaseVocationName; hand: number }> = [
  { id: 1, vocation: 'Sorcerer', hand: 2190 },
  { id: 2, vocation: 'Druid', hand: 2182 },
  { id: 3, vocation: 'Paladin', hand: 2389 },
  { id: 4, vocation: 'Knight', hand: 8601 },
];

export async function importStarterLoadouts(options: ImportOptions = {}): Promise<StarterLoadoutCatalog> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const serverRoot = getServerDataRoot(projectRoot);

  const loadouts: StarterLoadoutDefinition[] = definitions.map(({ id, vocation, hand }) => ({
    vocation,
    equipped: { head: 2457, armor: 2463, legs: 2647, boots: 2643, leftHand: hand, rightHand: hand === 2389 ? null : 2525 },
    sourceFile: 'data/creaturescripts/scripts/custom/firstitems.lua',
    sourceVocationId: id,
    warnings: vocation === 'Paladin'
      ? ['The backpack bow/arrows are deferred; the directly granted spear is used for this slice.']
      : vocation === 'Knight'
        ? ['Backpack alternatives jagged sword and daramian mace are deferred.']
        : ['The real starter item is equipped for training identity.'],
  }));
  const catalog: StarterLoadoutCatalog = { importedAtBuildTime: true, loadouts };
  if (options.write !== false) {
    const outputPath = resolve(projectRoot, 'content', 'generated', 'starter-loadouts.json');
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  }
  return catalog;
}
