import fs from 'fs';
import path from 'path';

export function buildCombatAssets() {
  const fullPath = './content/generated/tibia1098-assets.json';
  const outPath = './content/generated/tibia1098-combat-assets.json';

  if (!fs.existsSync(fullPath)) {
    console.warn(`[buildCombatAssets] ${fullPath} not found. Skipping.`);
    return;
  }

  const full = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  const combat = {
    version: full.version || '1.0.0',
    meta: full.meta || {},
    assets: full.assets || {},
    outfits: full.outfits || {},
    monsters: full.monsters || {},
    creatures: full.creatures || {},
    effects: full.effects || {},
    missiles: full.missiles || {},
    items: full.items || {},
  };

  fs.writeFileSync(outPath, JSON.stringify(combat));
  console.log(`✅ [buildCombatAssets] Wrote ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
}

if (process.argv[1] && process.argv[1].endsWith('build-combat-assets.mjs')) {
  buildCombatAssets();
}
