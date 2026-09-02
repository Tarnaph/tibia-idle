import type { VocationDefinition } from '../../content-schema/src/index.ts';
import { importVocations } from './importVocations.ts';

interface ImportOptions { projectRoot?: string; write?: boolean }

export async function importKnightVocation(options: ImportOptions = {}): Promise<VocationDefinition> {
  const catalog = await importVocations(options);
  const knight = catalog.vocations.find((vocation) => vocation.name === 'Knight');
  if (!knight) throw new Error('Knight vocation id 4 was not found.');
  return knight;
}
