import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('[SSH] Conectado à VPS 187.7.16.210. Iniciando deploy da Fase 185 (Trilha Sonora por Hunt e Vídeo de Login)...');
  const cmd = `
    set -e
    cd /root/tibia-idle
    
    echo "=== 1. PRE-DEPLOY DATABASE SAFETY BACKUP ==="
    mkdir -p /root/db_backups/deploy_backups
    BACKUP_FILE="/root/db_backups/deploy_backups/dev_pre_phase185_deploy_$(date +%Y%m%d_%H%M%S).db"
    cp -a prisma/dev.db "$BACKUP_FILE"
    echo "Backup created at: $BACKUP_FILE"
    
    echo "=== 2. SQLITE PRE-DEPLOY INTEGRITY CHECK ==="
    sqlite3 prisma/dev.db "PRAGMA integrity_check;"
    
    echo "=== 3. GIT FETCH & RESET TO ORIGIN/MAIN ==="
    git fetch origin main
    git reset --hard origin/main
    LATEST_COMMIT=$(git rev-parse --short HEAD)
    echo "HEAD now at: $LATEST_COMMIT"
    
    echo "=== 3.1 RESTORE MEDIA ASSETS FROM /root/tibia-idle/songs/ IF NEEDED ==="
    mkdir -p /root/tibia-idle/public/songs
    cp -a /root/tibia-idle/songs/songtibia.webm /root/tibia-idle/public/songtibia.webm 2>/dev/null || true
    cp -a /root/tibia-idle/songs/*.mp3 /root/tibia-idle/public/songs/ 2>/dev/null || true
    
    # Ensure kebab-case names
    cp -a "/root/tibia-idle/songs/Beneath the Streets - Rats.mp3" /root/tibia-idle/public/songs/beneath-the-streets-rats.mp3 2>/dev/null || true
    cp -a "/root/tibia-idle/songs/Drums Under Stone - Trolls.mp3" /root/tibia-idle/public/songs/drums-under-stone-trolls.mp3 2>/dev/null || true
    cp -a "/root/tibia-idle/songs/Underfoot - Rotworms.mp3" /root/tibia-idle/public/songs/underfoot-rotworms.mp3 2>/dev/null || true
    cp -a "/root/tibia-idle/songs/The Dead Remember - Skeletons.mp3" /root/tibia-idle/public/songs/the-dead-remember-skeletons.mp3 2>/dev/null || true
    cp -a "/root/tibia-idle/songs/Threads in the Dark - Spiders.mp3" /root/tibia-idle/public/songs/threads-in-the-dark-spiders.mp3 2>/dev/null || true
    cp -a "/root/tibia-idle/songs/Dragons pride.mp3" /root/tibia-idle/public/songs/dragons-pride.mp3 2>/dev/null || true
    cp -a "/root/tibia-idle/songs/Sunset in the Village.mp3" /root/tibia-idle/public/songs/sunset-in-the-village.mp3 2>/dev/null || true
    
    echo "=== 4. PRISMA CLIENT GENERATE ==="
    npx prisma generate
    
    echo "=== 5. CONFIGURE COMMIT STAMP ==="
    if grep -q "NEXT_PUBLIC_GIT_COMMIT" .env; then
      sed -i "s/NEXT_PUBLIC_GIT_COMMIT=.*/NEXT_PUBLIC_GIT_COMMIT=\\"$LATEST_COMMIT\\"/" .env
    else
      echo "NEXT_PUBLIC_GIT_COMMIT=\\"$LATEST_COMMIT\\"" >> .env
    fi
    export NEXT_PUBLIC_GIT_COMMIT="$LATEST_COMMIT"
    
    echo "=== 6. BUILD PRODUCTION BUNDLE (npx vinext build) ==="
    npx vinext build
    node scripts/patch-http-pipeline.cjs
    
    echo "=== 7. RESTART PM2 SERVICES ==="
    pm2 restart tibia-web colyseus-server
    pm2 save
    sleep 3
    pm2 status
    
    echo "=== 8. HTTP SMOKE CHECK DE MÍDIA ONLINE ==="
    echo "Check /songtibia.webm:"
    curl -I -s http://127.0.0.1:3000/songtibia.webm | head -n 5
    echo "Check /songs/beneath-the-streets-rats.mp3:"
    curl -I -s http://127.0.0.1:3000/songs/beneath-the-streets-rats.mp3 | head -n 5
    
    echo ""
    echo "=== DEPLOY DA FASE 185 CONCLUÍDO COM SUCESSO NA VPS (Commit $LATEST_COMMIT) ==="
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('[SSH] Erro de execução:', err);
      process.exit(1);
    }
    stream.on('data', (d) => process.stdout.write(d));
    stream.stderr.on('data', (d) => process.stderr.write(d));
    stream.on('close', (code) => {
      console.log(`\n[SSH] Deploy script finalizado com código ${code}`);
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
