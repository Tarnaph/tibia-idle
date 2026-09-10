import fs from 'fs';
import path from 'path';
import { parseTibia1098Dat, spriteIndex } from '../packages/tibia1098-assets/src/dat.ts';
import { parseTibia1098Spr } from '../packages/tibia1098-assets/src/spr.ts';
import { encodeRgbaPng } from '../packages/tibia1098-assets/src/png.ts';

const PROJECT_ROOT = process.cwd();
const OUTFITS_DIR = path.resolve(PROJECT_ROOT, 'public/generated/outfits');
const OUTFIT_THUMBS_DIR = path.resolve(PROJECT_ROOT, 'public/generated/outfit-thumbs');
const MOUNTS_DIR = path.resolve(PROJECT_ROOT, 'public/generated/mounts');

fs.mkdirSync(OUTFITS_DIR, { recursive: true });
fs.mkdirSync(OUTFIT_THUMBS_DIR, { recursive: true });
fs.mkdirSync(MOUNTS_DIR, { recursive: true });

console.log('Loading Tibia 10.98 DAT and SPR...');
const dat = parseTibia1098Dat(fs.readFileSync('Tibia 10/tibia/Tibia.dat'));
const spr = parseTibia1098Spr(fs.readFileSync('Tibia 10/tibia/Tibia.spr'));
console.log('DAT and SPR loaded successfully.');

function copySprite(target, targetWidth, sprite, offsetX, offsetY) {
  for (let y = 0; y < 32; y += 1) {
    const srcOffset = y * 32 * 4;
    const dstOffset = ((offsetY + y) * targetWidth + offsetX) * 4;
    sprite.copy(target, dstOffset, srcOffset, srcOffset + 32 * 4);
  }
}

function renderAppearanceRgba(appearance, coordinates) {
  const width = appearance.width * 32;
  const height = appearance.height * 32;
  const rgba = Buffer.alloc(width * height * 4);

  for (let tileWidth = 0; tileWidth < appearance.width; tileWidth += 1) {
    for (let tileHeight = 0; tileHeight < appearance.height; tileHeight += 1) {
      const index = spriteIndex(appearance, {
        width: tileWidth,
        height: tileHeight,
        ...coordinates,
      });
      const spriteId = appearance.spriteIds[index];
      if (spriteId) {
        copySprite(
          rgba,
          width,
          spr.decode(spriteId),
          (appearance.width - tileWidth - 1) * 32,
          (appearance.height - tileHeight - 1) * 32,
        );
      }
    }
  }
  return { rgba, width, height };
}

// Recolor RGBA using standard tibia 4-color mask
function applyRecolor(baseRgba, maskRgba, width, height, colors) {
  const out = Buffer.alloc(width * height * 4);
  const total = width * height * 4;

  for (let i = 0; i < total; i += 4) {
    const a0 = baseRgba[i + 3];
    if (a0 === 0) continue;

    const r0 = baseRgba[i];
    const g0 = baseRgba[i + 1];
    const b0 = baseRgba[i + 2];

    const mA = maskRgba[i + 3];
    let tint = null;

    if (mA > 0) {
      const mR = maskRgba[i];
      const mG = maskRgba[i + 1];
      const mB = maskRgba[i + 2];

      if (mR > 200 && mG < 50 && mB < 50) tint = colors.head;
      else if (mG > 200 && mR < 50 && mB < 50) tint = colors.body;
      else if (mB > 200 && mR < 50 && mG < 50) tint = colors.legs;
      else if (mR > 200 && mG > 200 && mB < 50) tint = colors.feet;
    }

    if (tint) {
      out[i] = Math.round((r0 * tint[0]) / 255);
      out[i + 1] = Math.round((g0 * tint[1]) / 255);
      out[i + 2] = Math.round((b0 * tint[2]) / 255);
      out[i + 3] = a0;
    } else {
      out[i] = r0;
      out[i + 1] = g0;
      out[i + 2] = b0;
      out[i + 3] = a0;
    }
  }
  return out;
}

const DEFAULT_COLORS = {
  head: [255, 170, 0],
  body: [0, 85, 255],
  legs: [0, 170, 0],
  feet: [170, 85, 0],
};

const DIRECTIONS = [
  { name: 'north', x: 0 },
  { name: 'east', x: 1 },
  { name: 'south', x: 2 },
  { name: 'west', x: 3 },
];

