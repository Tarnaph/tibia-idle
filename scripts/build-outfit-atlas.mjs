import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';

const TILE_SIZE = 64;

async function buildOutfitAtlas(outfitPrefix, outDir) {
  console.log(`\n[Atlas Generator] Building atlas for outfit prefix: ${outfitPrefix}...`);
  const outfitDir = './public/generated/outfits';
  const allFiles = fs.readdirSync(outfitDir)
    .filter(f => f.startsWith(outfitPrefix + '-') && f.endsWith('.png'))
    .sort();

  console.log(`Found ${allFiles.length} files for ${outfitPrefix}.`);
  if (allFiles.length === 0) {
    throw new Error(`No files found for outfit prefix: ${outfitPrefix}`);
  }

  // Calculate layout:
  // 1024 width = 16 columns of 64px
  const cols = 16;
  const rows = Math.ceil(allFiles.length / cols);
  // Round up rows to next power of 2 or multiple of 16
  const atlasWidth = cols * TILE_SIZE; // 1024
  let atlasHeight = 512;
  while (atlasHeight < rows * TILE_SIZE) {
    atlasHeight *= 2;
  }

  console.log(`Atlas grid: ${cols} cols x ${rows} rows (Canvas: ${atlasWidth}x${atlasHeight}px)`);

  const overlays = [];
  const frames = {};

  for (let i = 0; i < allFiles.length; i++) {
    const filename = allFiles[i];
    const key = filename.replace(/\.png$/, '');
    const col = i % cols;
    const row = Math.floor(i / cols);
    const left = col * TILE_SIZE;
    const top = row * TILE_SIZE;

    const filePath = path.join(outfitDir, filename);
    overlays.push({
      input: filePath,
      left,
      top,
    });

    frames[key] = {
      x: left,
      y: top,
      w: TILE_SIZE,
      h: TILE_SIZE,
    };
  }

  const blankCanvas = sharp({
    create: {
      width: atlasWidth,
      height: atlasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  const finalPng = await blankCanvas.composite(overlays).png({ compressionLevel: 9 }).toBuffer();
  const hash = crypto.createHash('sha256').update(finalPng).digest('hex').substring(0, 8);

  const hashedPngName = `${outfitPrefix}-atlas.${hash}.png`;
  const canonicalPngName = `${outfitPrefix}-atlas.png`;
  const hashedJsonName = `${outfitPrefix}-atlas.${hash}.json`;
  const canonicalJsonName = `${outfitPrefix}-atlas.json`;

  const manifest = {
    name: outfitPrefix,
    hash,
    image: `/generated/atlases/outfits/${hashedPngName}`,
    canonicalImage: `/generated/atlases/outfits/${canonicalPngName}`,
    width: atlasWidth,
    height: atlasHeight,
    spriteWidth: TILE_SIZE,
    spriteHeight: TILE_SIZE,
    totalFrames: allFiles.length,
    frames,
  };

  fs.mkdirSync(outDir, { recursive: true });

  const hashedPngPath = path.join(outDir, hashedPngName);
  const canonicalPngPath = path.join(outDir, canonicalPngName);
  const hashedJsonPath = path.join(outDir, hashedJsonName);
  const canonicalJsonPath = path.join(outDir, canonicalJsonName);

  fs.writeFileSync(hashedPngPath, finalPng);
  fs.writeFileSync(canonicalPngPath, finalPng);
  fs.writeFileSync(hashedJsonPath, JSON.stringify(manifest, null, 2));
  fs.writeFileSync(canonicalJsonPath, JSON.stringify(manifest, null, 2));

  console.log(`✅ SUCCESS! Created outfit atlas:`);
  console.log(`- ${hashedPngPath} (${(finalPng.length / 1024).toFixed(1)} KB)`);
  console.log(`- ${hashedJsonPath} (${(fs.statSync(hashedJsonPath).size / 1024).toFixed(1)} KB)`);

  return manifest;
}

async function buildMountAtlas(mountPrefix, outDir) {
  console.log(`\n[Atlas Generator] Building atlas for mount prefix: ${mountPrefix}...`);
  const mountDir = './public/generated/mounts';
  const allFiles = fs.readdirSync(mountDir)
    .filter(f => f.startsWith(mountPrefix + '-') && f.endsWith('.png'))
    .sort();

  console.log(`Found ${allFiles.length} files for ${mountPrefix}.`);
  if (allFiles.length === 0) {
    throw new Error(`No files found for mount prefix: ${mountPrefix}`);
  }

  // 512 width = 8 columns of 64px
  const cols = 8;
  const rows = Math.ceil(allFiles.length / cols);
  const atlasWidth = cols * TILE_SIZE; // 512
  let atlasHeight = 256;
  while (atlasHeight < rows * TILE_SIZE) {
    atlasHeight *= 2;
  }

  console.log(`Atlas grid: ${cols} cols x ${rows} rows (Canvas: ${atlasWidth}x${atlasHeight}px)`);

  const overlays = [];
  const frames = {};

  for (let i = 0; i < allFiles.length; i++) {
    const filename = allFiles[i];
    const key = filename.replace(/\.png$/, '');
    const col = i % cols;
    const row = Math.floor(i / cols);
    const left = col * TILE_SIZE;
    const top = row * TILE_SIZE;

    const filePath = path.join(mountDir, filename);
    overlays.push({
      input: filePath,
      left,
      top,
    });

    frames[key] = {
      x: left,
      y: top,
      w: TILE_SIZE,
      h: TILE_SIZE,
    };
  }

  const blankCanvas = sharp({
    create: {
      width: atlasWidth,
      height: atlasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  const finalPng = await blankCanvas.composite(overlays).png({ compressionLevel: 9 }).toBuffer();
  const hash = crypto.createHash('sha256').update(finalPng).digest('hex').substring(0, 8);

  const hashedPngName = `${mountPrefix}-atlas.${hash}.png`;
  const canonicalPngName = `${mountPrefix}-atlas.png`;
  const hashedJsonName = `${mountPrefix}-atlas.${hash}.json`;
  const canonicalJsonName = `${mountPrefix}-atlas.json`;

  fs.mkdirSync(outDir, { recursive: true });

  const hashedPngPath = path.join(outDir, hashedPngName);
  const canonicalPngPath = path.join(outDir, canonicalPngName);
  const hashedJsonPath = path.join(outDir, hashedJsonName);
  const canonicalJsonPath = path.join(outDir, canonicalJsonName);

  const manifest = {
    name: mountPrefix,
    hash,
    image: `/generated/atlases/mounts/${hashedPngName}`,
    canonicalImage: `/generated/atlases/mounts/${canonicalPngName}`,
    width: atlasWidth,
    height: atlasHeight,
    spriteWidth: TILE_SIZE,
    spriteHeight: TILE_SIZE,
    totalFrames: allFiles.length,
    frames,
  };

  fs.writeFileSync(hashedPngPath, finalPng);
  fs.writeFileSync(canonicalPngPath, finalPng);
  fs.writeFileSync(hashedJsonPath, JSON.stringify(manifest, null, 2));
  fs.writeFileSync(canonicalJsonPath, JSON.stringify(manifest, null, 2));

  console.log(`✅ SUCCESS! Created mount atlas:`);
  console.log(`- ${hashedPngPath} (${(finalPng.length / 1024).toFixed(1)} KB)`);
  console.log(`- ${hashedJsonPath} (${(fs.statSync(hashedJsonPath).size / 1024).toFixed(1)} KB)`);

  return manifest;
}

async function main() {
  const outfitDir = './public/generated/atlases/outfits';
  const mountDir = './public/generated/atlases/mounts';

  const assassinManifest = await buildOutfitAtlas('assassin-male', outfitDir);
  const pantherManifest = await buildMountAtlas('midnight-panther', mountDir);

  // Write master index for fast client-side lookup:
  const masterIndex = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    outfits: {
      'assassin-male': {
        hash: assassinManifest.hash,
        image: assassinManifest.image,
        canonicalImage: assassinManifest.canonicalImage,
        json: `/generated/atlases/outfits/assassin-male-atlas.${assassinManifest.hash}.json`,
        framesCount: assassinManifest.totalFrames,
      }
    },
    mounts: {
      'midnight-panther': {
        hash: pantherManifest.hash,
        image: pantherManifest.image,
        canonicalImage: pantherManifest.canonicalImage,
        json: `/generated/atlases/mounts/midnight-panther-atlas.${pantherManifest.hash}.json`,
        framesCount: pantherManifest.totalFrames,
      }
    }
  };

  const masterPath = './public/generated/atlases/outfit-mount-index.json';
  fs.writeFileSync(masterPath, JSON.stringify(masterIndex, null, 2));
  console.log(`\n✅ Master index written to ${masterPath}`);

  // Write TypeScript manifests module for instant static compilation without JSON network requests:
  const tsContent = `// Auto-generated by scripts/build-outfit-atlas.mjs - DO NOT EDIT MANUALLY

export interface AtlasFrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface OutfitAtlasManifest {
  name: string;
  hash: string;
  image: string;
  canonicalImage: string;
  width: number;
  height: number;
  spriteWidth: number;
  spriteHeight: number;
  totalFrames: number;
  frames: Record<string, AtlasFrameRect>;
}

export const OUTFIT_ATLAS_MANIFESTS: Record<string, OutfitAtlasManifest> = {
  'assassin-male': ${JSON.stringify(assassinManifest, null, 2)},
};

export const MOUNT_ATLAS_MANIFESTS: Record<string, OutfitAtlasManifest> = {
  'midnight-panther': ${JSON.stringify(pantherManifest, null, 2)},
};
`;

  const tsPath = './content/generated/atlas-manifests.ts';
  fs.writeFileSync(tsPath, tsContent);
  console.log(`✅ TypeScript manifests written to ${tsPath}`);
}

main().catch(err => {
  console.error('[Error building atlas]:', err);
  process.exit(1);
});
