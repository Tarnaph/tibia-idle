import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { parseTibia860Dat, spriteIndex } from '../packages/tibia860-assets/src/dat.ts';
import { parseTibia860Spr } from '../packages/tibia860-assets/src/spr.ts';

const PROJECT_ROOT = process.cwd();
const DAT_PATH = path.resolve(PROJECT_ROOT, '..', 'tibia-860-client', 'Tibia.dat');
const SPR_PATH = path.resolve(PROJECT_ROOT, '..', 'tibia-860-client', 'Tibia.spr');

const OUTPUT_DIR = path.resolve(PROJECT_ROOT, 'public/generated/outfits');
const THUMBS_DIR = path.resolve(PROJECT_ROOT, 'public/generated/outfit-thumbs');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(THUMBS_DIR, { recursive: true });

console.log('Loading Tibia 8.60 DAT and SPR...');
const datBuf = fs.readFileSync(DAT_PATH);
const sprBuf = fs.readFileSync(SPR_PATH);
const dat = parseTibia860Dat(datBuf);
const spr = parseTibia860Spr(sprBuf);
console.log('Loaded DAT & SPR successfully.');

const OUTFIT_MAP: Record<string, { male: number; female: number }> = {
  citizen: { male: 128, female: 136 },
  hunter: { male: 129, female: 137 },
  mage: { male: 130, female: 138 },
  knight: { male: 131, female: 139 },
  noble: { male: 132, female: 140 },
  summoner: { male: 133, female: 141 },
  warrior: { male: 134, female: 142 },
  barbarian: { male: 143, female: 147 },
  druid: { male: 144, female: 148 },
  sorcerer: { male: 145, female: 149 },
  oriental: { male: 146, female: 150 },
  pirate: { male: 151, female: 155 },
  assassin: { male: 152, female: 156 },
  beggar: { male: 153, female: 157 },
  paladin: { male: 129, female: 137 },
};

const DIRECTIONS = [
  { name: 'north', x: 0 },
  { name: 'east', x: 1 },
  { name: 'south', x: 2 },
  { name: 'west', x: 3 },
];

// Default preview colors (Tibia classic Citizen look)
const DEFAULT_COLORS = {
  head: [255, 170, 0],    // orange/brown hair
  body: [0, 85, 255],     // blue shirt
  legs: [0, 170, 0],      // green pants
  feet: [115, 60, 30],    // brown shoes
};

interface OutfitManifestEntry {
  id: string;
  maleLooktype: number;
  femaleLooktype: number;
  layers: number;
  frames: number;
}

const manifest: Record<string, OutfitManifestEntry> = {};

