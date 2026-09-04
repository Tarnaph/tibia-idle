const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const USER_INPUTS = {
  north: 'C:/Users/desig/.gemini/antigravity-ide/brain/897680f6-8d91-4c69-aa75-f4c650caea80/.user_uploaded/media_1788482377721.png',
  south: 'C:/Users/desig/.gemini/antigravity-ide/brain/897680f6-8d91-4c69-aa75-f4c650caea80/.user_uploaded/media_1788482377743.png',
  east:  'C:/Users/desig/.gemini/antigravity-ide/brain/897680f6-8d91-4c69-aa75-f4c650caea80/.user_uploaded/media_1788482377755.png',
  west:  'C:/Users/desig/.gemini/antigravity-ide/brain/897680f6-8d91-4c69-aa75-f4c650caea80/.user_uploaded/media_1788482377796.png'
};

const OUTPUT_DIR = path.resolve(__dirname, '../public/generated/tibia860');
const SIRE_EXPORT_DIR = path.resolve(OUTPUT_DIR, 'sire');
const SIRE_32_DIR = path.resolve(SIRE_EXPORT_DIR, 'raw-32x32');
const SIRE_HIRES_DIR = path.resolve(SIRE_EXPORT_DIR, 'hires-cutouts');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(SIRE_EXPORT_DIR, { recursive: true });
fs.mkdirSync(SIRE_32_DIR, { recursive: true });
fs.mkdirSync(SIRE_HIRES_DIR, { recursive: true });

