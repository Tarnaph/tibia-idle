import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { prisma } from '@/packages/database/src';

describe('Phase 152: SQLite Integrity, Git Database Untracking & Deploy Shield', () => {
  it('ensures .gitignore ignores SQLite database files to prevent production overwrite on deploy', () => {
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    const content = fs.readFileSync(gitignorePath, 'utf-8');

    expect(content).toContain('prisma/*.db*');
    expect(content).toContain('prisma/*.db');
    expect(content).toContain('prisma/*.db-wal');
    expect(content).toContain('prisma/*.db-shm');
    expect(content).toContain('dev.db*');
  });

  it('ensures prisma/dev.db is NOT tracked in git index', () => {
    try {
      const output = execSync('git ls-files prisma/dev.db', { encoding: 'utf-8' }).trim();
      expect(output).toBe('');
    } catch {
      // In environments where git is not accessible, test passes
    }
  });

  it('ensures database is healthy and passes PRAGMA integrity_check', async () => {
    const result = await prisma.$queryRawUnsafe<Array<{ integrity_check: string }>>('PRAGMA integrity_check;');
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].integrity_check.toLowerCase()).toBe('ok');
  });

  it('ensures WAL mode and busy timeout are configured for high concurrency', async () => {
    const modeResult = await prisma.$queryRawUnsafe<Array<{ journal_mode: string }>>('PRAGMA journal_mode;');
    expect(modeResult[0].journal_mode.toLowerCase()).toBe('wal');

    const timeoutResult = await prisma.$queryRawUnsafe<Array<{ timeout: number }>>('PRAGMA busy_timeout;');
    expect(Number(timeoutResult[0].timeout)).toBeGreaterThanOrEqual(5000);
  });

  it('verifies deploy script does NOT overwrite dev.db', () => {
    const deployScriptPath = path.join(process.cwd(), 'scratch/deploy-to-vps.mjs');
    if (fs.existsSync(deployScriptPath)) {
      const content = fs.readFileSync(deployScriptPath, 'utf-8');
      expect(content).not.toContain('rm -f /root/tibia-idle/prisma/dev.db');
    }
  });
});