async function extractAll() {
  for (const [outfitKey, looktypes] of Object.entries(OUTFIT_MAP)) {
    console.log(`Processing ${outfitKey} (male: ${looktypes.male}, female: ${looktypes.female})...`);
    manifest[outfitKey] = {
      id: outfitKey,
      maleLooktype: looktypes.male,
      femaleLooktype: looktypes.female,
      layers: 2,
      frames: 3,
    };

    for (const gender of ['male', 'female'] as const) {
      const looktype = looktypes[gender];
      const app = dat.appearances.creature.get(looktype);
      if (!app) {
        console.warn(`Creature ${looktype} not found in DAT!`);
        continue;
      }

      const width = app.width * 32;
      const height = app.height * 32;

      for (const dir of DIRECTIONS) {
        for (let frame = 0; frame < Math.min(app.frames, 3); frame++) {
          const l0Rgba = Buffer.alloc(width * height * 4);
          const l1Rgba = Buffer.alloc(width * height * 4);

          for (let w = 0; w < app.width; w++) {
            for (let h = 0; h < app.height; h++) {
              // Layer 0: Base
              const idx0 = spriteIndex(app, { width: w, height: h, layer: 0, x: dir.x, y: 0, z: 0, frame });
              const sId0 = app.spriteIds[idx0];
              const buf0 = spr.decode(sId0);

              // Layer 1: Mask
              const idx1 = spriteIndex(app, { width: w, height: h, layer: 1, x: dir.x, y: 0, z: 0, frame });
              const sId1 = app.spriteIds[idx1];
              const buf1 = spr.decode(sId1);

              const targetX = (app.width - 1 - w) * 32;
              const targetY = (app.height - 1 - h) * 32;

              for (let y = 0; y < 32; y++) {
                for (let x = 0; x < 32; x++) {
                  const srcOff = (y * 32 + x) * 4;
                  const tgtOff = ((targetY + y) * width + (targetX + x)) * 4;
                  if (buf0[srcOff + 3] > 0) {
                    l0Rgba[tgtOff] = buf0[srcOff];
                    l0Rgba[tgtOff + 1] = buf0[srcOff + 1];
                    l0Rgba[tgtOff + 2] = buf0[srcOff + 2];
                    l0Rgba[tgtOff + 3] = buf0[srcOff + 3];
                  }
                  if (buf1[srcOff + 3] > 0) {
                    l1Rgba[tgtOff] = buf1[srcOff];
                    l1Rgba[tgtOff + 1] = buf1[srcOff + 1];
                    l1Rgba[tgtOff + 2] = buf1[srcOff + 2];
                    l1Rgba[tgtOff + 3] = buf1[srcOff + 3];
                  }
                }
              }
            }
          }

          // Save Layer 0 (Base)
          const baseFile = path.join(OUTPUT_DIR, `${outfitKey}-${gender}-${dir.name}-f${frame}-base.png`);
          await sharp(l0Rgba, { raw: { width, height, channels: 4 } }).png().toFile(baseFile);

          // Save Layer 1 (Mask)
          const maskFile = path.join(OUTPUT_DIR, `${outfitKey}-${gender}-${dir.name}-f${frame}-mask.png`);
          await sharp(l1Rgba, { raw: { width, height, channels: 4 } }).png().toFile(maskFile);

          // If male, south, frame 0: Also generate recolored clean thumbnail
          if (gender === 'male' && dir.name === 'south' && frame === 0) {
            const recolored = Buffer.alloc(width * height * 4);
            for (let i = 0; i < width * height * 4; i += 4) {
              const a0 = l0Rgba[i + 3];
              if (a0 === 0) continue;
              const r0 = l0Rgba[i];
              const g0 = l0Rgba[i + 1];
              const b0 = l0Rgba[i + 2];

              const mR = l1Rgba[i];
              const mG = l1Rgba[i + 1];
              const mB = l1Rgba[i + 2];
              const mA = l1Rgba[i + 3];

              let tint: number[] | null = null;
              if (mA > 0) {
                if (mR > 200 && mG < 50 && mB < 50) tint = DEFAULT_COLORS.head;
                else if (mG > 200 && mR < 50 && mB < 50) tint = DEFAULT_COLORS.body;
                else if (mB > 200 && mR < 50 && mG < 50) tint = DEFAULT_COLORS.legs;
                else if (mR > 200 && mG > 200 && mB < 50) tint = DEFAULT_COLORS.feet;
              }

              if (tint) {
                recolored[i] = Math.round((r0 * tint[0]) / 255);
                recolored[i + 1] = Math.round((g0 * tint[1]) / 255);
                recolored[i + 2] = Math.round((b0 * tint[2]) / 255);
                recolored[i + 3] = a0;
              } else {
                recolored[i] = r0;
                recolored[i + 1] = g0;
                recolored[i + 2] = b0;
                recolored[i + 3] = a0;
              }
            }

            const thumbFile = path.join(THUMBS_DIR, `${outfitKey}.png`);
            await sharp(recolored, { raw: { width, height, channels: 4 } }).png().toFile(thumbFile);
          }
        }
      }
    }
  }

  // Handle Sire:
  // Sire already has transparent cutouts in public/generated/tibia860/outfit-sire-*-frame-*.png
  console.log('Processing Sire outfit layers...');
  manifest['sire'] = {
    id: 'sire',
    maleLooktype: 9999,
    femaleLooktype: 9999,
    layers: 1,
    frames: 3,
  };

  const sireEmptyMask = Buffer.alloc(64 * 64 * 4); // empty mask
  for (const gender of ['male', 'female'] as const) {
    for (const dir of DIRECTIONS) {
      for (let frame = 0; frame < 3; frame++) {
        const sireSrc = path.resolve(PROJECT_ROOT, `public/generated/tibia860/outfit-sire-${dir.name}-frame-${frame}.png`);
        const baseFile = path.join(OUTPUT_DIR, `sire-${gender}-${dir.name}-f${frame}-base.png`);
        const maskFile = path.join(OUTPUT_DIR, `sire-${gender}-${dir.name}-f${frame}-mask.png`);

        if (fs.existsSync(sireSrc)) {
          fs.copyFileSync(sireSrc, baseFile);
        }
        await sharp(sireEmptyMask, { raw: { width: 64, height: 64, channels: 4 } }).png().toFile(maskFile);
      }
    }
  }

  const manifestPath = path.resolve(PROJECT_ROOT, 'content/generated/outfit-layers.json');
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('Wrote content/generated/outfit-layers.json');
  console.log('SUCCESS: All outfit base and mask layers extracted!');
}

extractAll().catch((err) => {
  console.error('Extraction failed:', err);
  process.exit(1);
});
