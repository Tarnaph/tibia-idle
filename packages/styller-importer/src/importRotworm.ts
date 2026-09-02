import type { MonsterDefinition } from '../../content-schema/src/index.ts';
import { importMonsters } from './importMonsters.ts';

interface ImportOptions {
  projectRoot?: string;
  write?: boolean;
}

export async function importRotworm(options: ImportOptions = {}): Promise<MonsterDefinition> {
  const catalog = await importMonsters(options);
  const rotworm = catalog.monsters.find((monster) => monster.id === 'rotworm');
  if (!rotworm) throw new Error('Rotworm is missing from the selected catalog.');
  return rotworm;
}