// ==========================================
// 1. EXTRACT OUTFITS
// ==========================================
console.log('Reading outfits.xml...');
const outfitsXml = fs.readFileSync('realmap11/data/XML/outfits.xml', 'utf8');
const outfitRegex = /<outfit\s+type="(\d+)"\s+looktype="(\d+)"\s+name="([^"]+)"(?:\s+premium="([^"]*)")?(?:\s+unlocked="([^"]*)")?(?:\s+enabled="([^"]*)")?/g;

const femaleMap = new Map();
const maleMap = new Map();

let match;
while ((match = outfitRegex.exec(outfitsXml)) !== null) {
  const type = Number(match[1]);
  const lookType = Number(match[2]);
  const name = match[3];
  const premium = match[4] === 'yes';
  const unlocked = match[5] !== 'no';
  const enabled = match[6] !== 'no';

  if (type === 0) {
    femaleMap.set(name.toLowerCase(), { lookType, name, premium, unlocked, enabled });
  } else {
    maleMap.set(name.toLowerCase(), { lookType, name, premium, unlocked, enabled });
  }
}

const genderAliases = {
  noblewoman: 'nobleman',
  norsewoman: 'norseman',
  nobleman: 'noblewoman',
  norseman: 'norsewoman',
  'retro noblewoman': 'retro nobleman',
  'retro nobleman': 'retro noblewoman',
};

const outfitCatalogue = [];
const processedNames = new Set();

for (const [fName, fData] of femaleMap.entries()) {
  const mMatchName = maleMap.has(fName) ? fName : genderAliases[fName];
  if (mMatchName && maleMap.has(mMatchName)) {
    const mData = maleMap.get(mMatchName);
    const id = fData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    outfitCatalogue.push({
      id,
      name: fData.name.replace(/woman$/i, 'man').replace(/^Noblewoman$/i, 'Noble').replace(/^Norsewoman$/i, 'Norseman').replace(/^Retro Noblewoman$/i, 'Retro Noble'),
      femaleName: fData.name,
      maleName: mData.name,
      femaleLookType: fData.lookType,
      maleLookType: mData.lookType,
      premium: fData.premium || mData.premium,
      unlocked: fData.unlocked || mData.unlocked,
    });
    processedNames.add(fName);
    processedNames.add(mMatchName);
  }
}

console.log(`Processing ${outfitCatalogue.length} canonical outfits...`);

let outfitsProcessed = 0;
for (const outfit of outfitCatalogue) {
  for (const gender of ['male', 'female']) {
    const lookType = gender === 'male' ? outfit.maleLookType : outfit.femaleLookType;
    const app = dat.appearances.creature.get(lookType);
    if (!app) {
      console.warn(`Missing creature appearance for lookType ${lookType} (${outfit.name} ${gender})`);
      continue;
    }

    const grp = app.frameGroups?.[0] || app;
    const hasAddon1 = grp.patternY >= 2;
    const hasAddon2 = grp.patternY >= 3;
    const hasMountRider = grp.patternZ >= 2;

    if (gender === 'male') {
      outfit.hasAddon1 = hasAddon1;
      outfit.hasAddon2 = hasAddon2;
      outfit.hasMountRider = hasMountRider;
    }

    for (const dir of DIRECTIONS) {
      for (let frame = 0; frame < Math.min(app.frames, 3); frame++) {
        // Base & Mask (y=0, z=0)
        const { rgba: baseRgba, width, height } = renderAppearanceRgba(app, { layer: 0, x: dir.x, y: 0, z: 0, frame });
        const { rgba: maskRgba } = renderAppearanceRgba(app, { layer: 1, x: dir.x, y: 0, z: 0, frame });

        const baseFile = path.join(OUTFITS_DIR, `${outfit.id}-${gender}-${dir.name}-f${frame}-base.png`);
        const maskFile = path.join(OUTFITS_DIR, `${outfit.id}-${gender}-${dir.name}-f${frame}-mask.png`);
        fs.writeFileSync(baseFile, encodeRgbaPng(width, height, baseRgba));
        fs.writeFileSync(maskFile, encodeRgbaPng(width, height, maskRgba));

        // Addon 1 (y=1, z=0)
        if (hasAddon1) {
          const { rgba: a1Base } = renderAppearanceRgba(app, { layer: 0, x: dir.x, y: 1, z: 0, frame });
          const { rgba: a1Mask } = renderAppearanceRgba(app, { layer: 1, x: dir.x, y: 1, z: 0, frame });
          fs.writeFileSync(path.join(OUTFITS_DIR, `${outfit.id}-${gender}-${dir.name}-f${frame}-addon1-base.png`), encodeRgbaPng(width, height, a1Base));
          fs.writeFileSync(path.join(OUTFITS_DIR, `${outfit.id}-${gender}-${dir.name}-f${frame}-addon1-mask.png`), encodeRgbaPng(width, height, a1Mask));
        }

        // Addon 2 (y=2, z=0)
        if (hasAddon2) {
          const { rgba: a2Base } = renderAppearanceRgba(app, { layer: 0, x: dir.x, y: 2, z: 0, frame });
          const { rgba: a2Mask } = renderAppearanceRgba(app, { layer: 1, x: dir.x, y: 2, z: 0, frame });
          fs.writeFileSync(path.join(OUTFITS_DIR, `${outfit.id}-${gender}-${dir.name}-f${frame}-addon2-base.png`), encodeRgbaPng(width, height, a2Base));
          fs.writeFileSync(path.join(OUTFITS_DIR, `${outfit.id}-${gender}-${dir.name}-f${frame}-addon2-mask.png`), encodeRgbaPng(width, height, a2Mask));
        }

        // Mounted Rider Pose (y=0, z=1)
        if (hasMountRider) {
          const { rgba: mRiderBase } = renderAppearanceRgba(app, { layer: 0, x: dir.x, y: 0, z: 1, frame });
          const { rgba: mRiderMask } = renderAppearanceRgba(app, { layer: 1, x: dir.x, y: 0, z: 1, frame });
          fs.writeFileSync(path.join(OUTFITS_DIR, `${outfit.id}-${gender}-${dir.name}-f${frame}-mount-base.png`), encodeRgbaPng(width, height, mRiderBase));
          fs.writeFileSync(path.join(OUTFITS_DIR, `${outfit.id}-${gender}-${dir.name}-f${frame}-mount-mask.png`), encodeRgbaPng(width, height, mRiderMask));
        }

        // Generate clean recolored thumbnail (male, south, frame 0)
        if (gender === 'male' && dir.name === 'south' && frame === 0) {
          const thumbRgba = applyRecolor(baseRgba, maskRgba, width, height, DEFAULT_COLORS);
          fs.writeFileSync(path.join(OUTFIT_THUMBS_DIR, `${outfit.id}.png`), encodeRgbaPng(width, height, thumbRgba));
        }
      }
    }
  }
  outfitsProcessed++;
}
console.log(`Successfully processed ${outfitsProcessed} outfits!`);

// ==========================================
// 2. EXTRACT MOUNTS
// ==========================================
console.log('Reading mounts.xml...');
const mountsXml = fs.readFileSync('realmap11/data/XML/mounts.xml', 'utf8');
const mountRegex = /<mount\s+id="(\d+)"\s+clientid="(\d+)"\s+name="([^"]+)"(?:\s+speed="(\d+)")?(?:\s+premium="([^"]*)")?/g;

const mountCatalogue = [];
let mountMatch;
while ((mountMatch = mountRegex.exec(mountsXml)) !== null) {
  const mountId = Number(mountMatch[1]);
  const clientId = Number(mountMatch[2]);
  const name = mountMatch[3];
  const speedBonus = Number(mountMatch[4] || 20);
  const isPremium = mountMatch[5] !== 'no';
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // Avoid duplicate IDs if multiple rentals exist
  const uniqueId = mountCatalogue.some(m => m.id === id) ? `${id}-${mountId}` : id;

  mountCatalogue.push({
    mountId,
    id: uniqueId,
    clientId,
    name,
    speedBonus,
    isPremium,
    description: `Montaria oficial de Tibia: ${name} (Velocidade +${speedBonus}).`,
  });
}

console.log(`Processing ${mountCatalogue.length} mounts...`);
let mountsProcessed = 0;

for (const mount of mountCatalogue) {
  const app = dat.appearances.creature.get(mount.clientId);
  if (!app) {
    console.warn(`Missing creature appearance for mount ${mount.name} (clientId ${mount.clientId})`);
    continue;
  }

  for (const dir of DIRECTIONS) {
    for (let frame = 0; frame < Math.min(app.frames, 3); frame++) {
      const { rgba, width, height } = renderAppearanceRgba(app, { layer: 0, x: dir.x, y: 0, z: 0, frame });
      const filename = `${mount.id}-${dir.name}-f${frame}.png`;
      fs.writeFileSync(path.join(MOUNTS_DIR, filename), encodeRgbaPng(width, height, rgba));

      if (dir.name === 'south' && frame === 0) {
        fs.writeFileSync(path.join(MOUNTS_DIR, `${mount.id}.png`), encodeRgbaPng(width, height, rgba));
      }
    }
  }
  mountsProcessed++;
}
console.log(`Successfully processed ${mountsProcessed} mounts!`);

// Save updated generated JSONs
fs.writeFileSync('content/generated/outfits.json', JSON.stringify(outfitCatalogue, null, 2), 'utf8');
fs.writeFileSync('content/generated/mounts.json', JSON.stringify(mountCatalogue, null, 2), 'utf8');

console.log('Saved content/generated/outfits.json and content/generated/mounts.json successfully.');
