import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';

const TILE_SIZE = 64;

/**
 * Builds a texture atlas for an outfit prefix using only the actual files that exist on disk.
 * Does not assume 9 frames, 4 directions, or addons if they do not exist for this outfit.
 */
async function buildOutfitAtlas(outfitPrefix, outfitDir, outDir) {
  const allFiles = fs.readdirSync(outfitDir)
    .filter(f => f.startsWith(outfitPrefix + '-') && f.endsWith('.png'))
    .sort();

  if (allFiles.length === 0) {
    throw new Error(`No files found for outfit prefix: ${outfitPrefix}`);
  }

  // Calculate grid layout:
  // For outfits with many files (e.g. 432), 16 columns (1024px)
  // For outfits with few files (e.g. 24 or 144), adapt column count
  const cols = allFiles.length > 32 ? 16 : 8;
  const rows = Math.ceil(allFiles.length / cols);
  const atlasWidth = cols * TILE_SIZE;

  let atlasHeight = 128;
  while (atlasHeight < rows * TILE_SIZE) {
    atlasHeight *= 2;
  }

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

  const canonicalPngPath = path.join(outDir, `${outfitPrefix}-atlas.png`);
  const canonicalJsonPath = path.join(outDir, `${outfitPrefix}-atlas.json`);
  if (fs.existsSync(canonicalPngPath) && fs.existsSync(canonicalJsonPath)) {
    try {
      const existingManifest = JSON.parse(fs.readFileSync(canonicalJsonPath, 'utf8'));
      if (existingManifest.totalFrames === allFiles.length) {
        return existingManifest;
      }
    } catch {}
  }

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
  const hashedJsonPath = path.join(outDir, hashedJsonName);

  fs.writeFileSync(hashedPngPath, finalPng);
  fs.writeFileSync(canonicalPngPath, finalPng);
  fs.writeFileSync(hashedJsonPath, JSON.stringify(manifest));
  fs.writeFileSync(canonicalJsonPath, JSON.stringify(manifest));

  return manifest;
}

/**
 * Builds a texture atlas for a mount prefix using only the actual files that exist on disk.
 */
async function buildMountAtlas(mountPrefix, mountDir, outDir) {
  const allFiles = fs.readdirSync(mountDir)
    .filter(f => f.startsWith(mountPrefix + '-') && f.endsWith('.png'))
    .sort();

  if (allFiles.length === 0) {
    throw new Error(`No files found for mount prefix: ${mountPrefix}`);
  }

  const cols = 8;
  const rows = Math.ceil(allFiles.length / cols);
  const atlasWidth = cols * TILE_SIZE; // 512
  let atlasHeight = 256;
  while (atlasHeight < rows * TILE_SIZE) {
    atlasHeight *= 2;
  }

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

  const canonicalPngPath = path.join(outDir, `${mountPrefix}-atlas.png`);
  const canonicalJsonPath = path.join(outDir, `${mountPrefix}-atlas.json`);
  if (fs.existsSync(canonicalPngPath) && fs.existsSync(canonicalJsonPath)) {
    try {
      const existingManifest = JSON.parse(fs.readFileSync(canonicalJsonPath, 'utf8'));
      if (existingManifest.totalFrames === allFiles.length) {
        return existingManifest;
      }
    } catch {}
  }

  const finalPng = await blankCanvas.composite(overlays).png({ compressionLevel: 9 }).toBuffer();
  const hash = crypto.createHash('sha256').update(finalPng).digest('hex').substring(0, 8);
  const hashedPngName = `${mountPrefix}-atlas.${hash}.png`;
  const canonicalPngName = `${mountPrefix}-atlas.png`;
  const hashedJsonName = `${mountPrefix}-atlas.${hash}.json`;
  const canonicalJsonName = `${mountPrefix}-atlas.json`;

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

  fs.mkdirSync(outDir, { recursive: true });

  const hashedPngPath = path.join(outDir, hashedPngName);
  const hashedJsonPath = path.join(outDir, hashedJsonName);

  fs.writeFileSync(hashedPngPath, finalPng);
  fs.writeFileSync(canonicalPngPath, finalPng);
  fs.writeFileSync(hashedJsonPath, JSON.stringify(manifest));
  fs.writeFileSync(canonicalJsonPath, JSON.stringify(manifest));

  return manifest;
}

