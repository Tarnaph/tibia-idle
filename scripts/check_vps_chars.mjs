import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cd /root/tibia-idle && node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.character.findMany().then(c => { console.log(c.map(x => ({ id: x.id, name: x.name, gender: x.gender, outfit: x.outfit, outfitLookType: x.outfitLookType, outfitHead: x.outfitHead, outfitBody: x.outfitBody, outfitLegs: x.outfitLegs, outfitFeet: x.outfitFeet, health: x.health, maxHealth: x.maxHealth }))); process.exit(0); });"`, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('data', d => out += d);
    stream.on('close', () => {
      console.log('--- VPS CHARACTERS ---');
      console.log(out);
      conn.end();
    });
  });
}).connect({
  host: '187.7.16.210',
  port: 22,
  username: 'root',
  password: 'j3iu.dd2&bJ4nV('
});
