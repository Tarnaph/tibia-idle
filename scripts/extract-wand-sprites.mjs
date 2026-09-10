import fs from 'node:fs';
import { parseTibia1098Dat, spriteIndex } from '../packages/tibia1098-assets/src/dat.ts';
import { parseTibia1098Spr } from '../packages/tibia1098-assets/src/spr.ts';
import { parseOtbMap } from '../packages/tibia1098-assets/src/otb.ts';
import { encodeRgbaPng } from '../packages/tibia1098-assets/src/png.ts';

const datBuf = fs.readFileSync('Tibia 10/tibia/Tibia.dat');
const sprBuf = fs.readFileSync('Tibia 10/tibia/Tibia.spr');
const otbBuf = fs.readFileSync('realmap11/data/items/items.otb');

const dat = parseTibia1098Dat(datBuf);
const spr = parseTibia1098Spr(sprBuf);
const otb = parseOtbMap(otbBuf);

const weaponsXml = fs.readFileSync('realmap11/data/weapons/weapons.xml', 'utf8');
const itemsXml = fs.readFileSync('realmap11/data/items/items.xml', 'utf8');

const wandRegex = /<wand\s+id="(\d+)"\s+level="(\d+)"\s+mana="(\d+)"\s+min="(\d+)"\s+max="(\d+)"\s+type="([^"]+)"[^>]*>([\s\S]*?)<\/wand>/g;

const allWands = [];
let match;
while ((match = wandRegex.exec(weaponsXml)) !== null) {
  const id = Number(match[1]);
  const itemRegex = new RegExp(`<item\\s+id="${id}"[^>]*name="([^"]+)"`, 'i');
  const nameMatch = itemRegex.exec(itemsXml);
  const name = nameMatch ? nameMatch[1] : `Wand #${id}`;

  allWands.push({
    id,
    name,
    level: Number(match[2]),
    mana: Number(match[3]),
    min: Number(match[4]),
    max: Number(match[5]),
    type: match[6],
  });
}

console.log(`Processing ${allWands.length} wands/rods...`);

function copySprite(target, targetWidth, sprite, offsetX, offsetY) {
  for (let y = 0; y < 32; y += 1) {
    const srcOffset = y * 32 * 4;
    const dstOffset = ((offsetY + y) * targetWidth + offsetX) * 4;
    sprite.copy(target, dstOffset, srcOffset, srcOffset + 32 * 4);
  }
}

function renderFrame(appearance, coordinates) {
  const width = appearance.width * 32;
  const height = appearance.height * 32;
  const rgba = Buffer.alloc(width * height * 4);
  const spriteIds = [];

  for (let tileWidth = 0; tileWidth < appearance.width; tileWidth += 1) {
    for (let tileHeight = 0; tileHeight < appearance.height; tileHeight += 1) {
      const index = spriteIndex(appearance, {
        width: tileWidth,
        height: tileHeight,
        ...coordinates,
      });
      const spriteId = appearance.spriteIds[index];
      spriteIds.push(spriteId);
      copySprite(
        rgba,
        width,
        spr.decode(spriteId),
        (appearance.width - tileWidth - 1) * 32,
        (appearance.height - tileHeight - 1) * 32,
      );
    }
  }
  return { png: encodeRgbaPng(width, height, rgba), rgba, spriteIds, width, height };
}

const manifestPath = 'content/generated/tibia1098-assets.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Also load equipment.json to add all wands as valid equipment items
const equipmentPath = 'content/generated/equipment.json';
const equipment = JSON.parse(fs.readFileSync(equipmentPath, 'utf8'));

let generatedCount = 0;
for (const wand of allWands) {
  const id = wand.id;
  const itemOtb = otb.get(id);
  if (!itemOtb) {
    console.warn(`Item ${id} (${wand.name}) not found in items.otb`);
    continue;
  }
  const app = dat.appearances.item.get(itemOtb.clientId);
  if (!app) {
    console.warn(`Item ${id} (${wand.name}) with clientId ${itemOtb.clientId} not found in dat`);
    continue;
  }
  
  const rendered = renderFrame(app, { layer: 0, x: 0, y: 0, z: 0, frame: 0 });
  const outPath = `public/generated/tibia1098/items/item-${id}.png`;
  fs.writeFileSync(outPath, rendered.png);

  // Update manifest item mapping so ItemSprite resolves it natively
  manifest.items[String(id)] = {
    serverId: id,
    clientId: itemOtb.clientId,
    group: itemOtb.group,
    name: wand.name,
    resolved: true,
    source: {
      serverId: id,
      otb: 'realmap11/data/items/items.otb',
      dat: 'Tibia 10/tibia/Tibia.dat',
      spr: 'Tibia 10/tibia/Tibia.spr'
    },
    appearanceId: itemOtb.clientId,
    appearance: {
      width: app.width,
      height: app.height,
      exactSize: app.exactSize,
      layers: app.layers,
      patternX: app.patternX,
      patternY: app.patternY,
      patternZ: app.patternZ,
      frames: app.frames,
      attributes: app.attributes,
      spriteIds: app.spriteIds
    },
    extractedPattern: { x: 0, y: 0, z: 0 },
    extractedLayer: 0,
    frame: {
      frame: 0,
      direction: 'static',
      pattern: { x: 0, y: 0, z: 0 },
      layer: 0,
      spriteIds: app.spriteIds,
      file: outPath,
      publicUrl: `/generated/tibia1098/items/item-${id}.png`,
      sha256: '',
      width: app.width * 32,
      height: app.height * 32
    },
    importWarnings: []
  };

  // Add/update equipment.json
  const existingIndex = equipment.items.findIndex(i => i.id === id);
  const equipEntry = {
    id: id,
    name: wand.name,
    slot: 'hand',
    weaponType: 'wand',
    twoHanded: false,
    attack: wand.max,
    defense: 0,
    extraDefense: 0,
    armor: 0,
    range: 4,
    weightOz: 20,
    reqLevel: wand.level,
    reqVocation: wand.name.toLowerCase().includes('rod') ? ['Druid', 'Elder Druid'] : ['Sorcerer', 'Master Sorcerer'],
    attributes: [
      { key: 'magicLevel', value: 0 }
    ],
    elementalAbsorption: {},
    sourceFile: ['data/items/items.otb', 'data/items/items.xml'],
    sourceId: id,
    source: {
      otb: {
        sourceFile: 'data/items/items.otb',
        serverId: id,
        clientId: itemOtb.clientId,
        group: itemOtb.group,
        flags: 0
      },
      lua: {
        sourceFile: 'data/weapons/weapons.xml',
        sourceId: id,
        line: 0
      }
    },
    importWarnings: []
  };

  if (existingIndex >= 0) {
    equipment.items[existingIndex] = { ...equipment.items[existingIndex], ...equipEntry };
  } else {
    equipment.items.push(equipEntry);
  }

  generatedCount++;
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
fs.writeFileSync(equipmentPath, JSON.stringify(equipment, null, 2), 'utf8');
console.log(`Successfully extracted ${generatedCount} wand/rod sprites and registered in equipment.json and tibia1098-assets.json!`);
