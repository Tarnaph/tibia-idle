import { Client } from 'ssh2';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const conn = new Client();

const filesToUpload = [
  // 1. MP3 songs first
  { local: 'songs/Beneath the Streets - Rats.mp3', remote: '/root/tibia-idle/public/songs/beneath-the-streets-rats.mp3' },
  { local: 'songs/Drums Under Stone - Trolls.mp3', remote: '/root/tibia-idle/public/songs/drums-under-stone-trolls.mp3' },
  { local: 'songs/Underfoot - Rotworms.mp3', remote: '/root/tibia-idle/public/songs/underfoot-rotworms.mp3' },
  { local: 'songs/The Dead Remember - Skeletons.mp3', remote: '/root/tibia-idle/public/songs/the-dead-remember-skeletons.mp3' },
  { local: 'songs/Threads in the Dark - Spiders.mp3', remote: '/root/tibia-idle/public/songs/threads-in-the-dark-spiders.mp3' },
  { local: 'songs/Dragons pride.mp3', remote: '/root/tibia-idle/public/songs/dragons-pride.mp3' },
  { local: 'songs/Sunset in the Village.mp3', remote: '/root/tibia-idle/public/songs/sunset-in-the-village.mp3' },
  // 2. Video
  { local: 'songs/songtibia.webm', remote: '/root/tibia-idle/public/songtibia.webm' },
];

conn.on('ready', () => {
  console.log('[SSH] Conectado à VPS 187.7.16.210.');

  conn.sftp(async (err, sftp) => {
    if (err) {
      console.error('[SFTP] Erro iniciando SFTP:', err);
      conn.end();
      process.exit(1);
    }

    console.log('[SFTP] Sessão iniciada. Iniciando transferência...');

    for (const item of filesToUpload) {
      const localPath = path.resolve(rootDir, item.local);
      const stat = fs.statSync(localPath);
      const sizeMB = (stat.size / (1024 * 1024)).toFixed(2);
      console.log(`\n[SFTP] Transferindo ${item.local} (${sizeMB} MB) -> ${item.remote}...`);

      let lastPct = -1;
      await new Promise((resolve, reject) => {
        sftp.fastPut(localPath, item.remote, {
          concurrency: 64,
          chunkSize: 32768,
          step: (total, chunk, totalSize) => {
            const pct = Math.round((total / totalSize) * 100);
            if (pct % 10 === 0 && pct !== lastPct) {
              lastPct = pct;
              process.stdout.write(` ${pct}%`);
            }
          }
        }, (putErr) => {
          if (putErr) {
            console.error(`\n[SFTP] Erro ao enviar ${item.remote}:`, putErr);
            reject(putErr);
          } else {
            console.log(`\n[SFTP] ✓ Sucesso: ${item.remote}`);
            resolve();
          }
        });
      });
    }

    console.log('\n[SFTP] Todos os arquivos transferidos para a VPS!');
    console.log('[SSH] Espelhando arquivos para as pastas /songs/ e com nomes originais...');

    const mirrorCmd = `
      mkdir -p /root/tibia-idle/songs
      
      # Mirror songs to /root/tibia-idle/songs/
      cp -a /root/tibia-idle/public/songtibia.webm /root/tibia-idle/songs/songtibia.webm
      cp -a /root/tibia-idle/public/songs/beneath-the-streets-rats.mp3 "/root/tibia-idle/songs/Beneath the Streets - Rats.mp3"
      cp -a /root/tibia-idle/public/songs/beneath-the-streets-rats.mp3 "/root/tibia-idle/public/songs/Beneath the Streets - Rats.mp3"
      cp -a /root/tibia-idle/public/songs/drums-under-stone-trolls.mp3 "/root/tibia-idle/songs/Drums Under Stone - Trolls.mp3"
      cp -a /root/tibia-idle/public/songs/drums-under-stone-trolls.mp3 "/root/tibia-idle/public/songs/Drums Under Stone - Trolls.mp3"
      cp -a /root/tibia-idle/public/songs/underfoot-rotworms.mp3 "/root/tibia-idle/songs/Underfoot - Rotworms.mp3"
      cp -a /root/tibia-idle/public/songs/underfoot-rotworms.mp3 "/root/tibia-idle/public/songs/Underfoot - Rotworms.mp3"
      cp -a /root/tibia-idle/public/songs/the-dead-remember-skeletons.mp3 "/root/tibia-idle/songs/The Dead Remember - Skeletons.mp3"
      cp -a /root/tibia-idle/public/songs/the-dead-remember-skeletons.mp3 "/root/tibia-idle/public/songs/The Dead Remember - Skeletons.mp3"
      cp -a /root/tibia-idle/public/songs/threads-in-the-dark-spiders.mp3 "/root/tibia-idle/songs/Threads in the Dark - Spiders.mp3"
      cp -a /root/tibia-idle/public/songs/threads-in-the-dark-spiders.mp3 "/root/tibia-idle/public/songs/Threads in the Dark - Spiders.mp3"
      cp -a /root/tibia-idle/public/songs/dragons-pride.mp3 "/root/tibia-idle/songs/Dragons pride.mp3"
      cp -a /root/tibia-idle/public/songs/dragons-pride.mp3 "/root/tibia-idle/public/songs/Dragons pride.mp3"
      cp -a /root/tibia-idle/public/songs/sunset-in-the-village.mp3 "/root/tibia-idle/songs/Sunset in the Village.mp3"

      echo "=== VPS VERIFICAÇÃO FINAL DE MÍDIA ==="
      ls -lh /root/tibia-idle/public/songtibia.webm
      ls -lh /root/tibia-idle/public/songs/
      ls -lh /root/tibia-idle/songs/
    `;

    conn.exec(mirrorCmd, (execErr, stream) => {
      if (execErr) {
        console.error('[SSH] Erro no comando de espelhamento:', execErr);
        conn.end();
        process.exit(1);
      }
      stream.on('data', (d) => process.stdout.write(d));
      stream.stderr.on('data', (d) => process.stderr.write(d));
      stream.on('close', (code) => {
        console.log(`[SSH] Espelhamento finalizado com código ${code}`);
        conn.end();
        process.exit(code || 0);
      });
    });
  });
}).connect({
  host: '187.7.16.210',
  port: 22,
  username: 'root',
  password: 'j3iu.dd2&bJ4nV(',
  readyTimeout: 60000,
});
