import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('[SSH] Connected to VPS. Preparing database migration and Wolfy hunt context evidence...');
  const cmd = `
    set -e
    cd /root/tibia-idle

    echo "=== 1. PRE-MIGRATION SAFETY BACKUP ==="
    mkdir -p /root/db_backups/deploy_backups
    BACKUP_FILE="/root/db_backups/deploy_backups/dev_pre_hunt_recovery_$(date +%Y%m%d_%H%M%S).db"
    cp -a prisma/dev.db "$BACKUP_FILE"
    echo "Backup created at: $BACKUP_FILE"

    echo "=== 2. SQLITE PRE-INTEGRITY CHECK ==="
    sqlite3 prisma/dev.db "PRAGMA integrity_check;"

    echo "=== 3. APPLY MIGRATION (active_hunt_sessions & isHunting) ==="
    sqlite3 prisma/dev.db "
      -- Add isHunting column if not exists
      ALTER TABLE characters ADD COLUMN isHunting BOOLEAN NOT NULL DEFAULT 0;
    " || echo "Column isHunting might already exist, continuing..."

    sqlite3 prisma/dev.db "
      -- Create active_hunt_sessions table
      CREATE TABLE IF NOT EXISTS active_hunt_sessions (
        characterId TEXT NOT NULL PRIMARY KEY,
        sessionId TEXT NOT NULL,
        huntId TEXT NOT NULL,
        isHunting BOOLEAN NOT NULL DEFAULT 1,
        startedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    "

    echo "=== 4. REGISTER WOLFY AUTHORITATIVE SERVER EVIDENCE IN DB ==="
    # Baseado nas evidências dos logs do servidor (tentativas de save em troll-cave):
    sqlite3 prisma/dev.db "
      INSERT OR REPLACE INTO active_hunt_sessions (characterId, sessionId, huntId, isHunting, startedAt, updatedAt)
      VALUES ('8b75dc19-867e-46e2-9143-c26101f312f8', 'server-evidence-troll-cave', 'troll-cave', 1, '2026-09-17 19:04:44', datetime('now'));

      UPDATE characters SET isHunting = 1 WHERE id = '8b75dc19-867e-46e2-9143-c26101f312f8';
    "

    echo "=== 5. VERIFY ACTIVE HUNT SESSION FOR WOLFY ==="
    sqlite3 prisma/dev.db "SELECT * FROM active_hunt_sessions WHERE characterId = '8b75dc19-867e-46e2-9143-c26101f312f8';"
    sqlite3 prisma/dev.db "SELECT id, name, level, experience, saveVersion, isHunting FROM characters WHERE id = '8b75dc19-867e-46e2-9143-c26101f312f8';"

    echo "=== 6. SQLITE POST-INTEGRITY CHECK ==="
    sqlite3 prisma/dev.db "PRAGMA integrity_check;"
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('[SSH] Exec error:', err);
      process.exit(1);
    }
    stream.on('data', (d) => process.stdout.write(d));
    stream.stderr.on('data', (d) => process.stderr.write(d));
    stream.on('close', (code) => {
      console.log(`\n[SSH] Step finished with code ${code}`);
      conn.end();
      process.exit(code || 0);
    });
  });
}).connect({
  host: '187.7.16.210',
  port: 22,
  username: 'root',
  password: 'j3iu.dd2&bJ4nV(',
  readyTimeout: 30000,
});
