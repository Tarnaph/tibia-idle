import fs from 'fs';

export function buildCollisionMap() {
  const thaisCityPath = './content/generated/thais-city.json';
  const outPath = './content/generated/thais-collision.json';

  if (!fs.existsSync(thaisCityPath)) return;

  const thais = JSON.parse(fs.readFileSync(thaisCityPath, 'utf8'));
  const z7 = {};
  const z6 = {};

  for (const t of thais.tiles) {
    if (t.walkable) {
      z7[`${t.x},${t.y}`] = 1;
    }
  }

  for (const t of (thais.upperTiles || [])) {
    if (t.walkable) {
      z6[`${t.x},${t.y}`] = 1;
    }
  }

  const collision = { z7, z6 };
  fs.writeFileSync(outPath, JSON.stringify(collision));
  console.log(`✅ [buildCollisionMap] Wrote ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
}

if (process.argv[1] && process.argv[1].endsWith('build-collision-map.mjs')) {
  buildCollisionMap();
}
