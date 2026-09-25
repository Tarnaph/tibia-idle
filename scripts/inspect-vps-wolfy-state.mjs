import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const cmd = `
    cd /root/tibia-idle
    echo '=== CHARACTERS HUNT AND STAMINA STATE ==='
    sqlite3 prisma/dev.db "SELECT id, name, level, staminaMinutes, isHunting, lastHuntId, saveVersion FROM characters;"
    echo '=== LAST 20 TIBIA-WEB ERROR LOGS ==='
    tail -n 20 /root/.pm2/logs/tibia-web-error.log
  `;
  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); process.exit(1); }
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => {
      conn.end();
      process.exit(0);
    });
  });
}).connect({
  host: '187.7.16.210',
  port: 22,
  username: 'root',
  password: 'j3iu.dd2&bJ4nV(',
});
