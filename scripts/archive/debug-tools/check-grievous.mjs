import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  conn.exec(`sqlite3 /root/tibia-idle/prisma/dev.db "SELECT name, outfit, outfitLookType, outfitAddons, mount, mountActive FROM characters WHERE name = 'Grievous'"`, (err, stream) => {
    stream.on('data', d => process.stdout.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '187.7.16.210', port: 22, username: 'root', password: 'j3iu.dd2&bJ4nV(' });
