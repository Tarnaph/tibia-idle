# Resumo da Fase 202: Resolução Definitiva de "Falha ao Salvar Progresso do Servidor"

## Objetivo
Eliminar todas as causas raízes dos erros de salvamento ("Falha ao salvar progresso no servidor" e "Falha ao salvar progresso antes de sair da caçada"), identificados a partir da telemetria de erro real na VPS (`187.7.16.210`).

## Diagnóstico Realizado na Produção
1. **Timeouts da Transação do Prisma e Locks de SQLite:**
   O `PrismaPersistenceManager.ts` executava `this.db.$transaction(executePersistenceTx)` com o timeout padrão de 5.000 ms. Ao salvar múltiplos skills, o timeout estourava com:
   `Transaction API error: Transaction already closed: A query cannot be executed on an expired transaction (timeout 5000 ms)`.
2. **Falsos Positivos de Rate Limiter de XP:**
   O `characterService.ts` rejeitava ganhos legítimos de caçada (+14k a +504k XP) com:
   `Suspicious XP gain: +388800 XP exceeds continuous time budget (max allowed: +10786)`.
   Isso ocorria porque a consulta de contexto autoritativo via HTTP para o Colyseus retornava `isHunting: false` quando o socket estava dessincronizado ou em transição.
3. **Colisão de Concorrência Otimista (OCC 409):**
   O Colyseus tentava salvar a cidade a cada 20s usando `Math.max(playerVersion, dbVersion)` que sobrescrevia a versão do banco em vez de respeitar o versionamento monotônico atômico.
4. **Starvation no Frontend:**
   O `GamePrototype.tsx` limitava a espera de mutex a apenas 2s, causando falhas quando salvamentos consecutivos (como autosave e clique de saída de hunt) coincidiam.

## Mudanças Realizadas
1. **`packages/database/src/index.ts`:**
   - Adicionada configuração automática de `busy_timeout=30000` e `connection_limit=1` na `DATABASE_URL` SQLite.
   - PRAGMAs configurados com `PRAGMA busy_timeout = 30000` e `PRAGMA journal_mode = WAL`.
2. **`packages/server/src/persistence/PrismaPersistenceManager.ts`:**
   - Adicionados `{ maxWait: 15000, timeout: 30000 }` na transação interativa do Prisma.
   - Corrigido `currentVersion = playerVersion` para garantir que o OCC não sobrescreva silenciosamente versões defasadas.
3. **`packages/auth/src/characterService.ts`:**
   - Validação de caçada ajustada: `isHunting = options?.isInternal ? Boolean(options?.isHunting) : Boolean(contextResult.isHunting || (existing as any)?.isHunting);`.
   - Se o banco de dados confirma que o personagem está em caçada (`existing.isHunting`), o ganho de XP é processado com o orçamento correto de caçada (1.800.000 de burst).
4. **`apps/web/components/GamePrototype.tsx`:**
   - Mutex de salvamento ampliado de 2s para 6s.
   - Detalhamento de erro do backend capturado do JSON HTTP e exibido informativamente no banner e console.
   - 4ª tentativa de retry com delay de 1.5s adicionada no `exitHunt` para absorver latência de lock sem falhar.

## Verificação
- `npm run typecheck`: 0 erros de tipagem.
- Vitest: 100% de aprovação em todos os testes de persistência, OCC e taxas de avanço (`phase182`, `phase199`, `phase167`, `phase68`, `block1-1b`).
