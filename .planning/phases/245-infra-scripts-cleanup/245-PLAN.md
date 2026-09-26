# Phase 245 Plan: Onda 1 - Limpeza e Unificação da Infraestrutura de Scripts

## Objetivo
Consolidar mais de 60 scripts redundantes de deploy (`deploy-phase*.mjs`) em um único script universal, canônico e profissional (`scripts/deploy.mjs`), e arquivar scripts temporários obsoletos de debug em `scripts/archive/`, despoluindo a raiz e estabelecendo um pipeline de entrega contínua limpo e seguro.

## Escopo Técnico
1. **Criação de `scripts/deploy.mjs`:**
   - Suporte a flags CLI (ex: `--phase <num>`, `--skip-build`, `--kill-timeout <ms>`).
   - Integração das salvaguardas consolidadas na Fase 244 (Graceful Colyseus flush, kill-timeout de 10s no PM2, compilação atômica de packages e web, verificação de logs remotos).
   - Definição de alias no `package.json` (`npm run deploy`).
2. **Arquivamento Seguro:**
   - Mover os arquivos `deploy-phase*.mjs` antigos para `scripts/archive/legacy-deploys/` (preservando o histórico caso seja necessário consultar configurações específicas).
   - Mover scripts de investigação pontual antigos para `scripts/archive/debug-tools/`.
3. **Validação:**
   - Execução de `node scripts/deploy.mjs --help` ou dry-run para garantir que o script roda sem erros de sintaxe ou de importação ES module.
   - Execução de `npm run typecheck` e `npm run test` para assegurar que nada foi quebrado.
