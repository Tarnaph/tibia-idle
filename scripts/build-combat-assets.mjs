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

  // Clean compact mapItems (stripping redundant internal hashes/paths)
  const cleanMapItems = {};
  for (const [id, m] of Object.entries(full.mapItems || {})) {
    cleanMapItems[id] = {
      id: m.id,
      appearance: m.appearance,
      frame: m.frame ? { publicUrl: m.frame.publicUrl, width: m.frame.width, height: m.frame.height } : undefined,
      frames: m.frames ? m.frames.map(f => ({ publicUrl: f.publicUrl, pattern: f.pattern, width: f.width, height: f.height })) : undefined,
      animDurationMs: m.animDurationMs,
    };
  }

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
    corpses: full.corpses || {},
    mapItems: cleanMapItems,
  };

  fs.writeFileSync(outPath, JSON.stringify(combat));
  console.log(`✅ [buildCombatAssets] Wrote ${outPath} (${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB)`);
}

if (process.argv[1] && process.argv[1].endsWith('build-combat-assets.mjs')) {
  buildCombatAssets();
}
