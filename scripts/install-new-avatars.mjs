import fs from 'node:fs';
import path from 'node:path';

const sourceDir = 'C:\\Users\\desig\\.gemini\\antigravity-ide\\brain\\4ca7e99e-68c9-414d-b4d8-15df1cd7bdf6\\.user_uploaded';
const targetDir = path.resolve('public/images/avatars');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Mapping of new avatars:
// 1: Knight (Horned Helmet Warrior) -> media_1789048676643.jpg
// 2: Sorcerer (Silver-haired Purple Archmage) -> media_1789048676588.jpg
// 3: Paladin (Winged Valkyrie with Staff) -> media_1789048676631.jpg
// 4: Druid (Red-Haired Witch with Blue Hat) -> media_1789048676226.jpg
// 5: Champion (Bearded Berserker in Heavy Plate) -> media_1789048676246.jpg

const mapping = [
  { id: 1, file: 'media_1789048676643.jpg' },
  { id: 2, file: 'media_1789048676588.jpg' },
  { id: 3, file: 'media_1789048676631.jpg' },
  { id: 4, file: 'media_1789048676226.jpg' },
  { id: 5, file: 'media_1789048676246.jpg' },
];

for (const item of mapping) {
  const srcPath = path.join(sourceDir, item.file);
  if (!fs.existsSync(srcPath)) {
    throw new Error(`Source file not found: ${srcPath}`);
  }

  const buffer = fs.readFileSync(srcPath);
  const base64 = buffer.toString('base64');

  // 1. Write as .jpg
  const jpgPath = path.join(targetDir, `avatar-${item.id}.jpg`);
  fs.writeFileSync(jpgPath, buffer);

  // 2. Write as .png (same bytes or copy)
  const pngPath = path.join(targetDir, `avatar-${item.id}.png`);
  fs.writeFileSync(pngPath, buffer);

  // 3. Write as .svg with embedded base64
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <clipPath id="avClip${item.id}">
      <rect width="512" height="512" rx="32" ry="32" />
    </clipPath>
  </defs>
  <image href="data:image/jpeg;base64,${base64}" width="512" height="512" preserveAspectRatio="xMidYMid slice" clip-path="url(#avClip${item.id})" />
</svg>`;
  const svgPath = path.join(targetDir, `avatar-${item.id}.svg`);
  fs.writeFileSync(svgPath, svgContent, 'utf-8');

  console.log(`Installed Avatar ${item.id}:`);
  console.log(`  - JPG: ${jpgPath} (${buffer.length} bytes)`);
  console.log(`  - PNG: ${pngPath} (${buffer.length} bytes)`);
  console.log(`  - SVG: ${svgPath} (${svgContent.length} bytes)`);
}

console.log('All 5 avatars installed successfully!');
