import { Client } from 'ssh2';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localScript = path.join(__dirname, 'remote-test-runner.js');

const conn = new Client();
conn.on('ready', () => {
  console.log('[SSH] Conectado à VPS. Fazendo upload do script de teste via SFTP...');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    sftp.fastPut(localScript, '/root/test-phase186.js', (err) => {
      if (err) throw err;
      console.log('[SFTP] Upload concluído. Executando node /root/test-phase186.js...');
      conn.exec('node /root/test-phase186.js', (err, proc) => {
        if (err) throw err;
        proc.on('data', d => process.stdout.write(d));
        proc.stderr.on('data', d => process.stderr.write(d));
        proc.on('close', (code) => {
          conn.exec('rm -f /root/test-phase186.js', () => {
            conn.end();
            process.exit(code || 0);
          });
        });
      });
    });
  });
}).connect({
  host: '187.7.16.210',
  port: 22,
  username: 'root',
  password: 'j3iu.dd2&bJ4nV(',
});
