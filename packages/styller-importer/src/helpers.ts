import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function getServerDataRoot(projectRoot: string = process.cwd()): string {
  const realmapPath = resolve(projectRoot, '..', 'realmap11');
  if (existsSync(resolve(realmapPath, 'data'))) {
    return realmapPath;
  }
  const styllerPath = resolve(projectRoot, '..', 'styller-master');
  if (existsSync(resolve(styllerPath, 'data'))) {
    return styllerPath;
  }
  return realmapPath;
}
