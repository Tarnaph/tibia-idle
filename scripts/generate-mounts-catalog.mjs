import fs from 'fs';
import path from 'path';

const mountsXmlPath = path.resolve(process.cwd(), '../realmap11/data/XML/mounts.xml');
const outJsonPath = path.resolve(process.cwd(), 'content/generated/mounts.json');

const xml = fs.readFileSync(mountsXmlPath, 'utf8');

// Parse <mount id="1" clientid="368" name="Widow Queen" speed="20" premium="yes" />
const regex = /<mount\s+id="(\d+)"\s+clientid="(\d+)"\s+name="([^"]+)"\s+speed="(\d+)"\s+premium="([^"]+)"\s*\/>/g;

const mounts = [];
let match;

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

const seenSlugs = new Set();

while ((match = regex.exec(xml)) !== null) {
  const [, idStr, clientIdStr, name, speedStr, premiumStr] = match;
  let slug = slugify(name);
  if (slug === 'rented-horse') {
    slug = `rented-horse-${idStr}`;
  } else if (seenSlugs.has(slug)) {
    slug = `${slug}-${idStr}`;
  }
  seenSlugs.add(slug);

  mounts.push({
    mountId: parseInt(idStr, 10),
    id: slug,
    clientId: parseInt(clientIdStr, 10),
    name: name.trim(),
    speedBonus: parseInt(speedStr, 10),
    isPremium: premiumStr.toLowerCase() === 'yes',
    description: `Montaria oficial de Tibia: ${name.trim()} (Velocidade +${speedStr}).`,
  });
}

// Add 'none' option at the beginning or end
console.log(`Parsed ${mounts.length} mounts from mounts.xml`);

fs.writeFileSync(outJsonPath, JSON.stringify(mounts, null, 2));
console.log(`Saved mounts catalog to ${outJsonPath}`);
