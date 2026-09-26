# Phase 244 Summary: Blindagem Total de Persistência (Reconciliação de UUID de Alts, Graceful Shutdown no Servidor e Flush Pré-Deploy)

## Status: Complete
**Data:** 25 de Setembro de 2026
**Commit:** `fix(persistence): reconcile alt canonical UUID, add graceful server shutdown flush and deploy safety`

---

## 🎯 Objetivos Entregues

1. **Reconciliação Imediata de UUID de Novos Alts (`GamePrototype.tsx` & `packages/domain/src/party.ts`):**
   - Identificada e corrigida a brecha crítica em que personagens criados em jogo recebiam IDs locais provisórios (`sorcerer-2`, etc.) enquanto o banco de dados Prisma gerava um UUID canônico (`c7a8b9f0-...`). Como os IDs não eram sincronizados, o autosave de alts batia na API com ID provisório inexistente, gerando silenciosamente HTTP 403 e impedindo que o progresso (level 50~60, skills, etc.) fosse salvo no banco.
   - Atualizada a função de domínio `addPartyMember` para aceitar um parâmetro opcional `explicitId?: string`, preservando 100% de retrocompatibilidade com testes e callers existentes.
   - Em `createMember` ([`GamePrototype.tsx`](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/GamePrototype.tsx)), quando autenticado, a requisição `POST /api/characters` é executada primeiro e o UUID oficial gerado pelo banco é repassado diretamente para `addPartyMember`. Assim, o personagem nasce no estado local já com o UUID autoritativo do banco de dados em `game.session.characters`, `savedPool`, `partyMemberIds` e `characterSaveVersionsRef`.
   - Modais [`PartyMemberModal.tsx`](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/PartyMemberModal.tsx) e [`UnifiedPartyModal.tsx`](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/party/UnifiedPartyModal.tsx) atualizados para suportar o fluxo de criação assíncrono com feedback de erros de rede.

2. **Auto-Reconciliação Inteligente e Telemetria em Autosave (`GamePrototype.tsx`):**
   - No loop `saveProgress` de personagens secundários, se uma requisição retornar HTTP 403 ou 404 (indicando que o ID em memória diverge do banco), o jogo consulta `/api/characters`, localiza o personagem pelo nome, descobre o UUID real e auto-cura dinamicamente as referências em `game.session.characters`, `savedPool`, `partyMemberIds` e `characterSaveVersionsRef`.

3. **Graceful Shutdown & Save-on-Exit no Servidor Colyseus (`ThaisCityRoom.ts`, `HuntDungeonRoom.ts` & `cli.ts`):**
   - Em `ThaisCityRoom`, implementado o método estático `flushActiveInstanceSaves` e tornado `performRoomAutoSave` público.
   - Em `HuntDungeonRoom`, implementado registro estático de salas ativas (`activeRooms`), método `flushAllActiveRooms` e persistência forçada de todos os jogadores no `onDispose`.
   - No ponto de entrada do servidor Node/Colyseus ([`packages/server/src/cli.ts`](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/packages/server/src/cli.ts)), adicionados handlers para os sinais `SIGTERM` e `SIGINT` emitidos pelo PM2. Quando um reinício ou parada é comandado, o servidor dispara o flush de todas as salas de Thais e de Caçadas e aguarda a conclusão antes de sair (`process.exit(0)`).

4. **Script de Deploy Blindado com Graceful Restart (`scripts/deploy-phase244-vps.mjs`):**
   - Atualizado o comando de reinício para `pm2 restart colyseus-server tibia-web --kill-timeout 10000`, concedendo uma janela de 10 segundos para que todas as transações em trânsito e flushes de persistência sejam gravados sem cortes abruptos.

---

## 🧪 Validação e Testes

- **Suíte de Testes da Fase 244:**
  - `tests/phase244-persistence-reconciliation.test.ts`:
    - 5/5 testes aprovados com 100% de sucesso.
    - Teste 1: Uso do UUID canônico do banco em `addPartyMember`.
    - Teste 2: Comportamento padrão mantido quando `explicitId` não for fornecido.
    - Teste 3: Prevenção de duplicidade por UUID na party.
    - Teste 4: Execução de `ThaisCityRoom.flushActiveInstanceSaves` sem falhas.
    - Teste 5: Rastreamento dinâmico de masmorras ativas e execução de `flushAllActiveRooms` e `onDispose` em `HuntDungeonRoom`.
- **Testes de Regressão de Persistência:**
  - `tests/phase173-party-persistence-and-fix-md.test.ts`: 7/7 aprovados.
  - `tests/phase174-party-gold-vault-and-autosave.test.ts`: 6/6 aprovados.
- **Tipagem Estrita TypeScript:**
  - `npm run typecheck`: 0 erros (`tsc --noEmit --incremental false` concluído com sucesso).

---

## 📁 Arquivos Modificados / Criados

- `packages/domain/src/party.ts`: Adicionado suporte a `explicitId?: string` em `addPartyMember`.
- `apps/web/components/GamePrototype.tsx`: `createMember` assíncrono com UUID canônico e auto-reconciliação em `saveProgress`.
- `apps/web/components/PartyMemberModal.tsx`: Suporte a `onCreate` assíncrono.
- `apps/web/components/party/UnifiedPartyModal.tsx`: Suporte a `onCreateCharacter` assíncrono.
- `packages/server/src/rooms/ThaisCityRoom.ts`: Adicionado `flushActiveInstanceSaves` e tornado `performRoomAutoSave` público.
- `packages/server/src/rooms/HuntDungeonRoom.ts`: Adicionados `activeRooms`, `flushAllActiveRooms` e persistência em `onDispose`.
- `packages/server/src/cli.ts`: Handlers de `SIGTERM` e `SIGINT` com flush gracioso.
- `tests/phase244-persistence-reconciliation.test.ts`: Nova suíte de testes unitários.
- `scripts/deploy-phase244-vps.mjs`: Script de deploy seguro com `--kill-timeout 10000`.
- `FIX.md`: Marcado Item 18 como concluído `[x]`.
- `.planning/ROADMAP.md` e `.planning/STATE.md`: Atualizados para refletir a Fase 244 completa.
