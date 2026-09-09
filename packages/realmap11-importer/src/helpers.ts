import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function getServerDataRoot(projectRoot: string = process.cwd()): string {
  const realmapPath = resolve(projectRoot, '..', 'realmap11');
  if (!existsSync(resolve(realmapPath, 'data'))) {
    throw new Error(`Mandatory realmap11 server data directory not found at ${resolve(realmapPath, 'data')}`);
  }
  return realmapPath;
}
