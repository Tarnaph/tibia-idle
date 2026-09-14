# Phase 167 Summary: Bloco 1 - Segurança, Persistência Multi-Sala e Backup SQLite

## 📌 Visão Geral da Entrega
A **Fase 167 (Bloco 1)** implementou com sucesso o conjunto crítico de segurança, integridade de dados e resiliência de banco de dados alinhado com o revisor sênior e aprovado pelo usuário para a homologação fechada:

1. **Derivação Autoritativa de Nível e Atributos no Servidor:**
   - O nível e os stats (`maxHealth`, `maxMana`, `capacity`) não aceitam mais dados arbitrários enviados pelo cliente no payload HTTP ou no estado da sala.
   - O nível é derivado estritamente da experiência acumulada via `levelForExperience(exp)`.
   - Stats são recalculados via `calculateStatsForLevel(vocation, level)`.

2. **Versionamento Monotônico e Anti-Replay (`saveVersion` & `lastSavedAt`):**
   - Adicionados campos `saveVersion Int @default(1)` e `lastSavedAt DateTime @default(now())` no modelo `Character` do Prisma.
   - Requisições com `saveVersion` defasado (menor que o registrado no banco) são descartadas com resposta segura `{ success: true, skipped: true }`, prevenindo replay attacks e perda de dados por jitter de rede.
   - Cada salvamento bem-sucedido incrementa monotonicamente `saveVersion = currentVersion + 1`.

3. **Mutex Atômico por Personagem (`CharacterSaveLockManager`):**
   - Serialização in-memory por `characterId` que impede race conditions e dirty writes entre requisições HTTP manuais (`/api/characters/[id]/save`) e o autosave periódico do servidor Colyseus.
   - Personagens distintos continuam processados em paralelo sem bloqueio mútuo.

4. **Isolamento de Autosave Multi-Sala no Colyseus e Graceful Teardown:**
   - Removido o timer singleton compartilhado que colidia entre salas.
   - Cada instância de `ThaisCityRoom` gerencia seu próprio timer via `this.clock.setInterval`.
   - Adicionado controle anti-encavalamento (`activeSavePromise`).
   - Implementado `onDispose` gracioso que aguarda gravações em voo e realiza o salvamento final antes do descarte da sala.

5. **Proteção e HTTP Basic Auth no Endpoint `/colyseus`:**
   - O painel do Colyseus Monitor foi protegido com middleware de autenticação HTTP Basic (`COLYSEUS_MONITOR_USER` e `COLYSEUS_MONITOR_PASS`).
   - Requisições sem autorização recebem `401 Unauthorized`.
   - Se `ENABLE_COLYSEUS_MONITOR=false` ou em produção sem senha configurada, responde `404 Not Found`.

6. **Script Determinístico de Backup SQLite WAL-Safe (`scripts/backup-sqlite.mjs`):**
   - Executa `VACUUM INTO 'backups/backup-<timestamp>.db'` de forma atômica e segura contra operações em modo WAL sem corrupção.
   - Executa `PRAGMA integrity_check` e valida integridade com status `ok`.
   - Rotação automática mantendo os últimos 10 snapshots.
   - Atalho adicionado em `package.json`: `npm run db:backup`.

---

## 🧪 Verificação e Testes
- **Suíte de Testes Dedicada (`tests/block1-security-and-multi-room-persistence.test.ts`):**
  - 11 testes criados, cobrindo todos os critérios de aceitação e proteções.
  - **Resultado:** 11/11 aprovados (100% de sucesso).
- **Testes de Regressão Executados:**
  - `tests/phase46-postgresql-persistence-reconnection-e2e.test.ts`: 3/3 aprovados.
  - `tests/auth-foundation.test.ts`: 10/10 aprovados.
  - `tests/phase128-autosave-mutex-and-sprite-resilience.test.ts`: 7/7 aprovados.
  - `tests/phase116-auth-security-and-idle-pose.test.ts`: 8/8 aprovados.
  - `tests/phase68-death-penalty-and-modal.test.ts`: 6/6 aprovados.
- **Checagem de Tipos:**
  - `npm run typecheck` (`tsc --noEmit`): 0 erros em todo o monorepo.
