import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  conn.exec('sqlite3 /root/tibia-idle/prisma/dev.db "SELECT id, email, role FROM accounts; SELECT id, name, adminTitle, level, accountId FROM characters;"', (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => { conn.end(); });
  });
}).connect({
  host: '187.7.16.210',
  port: 22,
  username: 'root',
  password: 'j3iu.dd2&bJ4nV(',
});
