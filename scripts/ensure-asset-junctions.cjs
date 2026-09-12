const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const assetsDir = path.join(rootDir, 'public', 'assets');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const junctions = [
  { name: 'items', target: path.join(rootDir, 'public', 'generated', 'cyclopedia', 'items') },
  { name: 'spells', target: path.join(rootDir, 'public', 'generated', 'spell-icons') },
  { name: 'runes', target: path.join(rootDir, 'public', 'generated', 'spell-icons') },
  { name: 'potions', target: path.join(rootDir, 'public', 'generated', 'item-icons') },
  { name: 'mounts', target: path.join(rootDir, 'public', 'generated', 'mount-previews') },
  { name: 'monsters', target: path.join(rootDir, 'public', 'generated', 'bestiary') },
  { name: 'outfits', target: path.join(rootDir, 'public', 'generated', 'outfit-canvas') },
  { name: 'outfit-thumbs', target: path.join(rootDir, 'public', 'generated', 'outfit-previews') },
  { name: 'hunts', target: path.join(rootDir, 'public', 'generated', 'bestiary') },
  { name: 'avatars', target: path.join(rootDir, 'public', 'images', 'avatars') },
  { name: 'loading', target: path.join(rootDir, 'public', 'images', 'loading') },
];

for (const { name, target } of junctions) {
  const linkPath = path.join(assetsDir, name);
  if (!fs.existsSync(linkPath) && fs.existsSync(target)) {
    try {
      const symlinkType = process.platform === 'win32' ? 'junction' : 'dir';
      fs.symlinkSync(target, linkPath, symlinkType);
      console.log(`[Assets] Created link: public/assets/${name} -> ${target}`);
    } catch (err) {
      console.warn(`[Assets] Could not create link for ${name}:`, err.message);
    }
  }
}
console.log('[Assets] Asset junctions verification complete.');
