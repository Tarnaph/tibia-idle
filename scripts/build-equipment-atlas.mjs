import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ATLAS_WIDTH = 2048;

async function buildEquipmentAtlas() {
  console.log('=== BUILDING COMPLETE EQUIPMENT & CONSUMABLES TEXTURE ATLAS ===');
  const outDir = './public/generated/atlases';
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const itemsToPack = [];
  const seenPaths = new Map();

  function registerItem(filePath, primaryKey, aliasKeys = []) {
    if (!fs.existsSync(filePath)) return false;
    const resolved = path.resolve(filePath);
    let item = seenPaths.get(resolved);
    if (!item) {
      item = {
        key: primaryKey,
        aliases: new Set([primaryKey, ...aliasKeys]),
        localPath: filePath,
        width: 32,
        height: 32,
      };
      seenPaths.set(resolved, item);
      itemsToPack.push(item);
    } else {
      item.aliases.add(primaryKey);
      aliasKeys.forEach((k) => item.aliases.add(k));
    }
    return true;
  }

  // 1. Wearable gear & equipment from content/generated/equipment.json
  const equipJsonPath = './content/generated/equipment.json';
  if (fs.existsSync(equipJsonPath)) {
    const raw = JSON.parse(fs.readFileSync(equipJsonPath, 'utf8'));
    const equipItems = raw.items.filter((i) => {
      const hasSlot = i.slot && i.slot !== 'other';
      const hasWeapon = i.weaponType && i.weaponType !== 'none';
      const hasArmor = typeof i.armor === 'number' && i.armor > 0;
      const hasDefense = typeof i.defense === 'number' && i.defense > 0;
      return hasSlot || hasWeapon || hasArmor || hasDefense;
    });

    console.log(`Evaluating ${equipItems.length} candidate equipment items...`);
    for (const eq of equipItems) {
      const id = eq.id;
      // Search possible item image locations
      const candidates = [
        `./public/assets/items/item-${id}.png`,
        `./public/generated/cyclopedia/items/item-${id}.png`,
        `./public/generated/tibia1098/items/item-${id}.png`,
      ];
      const validPath = candidates.find((p) => fs.existsSync(p));
      if (validPath) {
        registerItem(
          validPath,
          `item-${id}`,
          [
            `item-${id}.png`,
            `/assets/items/item-${id}.png`,
            `assets/items/item-${id}.png`,
            `/generated/cyclopedia/items/item-${id}.png`,
            `generated/cyclopedia/items/item-${id}.png`,
            `/generated/tibia1098/items/item-${id}.png`,
            `generated/tibia1098/items/item-${id}.png`,
          ]
        );
      }
    }
  }

  // 2. Essential Currencies and Containers (Gold, Platinum, Crystal, Starter Backpacks)
  const essentialExtraIds = [
    2148, // Gold Coin
    2152, // Platinum Coin
    2160, // Crystal Coin
    1987, // Brown Backpack
    1988, // Normal Backpack
    2000, // Blue Backpack
    2001, // Green Backpack
    2002, // Red Backpack
    2003, // Yellow Backpack
    2004, // Grey Backpack
  ];
  for (const id of essentialExtraIds) {
    const candidates = [
      `./public/assets/items/item-${id}.png`,
      `./public/generated/cyclopedia/items/item-${id}.png`,
      `./public/generated/tibia1098/items/item-${id}.png`,
    ];
    const validPath = candidates.find((p) => fs.existsSync(p));
    if (validPath) {
      registerItem(
        validPath,
        `item-${id}`,
        [
          `item-${id}.png`,
          `/assets/items/item-${id}.png`,
          `assets/items/item-${id}.png`,
          `/generated/cyclopedia/items/item-${id}.png`,
          `generated/cyclopedia/items/item-${id}.png`,
          `/generated/tibia1098/items/item-${id}.png`,
          `generated/tibia1098/items/item-${id}.png`,
        ]
      );
    }
  }

  // 3. Potions from public/potions/*.png
  const potionsDir = './public/potions';
  if (fs.existsSync(potionsDir)) {
    const files = fs.readdirSync(potionsDir).filter((f) => f.endsWith('.png'));
    for (const f of files) {
      const baseName = f.replace('.png', '');
      registerItem(
        path.join(potionsDir, f),
        `potion-${baseName}`,
        [
          baseName,
          f,
          `/potions/${f}`,
          `potions/${f}`,
        ]
      );
    }
  }

  console.log(`Found ${itemsToPack.length} unique equipment & consumable images to pack into atlas.`);

  // Get real metadata and extrude each frame with 1px border replication
  const extrudedItems = await Promise.all(
    itemsToPack.map(async (item) => {
      const meta = await sharp(item.localPath).metadata();
      const w = meta.width || 32;
      const h = meta.height || 32;
      const extrudedBuffer = await sharp(item.localPath)
        .extend({ top: 1, bottom: 1, left: 1, right: 1, extendWith: 'copy' })
        .png()
        .toBuffer();
      return {
        ...item,
        width: w,
        height: h,
        packedWidth: w + 2,
        packedHeight: h + 2,
        extrudedBuffer,
      };
    })
  );

  // Shelf bin-packing
  const sorted = [...extrudedItems].sort((a, b) => b.packedHeight - a.packedHeight || a.key.localeCompare(b.key));

  let currentX = 0;
  let currentY = 0;
  let shelfHeight = 0;
  const overlays = [];
  const atlasFrames = {};

  for (const item of sorted) {
    if (currentX + item.packedWidth > ATLAS_WIDTH) {
      currentX = 0;
      currentY += shelfHeight;
      shelfHeight = 0;
    }

    overlays.push({
      input: item.extrudedBuffer,
      left: currentX,
      top: currentY,
    });

    const frameDef = {
      frame: { x: currentX + 1, y: currentY + 1, w: item.width, h: item.height },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: item.width, h: item.height },
      sourceSize: { w: item.width, h: item.height },
    };

    for (const alias of item.aliases) {
      atlasFrames[alias] = frameDef;
    }

    currentX += item.packedWidth;
    if (item.packedHeight > shelfHeight) {
      shelfHeight = item.packedHeight;
    }
  }

  const totalHeight = currentY + shelfHeight;
  console.log(`Packing into ${ATLAS_WIDTH}x${totalHeight}px Equipment Atlas...`);

  const blankCanvas = sharp({
    create: {
      width: ATLAS_WIDTH,
      height: totalHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  const finalPng = await blankCanvas.composite(overlays).png({ compressionLevel: 8 }).toBuffer();

  const atlasPngPath = path.join(outDir, 'equipment-atlas.png');
  const atlasJsonPath = path.join(outDir, 'equipment-atlas.json');

  fs.writeFileSync(atlasPngPath, finalPng);
  fs.writeFileSync(
    atlasJsonPath,
    JSON.stringify(
      {
        frames: atlasFrames,
        meta: {
          image: 'equipment-atlas.png',
          format: 'RGBA8888',
          size: { w: ATLAS_WIDTH, h: totalHeight },
          scale: 1,
        },
      },
      null,
      2
    )
  );

  console.log(`✅ SUCCESS! Complete Equipment Atlas built:`);
  console.log(`- ${atlasPngPath} (${(finalPng.length / 1024).toFixed(1)} KB)`);
  console.log(`- ${atlasJsonPath} (${(fs.statSync(atlasJsonPath).size / 1024).toFixed(1)} KB) with ${Object.keys(atlasFrames).length} frame aliases.`);
}

buildEquipmentAtlas().catch((err) => {
  console.error(err);
  process.exit(1);
});
