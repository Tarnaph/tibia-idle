import fs from 'fs';
import path from 'path';
import { parseTibia1098Dat } from '../packages/tibia1098-assets/src/dat.ts';
import { parseTibia1098Spr } from '../packages/tibia1098-assets/src/spr.ts';
import { encodeRgbaPng } from '../packages/tibia1098-assets/src/png.ts';

const PROJECT_ROOT = process.cwd();
const OUTPUT_DIR = path.resolve(PROJECT_ROOT, 'public/generated/cyclopedia/items');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

console.log('Loading DAT and SPR for Cyclopedia items...');
const dat = parseTibia1098Dat(fs.readFileSync('Tibia 10/tibia/Tibia.dat'));
const spr = parseTibia1098Spr(fs.readFileSync('Tibia 10/tibia/Tibia.spr'));

const eqJson = JSON.parse(fs.readFileSync('content/generated/equipment.json', 'utf8')).items;
const ecoJson = JSON.parse(fs.readFileSync('content/generated/item-economy.json', 'utf8')).items;

const itemIdsToExtract = new Set();

// Collect all equipment item IDs
for (const it of Object.values(eqJson)) {
  if (it && it.id && it.name && it.name !== 'void' && !it.name.startsWith('item ')) {
    const clientId = it.source?.otb?.clientId || it.id;
    itemIdsToExtract.add({ serverId: it.id, clientId });
  }
}

// Collect common currency / loot / drop IDs
const extraIds = [
  2148, 2152, 2160, 5879, 5878, 5881, 5883, 2802, 5921, 7398,
  2456, 2461, 2467, 2459, 2389, 2676, 2167, 2197, 2510, 2190,
  7414, 7436, 2453, 7404, 2520, 2470, 2494, 2472
];
for (const id of extraIds) {
  itemIdsToExtract.add({ serverId: id, clientId: id });
}

let extracted = 0;
for (const { serverId, clientId } of itemIdsToExtract) {
  const destPath = path.join(OUTPUT_DIR, `item-${serverId}.png`);
  if (fs.existsSync(destPath)) {
    extracted++;
    continue;
  }
  const app = dat.appearances.item.get(clientId) || dat.appearances.item.get(serverId);
  if (!app || !app.spriteIds || app.spriteIds.length === 0) continue;
  const spriteId = app.spriteIds[0];
  if (!spriteId) continue;
  try {
    const rgba = spr.decode(spriteId);
    const png = encodeRgbaPng(32, 32, rgba);
    fs.writeFileSync(destPath, png);
    extracted++;
  } catch (err) {
    // Ignore decoding errors
  }
}

console.log(`Extracted ${extracted} item sprites into public/generated/cyclopedia/items/`);