async function processSprites() {
  console.log('--- Generating Sire Outfit Sprites ---');
  
  const directions = ['north', 'east', 'south', 'west'];
  const framesMetadata = [];
  const raw32Buffers = {};
  const frame64Buffers = { north: [], east: [], south: [], west: [] };

  for (const dir of directions) {
    const srcFile = USER_INPUTS[dir];
    if (!fs.existsSync(srcFile)) {
      throw new Error(`Input file for ${dir} does not exist: ${srcFile}`);
    }

    // 1. Load and trim source
    const trimmedBuf = await sharp(srcFile).trim().toBuffer();
    
    // Save hires cleaned cutout
    await sharp(trimmedBuf).toFile(path.join(SIRE_HIRES_DIR, `sire-${dir}-hires.png`));

    // 2. Downscale to 32px height using lanczos3 for clean pixel edges
    const downscaled = await sharp(trimmedBuf)
      .resize({ height: 32, kernel: 'lanczos3' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height } = downscaled.info;
    const data = downscaled.data;

    // 3. Clean alpha thresholding: Tibia 8.60 sprites use binary alpha (0 or 255)
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 110) {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 0;
      } else {
        data[i + 3] = 255;
      }
    }

    // Save individual 32x32 sprite (centered or anchored in 32x32 canvas if <=32, or exact size)
    const rawSpritePng = await sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
    raw32Buffers[dir] = { buffer: rawSpritePng, width, height };

    // Also produce a standardized 32x32 tile for sprite editors
    const fit32 = await sharp(rawSpritePng)
      .resize({ width: 32, height: 32, fit: 'inside' })
      .png()
      .toBuffer();
    const fit32Meta = await sharp(fit32).metadata();

    const std32 = await sharp({
      create: { width: 32, height: 32, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    })
    .composite([{
      input: fit32,
      left: Math.max(0, Math.floor((32 - (fit32Meta.width || 32)) / 2)),
      top: Math.max(0, 32 - (fit32Meta.height || 32))
    }])
    .png()
    .toBuffer();
    await sharp(std32).toFile(path.join(SIRE_32_DIR, `sire_${dir}_32x32.png`));

    // 4. Generate the 3 animation frames on 64x64 canvas
    // Frame 0: base standing pose
    // Base placement: feet touch y=63 (top = 64 - height = 32), right side aligns to x=63 (left = 64 - width)
    const baseTop = 64 - height;
    const baseLeft = Math.min(64 - width, Math.max(0, 64 - width));

    const offsets = [
      { f: 0, dY: 0, dX: 0 },   // Frame 0: idle / standing base
      { f: 1, dY: -1, dX: 0 },  // Frame 1: subtle 1px floating glide up
      { f: 2, dY: -1, dX: dir === 'east' ? 1 : dir === 'west' ? -1 : 0 } // Frame 2: subtle float glide with lateral sway
    ];

    for (const { f, dY, dX } of offsets) {
      const frameTop = Math.max(0, Math.min(64 - height, baseTop + dY));
      const frameLeft = Math.max(0, Math.min(64 - width, baseLeft + dX));

      const framePng = await sharp({
        create: { width: 64, height: 64, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
      })
      .composite([{ input: rawSpritePng, top: frameTop, left: frameLeft }])
      .png()
      .toBuffer();

      const fileName = `outfit-sire-${dir}-frame-${f}.png`;
      const filePath = path.join(OUTPUT_DIR, fileName);
      await sharp(framePng).toFile(filePath);

      frame64Buffers[dir].push(framePng);

      const sha256 = crypto.createHash('sha256').update(framePng).digest('hex').toUpperCase();

      framesMetadata.push({
        frame: f,
        direction: dir,
        pattern: { x: 0, y: 0, z: 0 },
        layer: 0,
        spriteIds: [99900 + f, 0, 0, 0],
        file: `public/generated/tibia860/${fileName}`,
        publicUrl: `/generated/tibia860/${fileName}`,
        sha256,
        width: 64,
        height: 64
      });
      console.log(`Generated: ${fileName} (${sha256.slice(0, 12)}...)`);
    }
  }

  // 5. Build 64x64 Sprite Sheet (192 x 256: 3 columns x 4 rows [north, east, south, west])
  const sheetComposites = [];
  directions.forEach((dir, row) => {
    frame64Buffers[dir].forEach((buf, col) => {
      sheetComposites.push({
        input: buf,
        left: col * 64,
        top: row * 64
      });
    });
  });

  const spriteSheet = await sharp({
    create: { width: 192, height: 256, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
  .composite(sheetComposites)
  .png()
  .toFile(path.join(SIRE_EXPORT_DIR, 'sire-spritesheet-64x64.png'));
  console.log('Generated Sprite Sheet: sire-spritesheet-64x64.png');

  // 6. Build 32x32 Sprite Sheet (96 x 128: 3 columns x 4 rows for Tibia Object Builder)
  const sheet32Composites = [];
  for (let row = 0; row < directions.length; row++) {
    const dir = directions[row];
    const std32Buf = await sharp(path.join(SIRE_32_DIR, `sire_${dir}_32x32.png`)).toBuffer();
    for (let col = 0; col < 3; col++) {
      sheet32Composites.push({
        input: std32Buf,
        left: col * 32,
        top: row * 32
      });
    }
  }

  await sharp({
    create: { width: 96, height: 128, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
  .composite(sheet32Composites)
  .png()
  .toFile(path.join(SIRE_EXPORT_DIR, 'sire-spritesheet-32x32.png'));
  console.log('Generated Object Builder Sprite Sheet: sire-spritesheet-32x32.png');

  // 7. Update content/generated/tibia860-assets.json
  const assetsJsonPath = path.resolve(__dirname, '../content/generated/tibia860-assets.json');
  const assets = JSON.parse(fs.readFileSync(assetsJsonPath, 'utf-8'));

  assets.outfits['Sire'] = {
    key: 'outfit-sire',
    kind: 'creature',
    label: 'Sire custom outfit',
    appearanceId: 999,
    sourceId: 999,
    sourceFile: 'custom/sire.png',
    relationship: 'selected-outfit',
    validation: 'Custom Sire outfit provided by user, converted to standard 64x64 Tibia sprite frames.',
    appearance: {
      width: 2,
      height: 2,
      exactSize: 46,
      layers: 1,
      patternX: 4,
      patternY: 3,
      patternZ: 1,
      frames: 3,
      attributes: [24],
      spriteIds: [99900, 99901, 99902, 99903]
    },
    extractedPattern: { x: 0, y: 0, z: 0 },
    extractedLayer: 0,
    frames: framesMetadata,
    notes: ['Custom Sire outfit converted from user PNG to standard 64x64 Tibia sprite frames with transparent background.']
  };

  fs.writeFileSync(assetsJsonPath, JSON.stringify(assets, null, 2), 'utf-8');
  console.log('Updated tibia860-assets.json with Sire outfit mapping!');
}

processSprites().catch(err => {
  console.error('Failed to generate sprites:', err);
  process.exit(1);
});
