import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ASSETS_DIR = path.resolve('public/assets/items');
const CYCLO_DIR = path.resolve('public/generated/cyclopedia/items');

const WEAPON_BASES = [
  { name: 'sword', baseId: 31821, regId: 31821, durId: 32384, lastId: 32390 },
  { name: 'axe', baseId: 31822, regId: 31822, durId: 32385, lastId: 32391 },
  { name: 'club', baseId: 31823, regId: 31823, durId: 32386, lastId: 32392 },
  { name: 'bow', baseId: 31824, regId: 31824, durId: 32387, lastId: 32393 },
  { name: 'rod', baseId: 31825, regId: 31825, durId: 32388, lastId: 32394 },
  { name: 'wand', baseId: 31826, regId: 31826, durId: 32389, lastId: 32395 },
];

function isCyanPixel(r, g, b) {
  return (b > r + 25 && g > r + 15) || (r === 30 && g === 58 && b === 73);
}

function toPink(r, g, b) {
  // Cyan to Pink/Magenta (swap B/G into R/B)
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (r === 30 && g === 58 && b === 73) return [73, 25, 65];
  if (r === 224 && g === 244 && b === 254) return [254, 220, 245];
  return [b, Math.floor(r * 0.8), Math.floor(g * 0.95)];
}

function toGreen(r, g, b) {
  // Cyan to Emerald/Dark Green
  if (r === 30 && g === 58 && b === 73) return [25, 65, 40];
  if (r === 224 && g === 244 && b === 254) return [220, 254, 230];
  return [Math.floor(r * 0.7), b, Math.floor(g * 0.75)];
}

async function processWeapons() {
  for (const w of WEAPON_BASES) {
    const srcPath = path.join(ASSETS_DIR, `item-${w.baseId}.png`);
    const { data, info } = await sharp(srcPath).raw().toBuffer({ resolveWithObject: true });

    // 1. Regular: Pink Aura
    const pinkData = Buffer.from(data);
    for (let i = 0; i < pinkData.length; i += 4) {
      if (pinkData[i + 3] > 0 && isCyanPixel(pinkData[i], pinkData[i+1], pinkData[i+2])) {
        const [nr, ng, nb] = toPink(pinkData[i], pinkData[i+1], pinkData[i+2]);
        pinkData[i] = nr;
        pinkData[i+1] = ng;
        pinkData[i+2] = nb;
      }
    }
    const pinkBuf = await sharp(pinkData, { raw: info }).png().toBuffer();
    fs.writeFileSync(path.join(ASSETS_DIR, `item-${w.regId}.png`), pinkBuf);

    // 2. Durable: Cyan Aura (already base, save to durId)
    const durBuf = await sharp(data, { raw: info }).png().toBuffer();
    fs.writeFileSync(path.join(ASSETS_DIR, `item-${w.durId}.png`), durBuf);

    // 3. Lasting: Green Aura
    const greenData = Buffer.from(data);
    for (let i = 0; i < greenData.length; i += 4) {
      if (greenData[i + 3] > 0 && isCyanPixel(greenData[i], greenData[i+1], greenData[i+2])) {
        const [nr, ng, nb] = toGreen(greenData[i], greenData[i+1], greenData[i+2]);
        greenData[i] = nr;
        greenData[i+1] = ng;
        greenData[i+2] = nb;
      }
    }
    const greenBuf = await sharp(greenData, { raw: info }).png().toBuffer();
    fs.writeFileSync(path.join(ASSETS_DIR, `item-${w.lastId}.png`), greenBuf);
  }

  // 4. Exercise Shields (base: wooden shield 2512)
  const shieldPath = path.join(ASSETS_DIR, `item-2512.png`);
  if (fs.existsSync(shieldPath)) {
    const { data: sData, info: sInfo } = await sharp(shieldPath).raw().toBuffer({ resolveWithObject: true });
    
    // Helper to add 4 sparkle pixels at (x: 23, y: 7) and (x: 7, y: 22)
    const sparkPositions = [
      { x: 23, y: 6 }, { x: 24, y: 7 }, { x: 22, y: 7 }, { x: 23, y: 8 },
      { x: 7, y: 21 }, { x: 8, y: 22 }, { x: 6, y: 22 }, { x: 7, y: 23 }
    ];

    const makeShield = async (sparkColors, outId) => {
      const copy = Buffer.from(sData);
      for (let p = 0; p < sparkPositions.length; p++) {
        const pos = sparkPositions[p];
        const idx = (pos.y * 32 + pos.x) * 4;
        const color = sparkColors[p % sparkColors.length];
        copy[idx] = color[0];
        copy[idx + 1] = color[1];
        copy[idx + 2] = color[2];
        copy[idx + 3] = 255;
      }
      const buf = await sharp(copy, { raw: sInfo }).png().toBuffer();
      fs.writeFileSync(path.join(ASSETS_DIR, `item-${outId}.png`), buf);
    };

    // Pink sparks for 35279
    await makeShield([[254, 220, 245], [246, 134, 207], [212, 103, 174], [176, 82, 143]], 35279);
    // Cyan sparks for 35285
    await makeShield([[224, 244, 254], [134, 207, 246], [103, 174, 212], [82, 143, 176]], 35285);
    // Green sparks for 35286
    await makeShield([[220, 254, 230], [134, 246, 160], [103, 212, 130], [82, 176, 110]], 35286);
  }

  console.log('✅ Generated exercise weapons for all 3 tiers (Regular, Durable, Lasting)!');
}

processWeapons().catch(console.error);
