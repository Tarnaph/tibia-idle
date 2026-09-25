import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const initialHunts = [
  { id: 'rat-cellars', monsters: ['rat', 'cave-rat'] },
  { id: 'spider-burrow', monsters: ['spider', 'bug', 'poison-spider'] },
  { id: 'troll-camp', monsters: ['troll', 'swamp-troll'] },
  { id: 'old-crypt', monsters: ['skeleton'] },
  { id: 'rotworm-cave', monsters: ['rotworm', 'carrion-worm'] },
  { id: 'cyclops-camp', monsters: ['cyclops', 'cyclops-smith'] },
  { id: 'elf-sanctuary', monsters: ['elf', 'elf-scout', 'elf-arcanist'] },
  { id: 'dragon-lair', monsters: ['dragon', 'dragon-lord'] },
  { id: 'corym-mine', monsters: ['corym-vanguard', 'corym-skirmisher', 'corym-charlatan'] },
  { id: 'giant-spider-lair', monsters: ['giant-spider', 'tarantula'] },
  { id: 'hero-cave', monsters: ['hero', 'renegade-knight', 'vicious-squire'] },
  { id: 'hydra-lair', monsters: ['hydra', 'bog-raider'] },
];

async function buildHuntAtlases() {
  console.log('=== BUILDING PER-HUNT MONSTER TEXTURE ATLASES ===');
  const outDir = './public/generated/atlases';
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const assetsJsonPath = './content/generated/tibia1098-assets.json';
  if (!fs.existsSync(assetsJsonPath)) {
    throw new Error(`Asset manifest not found at ${assetsJsonPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(assetsJsonPath, 'utf8'));
  const creatures = manifest.creatures || {};
  const rootAssets = manifest.assets || {};

  for (const hunt of initialHunts) {
    console.log(`\nProcessing Hunt: ${hunt.id} (Monsters: ${hunt.monsters.join(', ')})`);
    const framesToPack = [];
    const seenPaths = new Set();

    for (const monsterId of hunt.monsters) {
      const creature = creatures[monsterId] || rootAssets[monsterId];
      if (!creature || !creature.frames) {
        console.warn(`  [WARN] Creature ${monsterId} frames not found in manifest.`);
        continue;
      }

      console.log(`  Adding creature ${monsterId}: ${creature.frames.length} frames`);
      for (const f of creature.frames) {
        if (!f.file) continue;
        const localPath = path.resolve(f.file);
        if (!fs.existsSync(localPath)) {
          // Check public/
          const altPath = path.resolve('./public', f.publicUrl || f.file);
          if (!fs.existsSync(altPath)) continue;
        }

        const actualPath = fs.existsSync(localPath) ? localPath : path.resolve('./public', f.publicUrl || f.file);
        if (seenPaths.has(actualPath)) continue;
        seenPaths.add(actualPath);

        const w = f.width || 64;
        const h = f.height || 64;
        const baseName = path.basename(actualPath);

        framesToPack.push({
          localPath: actualPath,
          width: w,
          height: h,
          keys: [
            f.publicUrl,
            f.publicUrl.replace(/^\//, ''),
            baseName,
            baseName.replace('.png', ''),
          ],
        });
      }

      // Add thumbnail if available
      if (creature.thumbUrl) {
        const thumbPath = path.resolve('./public', creature.thumbUrl.replace(/^\//, ''));
        if (fs.existsSync(thumbPath) && !seenPaths.has(thumbPath)) {
          seenPaths.add(thumbPath);
          const meta = await sharp(thumbPath).metadata();
          framesToPack.push({
            localPath: thumbPath,
            width: meta.width || 64,
            height: meta.height || 64,
            keys: [
              creature.thumbUrl,
              creature.thumbUrl.replace(/^\//, ''),
              path.basename(thumbPath),
              `thumb-${monsterId}`,
            ],
          });
        }
      }
    }

    // Add map tile items from hunt-regions.json if available
    const huntRegionsPath = './content/generated/hunt-regions.json';
    if (fs.existsSync(huntRegionsPath)) {
      try {
        const huntRegions = JSON.parse(fs.readFileSync(huntRegionsPath, 'utf8')).regions || [];
        const region = huntRegions.find((r) => r.huntId === hunt.id);
        if (region && region.tiles) {
          const uniqueItemIds = new Set();
          for (const tile of region.tiles) {
            for (const id of tile.serverItemIds || []) {
              uniqueItemIds.add(id);
            }
          }
          console.log(`  Adding map items for ${hunt.id}: ${uniqueItemIds.size} unique item IDs across ${region.tiles.length} tiles`);
          const mapItems = manifest.mapItems || {};
          for (const id of uniqueItemIds) {
            const mapping = mapItems[String(id)];
            if (!mapping) continue;
            const frames = mapping.frames && mapping.frames.length > 0 ? mapping.frames : (mapping.frame ? [mapping.frame] : []);
            for (const f of frames) {
              if (!f || !f.publicUrl) continue;
              const localPath = path.resolve('./public', f.publicUrl.replace(/^\//, ''));
              if (!fs.existsSync(localPath) || seenPaths.has(localPath)) continue;
              seenPaths.add(localPath);
              const w = f.width || (mapping.appearance?.width ? mapping.appearance.width * 32 : 32);
              const h = f.height || (mapping.appearance?.height ? mapping.appearance.height * 32 : 32);
              const baseName = path.basename(localPath);
              framesToPack.push({
                localPath,
                width: w,
                height: h,
                keys: [
                  f.publicUrl,
                  f.publicUrl.replace(/^\//, ''),
                  baseName,
                  baseName.replace('.png', ''),
                ],
              });
            }
          }
        }
      } catch (err) {
        console.warn(`  [WARN] Failed to pack map items for hunt ${hunt.id}:`, err);
      }
    }

    if (framesToPack.length === 0) {
      console.warn(`  No frames to pack for hunt ${hunt.id}. Skipping.`);
      continue;
    }

    console.log(`  Extruding ${framesToPack.length} frames with 1px border replication in batches...`);
    const extruded = [];
    const BATCH_SIZE = 50;
    for (let i = 0; i < framesToPack.length; i += BATCH_SIZE) {
      const batch = framesToPack.slice(i, i + BATCH_SIZE);
      const batchRes = await Promise.all(
        batch.map(async (item) => {
          const extrudedBuffer = await sharp(item.localPath)
            .extend({ top: 1, bottom: 1, left: 1, right: 1, extendWith: 'copy' })
            .png()
            .toBuffer();
          return {
            ...item,
            packedWidth: item.width + 2,
            packedHeight: item.height + 2,
            extrudedBuffer,
          };
        })
      );
      extruded.push(...batchRes);
    }

    // Shelf bin-packing (Atlas width 2048 for high frame counts including map tiles)
    const ATLAS_WIDTH = 2048;
    const sorted = [...extruded].sort((a, b) => b.packedHeight - a.packedHeight || a.localPath.localeCompare(b.localPath));

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

      for (const k of item.keys) {
        atlasFrames[k] = frameDef;
      }

      currentX += item.packedWidth;
      if (item.packedHeight > shelfHeight) {
        shelfHeight = item.packedHeight;
      }
    }

    const totalHeight = currentY + shelfHeight;
    const blankCanvas = sharp({
      create: {
        width: ATLAS_WIDTH,
        height: totalHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    });

    const finalPng = await blankCanvas.composite(overlays).png({ compressionLevel: 8 }).toBuffer();
    const atlasPngPath = path.join(outDir, `hunt-${hunt.id}-atlas.png`);
    const atlasJsonPath = path.join(outDir, `hunt-${hunt.id}-atlas.json`);

    fs.writeFileSync(atlasPngPath, finalPng);
    fs.writeFileSync(
      atlasJsonPath,
      JSON.stringify(
        {
          frames: atlasFrames,
          meta: {
            image: `hunt-${hunt.id}-atlas.png`,
            format: 'RGBA8888',
            size: { w: ATLAS_WIDTH, h: totalHeight },
            scale: 1,
          },
        },
        null,
        2
      )
    );

    console.log(`  ✅ Built ${atlasPngPath} (${(finalPng.length / 1024).toFixed(1)} KB, ${Object.keys(atlasFrames).length} frame aliases).`);
  }

  console.log('\n=== ALL HUNT ATLASES SUCCESSFULLY BUILT ===');
}

buildHuntAtlases().catch((err) => {
  console.error(err);
  process.exit(1);
});
