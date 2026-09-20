import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const TILE_SIZE = 32;
const ATLAS_WIDTH = 2048;
const ATLAS_HEIGHT = 1024;
const COLS = ATLAS_WIDTH / TILE_SIZE; // 64 cols
const MAX_SLOTS = COLS * (ATLAS_HEIGHT / TILE_SIZE); // 64 * 32 = 2048 slots

async function buildCombatAtlas() {
  console.log('=== BUILDING COMBAT FX & MISSILES ATLAS ===');
  const outDir = './public/generated/atlases';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const combatAssets = JSON.parse(
    fs.readFileSync('./content/generated/tibia1098-combat-assets.json', 'utf8')
  );

  const framesToPack = [];
  const addedFiles = new Set();

  // 1. Effects: essential + extended range (IDs 1 to 60)
  for (const [idStr, fx] of Object.entries(combatAssets.effects || {})) {
    const id = Number(idStr);
    if (id <= 60 && fx?.frames) {
      for (const f of fx.frames) {
        if (!addedFiles.has(f.file)) {
          const fullPath = path.resolve(f.file);
          if (fs.existsSync(fullPath)) {
            addedFiles.add(f.file);
            framesToPack.push({
              file: f.file,
              publicUrl: f.publicUrl,
              fullPath,
            });
          }
        }
      }
    }
  }

  // 2. Missiles: all core + wands + distance (IDs 1 to 50)
  for (const [idStr, mis] of Object.entries(combatAssets.missiles || {})) {
    const id = Number(idStr);
    if (id <= 50 && mis?.frames) {
      for (const f of mis.frames) {
        if (!addedFiles.has(f.file)) {
          const fullPath = path.resolve(f.file);
          if (fs.existsSync(fullPath)) {
            addedFiles.add(f.file);
            framesToPack.push({
              file: f.file,
              publicUrl: f.publicUrl,
              fullPath,
            });
          }
        }
      }
    }
  }

  console.log(`Packing ${framesToPack.length} combat frames into ${ATLAS_WIDTH}x${ATLAS_HEIGHT} atlas...`);

  if (framesToPack.length > MAX_SLOTS) {
    throw new Error(`Too many frames (${framesToPack.length}) for atlas size of ${MAX_SLOTS} slots!`);
  }

  const overlays = [];
  const atlasJsonFrames = {};

  for (let i = 0; i < framesToPack.length; i++) {
    const item = framesToPack[i];
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col * TILE_SIZE;
    const y = row * TILE_SIZE;

    // Read and ensure exactly 32x32
    const imageBuf = await sharp(item.fullPath)
      .resize(TILE_SIZE, TILE_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    overlays.push({
      input: imageBuf,
      left: x,
      top: y,
    });

    const frameDef = {
      frame: { x, y, w: TILE_SIZE, h: TILE_SIZE },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: TILE_SIZE, h: TILE_SIZE },
      sourceSize: { w: TILE_SIZE, h: TILE_SIZE },
    };

    const fileName = path.basename(item.file);
    const publicUrl = item.publicUrl;
    const cleanUrl = publicUrl.startsWith('/') ? publicUrl.slice(1) : publicUrl;

    // Multiple alias keys so lookups never fail
    atlasJsonFrames[publicUrl] = frameDef;
    atlasJsonFrames[cleanUrl] = frameDef;
    atlasJsonFrames[fileName] = frameDef;
  }

  const atlasPng = await sharp({
    create: {
      width: ATLAS_WIDTH,
      height: ATLAS_HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(overlays)
    .png({ compressionLevel: 9 })
    .toBuffer();

  const atlasPngPath = path.join(outDir, 'combat-fx-atlas.png');
  const atlasJsonPath = path.join(outDir, 'combat-fx-atlas.json');

  fs.writeFileSync(atlasPngPath, atlasPng);

  const manifest = {
    frames: atlasJsonFrames,
    meta: {
      image: 'combat-fx-atlas.png',
      format: 'RGBA8888',
      size: { w: ATLAS_WIDTH, h: ATLAS_HEIGHT },
      scale: 1,
    },
  };

  fs.writeFileSync(atlasJsonPath, JSON.stringify(manifest, null, 2));

  console.log(`Combat Atlas created successfully:`);
  console.log(`PNG: ${atlasPngPath} (${(atlasPng.length / 1024).toFixed(1)} KB)`);
  console.log(`JSON: ${atlasJsonPath} with ${Object.keys(atlasJsonFrames).length} frame aliases`);
}

buildCombatAtlas().catch((err) => {
  console.error('Error building combat atlas:', err);
  process.exit(1);
});
