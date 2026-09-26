# Phase 244: Blindagem Total de Persistência (Reconciliação de UUID de Alts, Graceful Shutdown no Servidor e Flush Pré-Deploy)

## Goal
Garantir persistência 100% resiliente e permanente para todos os personagens e jogadores, eliminando perda de progresso por desincronização de IDs ou reinicialização do servidor:
1. **Reconciliação Imediata de UUID de Novos Alts Criados em Jogo (`GamePrototype.tsx`):**
   - Em `handleCreateMember`, aguardar a resposta da criação (`POST /api/characters`).
   - Receber o UUID oficial gerado pelo Prisma DB (`data.data.id`).
   - Substituir imediatamente o ID cliente provisório (`vocation-name` ou `sorcerer-2`) pelo UUID canônico em:
     - `game.session.characters`
     - `savedPool`
     - `partyMemberIds`
     - `characterSaveVersionsRef`
   - Garantir que todos os ciclos subsequentes de autosave (`/api/characters/${alt.id}/save`) enviem para o endpoint com o UUID real, acabando com os erros 403 e garantindo que o progresso (level 50~60, skills, etc.) seja gravado no banco de dados.
2. **Telemetria e Detecção de Erros no Autosave de Alts (`GamePrototype.tsx`):**
   - No loop `saveProgressRef`, verificar `!altRes.ok`. Se falhar (ex: 403, 404, 500), logar explicitamente com detalhes (`alt.id`, `alt.name`, `altRes.status`).
   - Se o erro for 403/404, tentar buscar a lista de personagens da conta (`/api/characters`) para reconciliar o ID correto pelo nome do personagem.
3. **Graceful Shutdown & Save-on-Exit no Servidor Colyseus (`packages/server/src/rooms/ThaisCityRoom.ts`, `HuntDungeonRoom.ts`, `index.ts`):**
   - Interceptar sinais `SIGINT` e `SIGTERM` no servidor Node/Colyseus.
   - Forçar a persistência imediata (`PrismaPersistenceManager.saveCharacter` / `saveInventory`) de todas as salas e conexões ativas antes de `process.exit(0)`.
4. **Rotina de Flush e Proteção de Deploy (`scripts/deploy-phase244-vps.mjs`):**
   - No script de deploy, aguardar 5 segundos com persistência antes de disparar o reinício do PM2, garantindo que escritas em andamento sejam concluídas sem perda de dados.
5. **Save de Emergência no Browser (`beforeunload` / `pagehide`):**
   - Disparar salvamento final no fechamento da aba se houver dados não sincronizados.

## Implementation Details

### 1. `apps/web/components/GamePrototype.tsx`:
- Em `handleCreateMember`:
  - Modificar o fetch para ser assíncrono com `await`:
    ```ts
    const res = await fetch('/api/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: memberName.trim(), vocation: memberVocation, gender: memberGender }),
    });
    const data = await res.json();
    if (res.ok && data.success && data.data?.id) {
      const realId = data.data.id;
      // Reconciliar o ID provisório pelo realId no game.session.characters, savedPool, etc.
    }
    ```
- Em `saveProgressRef`:
  - Adicionar log de telemetria de erro se `!altRes.ok`:
    ```ts
    if (!altRes.ok) {
      console.error(`[GamePrototype] Falha ao salvar alt ${alt.name} (ID: ${alt.id}):`, altRes.status);
    }
    ```

### 2. `packages/server/src/rooms/ThaisCityRoom.ts` & `HuntDungeonRoom.ts`:
- Adicionar método `public async flushAllSaves(): Promise<void>` para salvar todos os personagens conectados no banco Prisma.
- Adicionar hook de shutdown no servidor (`packages/server/src/index.ts`):
  ```ts
  const shutdown = async (signal: string) => {
    console.log(`[Colyseus Server] Recebido sinal ${signal}, iniciando flush de persistência de jogadores...`);
    // flush de todas as salas ativas
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  ```

### 3. Verification & Testing:
- Criar suíte de testes unitários `tests/phase244-persistence-reconciliation.test.ts`:
  - Testar a reconciliação do ID provisório de alts criados para o UUID do banco.
  - Testar a rotina de autosave enviando com UUID e rejeição com IDs inválidos.
  - Testar a lógica de flush de persistência no shutdown.
  - Rodar `npm run typecheck` e `npm run test` com 100% de aprovação.

## Deployment:
- Script `scripts/deploy-phase244-vps.mjs` com proteção pré-restart.
