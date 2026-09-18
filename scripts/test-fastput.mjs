import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected.');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    console.log('SFTP ready. Testing fastPut on one song...');
    const local = 'songs/Beneath the Streets - Rats.mp3';
    const remote = '/root/tibia-idle/public/songs/beneath-the-streets-rats.mp3';
    let lastPercent = -1;
    sftp.fastPut(local, remote, {
      step: (total, chunk, totalSize) => {
        const pct = Math.round((total / totalSize) * 100);
        if (pct % 20 === 0 && pct !== lastPercent) {
          lastPercent = pct;
          console.log(`Progress: ${pct}%`);
        }
      }
    }, (putErr) => {
      if (putErr) console.error('Upload err:', putErr);
      else console.log('Upload OK!');
      conn.end();
    });
  });
}).connect({
  host: '187.7.16.210',
  port: 22,
  username: 'root',
  password: 'j3iu.dd2&bJ4nV(',
});
