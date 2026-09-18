import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('[SSH] Connected to VPS 187.7.16.210. Starting authoritative hunt recovery deploy for e18bea313...');
  const cmd = `
    set -e
    cd /root/tibia-idle
    
    echo "=== 1. PRE-DEPLOY DATABASE SAFETY BACKUP ==="
    mkdir -p /root/db_backups/deploy_backups
    BACKUP_FILE="/root/db_backups/deploy_backups/dev_pre_hunt_recovery_deploy_$(date +%Y%m%d_%H%M%S).db"
    cp -a prisma/dev.db "$BACKUP_FILE"
    echo "Backup created at: $BACKUP_FILE"
    
    echo "=== 2. SQLITE PRE-DEPLOY INTEGRITY CHECK ==="
    sqlite3 prisma/dev.db "PRAGMA integrity_check;"
    
    echo "=== 3. GIT FETCH & HARD RESET TO e18bea313 ==="
    git fetch origin main
    git reset --hard e18bea313
    git log -n 1 --oneline
    
    echo "=== 4. PRISMA CLIENT GENERATE ==="
    npx prisma generate
    
    echo "=== 5. CONFIGURE .ENV FOR INTERNAL SERVICE AUTH & COMMIT STAMP ==="
    COMMIT_HASH="e18bea313"
    if grep -q "INTERNAL_SERVICE_KEY" .env; then
      sed -i 's/INTERNAL_SERVICE_KEY=.*/INTERNAL_SERVICE_KEY="cavebound_internal_core_secret_v1"/' .env
    else
      echo 'INTERNAL_SERVICE_KEY="cavebound_internal_core_secret_v1"' >> .env
    fi
    
    if grep -q "NEXT_PUBLIC_GIT_COMMIT" .env; then
      sed -i "s/NEXT_PUBLIC_GIT_COMMIT=.*/NEXT_PUBLIC_GIT_COMMIT=\\"$COMMIT_HASH\\"/" .env
    else
      echo "NEXT_PUBLIC_GIT_COMMIT=\\"$COMMIT_HASH\\"" >> .env
    fi
    
    export NEXT_PUBLIC_GIT_COMMIT="$COMMIT_HASH"
    export INTERNAL_SERVICE_KEY="cavebound_internal_core_secret_v1"
    
    echo "=== 6. BUILD PRODUCTION BUNDLE (npx vinext build) ==="
    npx vinext build
    node scripts/patch-http-pipeline.cjs
    
    echo "=== 7. RESTART PM2 SERVICES ==="
    pm2 restart tibia-web colyseus-server
    pm2 save
    sleep 3
    pm2 status
    
    echo "=== 8. SQLITE POST-DEPLOY INTEGRITY CHECK ==="
    sqlite3 prisma/dev.db "PRAGMA integrity_check;"
    
    echo "=== 9. TEST INTERNAL COMMUNICATION & WOLFY CONTEXT ==="
    curl -s -i -H "x-internal-secret: cavebound_internal_core_secret_v1" http://127.0.0.1:2567/api/character-context/8b75dc19-867e-46e2-9143-c26101f312f8 || true
    echo ""
    echo "=== DEPLOY TO VPS COMPLETED SUCCESSFULLY ==="
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('[SSH] Exec error:', err);
      process.exit(1);
    }
    stream.on('data', (d) => process.stdout.write(d));
    stream.stderr.on('data', (d) => process.stderr.write(d));
    stream.on('close', (code) => {
      console.log(`\n[SSH] Deploy script finished with code ${code}`);
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
