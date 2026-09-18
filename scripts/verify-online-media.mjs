import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  conn.exec(`
    echo "=== GET /songtibia.webm with range ==="
    curl -v -r 0-50 http://127.0.0.1:3000/songtibia.webm 2>&1 | head -n 30
    echo "=== GET /songs/beneath-the-streets-rats.mp3 with range ==="
    curl -v -r 0-50 http://127.0.0.1:3000/songs/beneath-the-streets-rats.mp3 2>&1 | head -n 30
  `, (err, stream) => {
    if (err) throw err;
    stream.on('data', (d) => process.stdout.write(d));
    stream.stderr.on('data', (d) => process.stderr.write(d));
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
