import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
function getArg(flag, defaultValue = null) {
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return defaultValue;
}
const hasFlag = (flag) => args.includes(flag);

if (hasFlag('--help') || hasFlag('-h')) {
  console.log(`
Uso: node scripts/deploy.mjs [opções]

Opções:
  --phase <num>         Número da fase sendo entregue (ex: 245). Default: auto-detectado do STATE.md
  --desc <texto>        Descrição breve da atualização para os logs
  --skip-build          Pula a etapa de build na VPS (reinicia apenas os processos)
  --kill-timeout <ms>   Tempo de espera para flush gracioso no PM2 em ms (default: 10000)
  --help, -h            Exibe esta ajuda
  `);
  process.exit(0);
}

// Auto-detect phase from .planning/STATE.md if not provided
let phase = getArg('--phase');
let phaseDesc = getArg('--desc');

if (!phase) {
  try {
    const statePath = path.resolve(process.cwd(), '.planning', 'STATE.md');
    if (fs.existsSync(statePath)) {
      const stateContent = fs.readFileSync(statePath, 'utf8');
      const phaseMatch = stateContent.match(/Phase:\s*(\d+)/i) || stateContent.match(/total_phases:\s*(\d+)/i);
      if (phaseMatch) {
        phase = phaseMatch[1];
      }
    }
  } catch (err) {
    // ignore
  }
}
phase = phase || 'latest';

const killTimeout = getArg('--kill-timeout', '10000');
const skipBuild = hasFlag('--skip-build');

const vpsConfig = {
  host: process.env.VPS_HOST || '187.7.16.210',
  port: parseInt(process.env.VPS_PORT || '22', 10),
  username: process.env.VPS_USER || 'root',
  password: process.env.VPS_PASSWORD || 'j3iu.dd2&bJ4nV(',
  readyTimeout: 30000,
};

console.log(`=======================================================`);
console.log(`🚀 DEPLOY UNIFICADO - CAVEBOUND / EXURA MMORPG`);
console.log(`🎯 Destino: ${vpsConfig.username}@${vpsConfig.host}:${vpsConfig.port}`);
console.log(`📦 Fase: ${phase}${phaseDesc ? ` - ${phaseDesc}` : ''}`);
console.log(`⏱️ Kill Timeout (Graceful Flush): ${killTimeout}ms`);
console.log(`🔨 Build: ${skipBuild ? 'SKIP' : 'ENABLED'}`);
console.log(`=======================================================\n`);

const conn = new Client();

conn.on('ready', () => {
  console.log(`[SSH] Conectado com sucesso à VPS ${vpsConfig.host}. Executando pipeline autoritativo...`);

  const cmd = `
    set -e
    cd /root/tibia-idle
    
    echo "=== 1. PRE-DEPLOY DATABASE SAFETY BACKUP ==="
    mkdir -p /root/db_backups/deploy_backups
    BACKUP_FILE="/root/db_backups/deploy_backups/dev_pre_phase${phase}_deploy_$(date +%Y%m%d_%H%M%S).db"
    if [ -f "prisma/dev.db" ]; then
      cp -a prisma/dev.db "$BACKUP_FILE"
      echo "✅ Backup local do banco de dados salvo em: $BACKUP_FILE"
      echo "=== 2. SQLITE PRE-DEPLOY INTEGRITY CHECK ==="
      sqlite3 prisma/dev.db "PRAGMA integrity_check;"
    else
      echo "ℹ️ prisma/dev.db não encontrado para backup SQLite local."
    fi
    
    echo "=== 3. GIT FETCH & RESET TO ORIGIN/MAIN ==="
    git fetch origin main
    git reset --hard origin/main
    LATEST_COMMIT=$(git rev-parse --short HEAD)
    echo "HEAD atualizado para o commit: $LATEST_COMMIT"
    
    echo "=== 4. PRISMA SCHEMA SYNC & CLIENT GENERATION ==="
    npx prisma db push --accept-data-loss
    npx prisma generate
    
    echo "=== 5. CONFIGURE COMMIT STAMP ==="
    if grep -q "NEXT_PUBLIC_GIT_COMMIT" .env; then
      sed -i "s/NEXT_PUBLIC_GIT_COMMIT=.*/NEXT_PUBLIC_GIT_COMMIT=\"$LATEST_COMMIT\"/" .env
    else
      echo "NEXT_PUBLIC_GIT_COMMIT=\"$LATEST_COMMIT\"" >> .env
    fi
    export NEXT_PUBLIC_GIT_COMMIT="$LATEST_COMMIT"
    
    ${skipBuild ? 'echo "=== 6. BUILD SKIPPED (--skip-build) ==="' : `
    echo "=== 6. BUILD PRODUCTION BUNDLE (npx vinext build) ==="
    npx vinext build
    node scripts/patch-http-pipeline.cjs
    `}
    
    echo "=== 7. GRACEFUL RESTART PM2 SERVICES WITH FLUSH & KILL TIMEOUT ==="
    # O timeout de ${killTimeout}ms permite que os sinais SIGINT/SIGTERM disparem o flush de persistência no Colyseus
    pm2 restart colyseus-server tibia-web --kill-timeout ${killTimeout}
    pm2 save
    sleep 3
    pm2 status
    
    echo "=== 8. HTTP HEALTHCHECK SMOKE TEST ==="
    curl -I -s http://127.0.0.1:3000 | head -n 5
    
    echo ""
    echo "=== ✅ DEPLOY DA FASE ${phase} CONCLUÍDO COM SUCESSO NA VPS (Commit: $LATEST_COMMIT) ==="
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('[SSH] Erro ao disparar comando na VPS:', err);
      process.exit(1);
    }
    stream.on('data', (d) => process.stdout.write(d));
    stream.stderr.on('data', (d) => process.stderr.write(d));
    stream.on('close', (code) => {
      console.log(`\n[SSH] Pipeline finalizado com código de saída ${code}`);
      conn.end();
      process.exit(code || 0);
    });
  });
}).connect(vpsConfig);

conn.on('error', (err) => {
  console.error('[SSH] Falha na conexão SSH com a VPS:', err.message);
  process.exit(1);
});
