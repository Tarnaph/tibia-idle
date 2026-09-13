import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ATLAS_WIDTH = 1024; // 1024 allows plenty of room for all ~250 icons + future spells

async function buildSpellsAtlas() {
  console.log('=== BUILDING COMPLETE SPELLS & RUNES TEXTURE ATLAS ===');
  const outDir = './public/generated/atlases';
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const itemsToPack = [];
  const seenPaths = new Map(); // path -> canonical item

  function registerIcon(filePath, primaryKey, aliasKeys = []) {
    if (!fs.existsSync(filePath)) return;
    const resolved = path.resolve(filePath);
    let item = seenPaths.get(resolved);
    if (!item) {
      item = {
        key: primaryKey,
        aliases: new Set([primaryKey, ...aliasKeys]),
        localPath: filePath,
        width: 32,
        height: 32,
      };
      seenPaths.set(resolved, item);
      itemsToPack.push(item);
    } else {
      item.aliases.add(primaryKey);
      aliasKeys.forEach((k) => item.aliases.add(k));
    }
  }

  // 1. Canonical Spells (public/spells/canonical/*.png)
  const canonicalDir = './public/spells/canonical';
  if (fs.existsSync(canonicalDir)) {
    const files = fs.readdirSync(canonicalDir).filter((f) => f.endsWith('.png'));
    for (const f of files) {
      const baseName = f.replace('.png', '');
      registerIcon(
        path.join(canonicalDir, f),
        baseName,
        [
          f,
          `/spells/canonical/${f}`,
          `spells/canonical/${f}`,
        ]
      );
    }
  }

  // 2. Named Spells (public/spells/*.png)
  const spellsDir = './public/spells';
  if (fs.existsSync(spellsDir)) {
    const files = fs.readdirSync(spellsDir).filter((f) => f.endsWith('.png'));
    for (const f of files) {
      const baseName = f.replace('.png', '');
      registerIcon(
        path.join(spellsDir, f),
        `spell-${baseName}`,
        [
          baseName,
          f,
          `/spells/${f}`,
          `spells/${f}`,
        ]
      );
    }
  }

  // 3. Runes (public/runes/*.png)
  const runesDir = './public/runes';
  if (fs.existsSync(runesDir)) {
    const files = fs.readdirSync(runesDir).filter((f) => f.endsWith('.png'));
    for (const f of files) {
      const baseName = f.replace('.png', '');
      registerIcon(
        path.join(runesDir, f),
        `rune-${baseName}`,
        [
          baseName,
          f,
          `/runes/${f}`,
          `runes/${f}`,
        ]
      );
    }
  }

  console.log(`Found ${itemsToPack.length} unique spell/rune images to pack into atlas.`);

  // Get real dimensions and extrude each frame with 1px border replication
  const extrudedItems = await Promise.all(
    itemsToPack.map(async (item) => {
      const meta = await sharp(item.localPath).metadata();
      const w = meta.width || 32;
      const h = meta.height || 32;
      const extrudedBuffer = await sharp(item.localPath)
        .extend({ top: 1, bottom: 1, left: 1, right: 1, extendWith: 'copy' })
        .png()
        .toBuffer();
      return {
        ...item,
        width: w,
        height: h,
        packedWidth: w + 2,
        packedHeight: h + 2,
        extrudedBuffer,
      };
    })
  );

  // Shelf bin-packing
  const sorted = [...extrudedItems].sort((a, b) => b.packedHeight - a.packedHeight || a.key.localeCompare(b.key));

  let currentX = 0;
  let currentY = 0;
  let shelfHeight = 0;
  const overlays = [];
  const atlasFrames = {};

  for (const item of sorted) {
    if (currentX + item.packedWidth > ATLAS_WIDTH) {
      currentX = 0;
      currentY += shelfHeight;
      shelfHeight = 0;
    }

    overlays.push({
      input: item.extrudedBuffer,
      left: currentX,
      top: currentY,
    });

    const frameDef = {
      frame: { x: currentX + 1, y: currentY + 1, w: item.width, h: item.height },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: item.width, h: item.height },
      sourceSize: { w: item.width, h: item.height },
    };

    // Register all aliases pointing to this frame
    for (const alias of item.aliases) {
      atlasFrames[alias] = frameDef;
    }

    currentX += item.packedWidth;
    if (item.packedHeight > shelfHeight) {
      shelfHeight = item.packedHeight;
    }
  }

  const totalHeight = currentY + shelfHeight;
  console.log(`Packing into ${ATLAS_WIDTH}x${totalHeight}px Spells Atlas...`);

  const blankCanvas = sharp({
    create: {
      width: ATLAS_WIDTH,
      height: totalHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  const finalPng = await blankCanvas.composite(overlays).png({ compressionLevel: 8 }).toBuffer();

  const atlasPngPath = path.join(outDir, 'spells-atlas.png');
  const atlasJsonPath = path.join(outDir, 'spells-atlas.json');

  fs.writeFileSync(atlasPngPath, finalPng);
  fs.writeFileSync(
    atlasJsonPath,
    JSON.stringify(
      {
        frames: atlasFrames,
        meta: {
          image: 'spells-atlas.png',
          format: 'RGBA8888',
          size: { w: ATLAS_WIDTH, h: totalHeight },
          scale: 1,
        },
      },
      null,
      2
    )
  );

  console.log(`✅ SUCCESS! Complete Spells Atlas built:`);
  console.log(`- ${atlasPngPath} (${(finalPng.length / 1024).toFixed(1)} KB)`);
  console.log(`- ${atlasJsonPath} (${(fs.statSync(atlasJsonPath).size / 1024).toFixed(1)} KB) with ${Object.keys(atlasFrames).length} frame aliases.`);
}

buildSpellsAtlas().catch((err) => {
  console.error(err);
  process.exit(1);
});
