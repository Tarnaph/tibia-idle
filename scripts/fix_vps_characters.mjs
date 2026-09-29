import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const code = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const brututus = await prisma.character.findFirst({ where: { name: 'Brututus' } });
  if (brututus) {
    await prisma.character.update({
      where: { id: brututus.id },
      data: {
        gender: 'female',
        outfit: 'Oriental',
        outfitLookType: 150,
        outfitHead: 0,
        outfitBody: 86,
        outfitLegs: 114,
        outfitFeet: 76,
        health: brututus.maxHealth > 0 ? brututus.maxHealth : 655,
        mana: brututus.maxMana > 0 ? brututus.maxMana : 3065,
        isHunting: false,
      }
    });
    console.log('Brututus updated successfully to female Oriental (150) with full HP/MP!');
  }

  const caos = await prisma.character.findFirst({ where: { name: 'Caos' } });
  if (caos) {
    await prisma.character.update({
      where: { id: caos.id },
      data: {
        gender: 'male',
        outfit: 'Knight',
        outfitLookType: 131,
        outfitHead: 0,
        outfitBody: 86,
        outfitLegs: 114,
        outfitFeet: 76,
        health: caos.maxHealth > 0 ? caos.maxHealth : 1620,
        mana: caos.maxMana > 0 ? caos.maxMana : 525,
        isHunting: false,
      }
    });
    console.log('Caos updated successfully to male Knight (131) with full HP/MP!');
  }

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
`;

  conn.exec(`cd /root/tibia-idle && node -e "${code.replace(/\n/g, ' ')}"`, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('data', d => out += d);
    stream.stderr.on('data', d => out += d);
    stream.on('close', () => {
      console.log('Output:\n' + out);
      conn.end();
    });
  });
}).connect({
  host: '187.7.16.210',
  port: 22,
  username: 'root',
  password: 'j3iu.dd2&bJ4nV('
});
