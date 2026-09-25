const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SKULL_URLS = {
  white: 'https://static.wikia.nocookie.net/tibia/images/b/b7/White_Skull.gif/revision/latest?cb=20050729023858&path-prefix=en',
  red: 'https://static.wikia.nocookie.net/tibia/images/5/59/Red_Skull.gif/revision/latest?cb=20050729023959&path-prefix=en',
  black: 'https://static.wikia.nocookie.net/tibia/images/f/fc/Black_Skull.gif/revision/latest?cb=20090618202149&path-prefix=en',
  yellow: 'https://static.wikia.nocookie.net/tibia/images/0/09/Yellow_Skull.gif/revision/latest?cb=20050729024031&path-prefix=en',
  orange: 'https://static.wikia.nocookie.net/tibia/images/b/b8/Orange_Skull.gif/revision/latest?cb=20191224173437&path-prefix=en',
  green: 'https://static.wikia.nocookie.net/tibia/images/4/4e/Green_Skull.gif/revision/latest?cb=20050729024144&path-prefix=en',
};

const rawDir = path.resolve(__dirname, '../scratch/skulls_raw');
fs.mkdirSync(rawDir, { recursive: true });

for (const [key, url] of Object.entries(SKULL_URLS)) {
  const dest = path.join(rawDir, `${key}.webp`);
  console.log(`Downloading ${key}...`);
  execSync(`curl.exe -s -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -H "Referer: https://tibia.fandom.com/" "${url}" -o "${dest}"`);
  const buf = fs.readFileSync(dest);
  const b21 = buf[21], b22 = buf[22], b23 = buf[23], b24 = buf[24];
  const val = b21 | (b22 << 8) | (b23 << 16) | (b24 << 24);
  const width = (val & 0x3FFF) + 1;
  const height = ((val >> 14) & 0x3FFF) + 1;
  console.log(`Downloaded ${key}: ${width}x${height} (${buf.length} bytes)`);
}
