const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const assetsDir = path.join(rootDir, 'public', 'assets');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const junctions = [
  { name: 'items', target: path.join(rootDir, 'public', 'generated', 'cyclopedia', 'items') },
  { name: 'spells', target: path.join(rootDir, 'public', 'spells') },
  { name: 'runes', target: path.join(rootDir, 'public', 'runes') },
  { name: 'potions', target: path.join(rootDir, 'public', 'potions') },
  { name: 'mounts', target: path.join(rootDir, 'public', 'generated', 'mounts') },
  { name: 'monsters', target: path.join(rootDir, 'public', 'generated', 'bestiary') },
  { name: 'outfits', target: path.join(rootDir, 'public', 'generated', 'outfits') },
  { name: 'outfit-thumbs', target: path.join(rootDir, 'public', 'generated', 'outfit-thumbs') },
  { name: 'hunts', target: path.join(rootDir, 'public', 'images', 'hunts') },
  { name: 'avatars', target: path.join(rootDir, 'public', 'images', 'avatars') },
  { name: 'loading', target: path.join(rootDir, 'public', 'images', 'loading') },
];

for (const { name, target } of junctions) {
  const linkPath = path.join(assetsDir, name);
  let shouldCreate = false;

  try {
    const stat = fs.lstatSync(linkPath);
    if (stat.isSymbolicLink()) {
      const currentTarget = path.resolve(assetsDir, fs.readlinkSync(linkPath));
      const expectedTarget = path.resolve(target);
      if (currentTarget !== expectedTarget) {
        console.log(`[Assets] Replacing outdated link for ${name}: ${currentTarget} -> ${expectedTarget}`);
        fs.unlinkSync(linkPath);
        shouldCreate = true;
      }
    }
  } catch (err) {
    shouldCreate = true;
  }

  if (shouldCreate && fs.existsSync(target)) {
    try {
      const symlinkType = process.platform === 'win32' ? 'junction' : 'dir';
      fs.symlinkSync(target, linkPath, symlinkType);
      console.log(`[Assets] Created link: public/assets/${name} -> ${target}`);
    } catch (err) {
      console.warn(`[Assets] Could not create link for ${name}:`, err.message);
    }
  } else if (!fs.existsSync(target)) {
    console.warn(`[Assets] Target directory does not exist for ${name}: ${target}`);
  }
}
console.log('[Assets] Asset junctions verification complete.');
