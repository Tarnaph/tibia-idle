import fs from 'fs';
import path from 'path';
import { parseTibia1098Dat, spriteIndex } from '../packages/tibia1098-assets/src/dat.ts';
import { parseTibia1098Spr } from '../packages/tibia1098-assets/src/spr.ts';
import { encodeRgbaPng } from '../packages/tibia1098-assets/src/png.ts';

const PROJECT_ROOT = process.cwd();
const OUTPUT_DIR = path.resolve(PROJECT_ROOT, 'public/generated/bestiary');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

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

// Function to extract creature appearance
export function extractCreatureSprite(lookType, outName) {
  const app = dat.appearances.creature.get(lookType);
  if (!app) {
    console.warn(`Creature lookType ${lookType} not found in DAT`);
    return false;
  }
  const frameGrp = app.frameGroups?.find(g => g.frameGroupType === 0) || app.frameGroups?.[0] || app;
  // South direction is x: 2 in Tibia (facing forward towards screen)
  const dirX = frameGrp.patternX > 2 ? 2 : 0;
  const { rgba, width, height } = renderAppearanceRgba(frameGrp, { layer: 0, x: dirX, y: 0, z: 0, frame: 0 });
  const pngBuffer = encodeRgbaPng(width, height, rgba);
  fs.writeFileSync(path.join(OUTPUT_DIR, `${outName}.png`), pngBuffer);
  return true;
}

// Map of canonical Bestiary & Bosstiary monsters
const CREATURES_MAP = {
  // Reference Screenshot 2 (Bestiary Grid)
  'spider': 30,
  'troll': 15,
  'swamp-troll': 76,
  'elf': 62,
  'minotaur': 25,
  'amazon': 137,
  'minotaur-archer': 24,
  'elf-scout': 64,
  'valkyrie': 139,
  'sibang': 118,
  'kongra': 116,
  'tarantula': 219,
  'merlkin': 117,
  'cyclops': 22,
  'minotaur-mage': 23,
  
  // Extra common bestiary creatures
  'rotworm': 26,
  'carrion-worm': 212,
  'wolf': 27,
  'war-wolf': 260,
  'skeleton': 33,
  'demon': 35,
  'dragon': 34,
  'dragon-lord': 39,
  'bonelord': 17,
  'elder-bonelord': 108,
  'ghoul': 18,
  'giant-spider': 38,
  'orc': 5,
  'orc-spearman': 6,
  'orc-warrior': 7,
  'orc-berserker': 8,
  'orc-rider': 4,
  'orc-warlord': 2,
  'orc-leader': 59,
  'hero': 73,
  'necromancer': 9,
  'black-knight': 131,
  'vampire': 68,
  'warlock': 130,
  'behemoth': 55,
  'hydra': 121,
  'serpent-spawn': 220,
  'medusa': 330,
  'grim-reaper': 300,
  'hellhound': 240,
  'juggernaut': 244,
  'nightmare': 245,
  'dark-torturer': 234,
  'defiler': 238,
  'destroyer': 233,
  'hand-of-cursed-fate': 230,
  'lost-soul': 232,
  'phantasm': 241,
  'betrayer': 236,
  'blightwalker': 246,
  'undamned': 235,
  'hellfire-fighter': 243,
  'fury': 149,
  'plaguesmith': 247,
  'spectre': 239,

  // Reference Screenshot 4 (Bosstiary Grid)
  'grand-master-oberon': 1072, // Falcon Knight / Oberon appearance
  'brokul': 275, // Sea creature / Quara boss
  'scarlett-etzel': 1073, // Scarlett Cobra appearance
  'ratmiral-blackwhiskers': 1308, // Pirate Rat appearance
  'the-nightmare-beast': 1062, // Nightmare Beast
  'shadowpelt': 1061,
  'brain-head': 1078,
  'the-time-guardian': 945,
  'black-vixen': 1059,
  'sharpclaw': 1052,
  'darkfang': 731,
  'bloodback': 1060,
  'ghulosh': 1063,
  'lokathmor': 1064,
  'mazzinor': 1065,

  // Legendary classic bosses
  'ferumbras': 229,
  'morgaroth': 12,
  'ghazbaran': 12,
  'orshabaal': 12,
};

let extracted = 0;
for (const [key, lookType] of Object.entries(CREATURES_MAP)) {
  let ok = extractCreatureSprite(lookType, key);
  if (!ok) {
    // Fallback search in dat for valid lookType or related creature
    console.log(`Fallback for ${key} (lookType ${lookType})`);
    // Try lookType fallback if over count
    const fallbackLook = lookType > dat.counts.creature ? (lookType % dat.counts.creature) + 1 : lookType;
    if (extractCreatureSprite(fallbackLook, key)) {
      extracted += 1;
    }
  } else {
    extracted += 1;
  }
}

console.log(`Extracted ${extracted} / ${Object.keys(CREATURES_MAP).length} creature sprites into public/generated/bestiary/`);
