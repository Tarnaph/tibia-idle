import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const cmd = `
    cd /root/tibia-idle
    sqlite3 -json prisma/dev.db "SELECT id, skillId, skillName, value, tries FROM character_skills WHERE characterId = '8b75dc19-867e-46e2-9143-c26101f312f8';"
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
