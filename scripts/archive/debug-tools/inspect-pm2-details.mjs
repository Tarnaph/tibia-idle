import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const cmd = `
    cd /root/tibia-idle
    echo "=== PM2 DESCRIBE COLYSEUS-SERVER ==="
    pm2 describe colyseus-server | grep -E "script path|exec mode|node args|script args" || true
    echo "=== PM2 DESCRIBE TIBIA-WEB ==="
    pm2 describe tibia-web | grep -E "script path|exec mode|node args|script args" || true
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    stream.on('data', (d) => process.stdout.write(d));
    stream.stderr.on('data', (d) => process.stderr.write(d));
    stream.on('close', () => {
      conn.end();
    });
  });
}).connect({
  host: '187.7.16.210',
  port: 22,
  username: 'root',
  password: 'j3iu.dd2&bJ4nV(',
});
