import fs from 'node:fs';

const weaponsXml = fs.readFileSync('realmap11/data/weapons/weapons.xml', 'utf8');
const itemsXml = fs.readFileSync('realmap11/data/items/items.xml', 'utf8');

const wandRegex = /<wand\s+id="(\d+)"\s+level="(\d+)"\s+mana="(\d+)"\s+min="(\d+)"\s+max="(\d+)"\s+type="([^"]+)"[^>]*>([\s\S]*?)<\/wand>/g;

const wands = [];
let match;
while ((match = wandRegex.exec(weaponsXml)) !== null) {
  const id = Number(match[1]);
  const itemRegex = new RegExp(`<item\\s+id="${id}"[^>]*name="([^"]+)"`, 'i');
  const nameMatch = itemRegex.exec(itemsXml);
  const name = nameMatch ? nameMatch[1] : `Wand #${id}`;

  const vocations = [];
  const vocRegex = /<vocation\s+name="([^"]+)"/g;
  let vocMatch;
  while ((vocMatch = vocRegex.exec(match[7])) !== null) {
    vocations.push(vocMatch[1]);
  }
  if (vocations.length === 0) {
    if (name.toLowerCase().includes('rod')) vocations.push('Druid');
    else vocations.push('Sorcerer');
  }

  const type = match[6];
  let projectileId = 5;
  let effectId = 12;
  if (type === 'fire') {
    projectileId = 4;
    effectId = 16;
  } else if (type === 'death') {
    projectileId = 11;
    effectId = 18;
  } else if (type === 'earth') {
    projectileId = 15;
    effectId = 17;
  } else if (type === 'ice') {
    projectileId = 29;
    effectId = 43;
  } else if (type === 'energy') {
    projectileId = 5;
    effectId = 12;
  }

  wands.push({
    id,
    name,
    level: Number(match[2]),
    mana: Number(match[3]),
    min: Number(match[4]),
    max: Number(match[5]),
    element: type,
    vocations,
    projectileId,
    effectId,
    range: 4,
  });
}

const fileContent = `// Canonical Wands and Rods definitions generated from realmap11/data/weapons/weapons.xml
import type { CharacterState } from './types';

export type MagicElement = 'energy' | 'fire' | 'death' | 'earth' | 'ice';

export interface WandDefinition {
  id: number;
  name: string;
  level: number;
  mana: number;
  min: number;
  max: number;
  element: MagicElement;
  vocations: string[];
  projectileId: number;
  effectId: number;
  range: number;
}

export const CANONICAL_WANDS: Record<number, WandDefinition> = {
${wands.map(w => `  ${w.id}: ${JSON.stringify(w, null, 4).replace(/\n/g, '\n  ')},`).join('\n')}
};

export function findWandDefinition(itemId: number): WandDefinition | undefined {
  return CANONICAL_WANDS[itemId];
}

export function canUseWand(
  character: CharacterState,
  wand: WandDefinition
): { ok: boolean; reason?: string } {
  if (character.level < wand.level) {
    return { ok: false, reason: \`\${character.name} precisa de nível \${wand.level} para usar \${wand.name}.\` };
  }

  const base = character.baseVocation || character.vocation;
  const isVocationOk = wand.vocations.some((v) => {
    const vLower = v.toLowerCase();
    const baseLower = base.toLowerCase();
    const fullLower = character.vocation.toLowerCase();
    return fullLower.includes(vLower) || baseLower.includes(vLower);
  });

  if (!isVocationOk) {
    return {
      ok: false,
      reason: \`\${character.name} não pode empunhar \${wand.name} (exclusivo para \${wand.vocations.join(', ')}).\`,
    };
  }

  return { ok: true };
}
`;

fs.writeFileSync('packages/domain/src/wands.ts', fileContent, 'utf8');
console.log('Successfully created packages/domain/src/wands.ts!');