async function main() {
  const startTime = Date.now();
  console.log('================================================================');
  console.log('PHASE 181: BATCH TEXTURE ATLAS GENERATOR FOR ALL OUTFITS & MOUNTS');
  console.log('================================================================');

  const outfitsDir = './public/generated/outfits';
  const mountsDir = './public/generated/mounts';
  const outOutfitsDir = './public/generated/atlases/outfits';
  const outMountsDir = './public/generated/atlases/mounts';

  fs.mkdirSync(outOutfitsDir, { recursive: true });
  fs.mkdirSync(outMountsDir, { recursive: true });

  // 1. Identify all outfit prefixes
  const outfitFiles = fs.readdirSync(outfitsDir).filter(f => f.endsWith('.png'));
  const outfitPrefixes = new Set();
  for (const f of outfitFiles) {
    const m = f.match(/^(.+)-(male|female)-/);
    if (m) outfitPrefixes.add(m[1] + '-' + m[2]);
  }
  const sortedOutfits = Array.from(outfitPrefixes).sort();
  console.log(`Discovered ${sortedOutfits.length} unique outfit variations to compile.`);

  // 2. Identify all mount prefixes
  const mountFiles = fs.readdirSync(mountsDir).filter(f => f.endsWith('.png'));
  const mountPrefixes = new Set();
  for (const f of mountFiles) {
    const m = f.match(/^(.+)-(south|east|north|west)-f\d+\.png$/);
    if (m) mountPrefixes.add(m[1]);
  }
  const sortedMounts = Array.from(mountPrefixes).sort();
  console.log(`Discovered ${sortedMounts.length} unique mount types to compile.`);

  const outfitIndex = {};
  const mountIndex = {};

  // Build outfits with worker concurrency
  console.log('\n--- Building Outfit Texture Atlases ---');
  let outfitDone = 0;
  const outfitConcurrency = 6;
  for (let i = 0; i < sortedOutfits.length; i += outfitConcurrency) {
    const batch = sortedOutfits.slice(i, i + outfitConcurrency);
    await Promise.all(batch.map(async (prefix) => {
      try {
        const manifest = await buildOutfitAtlas(prefix, outfitsDir, outOutfitsDir);
        outfitIndex[prefix] = {
          name: manifest.name,
          hash: manifest.hash,
          image: manifest.image,
          canonicalImage: manifest.canonicalImage,
          json: `/generated/atlases/outfits/${manifest.name}-atlas.${manifest.hash}.json`,
          canonicalJson: `/generated/atlases/outfits/${manifest.name}-atlas.json`,
          width: manifest.width,
          height: manifest.height,
          framesCount: manifest.totalFrames,
        };
        outfitDone++;
        process.stdout.write(`\rCompiled outfits: ${outfitDone}/${sortedOutfits.length} (${((outfitDone / sortedOutfits.length) * 100).toFixed(0)}%)`);
      } catch (err) {
        console.error(`\nFailed to compile outfit atlas: ${prefix}`, err);
      }
    }));
  }
  console.log(`\n✅ Completed ${outfitDone} outfit atlases.`);

  // Build mounts with worker concurrency
  console.log('\n--- Building Mount Texture Atlases ---');
  let mountDone = 0;
  const mountConcurrency = 8;
  for (let i = 0; i < sortedMounts.length; i += mountConcurrency) {
    const batch = sortedMounts.slice(i, i + mountConcurrency);
    await Promise.all(batch.map(async (prefix) => {
      try {
        const manifest = await buildMountAtlas(prefix, mountsDir, outMountsDir);
        mountIndex[prefix] = {
          name: manifest.name,
          hash: manifest.hash,
          image: manifest.image,
          canonicalImage: manifest.canonicalImage,
          json: `/generated/atlases/mounts/${manifest.name}-atlas.${manifest.hash}.json`,
          canonicalJson: `/generated/atlases/mounts/${manifest.name}-atlas.json`,
          width: manifest.width,
          height: manifest.height,
          framesCount: manifest.totalFrames,
        };
        mountDone++;
        process.stdout.write(`\rCompiled mounts: ${mountDone}/${sortedMounts.length} (${((mountDone / sortedMounts.length) * 100).toFixed(0)}%)`);
      } catch (err) {
        console.error(`\nFailed to compile mount atlas: ${prefix}`, err);
      }
    }));
  }
  console.log(`\n✅ Completed ${mountDone} mount atlases.`);

  // Write master index for fast client-side lookup:
  const masterIndex = {
    version: '2.0',
    generatedAt: new Date().toISOString(),
    outfitsCount: Object.keys(outfitIndex).length,
    mountsCount: Object.keys(mountIndex).length,
    outfits: outfitIndex,
    mounts: mountIndex,
  };

  const masterPath = './public/generated/atlases/outfit-mount-index.json';
  fs.writeFileSync(masterPath, JSON.stringify(masterIndex, null, 2));
  console.log(`\n✅ Master index written to ${masterPath} (${(fs.statSync(masterPath).size / 1024).toFixed(1)} KB)`);

  const contentIndexPath = './content/generated/atlas-index.json';
  fs.mkdirSync(path.dirname(contentIndexPath), { recursive: true });
  fs.writeFileSync(contentIndexPath, JSON.stringify(masterIndex, null, 2));
  console.log(`✅ Content index written to ${contentIndexPath}`);

  // Write lightweight TypeScript manifests module:
  const tsContent = `// Auto-generated by scripts/build-all-outfit-atlases.mjs - DO NOT EDIT MANUALLY
import atlasIndexData from './atlas-index.json';

export interface AtlasFrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AtlasMetadata {
  name: string;
  hash: string;
  image: string;
  canonicalImage: string;
  json: string;
  canonicalJson: string;
  width: number;
  height: number;
  framesCount: number;
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

export const OUTFIT_ATLAS_INDEX = atlasIndexData.outfits as Record<string, AtlasMetadata>;
export const MOUNT_ATLAS_INDEX = atlasIndexData.mounts as Record<string, AtlasMetadata>;

// Global in-memory cache for decoded manifests, populated on-demand to keep initial bundle lean:
export const OUTFIT_ATLAS_MANIFESTS: Record<string, OutfitAtlasManifest> = {};
export const MOUNT_ATLAS_MANIFESTS: Record<string, OutfitAtlasManifest> = {};
`;

  const tsPath = './content/generated/atlas-manifests.ts';
  fs.writeFileSync(tsPath, tsContent);
  console.log(`✅ TypeScript manifests written to ${tsPath}`);

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🎉 BATCH ATLAS GENERATION FINISHED IN ${elapsedSec}s!`);
}

main().catch(err => {
  console.error('[Fatal Error in Batch Generator]:', err);
  process.exit(1);
});
