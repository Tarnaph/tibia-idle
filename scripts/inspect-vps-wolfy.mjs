import { Client } from 'ssh2';
import fs from 'fs';

const conn = new Client();
conn.on('ready', () => {
  conn.exec('sqlite3 /root/tibia-idle/prisma/dev.db "SELECT id, name, level, vocationName, outfit, mount, mountActive, adminTitle, isHunting, posX, posY, posZ FROM characters WHERE id=\'8b75dc19-867e-46e2-9143-c26101f312f8\';"', (err, stream) => {
    if (err) throw err;
    stream.on('data', d => console.log('VPS Wolfy Data:\n' + d.toString()));
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
  readyTimeout: 30000,
});
