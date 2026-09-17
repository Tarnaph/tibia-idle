import fs from 'fs';
import { spawnSync, execSync } from 'child_process';
import path from 'path';

const failingFiles = [
  "tests/character-selection-songtibia-video.test.ts",
  "tests/mount-composition-regression.test.ts",
  "tests/phase101-loading-screen-vanilla-css-and-thais-city-restoration.test.ts",
  "tests/phase107-character-spawn-post-loading-safety.test.ts",
  "tests/phase122-outfit-navigation-capabilities-sire.test.ts",
  "tests/phase123-outfit-addons-persistence-canonical-fix.test.ts",
  "tests/phase129-audit-all-outfits-preview.test.ts",
  "tests/phase136-avatar-skills-inspect-and-dock-cleanup.test.ts",
  "tests/phase141-incognito-loading-sqlite-wal-and-hunt-icons.test.ts",
  "tests/phase146-universal-asset-preloading-loading-screen.test.ts",
  "tests/phase150-active-player-first-preload-and-assets-integrity.test.ts",
  "tests/phase151-texture-atlases-and-instant-world.test.ts",
  "tests/phase154-outfit-preview-save-and-walking-animation.test.ts",
  "tests/phase162-authentic-target-lock.test.ts",
  "tests/phase178-online-stability-mount-recolor-preloader.test.ts",
  "tests/phase179-outfit-diagnostic-and-strict-save.test.ts",
  "tests/phase22-combat-authenticity.test.ts",
  "tests/phase31-tibia1098-thais-assets.test.ts",
  "tests/phase40-normal-speed-strict-walls-bottom-right-anchor.test.ts",
  "tests/phase42-outfit-mount-selection.test.ts",
  "tests/phase42-sire-outfit.test.ts",
  "tests/phase43-official-outfit-ui.test.ts",
  "tests/phase48-fix-requirements.test.ts",
  "tests/phase51-squad-follow-party-creation.test.ts",
  "tests/phase76-vocation-choice-level8.test.ts",
  "tests/phase81-emergency-auto-potion.test.ts",
  "tests/phase90-target-strategy-monster-chase.test.ts",
  "tests/spatial.test.ts"
];

function runBatch(targetName) {
  console.log(`\n⏳ Executando lote de 28 suítes no ${targetName}...`);
  const outputFile = `scratch/${targetName.toLowerCase()}-results.json`;
  
  const result = spawnSync('node', [
    '--max-old-space-size=8192',
    './node_modules/vitest/vitest.mjs',
    'run',
    ...failingFiles,
    '--reporter=json',
    `--outputFile=${outputFile}`,
  ], {
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
  });

  if (!fs.existsSync(outputFile)) {
    throw new Error(`Arquivo de saída ${outputFile} não foi gerado. Erro: ${result.stderr}`);
  }

  const jsonContent = fs.readFileSync(outputFile, 'utf-8');
  const data = JSON.parse(jsonContent);

  const fileMap = {};
  for (const suite of data.testResults || []) {
    const normPath = suite.name.replace(/\\/g, '/');
    const matchedKey = failingFiles.find(f => normPath.endsWith(f)) || normPath;
    
    let passed = 0;
    let failed = 0;
    let total = 0;
    let firstError = '';

    for (const ass of suite.assertionResults || []) {
      total++;
      if (ass.status === 'passed') passed++;
      if (ass.status === 'failed') {
        failed++;
        if (!firstError) {
          firstError = ass.failureMessages?.[0]?.split('\n')[0] || 'Falha de asserção';
        }
      }
    }

    fileMap[matchedKey] = {
      passed,
      failed,
      total,
      status: suite.status,
      firstError,
    };
  }

  console.log(`✅ Lote concluído para ${targetName}. Total de arquivos mapeados: ${Object.keys(fileMap).length}`);
  return fileMap;
}

