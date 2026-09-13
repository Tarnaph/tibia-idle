import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const TILE_SIZE = 32;
const ATLAS_SIZE = 2048;
const SLOTS_PER_ROW = ATLAS_SIZE / TILE_SIZE; // 64
const MAX_SLOTS = SLOTS_PER_ROW * SLOTS_PER_ROW; // 4096

async function buildThaisAtlas() {
  console.log('=== BUILDING COMPLETE THAIS TEXTURE ATLAS ===');
  const manifestPath = './content/generated/tibia1098-assets.json';
  const thaisPath = './content/generated/thais-city.json';
  const outDir = './public/generated/atlases';
  const compactManifestDir = './content/generated';

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const thais = JSON.parse(fs.readFileSync(thaisPath, 'utf8'));
  const allTiles = [...thais.tiles, ...(thais.upperTiles || [])];

  const uniqueItemIds = new Set();
  allTiles.forEach(t => t.serverItemIds.forEach(id => uniqueItemIds.add(id)));
  console.log(`Found ${uniqueItemIds.size} unique items in Thais (${allTiles.length} tiles).`);

  const framesToPack = [];
  const thaisItemMeta = {};

  // 1. Map items
  for (const id of uniqueItemIds) {
    const mapping = manifest.mapItems[String(id)];
    if (!mapping) continue;

    const frames = [];
    if (mapping.frames && mapping.frames.length > 0) {
      mapping.frames.forEach((f, idx) => {
        const frameKey = `item-${id}-f${idx}`;
        const localPath = path.join('./public', f.publicUrl);
        if (fs.existsSync(localPath)) {
          const w = f.width || (mapping.appearance?.width ? mapping.appearance.width * 32 : 32);
          const h = f.height || (mapping.appearance?.height ? mapping.appearance.height * 32 : 32);
          framesToPack.push({ key: frameKey, localPath, width: w, height: h });
          frames.push({
            key: frameKey,
            px: f.pattern?.x || 0,
            py: f.pattern?.y || 0,
            animFrame: f.animFrame || idx,
          });
        }
      });
    } else if (mapping.frame) {
      const frameKey = `item-${id}`;
      const localPath = path.join('./public', mapping.frame.publicUrl);
      if (fs.existsSync(localPath)) {
        const w = mapping.frame.width || (mapping.appearance?.width ? mapping.appearance.width * 32 : 32);
        const h = mapping.frame.height || (mapping.appearance?.height ? mapping.appearance.height * 32 : 32);
        framesToPack.push({ key: frameKey, localPath, width: w, height: h });
        frames.push({
          key: frameKey,
          px: 0,
          py: 0,
          animFrame: 0,
        });
      }
    }

    if (frames.length > 0) {
      thaisItemMeta[String(id)] = {
        isGround: !!mapping.isGround,
        width: mapping.frame?.width || mapping.frames?.[0]?.width || 32,
        height: mapping.frame?.height || mapping.frames?.[0]?.height || 32,
        patternX: mapping.appearance?.patternX || 1,
        patternY: mapping.appearance?.patternY || 1,
        animFrames: mapping.appearance?.frames || (mapping.frames ? mapping.frames.length : 1),
        animDurationMs: mapping.animDurationMs || 180,
        frames,
      };
    }
  }

  // 2. Training assets
  const trainingIds = ['trainingFloor', 'trainingWall', 'trainingRug', 'trainingDummy', 'trainingDecor'];
  for (const tid of trainingIds) {
    const asset = manifest.assets?.[tid];
    if (asset?.frames?.[0]) {
      const frameKey = `asset-${tid}`;
      const localPath = path.join('./public', asset.frames[0].publicUrl);
      if (fs.existsSync(localPath)) {
        framesToPack.push({ key: frameKey, localPath, width: 32, height: 32 });
        thaisItemMeta[tid] = {
          isGround: tid === 'trainingFloor' || tid === 'trainingRug',
          width: 32,
          height: 32,
          patternX: 1,
          patternY: 1,
          animFrames: 1,
          animDurationMs: 0,
          frames: [{ key: frameKey, px: 0, py: 0, animFrame: 0 }],
        };
      }
    }
  }

  // 3. Teleport effect (11) and fire effect (16)
  const effectIds = ['11', '16'];
  for (const eid of effectIds) {
    const eff = manifest.effects?.[eid];
    if (eff?.frames) {
      const effFrames = [];
      eff.frames.forEach((f, idx) => {
        const frameKey = `effect-${eid}-f${idx}`;
        const localPath = path.join('./public', f.publicUrl);
        if (fs.existsSync(localPath)) {
          framesToPack.push({ key: frameKey, localPath, width: f.width || 32, height: f.height || 32 });
          effFrames.push(frameKey);
        }
      });
      thaisItemMeta[`effect-${eid}`] = {
        frames: effFrames,
        frameDurationMs: 100,
      };
    }
  }

  console.log(`Total frames to pack: ${framesToPack.length}`);

  // Shelf Bin-Packing: Sort by height DESC, width DESC, key ASC
  const sorted = [...framesToPack].sort((a, b) => b.height - a.height || b.width - a.width || a.key.localeCompare(b.key));

  let currentX = 0;
  let currentY = 0;
  let shelfHeight = 0;
  const overlays = [];
  const atlasFrames = {};

  for (const item of sorted) {
    if (currentX + item.width > ATLAS_SIZE) {
      currentX = 0;
      currentY += shelfHeight;
      shelfHeight = 0;
    }

    overlays.push({
      input: item.localPath,
      left: currentX,
      top: currentY,
    });

    atlasFrames[item.key] = {
      frame: { x: currentX, y: currentY, w: item.width, h: item.height },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: item.width, h: item.height },
      sourceSize: { w: item.width, h: item.height },
    };

    currentX += item.width;
    if (item.height > shelfHeight) {
      shelfHeight = item.height;
    }
  }

  const totalHeight = currentY + shelfHeight;
  console.log(`Packed into 2D Shelf Atlas: ${ATLAS_SIZE}x${totalHeight}px`);

  const atlasJson = {
    frames: atlasFrames,
    meta: {
      image: 'thais-atlas.png',
      format: 'RGBA8888',
      size: { w: ATLAS_SIZE, h: totalHeight },
      scale: 1,
    },
  };

  console.log(`Rendering ${ATLAS_SIZE}x${totalHeight} PNG with sharp...`);
  const blankCanvas = sharp({
    create: {
      width: ATLAS_SIZE,
      height: totalHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  const finalPng = await blankCanvas.composite(overlays).png({ compressionLevel: 8 }).toBuffer();

  const atlasPngPath = path.join(outDir, 'thais-atlas.png');
  const atlasJsonPath = path.join(outDir, 'thais-atlas.json');
  const metadataJsonPath = path.join(compactManifestDir, 'thais-item-metadata.json');

  fs.writeFileSync(atlasPngPath, finalPng);
  fs.writeFileSync(atlasJsonPath, JSON.stringify(atlasJson, null, 2));
  fs.writeFileSync(metadataJsonPath, JSON.stringify(thaisItemMeta, null, 2));

  console.log(`✅ SUCCESS! Complete Thais Atlas built:`);
  console.log(`- ${atlasPngPath} (${(finalPng.length / 1024).toFixed(1)} KB)`);
  console.log(`- ${atlasJsonPath} (${(fs.statSync(atlasJsonPath).size / 1024).toFixed(1)} KB)`);
  console.log(`- ${metadataJsonPath} (${(fs.statSync(metadataJsonPath).size / 1024).toFixed(1)} KB)`);
}

buildThaisAtlas().catch(err => {
  console.error(err);
  process.exit(1);
});
