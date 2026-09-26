import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

describe('Phase 245: Onda 1 - Limpeza e Unificação da Infraestrutura de Scripts', () => {
  const rootDir = process.cwd();
  const scriptsDir = path.resolve(rootDir, 'scripts');
  const archiveDir = path.resolve(scriptsDir, 'archive');
  const legacyDeploysDir = path.resolve(archiveDir, 'legacy-deploys');
  const debugToolsDir = path.resolve(archiveDir, 'debug-tools');

  it('1. Deve possuir o script de deploy unificado scripts/deploy.mjs', () => {
    const deployScriptPath = path.resolve(scriptsDir, 'deploy.mjs');
    expect(fs.existsSync(deployScriptPath)).toBe(true);

    const content = fs.readFileSync(deployScriptPath, 'utf8');
    expect(content).toContain('DEPLOY UNIFICADO');
    expect(content).toContain('--phase');
    expect(content).toContain('--kill-timeout');
    expect(content).toContain('--skip-build');
    expect(content).toContain('pm2 restart colyseus-server tibia-web');
  });

  it('2. Deve executar node scripts/deploy.mjs --help com código 0', () => {
    const output = execSync('node scripts/deploy.mjs --help', { encoding: 'utf8', cwd: rootDir });
    expect(output).toContain('Uso: node scripts/deploy.mjs [opções]');
    expect(output).toContain('--phase');
    expect(output).toContain('--skip-build');
    expect(output).toContain('--kill-timeout');
  });

  it('3. Deve ter arquivado os scripts redundantes deploy-phase*.mjs fora da raiz de scripts', () => {
    const rootScriptFiles = fs.readdirSync(scriptsDir, { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => d.name);

    // Não deve haver nenhum deploy-phase*.mjs na pasta scripts raiz
    const remainingPhaseDeploys = rootScriptFiles.filter((name) => name.startsWith('deploy-phase'));
    expect(remainingPhaseDeploys).toHaveLength(0);

    // Os scripts legados devem estar salvos em scripts/archive/legacy-deploys/
    expect(fs.existsSync(legacyDeploysDir)).toBe(true);
    const archivedDeploys = fs.readdirSync(legacyDeploysDir);
    expect(archivedDeploys.length).toBeGreaterThan(40);
  });

  it('4. Deve ter a pasta scripts/archive/debug-tools preservando ferramentas antigas de diagnóstico', () => {
    expect(fs.existsSync(debugToolsDir)).toBe(true);
    const debugTools = fs.readdirSync(debugToolsDir);
    expect(debugTools.length).toBeGreaterThan(5);
  });

  it('5. Deve configurar o comando "deploy" no package.json apontando para scripts/deploy.mjs', () => {
    const pkgPath = path.resolve(rootDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    expect(pkg.scripts.deploy).toBe('node scripts/deploy.mjs');
  });
});
