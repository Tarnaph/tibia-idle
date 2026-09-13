import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const TILE_SIZE = 64; // Creatures and icons can be up to 64x64 or standard 32x32 / 64x64
const ATLAS_SIZE = 1024; // 1024x1024 with 64x64 slots = 16x16 = 256 slots
const SLOTS_PER_ROW = ATLAS_SIZE / TILE_SIZE; // 16

async function buildCreaturesAtlas() {
  console.log('=== BUILDING CREATURES & ESSENTIAL ASSETS ATLAS ===');
  const outDir = './public/generated/atlases';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const items = [];

  // 1. Monsters
  const monsters = [
    { id: 'rat', path: './public/generated/bestiary/rat.png' },
    { id: 'cave-rat', path: './public/generated/bestiary/cave-rat.png' },
    { id: 'spider', path: './public/generated/bestiary/spider.png' },
    { id: 'skeleton', path: './public/generated/bestiary/skeleton.png' },
    { id: 'troll', path: './public/generated/bestiary/troll.png' },
    { id: 'rotworm', path: './public/generated/bestiary/rotworm.png' },
    { id: 'dragon', path: './public/generated/bestiary/dragon.png' },
  ];

  for (const m of monsters) {
    if (fs.existsSync(m.path)) {
      items.push({ key: `monster-${m.id}`, localPath: m.path });
    }
  }

  // 2. Outfit thumbnails
  const thumbs = [
    'citizen', 'hunter', 'mage', 'knight', 'noble', 'summoner', 'warrior', 'barbarian', 'druid', 'sorcerer', 'paladin', 'sire', 'assassin', 'pirate', 'oriental', 'beggar'
  ];
  for (const t of thumbs) {
    const p = `./public/generated/outfit-thumbs/${t}.png`;
    if (fs.existsSync(p)) {
      items.push({ key: `thumb-${t}`, localPath: p });
    }
  }

  // 3. Mounts
  const mounts = [
    { id: 'donkey_rider_south', path: './public/generated/mounts/donkey_rider_south.png' },
  ];
  for (const m of mounts) {
    if (fs.existsSync(m.path)) {
      items.push({ key: `mount-${m.id}`, localPath: m.path });
    }
  }

  // 4. Core spell icons from public/spells/canonical
  const spellDir = './public/spells/canonical';
  if (fs.existsSync(spellDir)) {
    const files = fs.readdirSync(spellDir).filter(f => f.endsWith('.png'));
    for (const f of files) {
      const name = f.replace('.png', '');
      items.push({ key: `spell-${name}`, localPath: path.join(spellDir, f) });
    }
  }

  console.log(`Found ${items.length} creature & UI items to pack.`);

  const overlays = [];
  const atlasJson = {
    frames: {},
    meta: {
      image: 'creatures-atlas.png',
      format: 'RGBA8888',
      size: { w: ATLAS_SIZE, h: ATLAS_SIZE },
      scale: 1,
    },
  };

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const col = i % SLOTS_PER_ROW;
    const row = Math.floor(i / SLOTS_PER_ROW);
    const left = col * TILE_SIZE;
    const top = row * TILE_SIZE;

    // Read image to get actual size
    const meta = await sharp(item.localPath).metadata();
    const w = meta.width || 32;
    const h = meta.height || 32;

    // Resize or place centered if needed, or composite directly
    let inputBuf;
    if (w > TILE_SIZE || h > TILE_SIZE) {
      inputBuf = await sharp(item.localPath).resize(TILE_SIZE, TILE_SIZE, { fit: 'inside' }).toBuffer();
    } else {
      inputBuf = item.localPath;
    }

    overlays.push({
      input: inputBuf,
      left,
      top,
    });

    atlasJson.frames[item.key] = {
      frame: { x: left, y: top, w, h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w, h },
      sourceSize: { w, h },
    };
  }

  const blankCanvas = sharp({
    create: {
      width: ATLAS_SIZE,
      height: ATLAS_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  const finalPng = await blankCanvas.composite(overlays).png({ compressionLevel: 9 }).toBuffer();

  const atlasPngPath = path.join(outDir, 'creatures-atlas.png');
  const atlasJsonPath = path.join(outDir, 'creatures-atlas.json');

  fs.writeFileSync(atlasPngPath, finalPng);
  fs.writeFileSync(atlasJsonPath, JSON.stringify(atlasJson, null, 2));

  console.log(`✅ SUCCESS! Created:`);
  console.log(`- ${atlasPngPath} (${(finalPng.length / 1024).toFixed(1)} KB)`);
  console.log(`- ${atlasJsonPath} (${(fs.statSync(atlasJsonPath).size / 1024).toFixed(1)} KB)`);
}

buildCreaturesAtlas().catch((err) => {
  console.error('Creatures atlas build failed:', err);
  process.exit(1);
});
