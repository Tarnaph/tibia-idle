import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('[SSH] Connected to VPS. Searching logs for Wolfy ID...');
  const cmd = `
    cd /root/tibia-idle
    echo "=== RECENT SAVE LOGS IN TIBIA-WEB ==="
    pm2 logs tibia-web --lines 100 --nostream | grep -E "8b75dc19|save|saveVersion|hunt" | tail -n 25 || true

    echo "=== RECENT ERRORS IN TIBIA-WEB ==="
    pm2 logs tibia-web --err --lines 50 --nostream | tail -n 25 || true

    echo "=== RECENT COLYSEUS LOGS ==="
    pm2 logs colyseus-server --lines 100 --nostream | grep -E "8b75dc19|Wolfy|onJoin|onLeave|inHunt" | tail -n 25 || true
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('[SSH] Exec error:', err);
      process.exit(1);
    }
    stream.on('data', (d) => process.stdout.write(d));
    stream.stderr.on('data', (d) => process.stderr.write(d));
    stream.on('close', (code) => {
      conn.end();
      process.exit(code || 0);
    });
  });
}).connect({
  host: '187.7.16.210',
  port: 22,
  username: 'root',
  password: 'j3iu.dd2&bJ4nV(',
  readyTimeout: 30000,
});
