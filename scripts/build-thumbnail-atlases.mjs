import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const THUMB_SIZE = 64; // Each thumbnail is 64x64

async function buildOutfitThumbAtlas() {
  console.log('=== 1. BUILDING OUTFIT THUMBNAILS ATLAS ===');
  const dir = './public/generated/outfit-thumbs';
  const outDir = './public/generated/atlases';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
  console.log(`Found ${files.length} outfit thumbnails.`);

  // Calculate grid layout: e.g. 10 columns
  const cols = 10;
  const rows = Math.ceil(files.length / cols);
  const atlasWidth = cols * THUMB_SIZE; // 640px
  const atlasHeight = rows * THUMB_SIZE;

  const overlays = [];
  const frames = {};

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const outfitId = file.replace('.png', '').toLowerCase();
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * THUMB_SIZE;
    const y = row * THUMB_SIZE;

    const inputPath = path.join(dir, file);
    // Resize or ensure 64x64
    const resizedBuffer = await sharp(inputPath)
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    overlays.push({
      input: resizedBuffer,
      left: x,
      top: y,
    });

    frames[outfitId] = { x, y, w: THUMB_SIZE, h: THUMB_SIZE };
  }

  // Generate atlas image
  const atlasBuffer = await sharp({
    create: {
      width: atlasWidth,
      height: atlasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(overlays)
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, 'outfit-thumbs-atlas.png'));

  const manifest = {
    image: 'outfit-thumbs-atlas.png',
    width: atlasWidth,
    height: atlasHeight,
    thumbSize: THUMB_SIZE,
    count: files.length,
    frames,
  };

  fs.writeFileSync(path.join(outDir, 'outfit-thumbs-manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`✅ Outfit Thumbs Atlas created: ${atlasWidth}x${atlasHeight} (${files.length} items)`);
}

async function buildMountThumbAtlas() {
  console.log('\n=== 2. BUILDING MOUNT THUMBNAILS ATLAS ===');
  const dir = './public/generated/mounts';
  const outDir = './public/generated/atlases';

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.png') && !f.includes('-f') && !f.includes('_rider_'))
    .sort();
  console.log(`Found ${files.length} base mount thumbnails.`);

  // Calculate grid layout: e.g. 12 columns
  const cols = 12;
  const rows = Math.ceil(files.length / cols);
  const atlasWidth = cols * THUMB_SIZE; // 768px
  const atlasHeight = rows * THUMB_SIZE;

  const overlays = [];
  const frames = {};

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const mountId = file.replace('.png', '').toLowerCase();
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * THUMB_SIZE;
    const y = row * THUMB_SIZE;

    const inputPath = path.join(dir, file);
    const resizedBuffer = await sharp(inputPath)
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    overlays.push({
      input: resizedBuffer,
      left: x,
      top: y,
    });

    frames[mountId] = { x, y, w: THUMB_SIZE, h: THUMB_SIZE };
  }

  // Generate atlas image
  await sharp({
    create: {
      width: atlasWidth,
      height: atlasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(overlays)
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, 'mount-thumbs-atlas.png'));

  const manifest = {
    image: 'mount-thumbs-atlas.png',
    width: atlasWidth,
    height: atlasHeight,
    thumbSize: THUMB_SIZE,
    count: files.length,
    frames,
  };

  fs.writeFileSync(path.join(outDir, 'mount-thumbs-manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`✅ Mount Thumbs Atlas created: ${atlasWidth}x${atlasHeight} (${files.length} items)`);
}

async function main() {
  await buildOutfitThumbAtlas();
  await buildMountThumbAtlas();
  console.log('\n🎉 ALL THUMBNAIL ATLASES GENERATED SUCCESSFULLY!');
}

main().catch((err) => {
  console.error('Failed to generate thumbnail atlases:', err);
  process.exit(1);
});
