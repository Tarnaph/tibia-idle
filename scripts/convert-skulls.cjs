const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const types = ['white', 'red', 'black', 'yellow', 'orange', 'green'];
const rawDir = path.resolve(__dirname, '../scratch/skulls_raw');
const outDir = path.resolve(__dirname, '../public/assets/skulls');

async function convert() {
  for (const type of types) {
    const input = path.join(rawDir, `${type}.webp`);
    const out1x = path.join(outDir, `skull-${type}.png`);
    const out2x = path.join(outDir, `skull-${type}-2x.png`);

    // 1x: 11x11 authentic PNG
    await sharp(input)
      .png()
      .toFile(out1x);

    // 2x: 22x22 nearest-neighbor scaled PNG for high-dpi modals
    await sharp(input)
      .resize(22, 22, { kernel: 'nearest' })
      .png()
      .toFile(out2x);

    const m1 = await sharp(out1x).metadata();
    const m2 = await sharp(out2x).metadata();
    console.log(`Converted skull-${type}.png: ${m1.width}x${m1.height} & 2x: ${m2.width}x${m2.height}`);
  }
}

convert().catch(console.error);
