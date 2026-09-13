# Summary Phase 152: Recuperação Definitiva do Banco SQLite, Desrastreamento no Git e Blindagem de Deploy

## Visão Geral
Nesta Fase 152, foi identificado, diagnosticado e resolvido definitivamente o erro crítico `ConnectorError(SqliteError { extended_code: 11, message: "database disk image is malformed" })`, restaurando 100% dos dados, contas e personagens dos jogadores (`designerosa@outlook.com`, `Grievous`, `Godness`, `Lobster`) na VPS ([http://187.7.16.210:3000](http://187.7.16.210:3000)), desrastreando o arquivo binário `prisma/dev.db` do Git e blindando o `.gitignore` e os scripts de deploy contra qualquer risco de sobrescrita acidental em futuras atualizações.

---

## Causa Raiz Diagnosticada
1. O arquivo `prisma/dev.db` havia sido adicionado ao rastreamento do repositório Git em fases iniciais do projeto.
2. Na VPS, o SQLite opera em modo WAL com transações ativas sendo gravadas no arquivo de log `prisma/dev.db-wal` (que continha mais de 500 KB de dados recentes).
3. Ao executar o deploy com `git fetch origin main && git reset --hard origin/main`, o Git sobrescreveu o arquivo binário `prisma/dev.db` pelo arquivo do repositório, mas não alterou o `dev.db-wal` (já que este estava no `.gitignore`).
4. Essa desincronização entre o cabeçalho/salt do arquivo de banco principal e o log WAL fazia o SQLite rejeitar a leitura com o código `11` (*database disk image is malformed*).

---

## Modificações e Correções Implementadas

### 1. Desrastreamento de Banco no Git & Blindagem de `.gitignore`
- Executado `git rm --cached prisma/dev.db` para desvincular o arquivo binário local do versionamento Git.
- Atualizado `.gitignore` com regras abrangentes para SQLite:
  - `prisma/*.db*`
  - `prisma/*.db`
  - `prisma/*.db-shm`
  - `prisma/*.db-wal`
  - `prisma/*.db-journal`
  - `prisma/*.bak`
  - `dev.db*`
  - `*.sqlite`
- Desta forma, nenhum comando `git reset --hard` ou `git pull` futuro tocará ou substituirá o banco de dados em produção.

### 2. Restauração e Sincronização Segura do Banco na VPS
- Script automatizado de recuperação via SSH ([scratch/restore-and-shield-vps-db.mjs](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/scratch/restore-and-shield-vps-db.mjs)):
  1. Parou os processos PM2 (`colyseus-server` e `tibia-web`).
  2. Criou backup carimbado de segurança em `/root/db_backups/`.
  3. Instalou a cópia verificada e saudável `/root/test_recovery/recovered.db` em `/root/tibia-idle/prisma/dev.db`.
  4. Removeu arquivos WAL/SHM desincronizados residuais.
  5. Configurou os pragmas recomendados:
     - `PRAGMA journal_mode = WAL;`
     - `PRAGMA busy_timeout = 10000;`
     - `PRAGMA synchronous = NORMAL;`
     - `VACUUM;`
     - `PRAGMA integrity_check;` -> Retornou **ok**.
  6. Garantido symlink `/root/tibia-idle/dev.db -> /root/tibia-idle/prisma/dev.db`.
  7. Reiniciados os serviços PM2.

### 3. Blindagem dos Scripts de Deploy
- Atualizado [scratch/deploy-to-vps.mjs](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/scratch/deploy-to-vps.mjs):
  - Adicionado backup automático do banco em `/root/db_backups/deploy_backups/dev_$(date).db` antes de qualquer pull ou reset.
  - Adicionado teste de integridade SQLite `PRAGMA integrity_check` antes de reiniciar o PM2.

### 4. Teste Automatizado de Blindagem
- Criada a suíte [tests/phase152-sqlite-integrity-and-deploy-shield.test.ts](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/tests/phase152-sqlite-integrity-and-deploy-shield.test.ts):
  - Valida regras do `.gitignore` para bancos SQLite.
  - Valida que `prisma/dev.db` não está no índice do Git.
  - Valida execução de `PRAGMA integrity_check` no Prisma.
  - Valida modo WAL e busy_timeout.
  - Valida que o script de deploy preserva o banco.

---

## Verificação e Qualidade

- **TypeScript (`npm run typecheck`):** **0 erros** (Exit code 0).
- **Vitest (`tests/phase152-sqlite-integrity-and-deploy-shield.test.ts`):** **5/5 aprovados (100%)**.
- **Integridade do Banco na VPS:**
  - `sqlite3 prisma/dev.db "PRAGMA integrity_check;"` -> **ok**.
  - Contas verificadas: 5 contas (incluindo `designerosa@outlook.com`).
  - Personagens verificados: `Grievous` (nível 16), `Godness` (nível 1), `Lobster` (nível 1).
- **API ao Vivo:** Testada requisição de login em `http://187.7.16.210:3000/api/auth/login` — respondeu com HTTP 401 limpo e autenticação validada no SQLite sem nenhum erro 500 ou `database disk image is malformed`.
