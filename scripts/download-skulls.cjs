const https = require('https');
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

async function download(url, dest) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    const req = https.get({
      protocol: opts.protocol,
      host: opts.host,
      path: opts.pathname + opts.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error('Status ' + res.statusCode + ' for ' + url));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', reject);
  });
}

async function main() {
  const tmpDir = path.resolve(__dirname, '../scratch/skulls_raw');
  fs.mkdirSync(tmpDir, { recursive: true });

  for (const [key, url] of Object.entries(SKULL_URLS)) {
    const dest = path.join(tmpDir, `${key}.gif`);
    console.log(`Downloading ${key} skull...`);
    await download(url, dest);
    const buf = fs.readFileSync(dest);
    // Read GIF header width & height (bytes 6-9 in little endian)
    const w = buf.readUInt16LE(6);
    const h = buf.readUInt16LE(8);
    console.log(`Saved ${key}.gif -> ${w}x${h} (${buf.length} bytes)`);
  }
}

main().catch(console.error);
