import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const mountsJsonPath = path.resolve(process.cwd(), 'content/generated/mounts.json');
const mounts = JSON.parse(fs.readFileSync(mountsJsonPath, 'utf8'));

const outDir = path.resolve(process.cwd(), 'public/generated/mounts');
fs.mkdirSync(outDir, { recursive: true });

// Palette colors for mount categories
const THEME_PALETTES = [
  { bg1: '#2a1a3a', bg2: '#4a2d68', accent: '#c084fc', border: '#7e22ce' }, // Shadow / Dark
  { bg1: '#1a293a', bg2: '#2b4764', accent: '#60a5fa', border: '#1d4ed8' }, // Ice / Crystal
  { bg1: '#3a1f1a', bg2: '#68352b', accent: '#f87171', border: '#b91c1c' }, // Fire / Magma
  { bg1: '#1a3a25', bg2: '#2d6840', accent: '#4ade80', border: '#15803d' }, // Nature / Jungle
  { bg1: '#3a321a', bg2: '#68592d', accent: '#facc15', border: '#a16207' }, // Gold / Royal
  { bg1: '#262626', bg2: '#404040', accent: '#e5e5e5', border: '#737373' }, // Steel / Stone
];

async function generateThumbs() {
  console.log(`Generating thumbnails for ${mounts.length} mounts...`);

  for (let i = 0; i < mounts.length; i++) {
    const mount = mounts[i];
    const outPath = path.join(outDir, `${mount.id}.png`);

    // If donkey already exists, don't overwrite if it's the rider sprite
    if (mount.id === 'donkey' && fs.existsSync(outPath)) {
      continue;
    }

    const theme = THEME_PALETTES[i % THEME_PALETTES.length];
    const initials = mount.name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 3)
      .toUpperCase();

    // Create a 64x64 SVG icon with clean fantasy mount badge
    const svg = `
    <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="grad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="${theme.bg2}" />
          <stop offset="100%" stop-color="${theme.bg1}" />
        </radialGradient>
        <filter id="glow">
          <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000000" flood-opacity="0.8"/>
        </filter>
      </defs>

      <!-- Frame -->
      <rect x="2" y="2" width="60" height="60" rx="6" fill="url(#grad)" stroke="${theme.border}" stroke-width="2"/>
      
      <!-- Inner border -->
      <rect x="5" y="5" width="54" height="54" rx="4" fill="none" stroke="${theme.accent}" stroke-width="1" stroke-opacity="0.4"/>

      <!-- Mount Horse/Beast Silhouette Icon -->
      <path d="M22,42 C20,38 21,30 25,24 C27,21 31,18 36,18 C39,18 41,20 40,23 C39,25 36,26 35,27 C37,28 41,31 42,35 C43,39 40,42 36,43 C33,44 28,44 22,42 Z" fill="${theme.accent}" fill-opacity="0.25"/>

      <!-- Initials Badge -->
      <text x="32" y="36" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="900" fill="${theme.accent}" text-anchor="middle" filter="url(#glow)">${initials}</text>
      
      <!-- Premium / Mount Star -->
      <polygon points="32,8 34,13 39,13 35,16 36,21 32,18 28,21 29,16 25,13 30,13" fill="${theme.accent}" opacity="0.9"/>
    </svg>
    `;

    await sharp(Buffer.from(svg))
      .png()
      .toFile(outPath);
  }

  console.log('All mount thumbnails generated successfully!');
}

generateThumbs().catch(console.error);
