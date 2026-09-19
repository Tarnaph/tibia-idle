# Resumo da Fase 203: Resolução Definitiva de Falsos Positivos de Rate Limiter de XP e Skills em Caçadas

## Objetivo
Eliminar a causa do erro de salvamento de caçada:
`Falha ao salvar: Suspicious XP gain: +29640 XP exceeds continuous time budget (max allowed: +24767)`
e os erros correspondentes de avanço de treino:
`Salto anômalo de habilidade não permitido: ganho de 464200 tentativas de treino excede o orçamento contínuo no tempo`
identificados na telemetria de produção na VPS (`187.7.16.210`).

## Diagnóstico Realizado
1. **Omissão de Persistência de `isHunting` no SQLite:**
   O frontend enviava `isHunting: true` no payload de salvamento (`POST /api/characters/:id/save`), porém o `characterService.ts` omitia `isHunting` e `lastHuntId` do objeto `updateData`. Com isso, a coluna `isHunting` na tabela `characters` permanecia com valor `0` (`false`) indefinidamente no SQLite.
2. **Rejeição por Não Detecção de Caçada:**
   Ao validar o rate limiter contínuo de XP e de skill tries, o `characterService.ts` ignorava a flag `data.isHunting` enviada pelo cliente. Como a consulta interna ao Colyseus retornava `isHunting: false` (devido a reconexão ou assincronia de socket) e o banco continha `isHunting = 0`, a requisição era avaliada sob as regras da cidade de Thais (burst de 10.000 XP + 500 XP/s e 12 tries/s de treino urbano), bloqueando ganhos legítimos de monstros como Cyclops (+29.640 XP e 240 tries/s).
3. **Atraso na Notificação de Caçada no Frontend:**
   O `startSelectedHunt` iniciava uma tela de transição de 10 segundos antes de enviar `gameNetwork.sendSetInHunt(true, huntId)` ao Colyseus, gerando uma janela de 10s onde o servidor ainda considerava o jogador na cidade.
4. **Conflito de Concorrência Otimista (OCC) no Colyseus:**
   O auto-save periódico de 20s do Colyseus tentava gravar no SQLite usando uma versão defasada em memória (`playerVersion < dbVersion`), gerando exceções repetidas `[OCC_CONFLICT]` nos logs do PM2 e abortando suas transações.

## Mudanças Implementadas
1. **`packages/auth/src/characterService.ts`:**
   - Adicionada gravação explícita de `updateData.isHunting` e `updateData.lastHuntId` na tabela `characters`.
   - Implementada detecção contextual robusta de caçada:
     ```ts
     const hasHuntEvidence = Boolean(
       (existing as any)?.lastHuntId ||
       (data as any)?.lastHuntId ||
       (existing as any)?.isHunting ||
       contextResult.isHunting
     );
     const isHunting = options?.isInternal
       ? Boolean(options?.isHunting)
       : Boolean(
           contextResult.isHunting ||
           (existing as any)?.isHunting ||
           (data.isHunting && hasHuntEvidence)
         );
     ```
   - Aplicada a mesma regra de detecção de caçada para a validação de tentativas de skills (`SkillRateLimiter`), permitindo a taxa de combate de 240 tries/s.
2. **`apps/web/components/GamePrototype.tsx`:**
   - Em `startSelectedHunt`: Adicionada chamada imediata a `gameNetwork.sendSetInHunt(true, huntId);` logo no clique da caçada.
   - Em `saveProgress`: Adicionado envio de `lastHuntId` no payload JSON de salvamento tanto para o personagem principal quanto para personagens secundários da party.
3. **`packages/server/src/persistence/PrismaPersistenceManager.ts`:**
   - Adicionada proteção contra conflitos OCC quando o cliente grava uma versão mais recente via HTTP:
     ```ts
     if (playerVersion < dbVersion) {
       (player as any).saveVersion = dbVersion;
       return;
     }
     ```
     Eliminando os logs de erro de versão desatualizada e evitando lock contention no SQLite.

## Verificação
- **Vitest:** 100% de aprovação nos testes de regressão de persistência, rate limiting e concorrência (`phase182-hunt-context-recovery`, `phase182-progression-and-rewards-fix`, `phase199-save-resilience`, `block1-1b`, `phase68`).
- **TypeScript:** 0 erros no typecheck global (`npm run typecheck`).