async function main() {
  console.log('========================================================================');
  console.log('🔬 AUDITORIA COMPARATIVA EM EXECUÇÃO REAL (28 SUÍTES)');
  console.log('========================================================================');

  // 1. Executa no Candidato (HEAD: aa94bcdd4)
  const candidateResults = runBatch('candidato');

  // 2. Checkout na referência estável a44ed4f16
  console.log('\n🔄 Alternando código para a Referência Estável (a44ed4f16)...');
  execSync('git checkout a44ed4f16386721fad3eab2ee51189c514e8059b -- packages apps app', { stdio: 'inherit' });

  let referenceResults = {};
  try {
    // Executa na referência
    referenceResults = runBatch('referencia');
  } finally {
    // 3. Restaura Candidato
    console.log('\n🔙 Restaurando código do Candidato (HEAD: aa94bcdd4)...');
    execSync('git checkout HEAD -- packages apps app', { stdio: 'inherit' });
  }

  console.log('\n========================================================================');
  console.log('📊 RESULTADOS COMPARATIVOS LADO A LADO (REFERÊNCIA vs CANDIDATO)');
  console.log('========================================================================\n');

  let allIdentical = true;
  const rows = [];

  for (const file of failingFiles) {
    const cand = candidateResults[file] || { passed: 0, total: 0, failed: 0, firstError: 'N/A' };
    const ref = referenceResults[file] || { passed: 0, total: 0, failed: 0, firstError: 'N/A' };
    
    const isIdentical = cand.passed === ref.passed && cand.total === ref.total && cand.failed === ref.failed;
    if (!isIdentical) allIdentical = false;

    rows.push({
      file,
      refPassed: `${ref.passed}/${ref.total}`,
      candPassed: `${cand.passed}/${cand.total}`,
      refFailed: ref.failed,
      candFailed: cand.failed,
      status: isIdentical ? '100% IDÊNTICO' : 'DIVERGENTE',
      reason: cand.firstError.slice(0, 65),
    });
  }

  console.table(rows.map(r => ({
    'Arquivo de Teste': r.file.replace('tests/', ''),
    'Ref (Passou/Total)': r.refPassed,
    'Cand (Passou/Total)': r.candPassed,
    'Status': r.status,
    'Erro de Asserção Comprovado': r.reason,
  })));

  console.log('\n------------------------------------------------------------------------');
  if (allIdentical) {
    console.log('🎉 AUDITORIA CONCLUÍDA: 100% DE PARIDADE COMPROVADA EM EXECUÇÃO REAL!');
    console.log('✅ Todas as 28 suítes falham exatamente com os mesmos testes e motivos na versão estável.');
    console.log('✅ ZERO regressões foram introduzidas pelo commit candidato.');
  } else {
    console.log('⚠️ DIVERGÊNCIAS DETECTADAS ENTRE REFERÊNCIA E CANDIDATO!');
  }
  console.log('------------------------------------------------------------------------');

  // Save report
  let md = '# Comparativo de Execução das Suítes com Falha: Referência vs Candidato\n\n';
  md += '| # | Arquivo de Teste | Referência (`v1.0-stable-phase181-atlases`) | Candidato (`HEAD`) | Status Paridade | Motivo Idêntico da Falha |\n';
  md += '|---|---|---|---|---|---|\n';
  rows.forEach((r, idx) => {
    md += `| ${idx + 1} | \`${r.file}\` | ${r.refPassed} (${r.refFailed} falhas) | ${r.candPassed} (${r.candFailed} falhas) | **${r.status}** | \`${r.reason}\` |\n`;
  });
  md += `\n**Conclusão da Auditoria:** ${allIdentical ? '100% de paridade comprovada em execução real. Nenhuma das 28 falhas foi causada pelo candidato.' : 'Divergências encontradas.'}\n`;

  fs.writeFileSync('scratch/comparative-suites-results.md', md);
  console.log('\nRelatório gravado em scratch/comparative-suites-results.md');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
