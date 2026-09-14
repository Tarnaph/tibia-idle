import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runBackup() {
  const rootDir = path.resolve(__dirname, '..');
  const backupsDir = path.resolve(rootDir, 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const rawDbUrl = process.env.DATABASE_URL || `file:${path.resolve(rootDir, 'prisma/dev.db').replace(/\\/g, '/')}`;
  const prisma = new PrismaClient({
    datasources: {
      db: { url: rawDbUrl },
    },
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `backup-${timestamp}.db`;
  const backupFilePath = path.resolve(backupsDir, backupFileName);
  const normalizedBackupPath = backupFilePath.replace(/\\/g, '/');

  console.log(`[Backup] Iniciando snapshot atômico (WAL Safe)...`);
  console.log(`[Backup] Origem: ${rawDbUrl}`);
  console.log(`[Backup] Destino: ${normalizedBackupPath}`);

  try {
    // 1. Executa VACUUM INTO nativo do SQLite (garante transações completas sem travar writes concorrentes)
    await prisma.$executeRawUnsafe(`VACUUM INTO '${normalizedBackupPath}'`);
    console.log(`[Backup] VACUUM INTO concluído com sucesso.`);

    // 2. Valida integridade do arquivo gerado
    const stats = fs.statSync(backupFilePath);
    console.log(`[Backup] Tamanho do snapshot: ${(stats.size / 1024).toFixed(2)} KB`);

    const verifyPrisma = new PrismaClient({
      datasources: {
        db: { url: `file:${normalizedBackupPath}` },
      },
    });

    try {
      const integrityResult = await verifyPrisma.$queryRawUnsafe('PRAGMA integrity_check');
      const status = integrityResult?.[0]?.integrity_check || integrityResult?.[0]?.['integrity_check'] || 'unknown';
      if (status !== 'ok') {
        throw new Error(`Falha no PRAGMA integrity_check: ${JSON.stringify(integrityResult)}`);
      }
      console.log(`[Backup] Verificação de integridade: OK (${status})`);
    } finally {
      await verifyPrisma.$disconnect();
    }

    // 3. Rotação: manter os últimos 10 backups
    const existingBackups = fs.readdirSync(backupsDir)
      .filter((f) => f.startsWith('backup-') && f.endsWith('.db'))
      .map((f) => ({
        name: f,
        path: path.resolve(backupsDir, f),
        time: fs.statSync(path.resolve(backupsDir, f)).mtimeMs,
      }))
      .sort((a, b) => b.time - a.time);

    if (existingBackups.length > 10) {
      const toRemove = existingBackups.slice(10);
      for (const item of toRemove) {
        fs.unlinkSync(item.path);
        console.log(`[Backup] Rotação: arquivo antigo removido -> ${item.name}`);
      }
    }

    console.log(`[Backup] Backup finalizado com sucesso: ${backupFileName}`);
    return { success: true, file: backupFileName, sizeBytes: stats.size };
  } catch (err) {
    console.error(`[Backup ERROR]:`, err.message || err);
    // Limpar arquivo parcial se falhou
    if (fs.existsSync(backupFilePath)) {
      try { fs.unlinkSync(backupFilePath); } catch {}
    }
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && process.argv[1].endsWith('backup-sqlite.mjs')) {
  runBackup()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { runBackup };
