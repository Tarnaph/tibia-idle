# Walkthrough - Phase 167: Bloco 1 - Segurança, Persistência Multi-Sala e Backup SQLite

## 🎯 Resumo da Entrega

A **Phase 167 (Bloco 1)** foi concluída com êxito total, implementando com rigor as proteções, o determinismo de persistência e a resiliência de banco alinhados entre a equipe e o revisor sênior:

1. **Derivação Autoritativa de Nível e Atributos no Servidor:**
   - O servidor não aceita mais `level` arbitrário enviado pelo cliente no payload HTTP `/save` nem no estado da sala.
   - O nível é derivado exclusivamente da experiência acumulada via `levelForExperience(exp)`.
   - Stats derivados (`maxHealth`, `maxMana`, `capacity`) são calculados com base na vocação e no nível legítimo via `calculateStatsForLevel(vocation, level)`, impedindo atributos inflados.

2. **Versionamento Monotônico e Anti-Replay (`saveVersion` & `lastSavedAt`):**
   - Adicionados `saveVersion Int @default(1)` e `lastSavedAt DateTime @default(now())` no modelo `Character` do Prisma (`prisma/schema.prisma`).
   - Sincronizado o schema no SQLite (`prisma/dev.db`) sem alterar contas ou histórico de jogadores.
   - Pacotes desatualizados que chegam fora de ordem por jitter de rede são descartados com segurança (`skipped: true`), prevenindo regressões de estado e replay attacks.
   - Todo salvamento bem-sucedido incrementa monotonicamente `saveVersion = currentVersion + 1`.

3. **Mutex Atômico por Personagem (`CharacterSaveLockManager`):**
   - Criado gerenciador de locks em memória em `packages/auth/src/characterSaveLock.ts` exportado em `packages/auth/src/index.ts`.
   - Serializa atomicamente gravações para o mesmo `characterId`, eliminando dirty writes e concorrência descontrolada entre chamadas HTTP (`/api/characters/[id]/save`) e o autosave periódico da sala Colyseus.
   - Operações em personagens distintos continuam paralelas e independentes.

4. **Isolamento de Autosave Multi-Sala no Colyseus e Graceful Teardown:**
   - Eliminado o timer estático global de `PrismaPersistenceManager.ts`.
   - Cada instância de `ThaisCityRoom` gerencia seu próprio timer de autosave usando o clock da sala (`this.clock.setInterval`).
   - Adicionada flag anti-encavalamento (`activeSavePromise`) para evitar que ciclos de salvamento se sobreponham.
   - Implementado teardown gracioso no `onDispose` da sala, aguardando gravações ativas em voo antes de executar o salvamento final.

5. **Proteção e Autenticação HTTP Basic no Monitor Colyseus (`/colyseus`):**
   - Implementado middleware `colyseusMonitorAuthMiddleware` em `packages/server/src/server.ts`.
   - Retorna `401 Unauthorized` com cabeçalho `WWW-Authenticate: Basic realm="Colyseus Monitor"` quando acessado sem credenciais válidas.
   - Se `ENABLE_COLYSEUS_MONITOR=false` ou em produção sem senha configurada (`COLYSEUS_MONITOR_PASS`), responde `404 Not Found`.

6. **Script Determinístico de Backup SQLite WAL-Safe (`scripts/backup-sqlite.mjs`):**
   - Implementado snapshot atômico a quente usando o comando nativo `VACUUM INTO 'backups/backup-<timestamp>.db'`, seguro mesmo com o banco em modo WAL e com jogadores conectados.
   - Validação imediata com `PRAGMA integrity_check` garantindo que o arquivo gerado está íntegro (`ok`).
   - Rotação automática mantendo os últimos 10 snapshots.
   - Atalho adicionado em `package.json`: `npm run db:backup`.

---

## 🛠️ Arquivos Modificados e Criados

| Arquivo | Componente / Responsabilidade | Modificação |
|---|---|---|
| `prisma/schema.prisma` | Banco de Dados / Prisma | Adicionados `saveVersion` e `lastSavedAt` no modelo `Character`. |
| `packages/auth/src/characterSaveLock.ts` | Auth / Concorrência | Mutex in-memory por `characterId` via `CharacterSaveLockManager`. |
| `packages/auth/src/characterService.ts` | Auth / Lógica de Personagem | Anti-replay, derivação autoritativa por XP e lock atômico. |
| `packages/auth/src/index.ts` | Auth / Exportações | Exportado `CharacterSaveLockManager`. |
| `app/api/characters/[id]/save/route.ts` | API HTTP Next.js | Repassa `saveVersion` e trata pacotes com status `skipped`. |
| `packages/server/src/persistence/PrismaPersistenceManager.ts` | Server / Persistência | Derivação autoritativa de stats/nível, mutex e suporte a batch por sala. |
| `packages/server/src/rooms/ThaisCityRoom.ts` | Server / Colyseus Room | Autosave local isolado via room clock, `activeSavePromise` e `onDispose` gracioso. |
| `packages/server/src/server.ts` | Server / HTTP & Colyseus | Middleware de Basic Auth e 404 guard em `/colyseus`. |
| `scripts/backup-sqlite.mjs` | Scripts / Backup WAL | Script atômico com `VACUUM INTO` e validação com `PRAGMA integrity_check`. |
| `package.json` | Configuração do Projeto | Adicionado script `npm run db:backup`. |
| `tests/block1-security-and-multi-room-persistence.test.ts` | Testes Automatizados | 11 testes cobrindo derivação de nível, versionamento, mutex, salas e backup. |

---

## 🧪 Validação dos Testes

- **Suíte Dedicada do Bloco 1 (`tests/block1-security-and-multi-room-persistence.test.ts`):** 11/11 aprovados (100%).
- **Regressão de Persistência e Auth:**
  - `tests/phase46-postgresql-persistence-reconnection-e2e.test.ts`: 3/3 aprovados.
  - `tests/auth-foundation.test.ts`: 10/10 aprovados.
  - `tests/phase128-autosave-mutex-and-sprite-resilience.test.ts`: 7/7 aprovados.
  - `tests/phase116-auth-security-and-idle-pose.test.ts`: 8/8 aprovados.
  - `tests/phase68-death-penalty-and-modal.test.ts`: 6/6 aprovados.
- **Checagem de Tipos TypeScript (`npm run typecheck`):** 0 erros no monorepo completo.
- **Servidor Dev:** Ativo e saudável na porta 3000 (`GET /api/config 200 in 5ms`).
